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
