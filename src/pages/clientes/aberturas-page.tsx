import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAberturas } from "@/hooks/clientes/use-clientes-aberturas"

type PeriodoPreset = "3m" | "semestre" | "ano_atual" | "12m"

const PRESET_OPTIONS: { value: PeriodoPreset; label: string }[] = [
  { value: "3m", label: "Últimos 3 meses" },
  { value: "semestre", label: "Último semestre" },
  { value: "ano_atual", label: "Ano atual" },
  { value: "12m", label: "Últimos 12 meses" },
]

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function computePresetRange(preset: PeriodoPreset) {
  const hoje = new Date()
  const dataFim = toDateInputValue(hoje)

  if (preset === "ano_atual") {
    const inicio = new Date(hoje.getFullYear(), 0, 1)
    return { dataInicio: toDateInputValue(inicio), dataFim }
  }

  const mesesAntes = preset === "3m" ? 2 : preset === "semestre" ? 5 : 11
  const inicio = new Date(hoje)
  inicio.setMonth(inicio.getMonth() - mesesAntes)
  inicio.setDate(1)

  return { dataInicio: toDateInputValue(inicio), dataFim }
}

export default function AberturasPage() {
  const { points, loading, filters, setFilters, range, setRange } = useClientesAberturas()
  const [activePreset, setActivePreset] = useState<PeriodoPreset | "custom">("12m")

  function handlePresetClick(preset: PeriodoPreset) {
    setActivePreset(preset)
    setRange(computePresetRange(preset))
  }

  return (
    <AppShell title="Aberturas de Clientes" subtitle="Novos clientes por mês (primeira compra)">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                De
              </label>
              <input
                type="date"
                value={range.dataInicio}
                onChange={(e) => {
                  setActivePreset("custom")
                  setRange((prev) => ({ ...prev, dataInicio: e.target.value }))
                }}
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
                onChange={(e) => {
                  setActivePreset("custom")
                  setRange((prev) => ({ ...prev, dataFim: e.target.value }))
                }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 md:ml-auto">
              <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Período
              </span>

              <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {PRESET_OPTIONS.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePresetClick(option.value)}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      index > 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                    } ${
                      activePreset === option.value
                        ? "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                        : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
