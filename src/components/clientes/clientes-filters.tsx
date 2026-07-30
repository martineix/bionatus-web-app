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
