# Layout das Telas de Clientes — Ajustes

## Objetivo

Ajustar os componentes compartilhados das 5 telas de Clientes (Atividade, Frequência, Curva ABC, Avaliação, Aberturas), criados na sessão anterior, para:
1. Padronizar visualmente a barra de filtros com a do Dashboard.
2. Adicionar ordenação por coluna e paginação nas 4 tabelas (Atividade, Frequência, Curva ABC, Avaliação).
3. Adicionar um filtro de classe (A/B/C) na tela de Curva ABC, resolvendo o problema relatado de "só vejo A e B" — que investigação confirmou não ser bug de backend (a RPC já classifica corretamente: 586 A / 1519 B / 3076 C), e sim falta de um jeito de isolar cada grupo numa lista de ~5200 linhas sem paginação.

Escopo 100% frontend — nenhuma RPC/tabela do Supabase é alterada. Todos os dados já vêm completos do backend numa única chamada; sort, paginação e filtro de classe operam sobre os dados já carregados no cliente.

## Componente `ClientesFilters` (src/components/clientes/clientes-filters.tsx)

Replicar visualmente o padrão do `DashboardFilters` (src/components/ui/myComponents/dashboard-filters.tsx):
- Badge quadrado com ícone `Filter`, fundo `#F0F0F0`/`slate-800`, texto `#006426`/`#7DD3A2`.
- Título "Filtros" + contador de filtros ativos em pill (`N ativo(s)`), calculado sobre mercado/contas/isBionatus.
- Subtítulo descritivo abaixo do título (ex: "Refine a visualização dos clientes").
- Cada campo (Mercado, Fabricante) usa o padrão `InlineSelectField`: `<select>` com `appearance-none` + `ChevronDown` posicionado absoluto, cor de borda/fundo mudando quando o filtro está ativo (`activeControlClass` vs `defaultControlClass`, mesmas classes do Dashboard).
- Popover de Canal ganha: descrição do estado atual ("Todos os canais selecionáveis" / "N selecionado(s)"), botão "Limpar" quando há seleção, ícone `Check` ao lado da opção marcada.
- Mantém os 3 campos atuais (Mercado, Canal, Fabricante) — sem Ano/Mês, que não fazem sentido para métricas de histórico de vida.

## Componente `ClientesDataTable` (src/components/clientes/clientes-data-table.tsx)

**Ordenação:**
- `ClientesTableColumn<T>` ganha um campo opcional `sortValue?: (row: T) => string | number | null`. Colunas sem `sortValue` não são clicáveis para ordenar (ex: uma coluna de badge/estrelas sem valor escalar óbvio pode continuar sem sort, a critério de cada tela).
- Cabeçalho clicável nas colunas com `sortValue`: clique alterna asc → desc → nenhum; ícone de seta (`ChevronUp`/`ChevronDown`, ambos visíveis em cinza claro quando neutro, um deles destacado quando ativo).
- Estado de sort (`sortKey`, `sortDirection`) fica dentro do próprio `ClientesDataTable`, aplicado sobre o array `rows` recebido via prop antes de paginar.
- `null`/`undefined` sempre ordenam para o final, independente da direção.

**Paginação:**
- 50 linhas por página (fixo, sem seletor de tamanho de página — YAGNI por ora).
- Controles "Anterior"/"Próxima" + "Página X de Y" abaixo da tabela.
- Mudar filtro, busca ou ordenação reseta para a página 1.

**Polimento visual:**
- Zebra striping: linhas pares com fundo levemente diferenciado (`bg-slate-50/50` claro, `bg-slate-900/30` escuro).
- Colunas numéricas/monetárias/data usam `tabular-nums` para alinhamento vertical dos dígitos.
- Cabeçalho fixo (`sticky top-0`) dentro da área de scroll da tabela.
- Hover de linha mais visível (`hover:bg-slate-50` / `hover:bg-slate-900`).

## Tela de Curva ABC (src/pages/clientes/curva-abc-page.tsx)

- Novo controle de botões segmentados acima da tabela: "Todas | A | B | C", estilizados como grupo de toggle (botão ativo com fundo `#E4F1E8`/texto `#006426`, mesma paleta do badge de classe já usado na tabela).
- Filtro aplicado client-side sobre as linhas já carregadas da RPC (sem novo parâmetro de RPC).
- Estado do filtro de classe é local à página (não precisa persistir em localStorage).

## Fora de escopo (YAGNI)

- Sort/paginação nas telas de Aberturas (é gráfico, não tabela).
- Seletor de tamanho de página.
- Persistência de página/sort entre sessões.
- Qualquer mudança em RPC, MV ou tabela do Supabase.
