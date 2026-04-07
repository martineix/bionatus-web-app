import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover"
import type { DashboardFiltersInput, DashboardMonthOption, } from "@/lib/dashboard"

type DashboardFiltersProps = {
  filters: DashboardFiltersInput
  onChange: (filters: DashboardFiltersInput) => void
  availableYears: number[]
  availableMonths: DashboardMonthOption[]
}

const canalOptions = [
  { value: 1, label: "Marcas Próprias" },
  { value: 2, label: "Licitações" },
  { value: 3, label: "Varejo" },
  { value: 4, label: "Redes" },
  { value: 5, label: "Distribuição" },
  { value: 6, label: "Televendas" },
  { value: 7, label: "Outros" },
]

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

  function toggleConta(value: number) {
    const contas = filters.contas ?? []
    const exists = contas.includes(value)

    updateFilter(
      "contas",
      exists
        ? contas.filter((item) => item !== value)
        : [...contas, value]
    )
  }

  function getContasLabel() {
    const contas = filters.contas ?? []

    if (contas.length === 0) return "Canal: Todos"
    if (contas.length <= 2) {
      const labels = canalOptions
        .filter((item) => contas.includes(item.value))
        .map((item) => item.label)
      return `Canal: ${labels.join(", ")}`
    }

    return `Canal: ${contas.length} selecionados`
  }

  const filterControlClass =
    "h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors hover:border-slate-300 hover:bg-slate-50 focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"

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
            className={filterControlClass}
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
            className={`${filterControlClass} disabled:opacity-60`}
          >
            <option value="">Mês: Todos</option>
            {availableMonths.map((month) => (
              <option key={month.ano_mes} value={month.mes}>
                {month.ano_mes}
              </option>
            ))}
          </select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 min-w-55 justify-between rounded-lg border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="truncate">{getContasLabel()}</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-65 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Canais</p>
                <button
                  type="button"
                  onClick={() => updateFilter("contas", [])}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Limpar
                </button>
              </div>

              <div className="space-y-2">
                {canalOptions.map((option) => {
                  const checked = (filters.contas ?? []).includes(option.value)

                  return (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleConta(option.value)}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {option.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <select
            value={filters.mercado === null ? "" : String(filters.mercado)}
            onChange={(e) =>
              updateFilter(
                "mercado",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className={filterControlClass}
          >
            <option value="">Mercado: Todos</option>
            <option value="1">Mercado: Marcas + Licitações</option>
            <option value="2">Mercado: Farma</option>
          </select>

          <select
            value={
              filters.isBionatus === null ? "" : String(filters.isBionatus)
            }
            onChange={(e) =>
              updateFilter(
                "isBionatus",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className={filterControlClass}
          >
            <option value="">Fabricante: Todos</option>
            <option value="1">Fabricante: Bionatus</option>
            <option value="0">Fabricante: Terceiros</option>
          </select>
        </div>
      </div>
    </div>
  )
}