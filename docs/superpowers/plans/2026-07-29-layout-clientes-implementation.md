# Layout das Telas de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar visualmente os filtros das telas de Clientes com os do Dashboard, adicionar ordenação por coluna e paginação na tabela genérica compartilhada, e adicionar um filtro de classe A/B/C na tela de Curva ABC.

**Architecture:** Mudanças 100% em `src/components/clientes/*` (2 componentes compartilhados) e nas 4 páginas de tabela que os consomem (`src/pages/clientes/*-page.tsx`). Nenhuma RPC/tabela do Supabase é tocada — sort, paginação e o filtro de classe operam sobre os dados já carregados no cliente numa única chamada de RPC por tela.

**Tech Stack:** React 19 + TypeScript, Tailwind v4, lucide-react (ícones).

## Global Constraints

- Nenhuma mudança de schema/RPC/Supabase neste plano — é puramente frontend.
- Paginação client-side fixa em 50 linhas por página, sem seletor de tamanho.
- Mudar filtro, busca ou ordenação sempre reseta a paginação para a página 1.
- `ClientesFilters` mantém exatamente os 3 campos atuais (Mercado, Canal, Fabricante) — sem Ano/Mês.
- Sem framework de testes automatizado no projeto — verificação via `npm run build` (typecheck) e checagem manual com `npm run dev`.

---

### Task 1: `ClientesFilters` — paridade visual com `DashboardFilters`

**Files:**
- Modify: `src/components/clientes/clientes-filters.tsx`

**Interfaces:**
- Consumes: `ClientesFiltersInput` (`src/lib/clientes/clientes-filters-types.ts`, já existe, sem mudança), `channelOptions` (`src/lib/dashboard/dashboard-constants.ts`, já existe), componentes `Button`/`Checkbox`/`Popover`/`PopoverContent`/`PopoverTrigger` já usados.
- Produces: mesma assinatura pública `ClientesFilters({ filters, onChange })` — nenhum outro arquivo precisa mudar para consumir esta versão nova (drop-in visual replacement).

- [ ] **Step 1: Substituir todo o conteúdo do arquivo**

```tsx
// src/components/clientes/clientes-filters.tsx
import { useMemo } from "react"
import { Check, ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { channelOptions } from "@/lib/dashboard/dashboard-constants"
import type { ClientesFiltersInput } from "@/lib/clientes/clientes-filters-types"

type ClientesFiltersProps = {
  filters: ClientesFiltersInput
  onChange: (filters: ClientesFiltersInput) => void
}

const baseControlClass =
  "h-10 lg:h-9 w-full rounded-xl border bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition-colors dark:bg-slate-900 dark:text-slate-200"

const defaultControlClass =
  `${baseControlClass} border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus:border-[#297B49] dark:border-slate-700 dark:hover:bg-slate-800`

const activeControlClass =
  `${baseControlClass} border-[#297B49]/40 bg-[#F7FBF8] text-slate-900 hover:border-[#297B49] dark:border-[#297B49]/40 dark:bg-slate-900 dark:text-slate-100`

type InlineSelectFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  className: string
  children: React.ReactNode
}

function InlineSelectField({ label, value, onChange, className, children }: InlineSelectFieldProps) {
  return (
    <div className="space-y-1 lg:space-y-0 lg:min-w-0">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 lg:mb-0.5">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} appearance-none`}
        >
          {children}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 opacity-60 dark:text-slate-400" />
      </div>
    </div>
  )
}

export function ClientesFilters({ filters, onChange }: ClientesFiltersProps) {
  function updateFilter<K extends keyof ClientesFiltersInput>(key: K, value: ClientesFiltersInput[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleConta(value: number) {
    const exists = filters.contas.includes(value)
    updateFilter(
      "contas",
      exists ? filters.contas.filter((c) => c !== value) : [...filters.contas, value]
    )
  }

  const contasLabel = useMemo(() => {
    if (filters.contas.length === 0) return "Todos os canais"
    if (filters.contas.length <= 2) {
      return channelOptions
        .filter((c) => filters.contas.includes(c.value))
        .map((c) => c.label)
        .join(", ")
    }
    return `${filters.contas.length} canais selecionados`
  }, [filters.contas])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.mercado !== null) count += 1
    if (filters.contas.length > 0) count += 1
    if (filters.isBionatus !== null) count += 1
    return count
  }, [filters])

  const marketControlClass = filters.mercado !== null ? activeControlClass : defaultControlClass
  const manufacturerControlClass = filters.isBionatus !== null ? activeControlClass : defaultControlClass
  const channelControlClass = filters.contas.length > 0 ? activeControlClass : defaultControlClass

  return (
    <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        <div className="flex items-start gap-3 lg:min-w-55 lg:shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
            <Filter className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filtros</h2>

              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-[10px] font-medium text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
                  {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Refine a visualização dos clientes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end lg:items-end lg:gap-3">
          <div className="lg:w-50 lg:min-w-37.5">
            <InlineSelectField
              label="Mercado"
              value={filters.mercado === null ? "" : String(filters.mercado)}
              onChange={(value) => updateFilter("mercado", value === "" ? null : Number(value))}
              className={marketControlClass}
            >
              <option value="">Todos</option>
              <option value="1">Marcas + Licitações</option>
              <option value="2">Farma</option>
            </InlineSelectField>
          </div>

          <div className="lg:w-65 lg:min-w-65">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 lg:mb-0.5">
              Canal
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`${channelControlClass} justify-between px-3 font-normal shadow-none`}
                >
                  <span className="truncate text-left">{contasLabel}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[min(92vw,320px)] rounded-2xl border border-slate-200 p-3 shadow-lg dark:border-slate-700"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Canais</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {filters.contas.length === 0
                        ? "Todos os canais selecionáveis"
                        : `${filters.contas.length} selecionado${filters.contas.length > 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {filters.contas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateFilter("contas", [])}
                      className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {channelOptions.map((option) => {
                    const checked = filters.contas.includes(option.value)
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                          checked
                            ? "border-[#297B49]/30 bg-[#F7FBF8] dark:border-[#297B49]/30 dark:bg-slate-900"
                            : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={checked} onCheckedChange={() => toggleConta(option.value)} />
                          <span className="text-sm text-slate-700 dark:text-slate-200">{option.label}</span>
                        </div>

                        {checked && <Check className="h-4 w-4 text-[#297B49]" />}
                      </label>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:w-37.5 lg:min-w-37.5">
            <InlineSelectField
              label="Fabricante"
              value={filters.isBionatus === null ? "" : String(filters.isBionatus)}
              onChange={(value) => updateFilter("isBionatus", value === "" ? null : (Number(value) as 0 | 1))}
              className={manufacturerControlClass}
            >
              <option value="">Todos</option>
              <option value="1">Bionatus</option>
              <option value="0">Terceiros</option>
            </InlineSelectField>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: sucesso, sem erros de tipo (a assinatura pública não mudou, então nenhum outro arquivo deveria quebrar).

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`, abrir `/clientes/atividade` (ou qualquer uma das 4 telas de tabela + Aberturas), confirmar visualmente: badge com ícone verde, contador "N ativo(s)" aparece ao selecionar um filtro, chevron customizado nos selects, cor de destaque quando um filtro está ativo, popover de Canal com "Limpar" e ícone de check.

- [ ] **Step 4: Commit**

```bash
git add src/components/clientes/clientes-filters.tsx
git commit -m "feat: padronizar visual dos filtros de Clientes com o Dashboard"
```

---

### Task 2: `ClientesDataTable` — ordenação, paginação e polimento visual

**Files:**
- Modify: `src/components/clientes/clientes-data-table.tsx`
- Modify: `src/pages/clientes/atividade-page.tsx`
- Modify: `src/pages/clientes/frequencia-page.tsx`
- Modify: `src/pages/clientes/curva-abc-page.tsx`
- Modify: `src/pages/clientes/avaliacao-page.tsx`

**Interfaces:**
- Produces: `ClientesTableColumn<T>` ganha um campo opcional `sortValue?: (row: T) => string | number | null`. `ClientesDataTable` mantém a mesma prop pública (`columns`, `rows`, `loading`, `getRowKey`, `searchTerm`, `onSearchTermChange`, `emptyMessage?`, `searchPlaceholder?`) — nenhuma prop nova é exigida, o componente resolve sort/paginação internamente.
- Consumes: nenhuma dependência nova.

- [ ] **Step 1: Substituir todo o conteúdo de `clientes-data-table.tsx`**

```tsx
// src/components/clientes/clientes-data-table.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export type ClientesTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: "left" | "right" | "center"
  sortValue?: (row: T) => string | number | null
}

type SortDirection = "asc" | "desc"

type ClientesDataTableProps<T> = {
  columns: ClientesTableColumn<T>[]
  rows: T[]
  loading: boolean
  getRowKey: (row: T) => string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  emptyMessage?: string
  searchPlaceholder?: string
}

const PAGE_SIZE = 50

function alignClass(align: ClientesTableColumn<unknown>["align"]) {
  if (align === "right") return "text-right"
  if (align === "center") return "text-center"
  return "text-left"
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "pt-BR")
}

export function ClientesDataTable<T>({
  columns,
  rows,
  loading,
  getRowKey,
  searchTerm,
  onSearchTermChange,
  emptyMessage = "Nenhum cliente encontrado.",
  searchPlaceholder = "Buscar por cliente ou CNPJ...",
}: ClientesDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [rows])

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows

    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return rows

    return [...rows].sort((a, b) => {
      const result = compareValues(column.sortValue!(a), column.sortValue!(b))
      return sortDirection === "asc" ? result : -result
    })
  }, [rows, sortKey, sortDirection, columns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRows = sortedRows.slice(
    clampedPageIndex * PAGE_SIZE,
    clampedPageIndex * PAGE_SIZE + PAGE_SIZE
  )

  function handleSortClick(column: ClientesTableColumn<T>) {
    if (!column.sortValue) return

    if (sortKey !== column.key) {
      setSortKey(column.key)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortKey(null)
      setSortDirection("asc")
    }

    setPageIndex(0)
  }

  return (
    <div className="w-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="mb-4 h-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-auto rounded-xl">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {columns.map((col) => {
                    const sortable = !!col.sortValue
                    const isActive = sortKey === col.key

                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSortClick(col)}
                        className={`sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300 ${alignClass(col.align)} ${
                          sortable ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            col.align === "right" ? "flex-row-reverse" : ""
                          }`}
                        >
                          {col.header}
                          {sortable &&
                            (isActive ? (
                              sortDirection === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                            ))}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={getRowKey(row)}
                    className={`border-b border-slate-100 hover:bg-slate-100 dark:border-slate-900 dark:hover:bg-slate-800 ${
                      index % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3 text-slate-700 dark:text-slate-200 ${alignClass(col.align)} ${
                          col.align === "right" ? "tabular-nums" : ""
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>
              Página {clampedPageIndex + 1} de {pageCount}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={clampedPageIndex === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPageIndex >= pageCount - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

Nota: `null` sempre ordena para o final, independente da direção (nulls-last fixo) — comportamento intencional para não esconder registros com dados completos atrás dos incompletos.

- [ ] **Step 2: Adicionar `sortValue` às colunas de `atividade-page.tsx`**

Editar o array `columns` (mantendo `render` de cada coluna exatamente como já está, só adicionando a propriedade `sortValue`):

```tsx
const columns: ClientesTableColumn<ClienteAtividadeRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome, sortValue: (row) => row.nome },
  {
    key: "dias",
    header: "Dias sem comprar",
    align: "right",
    render: (row) => (row.diasDesdeUltimaCompra === null ? "—" : row.diasDesdeUltimaCompra),
    sortValue: (row) => row.diasDesdeUltimaCompra,
  },
  {
    key: "data_ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
    sortValue: (row) => (row.dataUltimaCompra ? new Date(row.dataUltimaCompra).getTime() : null),
  },
  {
    key: "valor_ultima",
    header: "Valor última compra",
    align: "right",
    render: (row) => (row.valorUltimaCompra === null ? "—" : formatCurrencyBRL(row.valorUltimaCompra)),
    sortValue: (row) => row.valorUltimaCompra,
  },
  {
    key: "total",
    header: "Total comprado (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
    sortValue: (row) => row.valorTotalLiquido,
  },
  {
    key: "qtd",
    header: "Qtd. pedidos",
    align: "right",
    render: (row) => row.qtdPedidos,
    sortValue: (row) => row.qtdPedidos,
  },
  {
    key: "ticket",
    header: "Ticket médio",
    align: "right",
    render: (row) => (row.ticketMedio === null ? "—" : formatCurrencyBRL(row.ticketMedio)),
    sortValue: (row) => row.ticketMedio,
  },
]
```

- [ ] **Step 3: Adicionar `sortValue` às colunas de `frequencia-page.tsx`**

```tsx
const columns: ClientesTableColumn<ClienteFrequenciaRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome, sortValue: (row) => row.nome },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "Sem histórico suficiente" : row.intervaloMedioDias),
    sortValue: (row) => row.intervaloMedioDias,
  },
  {
    key: "ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
    sortValue: (row) => (row.dataUltimaCompra ? new Date(row.dataUltimaCompra).getTime() : null),
  },
  {
    key: "previsao",
    header: "Previsão próxima compra",
    align: "right",
    render: (row) => (row.previsaoProximaCompra === null ? "—" : formatDateBR(row.previsaoProximaCompra)),
    sortValue: (row) => (row.previsaoProximaCompra ? new Date(row.previsaoProximaCompra).getTime() : null),
  },
]
```

- [ ] **Step 4: Adicionar `sortValue` às colunas de `curva-abc-page.tsx`**

```tsx
const columns: ClientesTableColumn<ClienteCurvaAbcRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome, sortValue: (row) => row.nome },
  {
    key: "valor",
    header: "Valor total (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
    sortValue: (row) => row.valorTotalLiquido,
  },
  {
    key: "participacao",
    header: "% Participação",
    align: "right",
    render: (row) => formatPercentBR(row.pctParticipacao),
    sortValue: (row) => row.pctParticipacao,
  },
  {
    key: "acumulado",
    header: "% Acumulado",
    align: "right",
    render: (row) => formatPercentBR(row.pctAcumulado),
    sortValue: (row) => row.pctAcumulado,
  },
  {
    key: "classe",
    header: "Classe",
    align: "center",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CLASSE_BADGE[row.classe]}`}>
        {row.classe}
      </span>
    ),
    sortValue: (row) => row.classe,
  },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "—" : row.intervaloMedioDias),
    sortValue: (row) => row.intervaloMedioDias,
  },
]
```

(A constante `CLASSE_BADGE` já existe no arquivo — mantém como está.)

- [ ] **Step 5: Adicionar `sortValue` às colunas de `avaliacao-page.tsx`**

```tsx
const columns: ClientesTableColumn<ClienteAvaliacaoRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome, sortValue: (row) => row.nome },
  {
    key: "atividade",
    header: "Atividade",
    align: "center",
    render: (row) => <StarRating value={row.estrelasAtividade} />,
    sortValue: (row) => row.estrelasAtividade,
  },
  {
    key: "frequencia",
    header: "Frequência",
    align: "center",
    render: (row) => <StarRating value={row.estrelasFrequencia} />,
    sortValue: (row) => row.estrelasFrequencia,
  },
  {
    key: "ticket",
    header: "Ticket Médio",
    align: "center",
    render: (row) => <StarRating value={row.estrelasTicketMedio} />,
    sortValue: (row) => row.estrelasTicketMedio,
  },
  {
    key: "geral",
    header: "Nota Geral",
    align: "center",
    render: (row) => <StarRating value={row.notaGeral} />,
    sortValue: (row) => row.notaGeral,
  },
]
```

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: sucesso, sem erros de tipo.

- [ ] **Step 7: Verificação manual**

Run: `npm run dev`. Em cada uma das 4 telas (`/clientes/atividade`, `/clientes/frequencia`, `/clientes/curva-abc`, `/clientes/avaliacao`):
- Clicar no cabeçalho "Cliente" (ou outra coluna) e confirmar que ordena asc → desc → volta ao normal, com o ícone de seta mudando.
- Confirmar paginação: "Página 1 de N", botões Anterior/Próxima funcionam, "Anterior" desabilitado na página 1.
- Confirmar zebra striping visível, header fixo ao rolar a tabela, hover de linha.
- Mudar um filtro (Mercado/Canal/Fabricante) ou a busca e confirmar que a paginação volta pra página 1.

- [ ] **Step 8: Commit**

```bash
git add src/components/clientes/clientes-data-table.tsx src/pages/clientes/atividade-page.tsx src/pages/clientes/frequencia-page.tsx src/pages/clientes/curva-abc-page.tsx src/pages/clientes/avaliacao-page.tsx
git commit -m "feat: ordenacao por coluna, paginacao e polimento visual na tabela de Clientes"
```

---

### Task 3: Filtro de classe (A/B/C) na tela de Curva ABC

**Files:**
- Modify: `src/pages/clientes/curva-abc-page.tsx`

**Interfaces:**
- Consumes: `ClienteCurvaAbcRow["classe"]` (`"A" | "B" | "C"`, já existe em `src/lib/clientes/clientes-curva-abc.ts`, sem mudança), `useClientesCurvaAbc()` (já existe, retorna `rows` já filtrado por busca — este task adiciona um segundo filtro em cima, aplicado na própria página, sem tocar no hook).
- Produces: nenhuma interface nova para outras tasks — este é o último task do plano.

- [ ] **Step 1: Ler o arquivo atual e adicionar o estado e o filtro de classe**

Adicionar ao topo do componente `CurvaAbcPage` (mantendo tudo que já existe: import de `useClientesCurvaAbc`, `columns`, etc.):

```tsx
// src/pages/clientes/curva-abc-page.tsx
import { useState } from "react"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesCurvaAbc } from "@/hooks/clientes/use-clientes-curva-abc"
import { formatCurrencyBRL, formatPercentBR } from "@/lib/format"
import type { ClienteCurvaAbcRow } from "@/lib/clientes/clientes-curva-abc"

const CLASSE_BADGE: Record<ClienteCurvaAbcRow["classe"], string> = {
  A: "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  C: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

type ClasseFiltro = "todas" | ClienteCurvaAbcRow["classe"]

const CLASSE_OPTIONS: { value: ClasseFiltro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
]

// columns: mantém exatamente o array definido na Task 2, Step 4, sem mudança aqui.

export default function CurvaAbcPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesCurvaAbc()
  const [classeFiltro, setClasseFiltro] = useState<ClasseFiltro>("todas")

  const rowsFiltradas =
    classeFiltro === "todas" ? rows : rows.filter((row) => row.classe === classeFiltro)

  return (
    <AppShell title="Curva ABC" subtitle="Classificação de clientes por valor">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            Classe
          </span>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            {CLASSE_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setClasseFiltro(option.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  index > 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                } ${
                  classeFiltro === option.value
                    ? "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ClientesDataTable
          columns={columns}
          rows={rowsFiltradas}
          loading={loading}
          getRowKey={(row) => row.cnpj}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>
    </AppShell>
  )
}
```

O reset de paginação ao trocar de classe já é automático: `ClientesDataTable` reseta a página sempre que a prop `rows` muda de referência (Task 2), e `rowsFiltradas` é recalculada a cada render com uma nova referência de array.

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: sucesso, sem erros de tipo.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`, abrir `/clientes/curva-abc`. Clicar em "C" e confirmar que a tabela mostra só os ~3076 clientes classe C (várias páginas de 50). Clicar em "Todas" e confirmar que volta a mostrar tudo. Confirmar que trocar de classe volta pra página 1.

- [ ] **Step 4: Commit**

```bash
git add src/pages/clientes/curva-abc-page.tsx
git commit -m "feat: filtro de classe A/B/C na tela de Curva ABC"
```
