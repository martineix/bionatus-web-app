import { Filter } from "lucide-react"
import type {
  DashboardFiltersInput,
  DashboardMonthOption,
} from "@/lib/dashboard"

type DashboardFiltersProps = {
  filters: DashboardFiltersInput
  onChange: (filters: DashboardFiltersInput) => void
  availableYears: number[]
  availableMonths: DashboardMonthOption[]
}

export default function DashboardFilters({
  filters,
  onChange,
  availableYears,
  availableMonths,
}: DashboardFiltersProps) {
  function updateFilter<K extends keyof DashboardFiltersInput>(
    key: K,
    value: DashboardFiltersInput[K]
  ) {
    onChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Filtros
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Refine a visualização dos indicadores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.ano === null ? "" : String(filters.ano)}
            onChange={(e) =>
              onChange({
                ...filters,
                ano: e.target.value === "" ? null : Number(e.target.value),
                mes: null,
              })
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Ano: Todos</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={filters.mes === null ? "" : String(filters.mes)}
            onChange={(e) =>
              onChange({
                ...filters,
                mes: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            disabled={!filters.ano}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Mês: Todos</option>
            {availableMonths.map((month) => (
              <option key={month.ano_mes} value={month.mes}>
                {month.ano_mes}
              </option>
            ))}
          </select>

          <select
            value={filters.contas === null ? "" : String(filters.contas)}
            onChange={(e) =>
              updateFilter(
                "contas",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Canal: Todos</option>
            <option value="1">Canal: Marcas Próprias</option>
            <option value="2">Canal: Licitações</option>
            <option value="3">Canal: Varejo</option>
            <option value="4">Canal: Redes</option>
            <option value="5">Canal: Distribuição</option>
            <option value="6">Canal: Televendas</option>
            <option value="7">Canal: Outros</option>
          </select>

          <select
            value={filters.mercado === null ? "" : String(filters.mercado)}
            onChange={(e) =>
              updateFilter(
                "mercado",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Mercado: Todos</option>
            <option value="1">Mercado: Marcas + Licitações</option>
            <option value="2">Mercado: Farma</option>
          </select>
        </div>
      </div>
    </div>
  )
}