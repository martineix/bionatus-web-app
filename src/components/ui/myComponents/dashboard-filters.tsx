import { Filter } from "lucide-react"
import type { DashboardFiltersInput } from "@/lib/dashboard"

type DashboardFiltersProps = {
  filters: DashboardFiltersInput
  onChange: (filters: DashboardFiltersInput) => void
}

export default function DashboardFilters({
  filters,
  onChange,
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
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426]">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filtros</h2>
            {/* <p className="text-xs text-slate-500">
              Refine a visualização dos indicadores
            </p> */}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49]">
            <option>Período: Diário</option>
            <option>Período: Semanal</option>
            <option>Período: Mensal</option>
            <option>Período: Anual</option>
          </select>

          {/* <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49]">
            <option>Representante: Todos</option>
            <option>Representante: Equipe interna</option>
            <option>Representante: Externos</option>
          </select> */}

          {/* <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49]">
            <option>Categoria: Todas</option>
            <option>Categoria: Vitaminas</option>
            <option>Categoria: Fitoterápicos</option>
            <option>Categoria: Suplementos</option>
          </select> */}

          <select
            value={
              filters.contas === null
                ? ""
                : String(filters.contas)
            }
            onChange={(e) =>
              updateFilter(
                "contas",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49]">
            <option value="">Canal: Todos</option>
            <option value="1">Canal: Marcas Próprias</option>
            <option value="2">Canal: Licitações</option>
            <option value="3">Canal: Varejo</option>
            <option value="4">Canal: Redes</option>
            <option value="5">Canal: Distribuição</option>
            <option value="6">Canal: Televendas</option>
            <option value="7">Canal: Outros</option>
          </select>
        </div>
      </div>
    </div>
  )
}