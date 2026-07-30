import { useEffect, useState, type MouseEvent } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, ClienteNomeCell, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAberturas } from "@/hooks/clientes/use-clientes-aberturas"
import type { ClienteAberturaDetalheRow } from "@/lib/clientes/clientes-aberturas"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

function formatMesAno(value: string | null) {
  if (!value) return null
  const [ano, mes] = value.split("-")
  return `${mes}/${ano}`
}

function getCurrentAnoMes() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`
}

function getBarColor(anoMes: string, selectedMonth: string | null, currentAnoMes: string) {
  if (selectedMonth === anoMes) return "#006426"
  if (anoMes === currentAnoMes) return "#297B49"
  return "#94A3B8"
}

const detalheColumns: ClientesTableColumn<ClienteAberturaDetalheRow>[] = [
  {
    key: "nome",
    header: "Cliente",
    render: (row) => <ClienteNomeCell nome={row.nome} cnpj={row.cnpj} codigoCliente={row.codigoCliente} />,
    sortValue: (row) => row.nome,
  },
  {
    key: "data_abertura",
    header: "Data de abertura",
    align: "right",
    render: (row) => formatDateBR(row.dataAbertura),
    sortValue: (row) => new Date(row.dataAbertura).getTime(),
  },
  {
    key: "recompra",
    header: "Recompra",
    align: "center",
    render: (row) =>
      row.qtdRecompras > 0 ? (
        <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
          Sim · {row.qtdRecompras}x
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Ainda não
        </span>
      ),
    sortValue: (row) => row.qtdRecompras,
  },
  {
    key: "representante",
    header: "Quem abriu",
    render: (row) => row.representanteAbertura ?? "—",
    sortValue: (row) => row.representanteAbertura,
  },
]

type PeriodoPreset = "mes_atual" | "3m" | "semestre" | "ano_atual" | "12m"

const PRESET_OPTIONS: { value: PeriodoPreset; label: string }[] = [
  { value: "mes_atual", label: "Mês atual" },
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

  const mesesAntes = preset === "mes_atual" ? 0 : preset === "3m" ? 2 : preset === "semestre" ? 5 : 11
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - mesesAntes, 1)

  return { dataInicio: toDateInputValue(inicio), dataFim }
}

export default function AberturasPage() {
  const {
    points,
    loading,
    detalhe,
    loadingDetalhe,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    range,
    setRange,
  } = useClientesAberturas()
  const [activePreset, setActivePreset] = useState<PeriodoPreset | "custom">("12m")
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const currentAnoMes = getCurrentAnoMes()

  function handlePresetClick(preset: PeriodoPreset) {
    setActivePreset(preset)
    setRange(computePresetRange(preset))
    setSelectedMonth(null)
  }

  function handleBarClick(anoMes: string) {
    setSelectedMonth((current) => (current === anoMes ? null : anoMes))
  }

  useEffect(() => {
    setSelectedMonth(null)
  }, [range, filters])

  const detalheExibido = selectedMonth
    ? detalhe.filter((row) => row.dataAbertura.slice(0, 7) === selectedMonth)
    : detalhe

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

            <div className="md:ml-auto">
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                Período
              </label>

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
                <BarChart data={points} onClick={() => setSelectedMonth(null)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="anoMes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="qtdClientes"
                    name="Clientes abertos"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                    onClick={(_data, index: number, event: MouseEvent) => {
                      event.stopPropagation()
                      const point = points[index]
                      if (point) handleBarClick(point.anoMes)
                    }}
                  >
                    {points.map((point) => (
                      <Cell
                        key={point.anoMes}
                        fill={getBarColor(point.anoMes, selectedMonth, currentAnoMes)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedMonth
                ? `Clientes abertos em ${formatMesAno(selectedMonth)}`
                : "Clientes abertos no período selecionado"}
            </h2>

            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="text-xs font-medium text-[#297B49] hover:underline dark:text-[#7DD3A2]"
              >
                Limpar seleção
              </button>
            )}
          </div>

          <ClientesDataTable
            columns={detalheColumns}
            rows={detalheExibido}
            loading={loadingDetalhe}
            getRowKey={(row) => row.cnpj}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            emptyMessage="Nenhum cliente aberto encontrado."
          />
        </section>
      </div>
    </AppShell>
  )
}
