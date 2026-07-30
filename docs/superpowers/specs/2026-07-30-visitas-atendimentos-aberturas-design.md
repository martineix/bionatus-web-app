# Visitas e Atendimentos em Aberturas de Clientes — Design

> **Errata 3 (2026-07-30):** Erro intermitente "não foi possível carregar o detalhe dos clientes" root-caused: `vw_clientes_nomes` (view com window function sobre ~70 mil linhas, sem índice) era joinada dentro das 5 RPCs de Clientes sem que o Postgres conseguisse empurrar o filtro por CNPJ pra dentro dela — o planner escolhia nested loop (até 78,8 milhões de comparações), levando `get_clientes_aberturas_detalhe` a 15-60 segundos dependendo do range de datas, estourando o timeout do Supabase. Corrigido criando `mv_clientes_nomes` (materialized view com índice único em `cnpj`, mesma definição de `vw_clientes_nomes`) e repontando as 5 RPCs (`get_clientes_atividade`, `get_clientes_frequencia`, `get_clientes_curva_abc`, `get_clientes_avaliacao`, `get_clientes_aberturas_detalhe`) pra usá-la. Tempo de query caiu de até 60s para ~1,5-2,6s. `vw_clientes_nomes` continua existindo (sem mais nenhuma dependência) caso seja útil pra consulta ad-hoc. **Pendência:** `mv_clientes_nomes` ainda não está em nenhum schedule de refresh — usuário vai adicionar `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_clientes_nomes;` ao workflow n8n "Atualiza MV Clientes-Pedidos".
>
> **Errata 2 (2026-07-30):** "Quem abriu" (representante_abertura) nunca deve mostrar compras internas de funcionários. Investigação encontrou dois problemas relacionados: (1) o vendedor genérico "FUNCIONARIOS" (codvend 814 no Sankhya) aparecia como representante_abertura para 109 clientes — corrigido excluindo "FUNCIONARIOS" da CTE `abertura_rep`; (2) mais fundamental: 111 CNPJs/CPFs distintos têm pedidos majoritariamente atribuídos a "FUNCIONARIOS" — são funcionários comprando pra si mesmos (mesmo padrão do CPF do Matheus/Graziela Velani), não clientes reais. Excluído `representante = 'FUNCIONARIOS'` diretamente em `vw_pedidos_v2` (1.174 pedidos, R$47.985,44), removendo essas 111 pseudo-contas de cliente de todo o sistema (Dashboard + todas as telas de Clientes), não só de Aberturas. MVs dependentes reconstruídas.
>
> **Errata (2026-07-30, pós-implementação):** o schema de `AD_LIGACOESVI` assumido abaixo (idêntico a `AD_ADVISITASQUESTIONARIO`: codigovisita/cidade/datavisita/questionario/pergunta/resposta) estava **incorreto** — o print original mostrava a tabela errada. O schema real, confirmado via `ALL_TAB_COLUMNS` no Sankhya, é: `id, idatendimento, usuario, clienterazaosocial, cnpj, datainicio, datafim, pedidonumero, pedidovalor, pedidostatus, motivo, observacoes, hashunico, origem` — e cada linha já é 1 atendimento completo (4.707 linhas = 4.707 IDs únicos, sem fragmentação em pergunta/resposta como em Visitas). A contagem de atendimentos em `get_clientes_aberturas_detalhe` usa `count(*)` por CNPJ (não `count(distinct codigovisita)`, que não existe nessa tabela). Tabela, RPC de upsert e serviço de sync foram corrigidos para o schema real; a tela de Aberturas (Task 4) não precisou de nenhuma mudança, pois só consome `qtd_atendimentos` como número. Sincronização inicial rodada manualmente: 4.707 registros, 1.399 CNPJs distintos.

## Objetivo

Trazer visibilidade sobre contato pós-abertura: na tela de Aberturas de Clientes (`src/pages/clientes/aberturas-page.tsx`), depois da coluna "Recompra", mostrar se o cliente recebeu visita (representante) e/ou atendimento (televendas) desde a data de abertura. Isso permite distinguir um cliente sem recompra mas acompanhado ("Visita: Sim · 2x") de um cliente totalmente abandonado (sem recompra e sem contato algum).

Não haverá telas/rotas novas no frontend — só o enriquecimento da tabela de detalhe já existente em Aberturas.

## Escopo — 3 repositórios/sistemas distintos

Este trabalho atravessa três sistemas fora do controle de versão único:

1. **Backend** (`C:\Users\Power BI\projetos\backend`) — serviço Node/Fastify que sincroniza dados do Sankhya (ERP on-premise) para o Supabase via chamadas ao DbExplorer do Sankhya.
2. **Supabase** (banco Postgres do projeto) — tabelas espelho e RPCs, aplicadas via migration.
3. **n8n** (orquestração de agendamento) — dispara a rota do backend periodicamente. **Fora do meu alcance de edição** (sem acesso MCP ao workflow "Visitas" existente para servir de referência exata); a duplicação do workflow será feita pelo usuário.
4. **Frontend** (`bionatus-web-app`, este repo) — só o consumo final via RPC + 2 colunas novas na tabela de Aberturas.

Já existe uma sincronização gêmea funcionando para Visitas (`AD_ADVISITASQUESTIONARIO` → `sankhya_visitas`), usada aqui como referência/template a ser clonado para Atendimentos (`AD_LIGACOESVI` → `sankhya_atendimentos`).

## Modelo de dados de origem

Ambas as tabelas Sankhya (`AD_ADVISITASQUESTIONARIO` e `AD_LIGACOESVI`) têm o mesmo formato: uma linha por par pergunta/resposta de um questionário, várias linhas compartilhando o mesmo `CODIGOVISITA` (o identificador do evento de visita/atendimento). Colunas: `ID, CODIGOVISITA, USUARIO, CLIENTERAZAOSOCI(AL), CNPJ, CIDADE, DATAVISITA, QUESTIONARIO, PERGUNTA, RESPOSTA, OBSERVACOES, HASHUNICO, ORIGEM`.

Uma "visita" ou "atendimento" real = um `CODIGOVISITA` distinto. Contagem de eventos deve usar `count(distinct codigovisita)`, nunca `count(*)` (que contaria cada pergunta/resposta como um evento separado).

CNPJ já vem em formato só-dígitos em `sankhya_visitas`, compatível com `mv_clientes_pedidos.cnpj` — join direto sem normalização adicional.

## 1. Backend — novo serviço de sincronização

**Arquivo novo:** `src/services/services-new/sync-sankhya-atendimentos.js`

Cópia de `sync-sankhya-visitas.js` (mesma lógica: token OAuth do Sankhya, paginação de 5000 em 5000 via `DbExplorerSP.executeQuery`, conversão de data `DDMMYYYY` → `YYYY-MM-DD`, upsert incremental por `id`), alterando:
- Tabela de origem no SQL: `AD_ADVISITASQUESTIONARIO` → `AD_LIGACOESVI`
- Tabela de destino no Supabase (para `getUltimoId` e para o nome da RPC): `sankhya_visitas` → `sankhya_atendimentos`
- Nome da RPC chamada: `insert_or_update_sankhya_visitas_new` → `insert_or_update_sankhya_atendimentos`
- Nome da função exportada: `getVisitas` → `getAtendimentos`

**Arquivo modificado:** `src/routes/sankhya.routes.js`
- Import de `getAtendimentos`
- Nova rota `app.post("/update-atendimentos", ...)`, espelhando exatamente o bloco de `/update-visitas` (try/catch, mensagem de sucesso, log de erro).

## 2. Supabase

**Tabela nova** `sankhya_atendimentos` — schema idêntico a `sankhya_visitas`:
```sql
create table public.sankhya_atendimentos (
  id integer primary key,
  codigovisita text,
  usuario text,
  clienterazaosocial text,
  cnpj text,
  cidade text,
  datavisita date,
  questionario text,
  pergunta text,
  resposta text,
  observacoes text,
  hashunico text,
  origem text
);
create index idx_sankhya_atendimentos_cnpj on public.sankhya_atendimentos (cnpj);
```
(índice em `cnpj` novo — não existe em `sankhya_visitas` hoje, mas passa a ser necessário para os `count(distinct codigovisita) ... where cnpj = ...` que a RPC de Aberturas vai fazer; adicionar o mesmo índice em `sankhya_visitas` por consistência/performance.)

**RPC nova** `insert_or_update_sankhya_atendimentos(pedido_data jsonb)` — cópia de `insert_or_update_sankhya_visitas_new`, trocando a tabela de destino.

Grants: seguem o padrão de tabelas de sincronização — sem necessidade de bloquear `anon` explicitamente, pois o backend usa a service role key (que ignora RLS/grants); ainda assim, aplicamos `revoke all ... from anon, authenticated` por padrão de segurança do projeto, já que não há necessidade de acesso direto do cliente a essas tabelas cruas.

**RPC modificada** `get_clientes_aberturas_detalhe` — adiciona duas colunas ao retorno:
- `qtd_visitas bigint` = `count(distinct v.codigovisita)` de `sankhya_visitas` onde `v.cnpj = pr.cnpj` e `v.datavisita > pr.data_abertura`
- `qtd_atendimentos bigint` = mesma lógica em `sankhya_atendimentos`

Mesmo critério de janela já usado para `qtd_recompras` (só conta depois da data de abertura).

## 3. n8n

Ação do usuário: duplicar o workflow "Visitas" existente, apontando a chamada HTTP para a nova rota `/update-atendimentos` em vez de `/update-visitas`, renomeando para "Atendimentos". Mesmo agendamento/gatilho do original.

## 4. Frontend

**`src/lib/clientes/clientes-aberturas.ts`** — `ClienteAberturaDetalheRow` ganha `qtdVisitas: number` e `qtdAtendimentos: number`; mapper atualizado para os novos campos `qtd_visitas`/`qtd_atendimentos` da RPC.

**`src/pages/clientes/aberturas-page.tsx`** — `detalheColumns` ganha 2 colunas novas após "Recompra": "Visita" e "Atendimento", mesmo componente visual do badge de recompra (`Sim · Nx` em verde / `Não` em cinza — usa "Não" em vez de "Ainda não" aqui, já que não há necessariamente uma expectativa futura de visita como há de recompra).

Nenhuma mudança em `use-clientes-aberturas.ts` além do que já é repassado via `detalhe` (o hook já não precisa saber da nova forma dos dados, só passa adiante).

## Fora de escopo (confirmado com o usuário)

- Telas/rotas dedicadas de "Visitas" e "Atendimentos" no frontend — não serão criadas.
- Filtro dedicado por usuário/representante que fez a visita — fora do escopo atual, pode vir depois se necessário.
- Contagem de visitas/atendimentos anteriores à abertura — fora de escopo (só pós-abertura).
