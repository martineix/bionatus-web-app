# Telas de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar 5 telas de análise de clientes (Atividade, Frequência, Curva ABC, Avaliação, Aberturas) agrupadas em um accordion "Clientes" no menu, mais uma página de parametrização "Avaliação de Clientes" dentro do accordion "Cadastros".

**Architecture:** Uma nova materialized view `mv_clientes_pedidos` (grão sistema+pedido, unificada por CNPJ) alimenta 5 novas RPCs `SECURITY DEFINER`, cada uma seguindo o padrão de restrição por representante já usado no dashboard (`_dashboard_rep_visible`). O frontend segue os padrões já existentes no projeto: `lib/<feature>.ts` (chamadas RPC + mapeamento), `hooks/<feature>/use-<feature>.ts` (estado), `pages/<feature>/<name>-page.tsx` (composição com `AppShell`). Sem migrations locais — todas as mudanças de schema vão direto ao Supabase via `apply_migration`.

**Tech Stack:** React 19 + TypeScript + Vite, react-router-dom v7, Tailwind v4, shadcn/radix components, Supabase (Postgres + RPC), recharts (gráfico de Aberturas), sonner (toasts). Sem framework de testes automatizados no projeto — verificação por `npm run build` (typecheck) e checagem manual no navegador (`npm run dev`).

## Global Constraints

- Sem migrations locais: toda mudança de schema/RPC é feita direto no Supabase remoto via `mcp__supabase__apply_migration` (nunca `execute_sql` para DDL).
- Toda tabela/RPC nova segue o padrão de RLS do projeto: `REVOKE ALL ... FROM PUBLIC, anon, authenticated;` seguido de `GRANT` explícito para `authenticated` nas RPCs (as tabelas base ficam sem grant direto — só as RPCs `SECURITY DEFINER` acessam).
- Unificação de cliente é por CNPJ (`cnpj`), nunca por `id_cliente` (que é por sistema).
- Métricas de Atividade, Frequência, Curva ABC e Avaliação são **sempre histórico de vida** (sem filtro de período/data) — só Aberturas usa um intervalo de datas.
- Devolução (Sankhya `tipmov='D'`) nunca conta como "pedido" nas contagens de qtd. de pedidos/ticket médio/última compra — identificada por `valor_pedido < 0` no grão de pedido agregado (ver Task 1). Ela **entra** na soma do valor total líquido (líquida a venda).
- Filtros de UI reaproveitados: Mercado, Canal (contas) e Fabricante (is_bionatus) — os mesmos do dashboard. Representante nunca é selecionado manualmente na UI hoje (idem dashboard atual) — a restrição é automática via `representante_contas`/`_dashboard_rep_visible` quando o usuário logado é `role='representante'`.
- Sem seletor de Ano/Mês nas 4 telas de histórico de vida (contradiz a semântica de "vida toda"). Só a tela de Aberturas tem um controle de período (padrão: últimos 12 meses).

---

### Task 1: Materialized view `mv_clientes_pedidos` + view `vw_clientes_nomes`

**Files:**
- Supabase migration (via `mcp__supabase__apply_migration`, nome: `create_mv_clientes_pedidos_and_view_nomes`)

**Interfaces:**
- Produces: `public.mv_clientes_pedidos` (colunas: `sistema int`, `pedido bigint`, `cnpj text`, `id_representante bigint`, `mercado int`, `contas int`, `is_bionatus int`, `data_pedido date`, `valor_pedido numeric`, `is_venda boolean`) e `public.vw_clientes_nomes` (colunas: `cnpj text`, `nome text`). Ambas usadas por todas as RPCs das Tasks 3, 4, 6, 7, 8.

- [ ] **Step 1: Verificar que `vw_pedidos_v2` não expõe `tipmov`/`sinal` diretamente**

Já confirmado por investigação: `vw_pedidos_v2` soma `vlrtot * sinal` em `vlr_total`, onde `sinal = -1` para devolução Sankhya (`tipmov='D'`) e `sinal = 1` em qualquer outro caso (Nexus não tem conceito de devolução). Isso significa que **todos os itens de um mesmo pedido de devolução têm `vlr_total`/`und_total` negativos** — então basta somar `vlr_total` por `(sistema, pedido)` e checar o sinal do total para saber se é devolução, sem precisar voltar a `sankhya_cabecalhos`.

- [ ] **Step 2: Criar a materialized view `mv_clientes_pedidos`**

```sql
create materialized view public.mv_clientes_pedidos as
select
    v.sistema,
    v.pedido,
    v.cnpj,
    max(v.id_representante) as id_representante,
    max(v.mercado) as mercado,
    max(v.contas) as contas,
    max(v.is_bionatus) as is_bionatus,
    max(v.data_cadastro_pedido) as data_pedido,
    sum(v.vlr_total) as valor_pedido,
    (sum(v.vlr_total) >= 0) as is_venda
from public.vw_pedidos_v2 v
left join public.removals r
    on r.pedido = v.pedido and r.sistema = v.sistema
where r.id is null
group by v.sistema, v.pedido, v.cnpj;

create unique index idx_mv_clientes_pedidos_pk
    on public.mv_clientes_pedidos (sistema, pedido);

create index idx_mv_clientes_pedidos_cnpj
    on public.mv_clientes_pedidos (cnpj);

create index idx_mv_clientes_pedidos_filtros
    on public.mv_clientes_pedidos (mercado, contas, is_bionatus, id_representante);

revoke all on public.mv_clientes_pedidos from public, anon, authenticated;
```

- [ ] **Step 3: Criar a view `vw_clientes_nomes` (resolução de nome por CNPJ, unificando Sankhya e Nexus)**

```sql
create or replace view public.vw_clientes_nomes as
with candidatos as (
    select
        cpf_cnpj as cnpj,
        coalesce(razao, parceiro) as nome,
        dtalter as atualizado_em,
        1 as prioridade
    from public.sankhya_parceiros
    where cpf_cnpj is not null and cpf_cnpj <> ''

    union all

    select
        pescpfcnp as cnpj,
        coalesce(pesrzs, pesnomfan) as nome,
        pestms as atualizado_em,
        2 as prioridade
    from public.nexus_pessoas
    where pescpfcnp is not null and pescpfcnp <> ''
)
select cnpj, nome
from (
    select
        cnpj,
        nome,
        row_number() over (
            partition by cnpj
            order by prioridade, atualizado_em desc nulls last
        ) as rn
    from candidatos
) x
where rn = 1;

revoke all on public.vw_clientes_nomes from public, anon, authenticated;
```

Sankhya tem prioridade sobre Nexus quando o mesmo CNPJ existe nos dois (mais registros/mais atualizado historicamente neste projeto).

- [ ] **Step 4: Rodar a migration via `mcp__supabase__apply_migration`**

Nome da migration: `create_mv_clientes_pedidos_and_view_nomes`. Conteúdo: os três blocos SQL dos Steps 2 e 3, na ordem.

- [ ] **Step 5: Validar manualmente com `mcp__supabase__execute_sql`**

```sql
select count(*) from public.mv_clientes_pedidos;
select count(*) from public.vw_clientes_nomes;

-- checar o caso já investigado nesta sessão (pedido 288233 / devolução 290001)
select sistema, pedido, cnpj, valor_pedido, is_venda
from public.mv_clientes_pedidos
where pedido in (288233, 290001);
```

Esperado: 2 linhas, a primeira (288233) com `valor_pedido` positivo e `is_venda = true`, a segunda (290001) com `valor_pedido` negativo e `is_venda = false`.

- [ ] **Step 6: Anotar o refresh no n8n**

Adicionar `REFRESH MATERIALIZED VIEW public.mv_clientes_pedidos;` ao workflow n8n existente que já refresca `mv_dashboard_clientes_diario`/`mv_dashboard_kpis_diario` (mesmo node de "Atualiza MVs" ou equivalente). Isso é uma edição manual no n8n (fora do escopo de código) — deixar anotado como pendência para quem for revisar o n8n, e rodar `refresh materialized view public.mv_clientes_pedidos;` manualmente via `execute_sql` uma vez agora para os dados existirem antes das próximas tasks.

---

### Task 2: Scaffold de frontend — accordion "Clientes", rotas, filtros e tabela compartilhados

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/App.tsx`
- Create: `src/lib/clientes/clientes-filters-types.ts`
- Create: `src/hooks/clientes/use-clientes-filters.ts`
- Create: `src/lib/clientes/clientes-rpc-helpers.ts`
- Create: `src/components/clientes/clientes-filters.tsx`
- Create: `src/components/clientes/clientes-data-table.tsx`
- Create: `src/pages/clientes/atividade-page.tsx` (placeholder, populado na Task 3)
- Create: `src/pages/clientes/frequencia-page.tsx` (placeholder, populado na Task 4)
- Create: `src/pages/clientes/curva-abc-page.tsx` (placeholder, populado na Task 6)
- Create: `src/pages/clientes/avaliacao-page.tsx` (placeholder, populado na Task 7)
- Create: `src/pages/clientes/aberturas-page.tsx` (placeholder, populado na Task 8)
- Delete: `src/pages/clientes/clientes-page.tsx`

**Interfaces:**
- Produces: `ClientesFiltersInput` type, `useClientesFilters()` hook (`{ filters, setFilters }`), `buildClientesRpcFilters(filters): { p_id_representante, p_mercado, p_contas, p_is_bionatus }`, `<ClientesFilters filters onChange />` component, `<ClientesDataTable columns rows loading getRowKey searchTerm onSearchTermChange />` generic component (genérico em `T`, usado pelas Tasks 3/4/6/7). Rotas `/clientes/atividade`, `/clientes/frequencia`, `/clientes/curva-abc`, `/clientes/avaliacao`, `/clientes/aberturas`.

- [ ] **Step 1: Criar os tipos de filtro**

```ts
// src/lib/clientes/clientes-filters-types.ts
export type ClientesFiltersInput = {
  mercado: number | null
  contas: number[]
  isBionatus: 0 | 1 | null
}
```

- [ ] **Step 2: Criar o hook de filtros (com persistência em localStorage)**

```ts
// src/hooks/clientes/use-clientes-filters.ts
import { useEffect, useState } from "react"
import type { ClientesFiltersInput } from "@/lib/clientes/clientes-filters-types"

const STORAGE_KEY = "clientes-filters"

const defaultFilters: ClientesFiltersInput = {
  mercado: null,
  contas: [],
  isBionatus: null,
}

function getInitialFilters(): ClientesFiltersInput {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return defaultFilters

  try {
    const parsed = JSON.parse(saved)
    return {
      mercado: typeof parsed.mercado === "number" ? parsed.mercado : null,
      contas: Array.isArray(parsed.contas) ? parsed.contas : [],
      isBionatus: parsed.isBionatus === 0 || parsed.isBionatus === 1 ? parsed.isBionatus : null,
    }
  } catch {
    return defaultFilters
  }
}

export function useClientesFilters() {
  const [filters, setFilters] = useState<ClientesFiltersInput>(getInitialFilters)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  return { filters, setFilters }
}
```

- [ ] **Step 3: Criar os helpers de conversão para as RPCs**

```ts
// src/lib/clientes/clientes-rpc-helpers.ts
import type { ClientesFiltersInput } from "./clientes-filters-types"

export function buildClientesRpcFilters(filters: ClientesFiltersInput) {
  return {
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
```

- [ ] **Step 4: Criar o componente de filtros compartilhado**

```tsx
// src/components/clientes/clientes-filters.tsx
import { useMemo } from "react"
import { ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { channelOptions } from "@/lib/dashboard/dashboard-constants"
import type { ClientesFiltersInput } from "@/lib/clientes/clientes-filters-types"

type ClientesFiltersProps = {
  filters: ClientesFiltersInput
  onChange: (filters: ClientesFiltersInput) => void
}

const controlClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"

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

  return (
    <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Filter className="h-4 w-4" />
          Filtros
        </div>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
              Mercado
            </label>
            <select
              value={filters.mercado === null ? "" : String(filters.mercado)}
              onChange={(e) => updateFilter("mercado", e.target.value === "" ? null : Number(e.target.value))}
              className={controlClass}
            >
              <option value="">Todos</option>
              <option value="1">Marcas + Licitações</option>
              <option value="2">Farma</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
              Canal
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={`${controlClass} justify-between font-normal`}>
                  <span className="truncate text-left">{contasLabel}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(92vw,320px)] rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="space-y-1.5">
                  {channelOptions.map((option) => {
                    const checked = filters.contas.includes(option.value)
                    return (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleConta(option.value)} />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
              Fabricante
            </label>
            <select
              value={filters.isBionatus === null ? "" : String(filters.isBionatus)}
              onChange={(e) =>
                updateFilter(
                  "isBionatus",
                  e.target.value === "" ? null : (Number(e.target.value) as 0 | 1)
                )
              }
              className={controlClass}
            >
              <option value="">Todos</option>
              <option value="1">Bionatus</option>
              <option value="0">Terceiros</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Criar a tabela genérica compartilhada**

```tsx
// src/components/clientes/clientes-data-table.tsx
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export type ClientesTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: "left" | "right" | "center"
}

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

function alignClass(align: ClientesTableColumn<unknown>["align"]) {
  if (align === "right") return "text-right"
  if (align === "center") return "text-center"
  return "text-left"
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 ${alignClass(col.align)}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={getRowKey(row)} className="border-b border-slate-100 dark:border-slate-900">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-3 text-slate-700 dark:text-slate-200 ${alignClass(col.align)}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Criar as 5 páginas placeholder**

```tsx
// src/pages/clientes/atividade-page.tsx
import AppShell from "@/components/layout/app-shell"

export default function AtividadePage() {
  return (
    <AppShell title="Atividade de Clientes" subtitle="Recência e histórico de compras por cliente">
      <p className="text-sm text-slate-500 dark:text-slate-400">Em construção.</p>
    </AppShell>
  )
}
```

Repetir o mesmo padrão para os outros 4 arquivos, trocando título/subtítulo:
- `frequencia-page.tsx` → `FrequenciaPage`, título "Frequência de Compra", subtítulo "Intervalo médio entre compras e previsão da próxima"
- `curva-abc-page.tsx` → `CurvaAbcPage`, título "Curva ABC", subtítulo "Classificação de clientes por valor"
- `avaliacao-page.tsx` → `AvaliacaoPage`, título "Avaliação de Clientes", subtítulo "Notas por atividade, frequência e ticket médio"
- `aberturas-page.tsx` → `AberturasPage`, título "Aberturas de Clientes", subtítulo "Novos clientes por mês (primeira compra)"

- [ ] **Step 7: Apagar a página antiga vazia**

```bash
rm "src/pages/clientes/clientes-page.tsx"
```

- [ ] **Step 8: Atualizar as rotas em `App.tsx`**

Substituir o import e a rota únicos de `ClientesPage` pelas 5 novas rotas:

```tsx
// src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/auth/login-page"
import DashboardPage from "@/pages/dashboard/dashboard-page"
import AtividadePage from "@/pages/clientes/atividade-page"
import FrequenciaPage from "@/pages/clientes/frequencia-page"
import CurvaAbcPage from "@/pages/clientes/curva-abc-page"
import AvaliacaoPage from "@/pages/clientes/avaliacao-page"
import AberturasPage from "@/pages/clientes/aberturas-page"
import ProdutosPage from "@/pages/produtos/produtos-page"
import RemocoesPage from "@/pages/remocoes/remocoes-page"
import PermissoesPage from "@/pages/permissoes/permissoes-page"
import ProtectedRoute from "@/routes/protected-route"
import RoleProtectedRoute from "@/routes/role-protected-route"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/atividade"
        element={
          <ProtectedRoute>
            <AtividadePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/frequencia"
        element={
          <ProtectedRoute>
            <FrequenciaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/curva-abc"
        element={
          <ProtectedRoute>
            <CurvaAbcPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/avaliacao"
        element={
          <ProtectedRoute>
            <AvaliacaoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/aberturas"
        element={
          <ProtectedRoute>
            <AberturasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <ProdutosPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/remocoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute featureKey="remocoes">
              <RemocoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/permissoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute>
              <PermissoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
```

(A rota `/cadastros/avaliacao-clientes` da Task 5 será adicionada nesse mesmo arquivo naquela task.)

- [ ] **Step 9: Transformar o item "Clientes" do menu em accordion**

Substituir todo o conteúdo de `src/components/layout/sidebar.tsx` por:

```tsx
import { useState, type RefObject } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Users,
  Activity,
  Repeat2,
  PieChart,
  Star,
  CalendarPlus,
  Ban,
  ShieldCheck,
  FolderCog,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  asideRef?: RefObject<HTMLElement | null>
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  hideRemocoes?: boolean
  hideAdminItems?: boolean
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const topNavItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
]

const clientesNavItems: NavItem[] = [
  { to: "/clientes/atividade", label: "Atividade", icon: Activity },
  { to: "/clientes/frequencia", label: "Frequência", icon: Repeat2 },
  { to: "/clientes/curva-abc", label: "Curva ABC", icon: PieChart },
  { to: "/clientes/avaliacao", label: "Avaliação", icon: Star },
  { to: "/clientes/aberturas", label: "Aberturas", icon: CalendarPlus },
]

const CLIENTES_PATHS = new Set(clientesNavItems.map((item) => item.to))

const produtosNavItems: NavItem[] = [
  {
    to: "/produtos",
    label: "Produtos",
    icon: Package,
  },
]

const cadastrosNavItems: NavItem[] = [
  {
    to: "/remocoes",
    label: "Remoções",
    icon: Ban,
  },
  {
    to: "/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
  },
  {
    to: "/cadastros/avaliacao-clientes",
    label: "Avaliação de Clientes",
    icon: Star,
  },
]

const CADASTROS_PATHS = new Set(cadastrosNavItems.map((item) => item.to))

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  asideRef,
  closeButtonRef,
  hideRemocoes = false,
  hideAdminItems = false,
}: SidebarProps) {
  const location = useLocation()
  const [cadastrosOpen, setCadastrosOpen] = useState(() =>
    CADASTROS_PATHS.has(location.pathname)
  )
  const [clientesOpen, setClientesOpen] = useState(() =>
    CLIENTES_PATHS.has(location.pathname)
  )

  const showLabels = mobileOpen || !collapsed

  const visibleCadastrosItems = cadastrosNavItems.filter((item) => {
    if (item.to === "/remocoes" && hideRemocoes) return false
    if (item.to === "/permissoes" && hideAdminItems) return false
    if (item.to === "/cadastros/avaliacao-clientes" && hideAdminItems) return false
    return true
  })

  function renderNavItem(item: NavItem, indent = false) {
    const Icon = item.icon

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        aria-label={!showLabels ? item.label : undefined}
        className={({ isActive }) =>
          `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${showLabels ? "gap-3" : "lg:justify-center"
          } ${indent && showLabels ? "ml-4" : ""} ${isActive
            ? "bg-[#D0D9D6] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          }`
        }
        title={!showLabels ? item.label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {showLabels && <span>{item.label}</span>}
      </NavLink>
    )
  }

  function renderAccordion(
    label: string,
    icon: LucideIcon,
    items: NavItem[],
    open: boolean,
    setOpen: (value: boolean) => void
  ) {
    if (items.length === 0) return null

    const Icon = icon

    if (!showLabels) {
      return items.map((item) => renderNavItem(item))
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{label}</span>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>

        {open && (
          <div className="mt-2 space-y-2">
            {items.map((item) => renderNavItem(item, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        ref={asideRef}
        id="mobile-sidebar"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white p-4 transition-[width,transform] duration-300 dark:border-slate-800 dark:bg-slate-950
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-72 lg:translate-x-0
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          {showLabels && (
            <div>
              <h2 className="text-xl font-bold text-[#006426] dark:text-[#7DD3A2]">
                Bionatus
              </h2>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              ref={closeButtonRef}
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="space-y-2" aria-label="Navegação principal">
          {topNavItems.map((item) => renderNavItem(item))}

          {renderAccordion("Clientes", Users, clientesNavItems, clientesOpen, setClientesOpen)}

          {produtosNavItems.map((item) => renderNavItem(item))}

          {renderAccordion("Cadastros", FolderCog, visibleCadastrosItems, cadastrosOpen, setCadastrosOpen)}
        </nav>
      </aside>
    </>
  )
}
```

- [ ] **Step 10: Rodar o typecheck**

Run: `npm run build`
Expected: sucesso (sem erros de tipo/import). Os placeholders compilam porque só usam `AppShell`.

- [ ] **Step 11: Verificar visualmente**

Run: `npm run dev`, abrir o navegador, logar, confirmar que o menu mostra o accordion "Clientes" com os 5 sub-itens, que cada rota abre a página placeholder correspondente, e que o accordion "Cadastros" ganhou o item "Avaliação de Clientes" (vai dar 404/tela branca até a Task 5 criar a rota — aceitável neste ponto, é só para confirmar o menu).

- [ ] **Step 12: Commit**

```bash
git add src/components/layout/sidebar.tsx src/App.tsx src/lib/clientes src/hooks/clientes src/components/clientes src/pages/clientes
git commit -m "feat: scaffold do accordion Clientes (menu, rotas, filtros e tabela compartilhados)"
```

---

### Task 3: Tela de Atividade

**Files:**
- Supabase migration (nome: `create_rpc_get_clientes_atividade`)
- Create: `src/lib/clientes/clientes-atividade.ts`
- Create: `src/hooks/clientes/use-clientes-atividade.ts`
- Modify: `src/pages/clientes/atividade-page.tsx`

**Interfaces:**
- Consumes: `ClientesFiltersInput`, `useClientesFilters()`, `buildClientesRpcFilters()`, `<ClientesFilters />`, `<ClientesDataTable />`, `toNumber`/`toNullableNumber` de `src/lib/clientes/clientes-rpc-helpers.ts` (Task 2); `public.mv_clientes_pedidos`, `public.vw_clientes_nomes`, `public._dashboard_rep_visible` (Task 1, já existente).
- Produces: RPC `get_clientes_atividade`; `getClientesAtividade(filters): Promise<ClienteAtividadeRow[]>` em `clientes-atividade.ts`; hook `useClientesAtividade()` retornando `{ rows, loading, searchTerm, setSearchTerm, filters, setFilters }`.

- [ ] **Step 1: Criar a RPC `get_clientes_atividade`**

```sql
create or replace function public.get_clientes_atividade(
    p_id_representante bigint default null,
    p_mercado integer default null,
    p_contas integer[] default null,
    p_is_bionatus integer default null
)
returns table(
    cnpj text,
    nome text,
    dias_desde_ultima_compra integer,
    data_ultima_compra date,
    valor_ultima_compra numeric,
    valor_total_liquido numeric,
    qtd_pedidos bigint,
    ticket_medio numeric
)
language sql stable security definer
set search_path to 'public'
as $function$
    with base as (
        select m.cnpj, m.data_pedido, m.valor_pedido, m.is_venda
        from public.mv_clientes_pedidos m
        where public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    vendas_ranqueadas as (
        select cnpj, data_pedido, valor_pedido,
               row_number() over (partition by cnpj order by data_pedido desc) as rn
        from base
        where is_venda
    ),
    agregado as (
        select
            cnpj,
            sum(valor_pedido) as valor_total_liquido,
            count(*) filter (where is_venda) as qtd_pedidos
        from base
        group by cnpj
    )
    select
        a.cnpj,
        n.nome,
        (current_date - v.data_pedido)::integer as dias_desde_ultima_compra,
        v.data_pedido as data_ultima_compra,
        v.valor_pedido as valor_ultima_compra,
        a.valor_total_liquido,
        a.qtd_pedidos,
        case when a.qtd_pedidos = 0 then null else round(a.valor_total_liquido / a.qtd_pedidos, 2) end as ticket_medio
    from agregado a
    left join vendas_ranqueadas v on v.cnpj = a.cnpj and v.rn = 1
    left join public.vw_clientes_nomes n on n.cnpj = a.cnpj
    order by dias_desde_ultima_compra nulls last;
$function$;

revoke all on function public.get_clientes_atividade(bigint, integer, integer[], integer) from public;
grant execute on function public.get_clientes_atividade(bigint, integer, integer[], integer) to authenticated;
```

- [ ] **Step 2: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_rpc_get_clientes_atividade`.

- [ ] **Step 3: Validar manualmente**

Run via `mcp__supabase__execute_sql`: `select * from public.get_clientes_atividade() order by dias_desde_ultima_compra limit 20;`
Expected: linhas com `dias_desde_ultima_compra` crescente, sem `qtd_pedidos` inflado por devoluções (comparar um CNPJ conhecido do caso do pedido 288233/290001 investigado nesta sessão: `qtd_pedidos` deve contar só a venda, não a devolução).

- [ ] **Step 4: Criar o lib file**

```ts
// src/lib/clientes/clientes-atividade.ts
import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAtividadeRow = {
  cnpj: string
  nome: string
  diasDesdeUltimaCompra: number | null
  dataUltimaCompra: string | null
  valorUltimaCompra: number | null
  valorTotalLiquido: number
  qtdPedidos: number
  ticketMedio: number | null
}

type ClienteAtividadeRowRaw = {
  cnpj: string
  nome: string | null
  dias_desde_ultima_compra: number | string | null
  data_ultima_compra: string | null
  valor_ultima_compra: number | string | null
  valor_total_liquido: number | string
  qtd_pedidos: number | string
  ticket_medio: number | string | null
}

function mapRow(row: ClienteAtividadeRowRaw): ClienteAtividadeRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    diasDesdeUltimaCompra: toNullableNumber(row.dias_desde_ultima_compra),
    dataUltimaCompra: row.data_ultima_compra,
    valorUltimaCompra: toNullableNumber(row.valor_ultima_compra),
    valorTotalLiquido: toNumber(row.valor_total_liquido),
    qtdPedidos: toNumber(row.qtd_pedidos),
    ticketMedio: toNullableNumber(row.ticket_medio),
  }
}

export async function getClientesAtividade(
  filters: ClientesFiltersInput
): Promise<ClienteAtividadeRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_atividade",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteAtividadeRowRaw[]).map(mapRow)
}
```

- [ ] **Step 5: Criar o hook**

```ts
// src/hooks/clientes/use-clientes-atividade.ts
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAtividade, type ClienteAtividadeRow } from "@/lib/clientes/clientes-atividade"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesAtividade() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteAtividadeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAtividade(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-atividade", error)
        toast.error("Não foi possível carregar a atividade dos clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters])

  const filteredRows = rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return row.nome.toLowerCase().includes(term) || row.cnpj.includes(term)
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
```

- [ ] **Step 6: Popular a página**

```tsx
// src/pages/clientes/atividade-page.tsx
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesAtividade } from "@/hooks/clientes/use-clientes-atividade"
import { formatCurrencyBRL } from "@/lib/format"
import type { ClienteAtividadeRow } from "@/lib/clientes/clientes-atividade"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

const columns: ClientesTableColumn<ClienteAtividadeRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome },
  {
    key: "dias",
    header: "Dias sem comprar",
    align: "right",
    render: (row) => (row.diasDesdeUltimaCompra === null ? "—" : row.diasDesdeUltimaCompra),
  },
  {
    key: "data_ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
  },
  {
    key: "valor_ultima",
    header: "Valor última compra",
    align: "right",
    render: (row) => (row.valorUltimaCompra === null ? "—" : formatCurrencyBRL(row.valorUltimaCompra)),
  },
  {
    key: "total",
    header: "Total comprado (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
  },
  { key: "qtd", header: "Qtd. pedidos", align: "right", render: (row) => row.qtdPedidos },
  {
    key: "ticket",
    header: "Ticket médio",
    align: "right",
    render: (row) => (row.ticketMedio === null ? "—" : formatCurrencyBRL(row.ticketMedio)),
  },
]

export default function AtividadePage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesAtividade()

  return (
    <AppShell title="Atividade de Clientes" subtitle="Recência e histórico de compras por cliente">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <ClientesDataTable
          columns={columns}
          rows={rows}
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

- [ ] **Step 7: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, abrir `/clientes/atividade`, confirmar que a tabela carrega, os filtros funcionam (mudar Mercado/Canal/Fabricante e ver a tabela recarregar) e a busca filtra por nome/CNPJ.

- [ ] **Step 8: Commit**

```bash
git add src/lib/clientes/clientes-atividade.ts src/hooks/clientes/use-clientes-atividade.ts src/pages/clientes/atividade-page.tsx
git commit -m "feat: tela de Atividade de Clientes"
```

---

### Task 4: Tela de Frequência

**Files:**
- Supabase migration (nome: `create_rpc_get_clientes_frequencia`)
- Create: `src/lib/clientes/clientes-frequencia.ts`
- Create: `src/hooks/clientes/use-clientes-frequencia.ts`
- Modify: `src/pages/clientes/frequencia-page.tsx`

**Interfaces:**
- Consumes: mesmo conjunto compartilhado da Task 3 (`ClientesFilters`, `ClientesDataTable`, `useClientesFilters`, `buildClientesRpcFilters`, `mv_clientes_pedidos`, `vw_clientes_nomes`).
- Produces: RPC `get_clientes_frequencia`; `getClientesFrequencia(filters): Promise<ClienteFrequenciaRow[]>`; hook `useClientesFrequencia()`.

- [ ] **Step 1: Criar a RPC `get_clientes_frequencia`**

```sql
create or replace function public.get_clientes_frequencia(
    p_id_representante bigint default null,
    p_mercado integer default null,
    p_contas integer[] default null,
    p_is_bionatus integer default null
)
returns table(
    cnpj text,
    nome text,
    qtd_pedidos bigint,
    intervalo_medio_dias numeric,
    data_ultima_compra date,
    previsao_proxima_compra date
)
language sql stable security definer
set search_path to 'public'
as $function$
    with base as (
        select m.cnpj, m.data_pedido
        from public.mv_clientes_pedidos m
        where m.is_venda
          and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    intervalos as (
        select
            cnpj,
            data_pedido,
            data_pedido - lag(data_pedido) over (partition by cnpj order by data_pedido) as intervalo_dias
        from base
    ),
    agregado as (
        select
            cnpj,
            count(*) as qtd_pedidos,
            avg(intervalo_dias) as intervalo_medio_dias,
            max(data_pedido) as data_ultima_compra
        from intervalos
        group by cnpj
    )
    select
        a.cnpj,
        n.nome,
        a.qtd_pedidos,
        round(a.intervalo_medio_dias, 1) as intervalo_medio_dias,
        a.data_ultima_compra,
        case
            when a.intervalo_medio_dias is null then null
            else (a.data_ultima_compra + a.intervalo_medio_dias)::date
        end as previsao_proxima_compra
    from agregado a
    left join public.vw_clientes_nomes n on n.cnpj = a.cnpj
    order by a.cnpj;
$function$;

revoke all on function public.get_clientes_frequencia(bigint, integer, integer[], integer) from public, anon;
grant execute on function public.get_clientes_frequencia(bigint, integer, integer[], integer) to authenticated;
```

- [ ] **Step 2: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_rpc_get_clientes_frequencia`.

- [ ] **Step 3: Validar manualmente**

Run via `mcp__supabase__execute_sql`: `select * from public.get_clientes_frequencia() where qtd_pedidos = 1 limit 5;`
Expected: `intervalo_medio_dias` e `previsao_proxima_compra` nulos para clientes com só 1 pedido de venda (histórico insuficiente).

- [ ] **Step 4: Criar o lib file**

```ts
// src/lib/clientes/clientes-frequencia.ts
import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteFrequenciaRow = {
  cnpj: string
  nome: string
  qtdPedidos: number
  intervaloMedioDias: number | null
  dataUltimaCompra: string | null
  previsaoProximaCompra: string | null
}

type ClienteFrequenciaRowRaw = {
  cnpj: string
  nome: string | null
  qtd_pedidos: number | string
  intervalo_medio_dias: number | string | null
  data_ultima_compra: string | null
  previsao_proxima_compra: string | null
}

function mapRow(row: ClienteFrequenciaRowRaw): ClienteFrequenciaRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    qtdPedidos: toNumber(row.qtd_pedidos),
    intervaloMedioDias: toNullableNumber(row.intervalo_medio_dias),
    dataUltimaCompra: row.data_ultima_compra,
    previsaoProximaCompra: row.previsao_proxima_compra,
  }
}

export async function getClientesFrequencia(
  filters: ClientesFiltersInput
): Promise<ClienteFrequenciaRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_frequencia",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteFrequenciaRowRaw[]).map(mapRow)
}
```

- [ ] **Step 5: Criar o hook**

```ts
// src/hooks/clientes/use-clientes-frequencia.ts
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesFrequencia, type ClienteFrequenciaRow } from "@/lib/clientes/clientes-frequencia"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesFrequencia() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteFrequenciaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesFrequencia(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-frequencia", error)
        toast.error("Não foi possível carregar a frequência dos clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters])

  const filteredRows = rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return row.nome.toLowerCase().includes(term) || row.cnpj.includes(term)
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
```

- [ ] **Step 6: Popular a página**

```tsx
// src/pages/clientes/frequencia-page.tsx
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesFrequencia } from "@/hooks/clientes/use-clientes-frequencia"
import type { ClienteFrequenciaRow } from "@/lib/clientes/clientes-frequencia"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

const columns: ClientesTableColumn<ClienteFrequenciaRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "Sem histórico suficiente" : row.intervaloMedioDias),
  },
  {
    key: "ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
  },
  {
    key: "previsao",
    header: "Previsão próxima compra",
    align: "right",
    render: (row) => (row.previsaoProximaCompra === null ? "—" : formatDateBR(row.previsaoProximaCompra)),
  },
]

export default function FrequenciaPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesFrequencia()

  return (
    <AppShell title="Frequência de Compra" subtitle="Intervalo médio entre compras e previsão da próxima">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <ClientesDataTable
          columns={columns}
          rows={rows}
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

- [ ] **Step 7: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, abrir `/clientes/frequencia`, confirmar dados e que clientes com 1 pedido mostram "Sem histórico suficiente".

- [ ] **Step 8: Commit**

```bash
git add src/lib/clientes/clientes-frequencia.ts src/hooks/clientes/use-clientes-frequencia.ts src/pages/clientes/frequencia-page.tsx
git commit -m "feat: tela de Frequência de Compra"
```

---

### Task 5: Parametrização (Cadastros → Avaliação de Clientes)

**Files:**
- Supabase migration (nome: `create_parametros_avaliacao_e_abc`)
- Create: `src/lib/parametros-avaliacao.ts`
- Create: `src/pages/cadastros/avaliacao-clientes-page.tsx`
- Modify: `src/App.tsx` (adicionar rota `/cadastros/avaliacao-clientes`)

**Interfaces:**
- Produces: tabelas `public.parametros_avaliacao_faixas`, `public.parametros_avaliacao_pesos`, `public.parametros_curva_abc` (com dados default); RPCs `list_parametros_avaliacao_faixas()`, `update_parametro_avaliacao_faixa(p_criterio, p_estrela, p_min_valor, p_max_valor)`, `list_parametros_avaliacao_pesos()`, `update_parametro_avaliacao_peso(p_criterio, p_peso_percentual)`, `list_parametros_curva_abc()`, `update_parametro_curva_abc(p_classe, p_percentual)`. Consumidas pela Task 6 (Curva ABC) e Task 7 (Avaliação).

- [ ] **Step 1: Criar as tabelas de parametrização com dados default**

```sql
create table public.parametros_avaliacao_faixas (
    criterio text not null check (criterio in ('atividade', 'frequencia', 'ticket_medio')),
    estrela integer not null check (estrela between 1 and 5),
    min_valor numeric not null,
    max_valor numeric not null,
    primary key (criterio, estrela)
);

insert into public.parametros_avaliacao_faixas (criterio, estrela, min_valor, max_valor) values
    ('atividade', 5, 0, 15),
    ('atividade', 4, 16, 30),
    ('atividade', 3, 31, 60),
    ('atividade', 2, 61, 120),
    ('atividade', 1, 121, 999999),
    ('frequencia', 5, 0, 15),
    ('frequencia', 4, 16, 30),
    ('frequencia', 3, 31, 60),
    ('frequencia', 2, 61, 120),
    ('frequencia', 1, 121, 999999),
    ('ticket_medio', 1, 0, 99.99),
    ('ticket_medio', 2, 100, 299.99),
    ('ticket_medio', 3, 300, 699.99),
    ('ticket_medio', 4, 700, 1499.99),
    ('ticket_medio', 5, 1500, 999999999);

create table public.parametros_avaliacao_pesos (
    criterio text primary key check (criterio in ('atividade', 'frequencia', 'ticket_medio')),
    peso_percentual numeric not null check (peso_percentual >= 0 and peso_percentual <= 100)
);

insert into public.parametros_avaliacao_pesos (criterio, peso_percentual) values
    ('atividade', 40),
    ('frequencia', 35),
    ('ticket_medio', 25);

create table public.parametros_curva_abc (
    classe text primary key check (classe in ('A', 'B', 'C')),
    percentual numeric not null check (percentual >= 0 and percentual <= 100)
);

insert into public.parametros_curva_abc (classe, percentual) values
    ('A', 80),
    ('B', 15),
    ('C', 5);

revoke all on public.parametros_avaliacao_faixas from public, anon, authenticated;
revoke all on public.parametros_avaliacao_pesos from public, anon, authenticated;
revoke all on public.parametros_curva_abc from public, anon, authenticated;
```

- [ ] **Step 2: Criar as RPCs de leitura e escrita (bloqueadas para `role='representante'`, mesmo padrão de `list_role_permissions`/`update_role_permission`)**

```sql
create or replace function public.list_parametros_avaliacao_faixas()
returns table(criterio text, estrela integer, min_valor numeric, max_valor numeric)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  return query
  select f.criterio, f.estrela, f.min_valor, f.max_valor
  from public.parametros_avaliacao_faixas f
  order by f.criterio, f.estrela desc;
end;
$function$;

create or replace function public.update_parametro_avaliacao_faixa(
    p_criterio text,
    p_estrela integer,
    p_min_valor numeric,
    p_max_valor numeric
)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  if p_min_valor > p_max_valor then
    raise exception 'O valor mínimo não pode ser maior que o máximo.';
  end if;

  update public.parametros_avaliacao_faixas
  set min_valor = p_min_valor, max_valor = p_max_valor
  where criterio = p_criterio and estrela = p_estrela;
end;
$function$;

create or replace function public.list_parametros_avaliacao_pesos()
returns table(criterio text, peso_percentual numeric)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  return query
  select p.criterio, p.peso_percentual
  from public.parametros_avaliacao_pesos p
  order by p.criterio;
end;
$function$;

create or replace function public.update_parametro_avaliacao_peso(
    p_criterio text,
    p_peso_percentual numeric
)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  update public.parametros_avaliacao_pesos
  set peso_percentual = p_peso_percentual
  where criterio = p_criterio;
end;
$function$;

create or replace function public.list_parametros_curva_abc()
returns table(classe text, percentual numeric)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  return query
  select a.classe, a.percentual
  from public.parametros_curva_abc a
  order by a.classe;
end;
$function$;

create or replace function public.update_parametro_curva_abc(
    p_classe text,
    p_percentual numeric
)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if (select prof.role from public.profiles prof where prof.id = auth.uid()) = 'representante' then
    raise exception 'Acesso não permitido para este perfil.';
  end if;

  update public.parametros_curva_abc
  set percentual = p_percentual
  where classe = p_classe;
end;
$function$;

revoke all on function public.list_parametros_avaliacao_faixas() from public, anon;
revoke all on function public.update_parametro_avaliacao_faixa(text, integer, numeric, numeric) from public, anon;
revoke all on function public.list_parametros_avaliacao_pesos() from public, anon;
revoke all on function public.update_parametro_avaliacao_peso(text, numeric) from public, anon;
revoke all on function public.list_parametros_curva_abc() from public, anon;
revoke all on function public.update_parametro_curva_abc(text, numeric) from public, anon;

grant execute on function public.list_parametros_avaliacao_faixas() to authenticated;
grant execute on function public.update_parametro_avaliacao_faixa(text, integer, numeric, numeric) to authenticated;
grant execute on function public.list_parametros_avaliacao_pesos() to authenticated;
grant execute on function public.update_parametro_avaliacao_peso(text, numeric) to authenticated;
grant execute on function public.list_parametros_curva_abc() to authenticated;
grant execute on function public.update_parametro_curva_abc(text, numeric) to authenticated;
```

Nota: RPCs de leitura também bloqueadas para `representante` — a página de Cadastros inteira já é bloqueada no frontend por `RoleProtectedRoute` sem `featureKey` (Task 5, Step 5), mas a checagem no banco garante que não dá para contornar chamando a RPC direto.

- [ ] **Step 3: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_parametros_avaliacao_e_abc`. Conteúdo: Steps 1 e 2 juntos.

- [ ] **Step 4: Validar manualmente**

Run via `mcp__supabase__execute_sql` (como usuário admin, isto é rodado com a service role da ferramenta, então o bloqueio de `representante` não se aplica aqui — só testa se as tabelas/RPCs existem e retornam os defaults):
```sql
select * from public.parametros_avaliacao_faixas order by criterio, estrela;
select * from public.parametros_avaliacao_pesos;
select * from public.parametros_curva_abc;
```
Expected: 15 + 3 + 3 linhas com os valores default do Step 1.

- [ ] **Step 5: Criar o lib file do frontend**

```ts
// src/lib/parametros-avaliacao.ts
import { supabase } from "./supabase"

export type ParametroFaixa = {
  criterio: "atividade" | "frequencia" | "ticket_medio"
  estrela: number
  minValor: number
  maxValor: number
}

export type ParametroPeso = {
  criterio: "atividade" | "frequencia" | "ticket_medio"
  pesoPercentual: number
}

export type ParametroAbc = {
  classe: "A" | "B" | "C"
  percentual: number
}

type ParametroFaixaRaw = {
  criterio: string
  estrela: number | string
  min_valor: number | string
  max_valor: number | string
}

type ParametroPesoRaw = {
  criterio: string
  peso_percentual: number | string
}

type ParametroAbcRaw = {
  classe: string
  percentual: number | string
}

export async function listParametrosFaixas(): Promise<ParametroFaixa[]> {
  const { data, error } = await supabase.rpc("list_parametros_avaliacao_faixas")
  if (error) throw error

  return ((data ?? []) as ParametroFaixaRaw[]).map((row) => ({
    criterio: row.criterio as ParametroFaixa["criterio"],
    estrela: Number(row.estrela),
    minValor: Number(row.min_valor),
    maxValor: Number(row.max_valor),
  }))
}

export async function updateParametroFaixa(
  criterio: ParametroFaixa["criterio"],
  estrela: number,
  minValor: number,
  maxValor: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_avaliacao_faixa", {
    p_criterio: criterio,
    p_estrela: estrela,
    p_min_valor: minValor,
    p_max_valor: maxValor,
  })
  if (error) throw error
}

export async function listParametrosPesos(): Promise<ParametroPeso[]> {
  const { data, error } = await supabase.rpc("list_parametros_avaliacao_pesos")
  if (error) throw error

  return ((data ?? []) as ParametroPesoRaw[]).map((row) => ({
    criterio: row.criterio as ParametroPeso["criterio"],
    pesoPercentual: Number(row.peso_percentual),
  }))
}

export async function updateParametroPeso(
  criterio: ParametroPeso["criterio"],
  pesoPercentual: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_avaliacao_peso", {
    p_criterio: criterio,
    p_peso_percentual: pesoPercentual,
  })
  if (error) throw error
}

export async function listParametrosAbc(): Promise<ParametroAbc[]> {
  const { data, error } = await supabase.rpc("list_parametros_curva_abc")
  if (error) throw error

  return ((data ?? []) as ParametroAbcRaw[]).map((row) => ({
    classe: row.classe as ParametroAbc["classe"],
    percentual: Number(row.percentual),
  }))
}

export async function updateParametroAbc(
  classe: ParametroAbc["classe"],
  percentual: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_curva_abc", {
    p_classe: classe,
    p_percentual: percentual,
  })
  if (error) throw error
}
```

- [ ] **Step 6: Criar a página de Cadastros**

```tsx
// src/pages/cadastros/avaliacao-clientes-page.tsx
import { useEffect, useState } from "react"
import { toast } from "sonner"
import AppShell from "@/components/layout/app-shell"
import {
  listParametrosFaixas,
  updateParametroFaixa,
  listParametrosPesos,
  updateParametroPeso,
  listParametrosAbc,
  updateParametroAbc,
  type ParametroFaixa,
  type ParametroPeso,
  type ParametroAbc,
} from "@/lib/parametros-avaliacao"

const CRITERIO_LABELS: Record<ParametroFaixa["criterio"], string> = {
  atividade: "Atividade (dias sem comprar)",
  frequencia: "Frequência (intervalo médio em dias)",
  ticket_medio: "Ticket Médio (R$)",
}

function FaixasSection({
  criterio,
  faixas,
  onSave,
}: {
  criterio: ParametroFaixa["criterio"]
  faixas: ParametroFaixa[]
  onSave: (estrela: number, minValor: number, maxValor: number) => Promise<void>
}) {
  const [drafts, setDrafts] = useState<Record<number, { min: string; max: string }>>({})
  const [savingEstrela, setSavingEstrela] = useState<number | null>(null)

  function getDraft(faixa: ParametroFaixa) {
    return drafts[faixa.estrela] ?? { min: String(faixa.minValor), max: String(faixa.maxValor) }
  }

  async function handleSave(faixa: ParametroFaixa) {
    const draft = getDraft(faixa)
    const minValor = Number(draft.min)
    const maxValor = Number(draft.max)

    if (!Number.isFinite(minValor) || !Number.isFinite(maxValor)) {
      toast.warning("Informe valores numéricos válidos.")
      return
    }

    setSavingEstrela(faixa.estrela)
    try {
      await onSave(faixa.estrela, minValor, maxValor)
      toast.success("Faixa atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a faixa.")
    } finally {
      setSavingEstrela(null)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {CRITERIO_LABELS[criterio]}
      </h3>

      <div className="mt-3 space-y-2">
        {faixas
          .filter((f) => f.criterio === criterio)
          .sort((a, b) => b.estrela - a.estrela)
          .map((faixa) => {
            const draft = getDraft(faixa)

            return (
              <div key={faixa.estrela} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-16 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {faixa.estrela}★
                </span>

                <input
                  type="number"
                  value={draft.min}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [faixa.estrela]: { ...draft, min: e.target.value } }))
                  }
                  className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />

                <span className="text-slate-400">até</span>

                <input
                  type="number"
                  value={draft.max}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [faixa.estrela]: { ...draft, max: e.target.value } }))
                  }
                  className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />

                <button
                  type="button"
                  onClick={() => handleSave(faixa)}
                  disabled={savingEstrela === faixa.estrela}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default function AvaliacaoClientesPage() {
  const [faixas, setFaixas] = useState<ParametroFaixa[]>([])
  const [pesos, setPesos] = useState<ParametroPeso[]>([])
  const [abc, setAbc] = useState<ParametroAbc[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPeso, setSavingPeso] = useState<string | null>(null)
  const [savingClasse, setSavingClasse] = useState<string | null>(null)
  const [pesoDrafts, setPesoDrafts] = useState<Record<string, string>>({})
  const [abcDrafts, setAbcDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([listParametrosFaixas(), listParametrosPesos(), listParametrosAbc()])
      .then(([faixasData, pesosData, abcData]) => {
        setFaixas(faixasData)
        setPesos(pesosData)
        setAbc(abcData)
      })
      .catch(() => toast.error("Não foi possível carregar os parâmetros."))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveFaixa(
    criterio: ParametroFaixa["criterio"],
    estrela: number,
    minValor: number,
    maxValor: number
  ) {
    await updateParametroFaixa(criterio, estrela, minValor, maxValor)
    setFaixas((prev) =>
      prev.map((f) => (f.criterio === criterio && f.estrela === estrela ? { ...f, minValor, maxValor } : f))
    )
  }

  async function handleSavePeso(criterio: ParametroPeso["criterio"]) {
    const draft = pesoDrafts[criterio] ?? String(pesos.find((p) => p.criterio === criterio)?.pesoPercentual ?? 0)
    const pesoPercentual = Number(draft)

    if (!Number.isFinite(pesoPercentual)) {
      toast.warning("Informe um peso numérico válido.")
      return
    }

    setSavingPeso(criterio)
    try {
      await updateParametroPeso(criterio, pesoPercentual)
      setPesos((prev) => prev.map((p) => (p.criterio === criterio ? { ...p, pesoPercentual } : p)))
      toast.success("Peso atualizado.")
    } catch {
      toast.error("Não foi possível atualizar o peso.")
    } finally {
      setSavingPeso(null)
    }
  }

  async function handleSaveAbc(classe: ParametroAbc["classe"]) {
    const draft = abcDrafts[classe] ?? String(abc.find((a) => a.classe === classe)?.percentual ?? 0)
    const percentual = Number(draft)

    if (!Number.isFinite(percentual)) {
      toast.warning("Informe um percentual numérico válido.")
      return
    }

    setSavingClasse(classe)
    try {
      await updateParametroAbc(classe, percentual)
      setAbc((prev) => prev.map((a) => (a.classe === classe ? { ...a, percentual } : a)))
      toast.success("Corte atualizado.")
    } catch {
      toast.error("Não foi possível atualizar o corte.")
    } finally {
      setSavingClasse(null)
    }
  }

  if (loading) {
    return (
      <AppShell title="Avaliação de Clientes" subtitle="Parametrize as faixas de estrelas e os cortes da Curva ABC">
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      </AppShell>
    )
  }

  return (
    <AppShell title="Avaliação de Clientes" subtitle="Parametrize as faixas de estrelas e os cortes da Curva ABC">
      <div className="space-y-6">
        <FaixasSection criterio="atividade" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("atividade", e, min, max)} />
        <FaixasSection criterio="frequencia" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("frequencia", e, min, max)} />
        <FaixasSection criterio="ticket_medio" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("ticket_medio", e, min, max)} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pesos da Nota Geral (%)
          </h3>
          <div className="mt-3 space-y-2">
            {pesos.map((peso) => (
              <div key={peso.criterio} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-56 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {CRITERIO_LABELS[peso.criterio]}
                </span>
                <input
                  type="number"
                  value={pesoDrafts[peso.criterio] ?? String(peso.pesoPercentual)}
                  onChange={(e) => setPesoDrafts((prev) => ({ ...prev, [peso.criterio]: e.target.value }))}
                  className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleSavePeso(peso.criterio)}
                  disabled={savingPeso === peso.criterio}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cortes da Curva ABC (% do faturamento acumulado)
          </h3>
          <div className="mt-3 space-y-2">
            {abc.map((item) => (
              <div key={item.classe} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-16 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Classe {item.classe}
                </span>
                <input
                  type="number"
                  value={abcDrafts[item.classe] ?? String(item.percentual)}
                  onChange={(e) => setAbcDrafts((prev) => ({ ...prev, [item.classe]: e.target.value }))}
                  className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleSaveAbc(item.classe)}
                  disabled={savingClasse === item.classe}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 7: Adicionar a rota em `App.tsx`**

Adicionar o import `AvaliacaoClientesPage` de `@/pages/cadastros/avaliacao-clientes-page` e a rota (junto das outras rotas protegidas por `RoleProtectedRoute` sem `featureKey`, mesmo padrão de `/permissoes`):

```tsx
<Route
  path="/cadastros/avaliacao-clientes"
  element={
    <ProtectedRoute>
      <RoleProtectedRoute>
        <AvaliacaoClientesPage />
      </RoleProtectedRoute>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 8: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, logar como admin, abrir Cadastros → Avaliação de Clientes, confirmar que as 15 faixas + 3 pesos + 3 cortes aparecem com os defaults, editar um valor e salvar, recarregar a página e confirmar que persistiu. Logar como um usuário `representante` (se houver conta de teste) e confirmar que a rota redireciona para `/dashboard`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/parametros-avaliacao.ts src/pages/cadastros/avaliacao-clientes-page.tsx src/App.tsx
git commit -m "feat: pagina de parametrizacao Avaliacao de Clientes em Cadastros"
```

---

### Task 6: Tela de Curva ABC

**Files:**
- Supabase migration (nome: `create_rpc_get_clientes_curva_abc`)
- Create: `src/lib/clientes/clientes-curva-abc.ts`
- Create: `src/hooks/clientes/use-clientes-curva-abc.ts`
- Modify: `src/pages/clientes/curva-abc-page.tsx`

**Interfaces:**
- Consumes: `public.parametros_curva_abc` (Task 5), `mv_clientes_pedidos`/`vw_clientes_nomes` (Task 1), componentes compartilhados (Task 2).
- Produces: RPC `get_clientes_curva_abc`; `getClientesCurvaAbc(filters): Promise<ClienteCurvaAbcRow[]>`; hook `useClientesCurvaAbc()`.

- [ ] **Step 1: Criar a RPC `get_clientes_curva_abc`**

```sql
create or replace function public.get_clientes_curva_abc(
    p_id_representante bigint default null,
    p_mercado integer default null,
    p_contas integer[] default null,
    p_is_bionatus integer default null
)
returns table(
    cnpj text,
    nome text,
    valor_total_liquido numeric,
    pct_participacao numeric,
    pct_acumulado numeric,
    classe text,
    intervalo_medio_dias numeric
)
language sql stable security definer
set search_path to 'public'
as $function$
    with base as (
        select m.cnpj, m.data_pedido, m.valor_pedido, m.is_venda
        from public.mv_clientes_pedidos m
        where public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    valores as (
        select cnpj, sum(valor_pedido) as valor_total_liquido
        from base
        group by cnpj
        having sum(valor_pedido) > 0
    ),
    intervalos as (
        select cnpj, avg(intervalo_dias) as intervalo_medio_dias
        from (
            select cnpj, data_pedido - lag(data_pedido) over (partition by cnpj order by data_pedido) as intervalo_dias
            from base
            where is_venda
        ) x
        group by cnpj
    ),
    total_geral as (
        select sum(valor_total_liquido) as total from valores
    ),
    ranqueado as (
        select
            v.cnpj,
            v.valor_total_liquido,
            round(v.valor_total_liquido / t.total * 100, 2) as pct_participacao,
            round(
                sum(v.valor_total_liquido) over (order by v.valor_total_liquido desc) / t.total * 100,
                2
            ) as pct_acumulado
        from valores v
        cross join total_geral t
    ),
    cortes as (
        select
            max(percentual) filter (where classe = 'A') as corte_a,
            max(percentual) filter (where classe = 'B') as corte_b
        from public.parametros_curva_abc
    )
    select
        r.cnpj,
        n.nome,
        r.valor_total_liquido,
        r.pct_participacao,
        r.pct_acumulado,
        case
            when r.pct_acumulado <= c.corte_a then 'A'
            when r.pct_acumulado <= c.corte_a + c.corte_b then 'B'
            else 'C'
        end as classe,
        round(i.intervalo_medio_dias, 1) as intervalo_medio_dias
    from ranqueado r
    cross join cortes c
    left join intervalos i on i.cnpj = r.cnpj
    left join public.vw_clientes_nomes n on n.cnpj = r.cnpj
    order by r.pct_acumulado;
$function$;

revoke all on function public.get_clientes_curva_abc(bigint, integer, integer[], integer) from public, anon;
grant execute on function public.get_clientes_curva_abc(bigint, integer, integer[], integer) to authenticated;
```

- [ ] **Step 2: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_rpc_get_clientes_curva_abc`.

- [ ] **Step 3: Validar manualmente**

Run via `mcp__supabase__execute_sql`: `select classe, count(*), sum(valor_total_liquido) from public.get_clientes_curva_abc() group by classe order by classe;`
Expected: 3 grupos (A/B/C), com a classe A concentrando poucos clientes e a maior parte do faturamento (dado o corte default 80%).

- [ ] **Step 4: Criar o lib file**

```ts
// src/lib/clientes/clientes-curva-abc.ts
import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteCurvaAbcRow = {
  cnpj: string
  nome: string
  valorTotalLiquido: number
  pctParticipacao: number
  pctAcumulado: number
  classe: "A" | "B" | "C"
  intervaloMedioDias: number | null
}

type ClienteCurvaAbcRowRaw = {
  cnpj: string
  nome: string | null
  valor_total_liquido: number | string
  pct_participacao: number | string
  pct_acumulado: number | string
  classe: string
  intervalo_medio_dias: number | string | null
}

function mapRow(row: ClienteCurvaAbcRowRaw): ClienteCurvaAbcRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    valorTotalLiquido: toNumber(row.valor_total_liquido),
    pctParticipacao: toNumber(row.pct_participacao),
    pctAcumulado: toNumber(row.pct_acumulado),
    classe: row.classe as ClienteCurvaAbcRow["classe"],
    intervaloMedioDias: toNullableNumber(row.intervalo_medio_dias),
  }
}

export async function getClientesCurvaAbc(
  filters: ClientesFiltersInput
): Promise<ClienteCurvaAbcRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_curva_abc",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteCurvaAbcRowRaw[]).map(mapRow)
}
```

- [ ] **Step 5: Criar o hook**

```ts
// src/hooks/clientes/use-clientes-curva-abc.ts
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesCurvaAbc, type ClienteCurvaAbcRow } from "@/lib/clientes/clientes-curva-abc"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesCurvaAbc() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteCurvaAbcRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesCurvaAbc(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-curva-abc", error)
        toast.error("Não foi possível carregar a curva ABC.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters])

  const filteredRows = rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return row.nome.toLowerCase().includes(term) || row.cnpj.includes(term)
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
```

- [ ] **Step 6: Popular a página**

```tsx
// src/pages/clientes/curva-abc-page.tsx
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

const columns: ClientesTableColumn<ClienteCurvaAbcRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome },
  {
    key: "valor",
    header: "Valor total (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
  },
  {
    key: "participacao",
    header: "% Participação",
    align: "right",
    render: (row) => formatPercentBR(row.pctParticipacao),
  },
  {
    key: "acumulado",
    header: "% Acumulado",
    align: "right",
    render: (row) => formatPercentBR(row.pctAcumulado),
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
  },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "—" : row.intervaloMedioDias),
  },
]

export default function CurvaAbcPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesCurvaAbc()

  return (
    <AppShell title="Curva ABC" subtitle="Classificação de clientes por valor">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <ClientesDataTable
          columns={columns}
          rows={rows}
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

- [ ] **Step 7: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, abrir `/clientes/curva-abc`, confirmar que os badges A/B/C aparecem e que a soma acumulada faz sentido. Ir em Cadastros → Avaliação de Clientes, mudar o corte de A (ex: de 80 para 70) e confirmar que a classificação na tela de Curva ABC muda ao recarregar.

- [ ] **Step 8: Commit**

```bash
git add src/lib/clientes/clientes-curva-abc.ts src/hooks/clientes/use-clientes-curva-abc.ts src/pages/clientes/curva-abc-page.tsx
git commit -m "feat: tela de Curva ABC"
```

---

### Task 7: Tela de Avaliação

**Files:**
- Supabase migration (nome: `create_rpc_get_clientes_avaliacao`)
- Create: `src/components/clientes/star-rating.tsx`
- Create: `src/lib/clientes/clientes-avaliacao.ts`
- Create: `src/hooks/clientes/use-clientes-avaliacao.ts`
- Modify: `src/pages/clientes/avaliacao-page.tsx`

**Interfaces:**
- Consumes: `public.parametros_avaliacao_faixas`, `public.parametros_avaliacao_pesos` (Task 5), `mv_clientes_pedidos`/`vw_clientes_nomes` (Task 1), componentes compartilhados (Task 2).
- Produces: RPC `get_clientes_avaliacao`; componente `<StarRating value={number | null} />`; `getClientesAvaliacao(filters): Promise<ClienteAvaliacaoRow[]>`; hook `useClientesAvaliacao()`.

- [ ] **Step 1: Criar a RPC `get_clientes_avaliacao`**

```sql
create or replace function public.get_clientes_avaliacao(
    p_id_representante bigint default null,
    p_mercado integer default null,
    p_contas integer[] default null,
    p_is_bionatus integer default null
)
returns table(
    cnpj text,
    nome text,
    estrelas_atividade integer,
    estrelas_frequencia integer,
    estrelas_ticket_medio integer,
    nota_geral numeric
)
language sql stable security definer
set search_path to 'public'
as $function$
    with base as (
        select m.cnpj, m.data_pedido, m.valor_pedido, m.is_venda
        from public.mv_clientes_pedidos m
        where public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    vendas as (
        select cnpj, data_pedido, valor_pedido
        from base
        where is_venda
    ),
    intervalos as (
        select cnpj, data_pedido - lag(data_pedido) over (partition by cnpj order by data_pedido) as intervalo_dias
        from vendas
    ),
    metricas as (
        select
            v.cnpj,
            max(v.data_pedido) as data_ultima_compra,
            (current_date - max(v.data_pedido))::integer as dias_desde_ultima_compra,
            avg(i.intervalo_dias) as intervalo_medio_dias,
            case when count(*) = 0 then null else sum(v.valor_pedido) / count(*) end as ticket_medio
        from vendas v
        left join intervalos i on i.cnpj = v.cnpj
        group by v.cnpj
    ),
    estrelas as (
        select
            m.cnpj,
            (
                select fa.estrela from public.parametros_avaliacao_faixas fa
                where fa.criterio = 'atividade'
                  and m.dias_desde_ultima_compra between fa.min_valor and fa.max_valor
                limit 1
            ) as estrelas_atividade,
            (
                select fa.estrela from public.parametros_avaliacao_faixas fa
                where fa.criterio = 'frequencia'
                  and m.intervalo_medio_dias between fa.min_valor and fa.max_valor
                limit 1
            ) as estrelas_frequencia,
            (
                select fa.estrela from public.parametros_avaliacao_faixas fa
                where fa.criterio = 'ticket_medio'
                  and m.ticket_medio between fa.min_valor and fa.max_valor
                limit 1
            ) as estrelas_ticket_medio
        from metricas m
    ),
    pesos as (
        select criterio, peso_percentual from public.parametros_avaliacao_pesos
    )
    select
        e.cnpj,
        n.nome,
        e.estrelas_atividade,
        e.estrelas_frequencia,
        e.estrelas_ticket_medio,
        round(
            (
                coalesce(e.estrelas_atividade, 0) * coalesce((select peso_percentual from pesos where criterio = 'atividade'), 0)
                + coalesce(e.estrelas_frequencia, 0) * coalesce((select peso_percentual from pesos where criterio = 'frequencia'), 0)
                + coalesce(e.estrelas_ticket_medio, 0) * coalesce((select peso_percentual from pesos where criterio = 'ticket_medio'), 0)
            )
            / nullif(
                (case when e.estrelas_atividade is not null then (select peso_percentual from pesos where criterio = 'atividade') else 0 end)
                + (case when e.estrelas_frequencia is not null then (select peso_percentual from pesos where criterio = 'frequencia') else 0 end)
                + (case when e.estrelas_ticket_medio is not null then (select peso_percentual from pesos where criterio = 'ticket_medio') else 0 end),
                0
            ),
            1
        ) as nota_geral
    from estrelas e
    left join public.vw_clientes_nomes n on n.cnpj = e.cnpj
    order by nota_geral desc nulls last;
$function$;

revoke all on function public.get_clientes_avaliacao(bigint, integer, integer[], integer) from public, anon;
grant execute on function public.get_clientes_avaliacao(bigint, integer, integer[], integer) to authenticated;
```

- [ ] **Step 2: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_rpc_get_clientes_avaliacao`.

- [ ] **Step 3: Validar manualmente**

Run via `mcp__supabase__execute_sql`: `select * from public.get_clientes_avaliacao() order by nota_geral desc limit 10;`
Expected: notas entre 1 e 5, sem erro de divisão por zero mesmo para clientes com só 1 critério disponível.

- [ ] **Step 4: Criar o componente de estrelas**

```tsx
// src/components/clientes/star-rating.tsx
import { Star } from "lucide-react"

export function StarRating({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-slate-400">Sem dados</span>
  }

  const rounded = Math.round(value)

  return (
    <div className="flex items-center gap-0.5" title={`${value} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rounded ? "fill-[#297B49] text-[#297B49]" : "text-slate-300 dark:text-slate-700"
          }`}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Criar o lib file**

```ts
// src/lib/clientes/clientes-avaliacao.ts
import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAvaliacaoRow = {
  cnpj: string
  nome: string
  estrelasAtividade: number | null
  estrelasFrequencia: number | null
  estrelasTicketMedio: number | null
  notaGeral: number | null
}

type ClienteAvaliacaoRowRaw = {
  cnpj: string
  nome: string | null
  estrelas_atividade: number | string | null
  estrelas_frequencia: number | string | null
  estrelas_ticket_medio: number | string | null
  nota_geral: number | string | null
}

function mapRow(row: ClienteAvaliacaoRowRaw): ClienteAvaliacaoRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    estrelasAtividade: toNullableNumber(row.estrelas_atividade),
    estrelasFrequencia: toNullableNumber(row.estrelas_frequencia),
    estrelasTicketMedio: toNullableNumber(row.estrelas_ticket_medio),
    notaGeral: toNullableNumber(row.nota_geral),
  }
}

export async function getClientesAvaliacao(
  filters: ClientesFiltersInput
): Promise<ClienteAvaliacaoRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_avaliacao",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteAvaliacaoRowRaw[]).map(mapRow)
}
```

- [ ] **Step 6: Criar o hook**

```ts
// src/hooks/clientes/use-clientes-avaliacao.ts
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAvaliacao, type ClienteAvaliacaoRow } from "@/lib/clientes/clientes-avaliacao"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesAvaliacao() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteAvaliacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAvaliacao(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-avaliacao", error)
        toast.error("Não foi possível carregar a avaliação dos clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters])

  const filteredRows = rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return row.nome.toLowerCase().includes(term) || row.cnpj.includes(term)
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
```

- [ ] **Step 7: Popular a página**

```tsx
// src/pages/clientes/avaliacao-page.tsx
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { StarRating } from "@/components/clientes/star-rating"
import { useClientesAvaliacao } from "@/hooks/clientes/use-clientes-avaliacao"
import type { ClienteAvaliacaoRow } from "@/lib/clientes/clientes-avaliacao"

const columns: ClientesTableColumn<ClienteAvaliacaoRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome },
  { key: "atividade", header: "Atividade", align: "center", render: (row) => <StarRating value={row.estrelasAtividade} /> },
  { key: "frequencia", header: "Frequência", align: "center", render: (row) => <StarRating value={row.estrelasFrequencia} /> },
  { key: "ticket", header: "Ticket Médio", align: "center", render: (row) => <StarRating value={row.estrelasTicketMedio} /> },
  { key: "geral", header: "Nota Geral", align: "center", render: (row) => <StarRating value={row.notaGeral} /> },
]

export default function AvaliacaoPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesAvaliacao()

  return (
    <AppShell title="Avaliação de Clientes" subtitle="Notas por atividade, frequência e ticket médio">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <ClientesDataTable
          columns={columns}
          rows={rows}
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

- [ ] **Step 8: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, abrir `/clientes/avaliacao`, confirmar as estrelas renderizando e que mudar um peso em Cadastros → Avaliação de Clientes altera a Nota Geral ao recarregar.

- [ ] **Step 9: Commit**

```bash
git add src/components/clientes/star-rating.tsx src/lib/clientes/clientes-avaliacao.ts src/hooks/clientes/use-clientes-avaliacao.ts src/pages/clientes/avaliacao-page.tsx
git commit -m "feat: tela de Avaliacao de Clientes"
```

---

### Task 8: Tela de Aberturas

**Files:**
- Supabase migration (nome: `create_rpc_get_clientes_aberturas`)
- Create: `src/lib/clientes/clientes-aberturas.ts`
- Create: `src/hooks/clientes/use-clientes-aberturas.ts`
- Modify: `src/pages/clientes/aberturas-page.tsx`

**Interfaces:**
- Consumes: `mv_clientes_pedidos`/`vw_clientes_nomes` (Task 1, nome de cliente não é necessário aqui), `ClientesFilters` (Task 2), `recharts` (já uma dependência do projeto).
- Produces: RPC `get_clientes_aberturas`; `getClientesAberturas(filters, dataInicio, dataFim): Promise<ClienteAberturaPoint[]>`; hook `useClientesAberturas()`.

- [ ] **Step 1: Criar a RPC `get_clientes_aberturas`**

```sql
create or replace function public.get_clientes_aberturas(
    p_data_inicio date,
    p_data_fim date,
    p_id_representante bigint default null,
    p_mercado integer default null,
    p_contas integer[] default null,
    p_is_bionatus integer default null
)
returns table(ano_mes text, qtd_clientes bigint)
language sql stable security definer
set search_path to 'public'
as $function$
    with base as (
        select m.cnpj, m.data_pedido
        from public.mv_clientes_pedidos m
        where m.is_venda
          and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    primeiras as (
        select cnpj, min(data_pedido) as primeira_compra
        from base
        group by cnpj
    )
    select
        to_char(primeira_compra, 'YYYY-MM') as ano_mes,
        count(*) as qtd_clientes
    from primeiras
    where primeira_compra between p_data_inicio and p_data_fim
    group by to_char(primeira_compra, 'YYYY-MM')
    order by ano_mes;
$function$;

revoke all on function public.get_clientes_aberturas(date, date, bigint, integer, integer[], integer) from public, anon;
grant execute on function public.get_clientes_aberturas(date, date, bigint, integer, integer[], integer) to authenticated;
```

Nota: o `min(data_pedido)` é calculado sobre TODO o histórico de vendas visível ao usuário (respeitando os filtros de representante/mercado/contas/fabricante, mas não o período) — o período (`p_data_inicio`/`p_data_fim`) só decide quais meses aparecem no resultado final, igual descrito na spec.

- [ ] **Step 2: Rodar a migration via `mcp__supabase__apply_migration`**

Nome: `create_rpc_get_clientes_aberturas`.

- [ ] **Step 3: Validar manualmente**

Run via `mcp__supabase__execute_sql`:
```sql
select * from public.get_clientes_aberturas(
    (current_date - interval '12 months')::date,
    current_date
);
```
Expected: até 12 linhas (uma por mês com abertura), `qtd_clientes` > 0.

- [ ] **Step 4: Criar o lib file**

```ts
// src/lib/clientes/clientes-aberturas.ts
import { supabase } from "@/lib/supabase"
import { toNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAberturaPoint = {
  anoMes: string
  qtdClientes: number
}

type ClienteAberturaPointRaw = {
  ano_mes: string
  qtd_clientes: number | string
}

export async function getClientesAberturas(
  filters: ClientesFiltersInput,
  dataInicio: string,
  dataFim: string
): Promise<ClienteAberturaPoint[]> {
  const { data, error } = await supabase.rpc("get_clientes_aberturas", {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAberturaPointRaw[]).map((row) => ({
    anoMes: row.ano_mes,
    qtdClientes: toNumber(row.qtd_clientes),
  }))
}
```

- [ ] **Step 5: Criar o hook (com período padrão de últimos 12 meses)**

```ts
// src/hooks/clientes/use-clientes-aberturas.ts
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAberturas, type ClienteAberturaPoint } from "@/lib/clientes/clientes-aberturas"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

function defaultRange() {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setMonth(inicio.getMonth() - 11)
  inicio.setDate(1)

  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: hoje.toISOString().slice(0, 10),
  }
}

export function useClientesAberturas() {
  const { filters, setFilters } = useClientesFilters()
  const [range, setRange] = useState(defaultRange)
  const [points, setPoints] = useState<ClienteAberturaPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAberturas(filters, range.dataInicio, range.dataFim)
      .then((data) => {
        if (mounted) setPoints(data)
      })
      .catch((error) => {
        logger.error("use-clientes-aberturas", error)
        toast.error("Não foi possível carregar as aberturas de clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters, range])

  return { points, loading, filters, setFilters, range, setRange }
}
```

- [ ] **Step 6: Popular a página com gráfico de colunas (recharts)**

```tsx
// src/pages/clientes/aberturas-page.tsx
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAberturas } from "@/hooks/clientes/use-clientes-aberturas"

export default function AberturasPage() {
  const { points, loading, filters, setFilters, range, setRange } = useClientesAberturas()

  return (
    <AppShell title="Aberturas de Clientes" subtitle="Novos clientes por mês (primeira compra)">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                De
              </label>
              <input
                type="date"
                value={range.dataInicio}
                onChange={(e) => setRange((prev) => ({ ...prev, dataInicio: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                Até
              </label>
              <input
                type="date"
                value={range.dataFim}
                onChange={(e) => setRange((prev) => ({ ...prev, dataFim: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="anoMes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtdClientes" name="Clientes abertos" fill="#297B49" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 7: Typecheck e verificação manual**

Run: `npm run build` → sem erros.
Run: `npm run dev`, abrir `/clientes/aberturas`, confirmar o gráfico de colunas renderizando os últimos 12 meses e reagindo à troca de período/filtros.

- [ ] **Step 8: Commit**

```bash
git add src/lib/clientes/clientes-aberturas.ts src/hooks/clientes/use-clientes-aberturas.ts src/pages/clientes/aberturas-page.tsx
git commit -m "feat: tela de Aberturas de Clientes"
```

---

## Nota de implementação (fora do que foi perguntado no brainstorm)

A spec dizia "mesmos filtros do dashboard", mas o dashboard inclui um seletor de Ano/Mês que não faz sentido para métricas de histórico de vida (Atividade/Frequência/ABC/Avaliação são sempre "vida toda"). Este plano usa um componente de filtros mais leve (`ClientesFilters`, só Mercado/Canal/Fabricante) nessas 4 telas, e um controle de período próprio (`De`/`Até`) só na tela de Aberturas, que é a única que realmente precisa de um intervalo de datas. Vale confirmar com o usuário quando a Task 2 estiver pronta, antes de seguir para as demais tasks.
