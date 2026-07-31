# A Faturar e Meta por Representante — Design

## Objetivo

Hoje a badge "A faturar" no card de Faturamento do Dashboard mostra sempre o total da empresa, mesmo quando um representante está logado — o que não ajuda o representante a saber quanto falta *dele* faturar. Este trabalho:

1. Quebra "A faturar" por vendedor (`CODVEND`), mantendo o total da empresa pra visão do admin.
2. Traz a meta mensal de vendas (COTA, tabela `TGFMET` do Sankhya) por representante.
3. Mostra, embaixo da badge "A faturar", um bullet graph comparando Faturamento realizado × Meta do mês, só quando há um representante no contexto (logado, ou selecionado pelo admin no filtro que já existe no Dashboard).

## Escopo — 3 repositórios/sistemas distintos

Mesmo padrão já usado em Visitas/Atendimentos:

1. **Backend** (`C:\Users\Power BI\projetos\backend`) — serviços Node/Fastify que sincronizam Sankhya → Supabase via DbExplorer.
2. **Supabase** — tabelas e RPCs, aplicadas via migration.
3. **n8n** — agendamento dos syncs. Ação do usuário: duplicar um workflow existente pra rota de metas.
4. **Frontend** (`bionatus-web-app`, este repo) — consumo das RPCs.

## RLS

Representante logado só vê o próprio valor de "a faturar" e a própria meta — nunca a carteira/metas de outros representantes. Admin sem filtro selecionado continua vendo o total da empresa (comportamento atual da badge). O papel do usuário (`profiles.role`) e o mapeamento pra `CODVEND` (via `representante_contas`, `sistema=2`) são resolvidos **uma vez por chamada** dentro da RPC, não por linha — lição da Errata 5 (Aberturas) aplicada aqui por padrão, mesmo essas tabelas sendo pequenas.

O vendedor genérico "FUNCIONARIOS" nunca faz login (não há necessidade de tratamento de RLS pra ele) e seu valor pendente continua entrando na soma total da empresa, sem exclusão especial.

## 1. Backend

### 1.1 "A Faturar" por vendedor (modifica sync existente)

**Arquivo:** `src/services/services-new/sync-sankhya-pendente-faturamento.js`

- `SQL_PENDENTE_FATURAMENTO` ganha `CAB.CODVEND` no `SELECT` e `GROUP BY CAB.CODVEND` no final.
- A gravação deixa de ser upsert de 1 linha fixa (`id=1`) e passa a ser "apaga tudo, insere de novo": a cada sync, `delete from sankhya_pendente_faturamento` seguido de `insert` de uma linha por `codvend` retornado pela query (só vendedores com pendente > 0 aparecem — evita linha desatualizada de quem zerou o pendente).

### 1.2 Meta (COTA) — novo sync

**Arquivo novo:** `src/services/services-new/sync-sankhya-metas.js`

Mesmo padrão de autenticação/paginação dos demais syncs. Query:
```sql
SELECT CODVEND, DTREF, SUM(PREVREC) AS META
FROM TGFMET
WHERE DTREF >= <primeiro dia de 12 meses atrás> AND DTREF <= <primeiro dia do mês atual>
GROUP BY CODVEND, DTREF
```
(Sincroniza uma janela de 12 meses pra trás + mês atual — dá histórico "de graça" pra uma futura tela de acompanhamento, sem custo extra de query. `SUM` porque a tabela pode ter mais de uma linha por `codvend`/mês, ex.: por filial.)

Upsert em `sankhya_metas` por `(codvend, mes_referencia)` — ao contrário do pendente-faturamento, aqui não faz sentido "apagar tudo": meses passados não somem, e o mês atual pode ser revisado (upsert normal).

**Arquivo modificado:** `src/routes/sankhya.routes.js` — nova rota `POST /update-metas`, espelhando `/update-visitas`/`/update-atendimentos` (try/catch, log, mensagem de sucesso).

### 1.3 n8n

Ação do usuário: duplicar um workflow existente, apontando a chamada HTTP pra `/update-metas`, renomeando pra "Metas". Mesmo agendamento (mensal ou diário — a meta não muda com frequência, mas rodar junto dos outros syncs diários não tem custo relevante).

## 2. Supabase

### 2.1 `sankhya_pendente_faturamento` — restruturada

```sql
alter table public.sankhya_pendente_faturamento drop constraint sankhya_pendente_faturamento_pkey;
alter table public.sankhya_pendente_faturamento drop column id;
alter table public.sankhya_pendente_faturamento add column codvend bigint not null;
alter table public.sankhya_pendente_faturamento add constraint sankhya_pendente_faturamento_pkey primary key (codvend);
```
(migration exata a ser ajustada na implementação; a tabela hoje só tem 1 linha, sem risco de perda de dado real.)

**RPC `get_sankhya_pendente_faturamento(p_id_representante bigint default null)`** — substitui a atual (sem parâmetros):
- Calcula `meu_role` (uma vez) e, se `representante`, o `codvend` mapeado via `representante_contas` (sistema=2).
- Representante logado: sempre retorna a própria linha, ignorando `p_id_representante`.
- Não-representante (admin) com `p_id_representante` informado: retorna a linha daquele `codvend` (zerada se não houver linha — sem pendente).
- Não-representante sem `p_id_representante`: `SUM(qtd), SUM(vlrnota), SUM(venda), SUM(bonus), MAX(updated_at)` de todas as linhas (comportamento atual, agora calculado, não armazenado).

### 2.2 `sankhya_metas` — tabela nova

```sql
create table public.sankhya_metas (
  codvend bigint not null,
  mes_referencia date not null,
  meta numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (codvend, mes_referencia)
);
```
Grants: `revoke all ... from anon, authenticated` (backend usa service role, mesmo padrão das outras tabelas de sync cru).

**RPC nova `get_meta_representante(p_ano integer, p_mes integer, p_id_representante bigint default null)`** — retorna `meta numeric` (0 se não houver linha):
- Mesma resolução de papel/`codvend` do item anterior.
- Representante logado: sempre a própria meta do mês pedido, ignorando `p_id_representante`.
- Admin: só retorna algo se `p_id_representante` for informado (retorna a meta daquele vendedor); sem parâmetro, retorna `null` — o frontend não chama essa RPC nesse caso (feature é só nível representante por enquanto).

## 3. Frontend

**`src/lib/dashboard.ts`:**
- `getPendenteFaturamento` ganha parâmetro `idRepresentante: number | null` e passa pra RPC.
- Novo `getMetaRepresentante(ano: number, mes: number, idRepresentante: number | null): Promise<number | null>` — chama `get_meta_representante`; não chama a RPC (retorna `null` direto) se `idRepresentante` for `null`.

**`src/hooks/dashboard/use-dashboard-data.ts`:**
- `loadPendenteFaturamento` passa a depender de `idRepresentante` (refaz quando o filtro muda, como as outras métricas).
- Novo estado `meta: number | null` + `loadMeta`, seguindo o mesmo padrão de `loadPendenteFaturamento` (chamado junto no mesmo efeito/`Promise.all`, só dispara quando `idRepresentante` existe).

**Novo componente `src/components/ui/myComponents/bullet-graph.tsx`:**
- Props: `valor: number`, `meta: number`.
- Barra horizontal: fundo neutro (`bg-slate-100 dark:bg-slate-800`, mesmo tom usado na Curva ABC), preenchimento proporcional a `min(100%, valor/meta)`.
- Cor por faixa, reaproveitando as cores semânticas já usadas no app (não as do painel de referência do Sankhya): `≥100%` → verde (`text-[#006426]`/`bg-[#006426]`, dark `text-[#7DD3A2]`), `70–99%` → âmbar (`text-amber-700`/`bg-amber-500`, dark `text-amber-400`), `<70%` → vermelho (`text-red-600`/`bg-red-500`, dark `text-red-400`) — mesma paleta do badge de KPI (`kpi-card.tsx`) e da Curva ABC.
- Texto acima da barra: "R$ {valor} / R$ {meta}" à esquerda, "{pct}%" à direita — layout igual ao print de referência.
- Sem meta cadastrada (`meta === 0` ou `null`): não renderiza nada (mesmo comportamento do "sem meta" do painel de referência).

**`src/components/dashboard/dashboard-kpis-section.tsx`:**
- Embaixo da badge "A faturar" existente, renderiza `<BulletGraph valor={faturamentoRealizado} meta={meta} />` quando `idRepresentante` (do contexto: logado ou filtro do admin) existir e `meta` tiver carregado.
- `valor` (Realizado) reaproveita o KPI de Faturamento que o card já recebe (mesmo mês/representante do filtro atual) — sem nova fórmula de cálculo. Se o número não bater com o esperado, ajusta-se depois.

## Fora de escopo (confirmado com o usuário)

- Bullet graph pra visão do admin sem filtro (empresa toda) — só nível representante por enquanto.
- Tela dedicada de histórico de metas mês a mês — não será criada agora (mas os dados já ficam guardados em `sankhya_metas` com histórico de 12 meses, disponível pra uma spec futura).
- Replicar a fórmula de faturamento do painel de referência do Sankhya (filtro por marca, `CODTIPOPER` específico) — usa-se o KPI de Faturamento que o Dashboard já calcula.
