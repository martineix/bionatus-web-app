# Telas de Clientes — Design

## Objetivo

Criar um conjunto de 5 telas de análise de clientes (Atividade, Frequência, Curva ABC, Avaliação, Aberturas), agrupadas em um accordion "Clientes" no menu, mais uma tela de parametrização em Cadastros para configurar as regras de avaliação/classificação.

## Contexto

- Existe hoje um item de menu "Clientes" (topo, fora de accordion) apontando para `src/pages/clientes/clientes-page.tsx`, que está vazia.
- A tabela `clientes_enriquecidos` mencionada em sessões anteriores **não existe** no banco atual. Dados de identidade de cliente vêm de `sankhya_parceiros` (codparc, parceiro, razao, cpf_cnpj, telefone, email, codcid, codreg) e `nexus_pessoas`.
- `vw_pedidos_v2` (grão de item de pedido) já expõe `cnpj`, `id_cliente`, `sistema`, `pedido`, `data_cadastro_pedido`, `vlr_total`, `und_vnd`, `mercado`, `contas`, `id_representante`, `representante`, `is_bionatus`.
- Um mesmo cliente real pode ter `id_cliente` diferente em Sankhya e Nexus. **Decisão: unificar por CNPJ** em todas as 5 telas.
- Padrão já existente no projeto: MVs `mv_dashboard_kpis_diario` e `mv_dashboard_clientes_diario`, refrescadas por workflows n8n ("Atualiza MV KPIs" / "Atualiza MV Clientes"), sempre excluindo pedidos presentes em `removals` (join `LEFT JOIN removals r ON r.pedido = v.pedido AND r.sistema = v.sistema WHERE r.id IS NULL`).
- Menu já tem o padrão de accordion implementado para "Cadastros" (`src/components/layout/sidebar.tsx`), com item pai clicável, `ChevronDown`/`ChevronRight`, e filtro de visibilidade por permissão.
- RPCs de dashboard existentes já respeitam a restrição de representante via `representante_contas` quando `profiles.role = 'representante'` — o mesmo padrão deve ser seguido pelas novas RPCs.

## Arquitetura de dados

### Nova materialized view: `mv_clientes_pedidos`

Grão: uma linha por `(sistema, pedido)`. Agrega os itens de `vw_pedidos_v2` por pedido (soma de `vlr_total`, já líquido de devolução via o sinal existente na view) e traz as dimensões de filtro do pedido.

Colunas:
- `sistema` (integer)
- `pedido` (bigint)
- `cnpj` (text)
- `id_representante` (bigint), `representante` (text)
- `mercado` (integer), `contas` (integer), `is_bionatus` (integer)
- `data_pedido` (date) — `data_cadastro_pedido`
- `valor_pedido` (numeric) — soma de `vlr_total` dos itens do pedido (líquido, positivo para venda, negativo para devolução)
- `is_venda` (boolean) — `true` quando o pedido é uma venda (não é uma devolução isolada); usado para não contar devoluções como "pedido" nas métricas de contagem/ticket médio/última compra

Exclui pedidos presentes em `removals` (mesmo padrão das MVs atuais).

Refresh: adicionado ao(s) workflow(s) n8n existente(s) que já refrescam `mv_dashboard_kpis_diario`/`mv_dashboard_clientes_diario` (mesma cadência).

### RPCs (uma por tela, todas recebendo os filtros padrão do dashboard: `p_data_inicio`, `p_data_fim`, `p_id_representante`, `p_mercado`, `p_contas`, `p_sistema`, com a mesma auto-restrição por `representante_contas` das RPCs de dashboard existentes)

1. `get_clientes_atividade` — por `cnpj`: nome/razão (join com `sankhya_parceiros`/`nexus_pessoas`), `dias_desde_ultima_compra`, `data_ultima_compra`, `valor_ultima_compra`, `valor_total_liquido` (vida), `qtd_pedidos` (só `is_venda = true`), `ticket_medio`.
2. `get_clientes_frequencia` — por `cnpj`: `intervalo_medio_dias` (média dos intervalos entre pedidos de venda consecutivos, todo o histórico), `data_ultima_compra`, `previsao_proxima_compra` (= última compra + intervalo médio; `null`/flag "sem histórico suficiente" quando há menos de 2 pedidos de venda).
3. `get_clientes_curva_abc` — por `cnpj`, dentro do conjunto filtrado: `valor_total_liquido` (vida), `%_participacao`, `%_acumulado`, `classe` (A/B/C conforme cortes de `parametros_curva_abc`), `intervalo_medio_dias`.
4. `get_clientes_avaliacao` — por `cnpj`: estrela de Atividade, Frequência e Ticket Médio (via faixas de `parametros_avaliacao_cliente`), Nota Geral (média ponderada via `parametros_avaliacao_cliente` pesos). Critério sem dados suficientes fica sem estrela e é excluído do cálculo da média.
5. `get_clientes_aberturas` — agrupado por mês (`ano_mes`), dentro do filtro ativo: quantidade de CNPJs cuja primeira compra (`min(data_pedido)` entre pedidos de venda) cai naquele mês.

### Tabelas de parametrização (novas, para a tela de Cadastros)

- `parametros_avaliacao_cliente`: uma linha por critério (`atividade`, `frequencia`, `ticket_medio`), com faixas configuráveis (5 faixas min/max → estrela 1-5) e peso (%) usado na média ponderada da nota geral. Defaults: pesos 40% Atividade / 35% Frequência / 25% Ticket Médio.
- `parametros_curva_abc`: cortes percentuais acumulados para A, B, C (default 80/15/5).

Ambas seguem o padrão de RLS do projeto (`REVOKE ALL FROM PUBLIC/anon/authenticated` + grants explícitos), editáveis só por quem tem permissão de Cadastros.

## Telas (frontend)

Menu: item "Clientes" torna-se accordion (mesmo padrão do accordion "Cadastros" em `sidebar.tsx`), com 5 sub-itens. Cada tela usa `AppShell` + a mesma barra de filtros do dashboard atual (representante, mercado, contas, sistema, período quando aplicável).

1. **Atividade** (`/clientes/atividade`) — tabela ordenável/buscável: Cliente, dias desde última compra, data última compra, valor última compra, total comprado (vida), qtd. pedidos, ticket médio.
2. **Frequência** (`/clientes/frequencia`) — tabela: Cliente, intervalo médio (dias), data última compra, previsão próxima compra (ou "sem histórico suficiente").
3. **Curva ABC** (`/clientes/curva-abc`) — tabela: Cliente, valor total (vida), % participação, % acumulado, classe A/B/C, intervalo médio.
4. **Avaliação** (`/clientes/avaliacao`) — tabela: Cliente, ★ Atividade, ★ Frequência, ★ Ticket Médio, ★ Nota Geral.
5. **Aberturas** (`/clientes/aberturas`) — gráfico de colunas por mês (padrão últimos 12 meses, com seletor de período), quantidade de clientes com primeira compra no mês.

Cadastros → **Avaliação de Clientes** (`/cadastros/avaliacao-clientes`) — formulário com as faixas de estrela (Atividade/Frequência/Ticket Médio), pesos da nota geral, e cortes da Curva ABC.

## Ordem de implementação

Atividade → Frequência → Curva ABC → Avaliação → Aberturas. A tela de parametrização (Cadastros → Avaliação de Clientes) precisa existir antes da tela de Avaliação e antes da Curva ABC usar cortes configuráveis (pode nascer com os defaults hard-coded nas tabelas de parametrização e a UI de edição entrar junto com a tela de Avaliação).

## Fora de escopo (YAGNI)

- Enriquecimento cadastral (CNAE, capital social) — não há fonte de dados ativa hoje (`clientes_enriquecidos` não existe).
- Página de detalhe por cliente unificando as 4 visões — decidido que cada tela é uma lista independente por ora.
- Pesos/cortes por representante ou segmento — parametrização é global.
