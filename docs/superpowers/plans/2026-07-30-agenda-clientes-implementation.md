# Agenda de Clientes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova aba "Agenda" dentro do accordion Clientes: um calendário do mês selecionado onde cada dia lista os clientes com previsão de compra naquele dia (mesmo cálculo já usado em Frequência de Compra: última compra + intervalo médio entre compras).

**Architecture:** Uma nova RPC Supabase (`get_clientes_agenda`) reaproveita a lógica de `get_clientes_frequencia` sem alterá-la, filtrando o resultado para o mês/ano pedido e anexando o representante da compra mais recente (canonicalizado via `vw_representantes_canonicos`, já existente). O frontend busca essa lista uma vez por mudança de mês/filtro, agrupa por dia no cliente, e renderiza uma grade de calendário (desktop) ou lista vertical (mobile) — mesmo padrão responsivo já usado em Aberturas. Clicar num dia abre um modal com a lista de clientes daquele dia.

**Tech Stack:** Supabase Postgres (RPC `LANGUAGE sql STABLE SECURITY DEFINER`), React 19 + TypeScript, Tailwind, `radix-ui` Dialog (já usado no projeto via `src/components/ui/dialog.tsx`).

## Global Constraints

- RLS é obrigatório: `get_clientes_agenda` deve chamar `public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)` dentro da CTE base, exatamente como `get_clientes_frequencia`/`get_clientes_aberturas_detalhe`. Um representante logado só pode ver clientes que ele já veria em qualquer outra tela de Clientes.
- Não alterar `get_clientes_frequencia` nem a tela de Frequência — a nova RPC é isolada.
- Previsão é sempre um dia único exato (`previsao_proxima_compra`), nunca uma faixa/janela de dias.
- O filtro de representante reaproveita a RPC `get_representantes_abertura()` já existente (não criar uma nova RPC de listagem).
- Representante do cliente = representante da compra **mais recente** (não da abertura).
- Sem telefone/e-mail de contato no modal nesta versão.
- Sem framework de testes automatizado. Verificação via SQL direto (`mcp__supabase__execute_sql`) e `npm run build` no frontend.
- Mobile = `<640px` (mesmo breakpoint de `useIsMobile()`, já existente em `src/hooks/use-is-mobile.ts`).
- Trabalho direto na branch `main`, sem worktree isolado (consentimento já estabelecido nesta sessão).

---

### Task 1: Supabase — RPC `get_clientes_agenda`

**Files:** nenhum arquivo local — via `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql`.

**Interfaces:**
- Consumes: `mv_clientes_pedidos`, `mv_clientes_nomes`, `vw_representantes_canonicos`, `_dashboard_rep_visible` (todos já existentes).
- Produces: RPC `public.get_clientes_agenda(p_ano integer, p_mes integer, p_id_representante bigint default null, p_mercado integer default null, p_contas integer[] default null, p_is_bionatus integer default null, p_representante_nome text default null)` retornando `cnpj, nome, codigo_cliente, representante, data_ultima_compra, intervalo_medio_dias, previsao_proxima_compra` — consumida pela Task 2 (frontend).

- [ ] **Step 1: Criar a RPC**

Rodar via `mcp__supabase__apply_migration` (name: `create_get_clientes_agenda`):

```sql
CREATE OR REPLACE FUNCTION public.get_clientes_agenda(
  p_ano integer,
  p_mes integer,
  p_id_representante bigint DEFAULT NULL::bigint,
  p_mercado integer DEFAULT NULL::integer,
  p_contas integer[] DEFAULT NULL::integer[],
  p_is_bionatus integer DEFAULT NULL::integer,
  p_representante_nome text DEFAULT NULL::text
)
RETURNS TABLE(
  cnpj text,
  nome text,
  codigo_cliente text,
  representante text,
  data_ultima_compra date,
  intervalo_medio_dias numeric,
  previsao_proxima_compra date
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    with base as (
        select m.cnpj, m.data_pedido, m.sistema, m.id_representante, m.representante
        from public.mv_clientes_pedidos m
        where m.is_venda
          and public._dashboard_rep_visible(m.sistema, m.id_representante, p_id_representante)
          and (p_mercado is null or m.mercado = p_mercado)
          and (p_contas is null or cardinality(p_contas) = 0 or m.contas = any(p_contas))
          and (p_is_bionatus is null or m.is_bionatus = p_is_bionatus)
    ),
    compras as (
        select distinct cnpj, data_pedido
        from base
    ),
    intervalos as (
        select
            cnpj,
            data_pedido,
            data_pedido - lag(data_pedido) over (partition by cnpj order by data_pedido) as intervalo_dias
        from compras
    ),
    agregado as (
        select
            cnpj,
            avg(intervalo_dias) as intervalo_medio_dias,
            max(data_pedido) as data_ultima_compra
        from intervalos
        group by cnpj
    ),
    ultima_compra_rep as (
        select b.cnpj, b.sistema, b.id_representante, b.representante,
               row_number() over (partition by b.cnpj order by b.data_pedido desc) as rn
        from base b
    ),
    previsoes as (
        select
            a.cnpj,
            a.data_ultima_compra,
            round(a.intervalo_medio_dias, 1) as intervalo_medio_dias,
            (a.data_ultima_compra + (a.intervalo_medio_dias * interval '1 day'))::date as previsao_proxima_compra
        from agregado a
        where a.intervalo_medio_dias is not null
    )
    select
        p.cnpj,
        n.nome,
        n.codigo_cliente,
        coalesce(vrc.nome_canonico, ucr.representante) as representante,
        p.data_ultima_compra,
        p.intervalo_medio_dias,
        p.previsao_proxima_compra
    from previsoes p
    left join ultima_compra_rep ucr on ucr.cnpj = p.cnpj and ucr.rn = 1
    left join public.vw_representantes_canonicos vrc
      on vrc.sistema = ucr.sistema and vrc.id_representante = ucr.id_representante
    left join public.mv_clientes_nomes n on n.cnpj = p.cnpj
    where extract(year from p.previsao_proxima_compra) = p_ano
      and extract(month from p.previsao_proxima_compra) = p_mes
      and (p_representante_nome is null or coalesce(vrc.nome_canonico, ucr.representante) = p_representante_nome)
    order by p.previsao_proxima_compra, p.cnpj;
$function$;

revoke all on function public.get_clientes_agenda(integer, integer, bigint, integer, integer[], integer, text) from public, anon;
grant execute on function public.get_clientes_agenda(integer, integer, bigint, integer, integer[], integer, text) to authenticated;
```

- [ ] **Step 2: Verificar com uma query de sanidade**

Rodar via `mcp__supabase__execute_sql`, usando o mês/ano atual (ajustar para o mês/ano real no momento da execução):

```sql
select cnpj, nome, representante, data_ultima_compra, intervalo_medio_dias, previsao_proxima_compra
from public.get_clientes_agenda(2026, 7)
order by previsao_proxima_compra
limit 10;
```

Expected: retorna linhas (não erro); todo `previsao_proxima_compra` cai dentro de julho/2026; `intervalo_medio_dias` nunca nulo (clientes sem intervalo calculável não aparecem).

- [ ] **Step 3: Verificar RLS — representante só vê sua própria carteira**

Rodar via `mcp__supabase__execute_sql` (reaproveita o profile de teste "Pedro Henrique Figueira", já mapeado em `representante_contas` para `(sistema=2, id_representante=51)` e `(sistema=1, id_representante=110609)` — se esses valores não existirem mais no momento da execução, buscar um profile real com `role='representante'` e seus pares em `representante_contas`):

```sql
-- Contagem sem simular login (sessão atual cai no ramo admin de _dashboard_rep_visible)
select count(*) as total_sem_rls from public.get_clientes_agenda(2026, 7);

-- Contagem esperada para o representante de teste: clientes cuja ÚLTIMA compra
-- foi feita por um dos pares (sistema, id_representante) mapeados a ele
select count(*) as esperado_representante
from (
    select ucr.cnpj
    from (
        select m.cnpj, m.sistema, m.id_representante,
               row_number() over (partition by m.cnpj order by m.data_pedido desc) as rn
        from public.mv_clientes_pedidos m
        where m.is_venda
    ) ucr
    join public.get_clientes_agenda(2026, 7) p on p.cnpj = ucr.cnpj
    where ucr.rn = 1
      and (ucr.sistema, ucr.id_representante) in ((2, 51), (1, 110609))
) x;

-- Simula o login do representante de teste e confirma que a RPC retorna exatamente esse total
select set_config('request.jwt.claims', '{"sub":"259d1a91-2a73-449a-be92-b7e780504d34"}', true);
select count(*) as total_como_representante from public.get_clientes_agenda(2026, 7);
```

Expected: `total_como_representante` é igual a `esperado_representante`, e ambos são menores ou iguais a `total_sem_rls` (menor, a menos que o representante de teste cubra 100% da carteira do mês). Se `total_como_representante` for igual a `total_sem_rls` (ou seja, RLS não filtrou nada), a RPC tem o mesmo bug já corrigido em `get_representantes_abertura` — voltar ao Step 1 e confirmar que a chamada a `_dashboard_rep_visible` está presente na CTE `base`.

---

### Task 2: Frontend — camada de dados (`clientes-agenda.ts` + hook)

**Files:**
- Create: `src/lib/clientes/clientes-agenda.ts`
- Create: `src/hooks/clientes/use-clientes-agenda.ts`

**Interfaces:**
- Consumes: RPC `get_clientes_agenda` (Task 1); `getRepresentantesAbertura` de `src/lib/clientes/clientes-aberturas.ts` (já existente, reaproveitado); `useClientesFilters` de `src/hooks/clientes/use-clientes-filters.ts` (já existente); `buildClientesRpcFilters`/`toNumber` de `src/lib/clientes/clientes-rpc-helpers.ts` (já existentes).
- Produces: tipo `ClienteAgendaRow` e função `getClientesAgenda(ano, mes, filters, representanteNome)`; hook `useClientesAgenda()` retornando `{ ano, mes, rows, loading, filters, setFilters, representanteNome, setRepresentanteNome, representantesOptions, goToPreviousMonth, goToNextMonth, goToCurrentMonth }` — consumidos pela Task 3/4.

- [ ] **Step 1: Criar `src/lib/clientes/clientes-agenda.ts`**

```typescript
import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAgendaRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  representante: string | null
  dataUltimaCompra: string
  intervaloMedioDias: number
  previsaoProximaCompra: string
}

type ClienteAgendaRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  representante: string | null
  data_ultima_compra: string
  intervalo_medio_dias: number | string
  previsao_proxima_compra: string
}

export async function getClientesAgenda(
  ano: number,
  mes: number,
  filters: ClientesFiltersInput,
  representanteNome: string | null
): Promise<ClienteAgendaRow[]> {
  const { data, error } = await supabase.rpc("get_clientes_agenda", {
    p_ano: ano,
    p_mes: mes,
    ...buildClientesRpcFilters(filters),
    p_representante_nome: representanteNome,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAgendaRowRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    representante: row.representante,
    dataUltimaCompra: row.data_ultima_compra,
    intervaloMedioDias: toNumber(row.intervalo_medio_dias),
    previsaoProximaCompra: row.previsao_proxima_compra,
  }))
}
```

- [ ] **Step 2: Criar `src/hooks/clientes/use-clientes-agenda.ts`**

```typescript
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAgenda, type ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"
import { getRepresentantesAbertura } from "@/lib/clientes/clientes-aberturas"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

function anoMesAtual() {
  const hoje = new Date()
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

export function useClientesAgenda() {
  const { filters, setFilters } = useClientesFilters()
  const [{ ano, mes }, setAnoMes] = useState(anoMesAtual)
  const [representanteNome, setRepresentanteNome] = useState<string | null>(null)
  const [representantesOptions, setRepresentantesOptions] = useState<string[]>([])
  const [rows, setRows] = useState<ClienteAgendaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRepresentantesAbertura()
      .then(setRepresentantesOptions)
      .catch((error) => {
        logger.error("use-clientes-agenda-representantes", error)
      })
  }, [])

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAgenda(ano, mes, filters, representanteNome)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-agenda", error)
        toast.error("Não foi possível carregar a agenda de clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [ano, mes, filters, representanteNome])

  function goToPreviousMonth() {
    setAnoMes((atual) =>
      atual.mes === 1 ? { ano: atual.ano - 1, mes: 12 } : { ano: atual.ano, mes: atual.mes - 1 }
    )
  }

  function goToNextMonth() {
    setAnoMes((atual) =>
      atual.mes === 12 ? { ano: atual.ano + 1, mes: 1 } : { ano: atual.ano, mes: atual.mes + 1 }
    )
  }

  function goToCurrentMonth() {
    setAnoMes(anoMesAtual())
  }

  return {
    ano,
    mes,
    rows,
    loading,
    filters,
    setFilters,
    representanteNome,
    setRepresentanteNome,
    representantesOptions,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  }
}
```

- [ ] **Step 3: Rodar o build**

Run: `npm run build`
Expected: build completo sem erros de TypeScript (`tsc -b && vite build` seguido de `✓ built in`). Os dois arquivos novos ainda não são importados por nenhuma página, então o build só confirma que compilam sem erro de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/lib/clientes/clientes-agenda.ts src/hooks/clientes/use-clientes-agenda.ts
git commit -m "feat: camada de dados da Agenda de Clientes (RPC get_clientes_agenda)"
```

---

### Task 3: Frontend — componentes de calendário e modal

**Files:**
- Create: `src/components/clientes/agenda-calendario.tsx`
- Create: `src/components/clientes/agenda-dia-modal.tsx`

**Interfaces:**
- Consumes: `ClienteAgendaRow` (Task 2); `ClienteNomeCell` de `src/components/clientes/clientes-data-table.tsx` (já existente); `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` de `src/components/ui/dialog.tsx` (já existente).
- Produces: componente `AgendaCalendario({ ano, mes, rowsByDia, isMobile, onDiaClick })`; componente `AgendaDiaModal({ open, onOpenChange, dataLabel, clientes })` — ambos consumidos pela Task 4 (página).

- [ ] **Step 1: Criar `src/components/clientes/agenda-calendario.tsx`**

```typescript
import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

type AgendaCalendarioProps = {
  ano: number
  mes: number
  rowsByDia: Map<number, ClienteAgendaRow[]>
  isMobile: boolean
  onDiaClick: (dia: number) => void
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function buildMonthCells(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const cells: (number | null)[] = []

  for (let i = 0; i < primeiroDia.getDay(); i++) cells.push(null)
  for (let dia = 1; dia <= diasNoMes; dia++) cells.push(dia)
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

function formatDiaSemanaBR(ano: number, mes: number, dia: number) {
  const data = new Date(ano, mes - 1, dia)
  const label = data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function AgendaCalendario({ ano, mes, rowsByDia, isMobile, onDiaClick }: AgendaCalendarioProps) {
  const hoje = new Date()
  const isHoje = (dia: number) =>
    hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes && hoje.getDate() === dia

  if (isMobile) {
    const diasComClientes = Array.from(rowsByDia.keys()).sort((a, b) => a - b)

    return (
      <div className="space-y-2">
        {diasComClientes.map((dia) => {
          const clientes = rowsByDia.get(dia) ?? []
          return (
            <button
              type="button"
              key={dia}
              onClick={() => onDiaClick(dia)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left dark:border-slate-800"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatDiaSemanaBR(ano, mes, dia)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {clientes.slice(0, 2).map((c) => c.nome).join(", ")}
                  {clientes.length > 2 ? ` e mais ${clientes.length - 2}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
                {clientes.length}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const cells = buildMonthCells(ano, mes)

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400"
        >
          {label}
        </div>
      ))}

      {cells.map((dia, index) => {
        if (dia === null) {
          return <div key={`vazio-${index}`} className="min-h-[92px] bg-slate-50/50 dark:bg-slate-900/40" />
        }

        const clientes = rowsByDia.get(dia) ?? []

        return (
          <button
            type="button"
            key={dia}
            disabled={clientes.length === 0}
            onClick={() => onDiaClick(dia)}
            className={`min-h-[92px] bg-white p-1.5 text-left transition-colors dark:bg-slate-950 ${
              clientes.length > 0 ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" : "cursor-default"
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isHoje(dia)
                  ? "bg-[#006426] text-white dark:bg-[#7DD3A2] dark:text-slate-950"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {dia}
            </span>

            <div className="mt-1 space-y-0.5">
              {clientes.slice(0, 3).map((cliente) => (
                <p key={cliente.cnpj} className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                  {cliente.nome}
                </p>
              ))}
              {clientes.length > 3 && (
                <p className="text-[11px] font-medium text-[#297B49] dark:text-[#7DD3A2]">
                  +{clientes.length - 3} mais
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/components/clientes/agenda-dia-modal.tsx`**

```typescript
import { CalendarDays, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ClienteNomeCell } from "@/components/clientes/clientes-data-table"
import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

type AgendaDiaModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataLabel: string
  clientes: ClienteAgendaRow[]
}

function formatPrevisaoRelativa(previsaoProximaCompra: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const previsao = new Date(`${previsaoProximaCompra}T00:00:00`)
  const diffDias = Math.round((previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return "Previsto pra hoje"
  if (diffDias > 0) return `Em ${diffDias} dia${diffDias > 1 ? "s" : ""}`
  return `${Math.abs(diffDias)} dia${Math.abs(diffDias) > 1 ? "s" : ""} atrás`
}

export function AgendaDiaModal({ open, onOpenChange, dataLabel, clientes }: AgendaDiaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(92vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle>{dataLabel}</DialogTitle>
              <DialogDescription>
                {clientes.length} cliente{clientes.length > 1 ? "s" : ""} com previsão de compra
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto px-6 py-4">
          {clientes.map((cliente) => (
            <div
              key={cliente.cnpj}
              className="space-y-1.5 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
            >
              <ClienteNomeCell nome={cliente.nome} cnpj={cliente.cnpj} codigoCliente={cliente.codigoCliente} />

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {cliente.representante ?? "—"}
                </span>
                <span className="font-medium text-[#297B49] dark:text-[#7DD3A2]">
                  {formatPrevisaoRelativa(cliente.previsaoProximaCompra)}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Intervalo médio: {cliente.intervaloMedioDias} dias
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Rodar o build**

Run: `npm run build`
Expected: build sem erros de TypeScript. Ainda sem uso em página nenhuma (isso vem na Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/components/clientes/agenda-calendario.tsx src/components/clientes/agenda-dia-modal.tsx
git commit -m "feat: componentes de calendario e modal de dia da Agenda de Clientes"
```

---

### Task 4: Frontend — página, rota e item de menu

**Files:**
- Create: `src/pages/clientes/agenda-page.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `useClientesAgenda` (Task 2), `AgendaCalendario`/`AgendaDiaModal` (Task 3), `ClientesFilters`/`InlineSelectField`/`activeControlClass`/`defaultControlClass` de `src/components/clientes/clientes-filters.tsx` (já existentes), `useIsMobile` de `src/hooks/use-is-mobile.ts` (já existente).

- [ ] **Step 1: Criar `src/pages/clientes/agenda-page.tsx`**

```typescript
import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import {
  ClientesFilters,
  InlineSelectField,
  activeControlClass,
  defaultControlClass,
} from "@/components/clientes/clientes-filters"
import { AgendaCalendario } from "@/components/clientes/agenda-calendario"
import { AgendaDiaModal } from "@/components/clientes/agenda-dia-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAgenda } from "@/hooks/clientes/use-clientes-agenda"
import { useIsMobile } from "@/hooks/use-is-mobile"
import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export default function AgendaPage() {
  const {
    ano,
    mes,
    rows,
    loading,
    filters,
    setFilters,
    representanteNome,
    setRepresentanteNome,
    representantesOptions,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = useClientesAgenda()
  const isMobile = useIsMobile()
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

  const rowsByDia = useMemo(() => {
    const map = new Map<number, ClienteAgendaRow[]>()
    rows.forEach((row) => {
      const dia = Number(row.previsaoProximaCompra.slice(8, 10))
      const lista = map.get(dia) ?? []
      lista.push(row)
      map.set(dia, lista)
    })
    return map
  }, [rows])

  const clientesDoDiaSelecionado = diaSelecionado !== null ? rowsByDia.get(diaSelecionado) ?? [] : []

  return (
    <AppShell
      title="Agenda de Clientes"
      subtitle="Previsão de compra por dia, com base no intervalo médio de cada cliente"
    >
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters}>
          <div className="lg:w-55 lg:min-w-45">
            <InlineSelectField
              label="Representante"
              value={representanteNome ?? ""}
              onChange={(value) => setRepresentanteNome(value === "" ? null : value)}
              className={representanteNome !== null ? activeControlClass : defaultControlClass}
            >
              <option value="">Todos</option>
              {representantesOptions.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </InlineSelectField>
          </div>
        </ClientesFilters>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                aria-label="Mês anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                aria-label="Próximo mês"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {MESES_LABEL[mes - 1]} de {ano}
              </h2>
            </div>

            <button
              type="button"
              onClick={goToCurrentMonth}
              className="text-xs font-medium text-[#297B49] hover:underline dark:text-[#7DD3A2]"
            >
              Hoje
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma previsão de compra para este mês.
            </p>
          ) : (
            <AgendaCalendario
              ano={ano}
              mes={mes}
              rowsByDia={rowsByDia}
              isMobile={isMobile}
              onDiaClick={setDiaSelecionado}
            />
          )}
        </section>
      </div>

      {diaSelecionado !== null && (
        <AgendaDiaModal
          open
          onOpenChange={(open) => {
            if (!open) setDiaSelecionado(null)
          }}
          dataLabel={`${String(diaSelecionado).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`}
          clientes={clientesDoDiaSelecionado}
        />
      )}
    </AppShell>
  )
}
```

- [ ] **Step 2: Adicionar a rota em `src/App.tsx`**

Adicionar o import junto aos outros de `@/pages/clientes/*` (linha 8, depois de `AberturasPage`):

```typescript
import AgendaPage from "@/pages/clientes/agenda-page"
```

Adicionar o bloco de rota logo depois do bloco `/clientes/aberturas` existente (depois da linha 73):

```typescript
      <Route
        path="/clientes/agenda"
        element={
          <ProtectedRoute>
            <AgendaPage />
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 3: Adicionar o item de menu em `src/components/layout/sidebar.tsx`**

No import de ícones do `lucide-react` (topo do arquivo), adicionar `CalendarClock` à lista (junto com `CalendarPlus`):

```typescript
  CalendarPlus,
  CalendarClock,
```

No array `clientesNavItems`, adicionar a entrada depois de `"Aberturas"`:

```typescript
  { to: "/clientes/agenda", label: "Agenda", icon: CalendarClock },
```

- [ ] **Step 4: Rodar o build**

Run: `npm run build`
Expected: build completo sem erros de TypeScript.

- [ ] **Step 5: Testar no navegador**

Run: `npm run dev` (ou reaproveitar instância já rodando) e abrir `/clientes/agenda` logado.

Verificar manualmente:
1. O calendário do mês atual aparece com os clientes previstos nos dias corretos.
2. Clicar num dia com clientes abre o modal com a lista completa.
3. Trocar de mês (setas) recarrega os dados e muda o label do mês/ano.
4. O filtro de Representante restringe o calendário quando um nome é selecionado.
5. Em viewport mobile (DevTools, <640px), o calendário vira lista vertical de dias com cliente.

- [ ] **Step 6: Commit**

```bash
git add src/pages/clientes/agenda-page.tsx src/App.tsx src/components/layout/sidebar.tsx
git commit -m "feat: tela de Agenda de Clientes (calendario de previsao de compra)"
```

---

## Ordem de execução

Task 1 → Task 2 → Task 3 → Task 4. Task 1 (backend) pode ser verificada de forma totalmente independente (queries SQL diretas) antes de avançar. Tasks 2 e 3 são independentes entre si (ambas só dependem da Task 1) e poderiam, em tese, ser feitas em paralelo, mas a Task 4 depende das duas.
