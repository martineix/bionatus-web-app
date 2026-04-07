import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DashboardMetricDailyPoint } from "@/lib/dashboard"
import { formatCurrencyBRL, formatNumberBR } from "@/lib/format"

type DashboardSalesChartProps = {
  data: DashboardMetricDailyPoint[]
  previousData: DashboardMetricDailyPoint[]
  lastYearData: DashboardMetricDailyPoint[]
  loading?: boolean
}

type ViewMode = "daily" | "cumulative"
type MetricMode = "faturamento" | "pedidos" | "ticket_medio" | "positivacoes"
type DayMode = "calendar" | "business"

const metricConfig = {
  faturamento: {
    label: "Faturamento",
    shortLabel: "Fat",
    color: "#006426",
    hoverBg: "#E4F1E8",
    hoverText: "#006426",
    format: (value: number) => formatCurrencyBRL(value),
  },
  pedidos: {
    label: "Pedidos",
    shortLabel: "Ped",
    color: "#EFAF14",
    hoverBg: "#FFF4CF",
    hoverText: "#A56F00",
    format: (value: number) => formatNumberBR(value),
  },
  ticket_medio: {
    label: "Ticket Médio",
    shortLabel: "Tkt",
    color: "#00AFBE",
    hoverBg: "#DDF7FA",
    hoverText: "#007C87",
    format: (value: number) => formatCurrencyBRL(value),
  },
  positivacoes: {
    label: "Positivações",
    shortLabel: "Pos",
    color: "#7832CD",
    hoverBg: "#EEE3FB",
    hoverText: "#7832CD",
    format: (value: number) => formatNumberBR(value),
  },
} as const

type ChartRow = {
  dia: string
  label: string
  atual: number
  anterior: number
  anoAnterior: number
}

type MobileTableRow = {
  dia: string
  atual: number
  anterior: number
  anoAnterior: number
}

export default function DashboardSalesChart({
  data,
  previousData,
  lastYearData,
  loading = false,
}: DashboardSalesChartProps) {

  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [metricMode, setMetricMode] = useState<MetricMode>("faturamento")
  const [hoveredMetric, setHoveredMetric] = useState<MetricMode | null>(null)
  const [dayMode, setDayMode] = useState<DayMode>("calendar")

  const [showAnoAnterior, setShowAnoAnterior] = useState(false)

  const currentMetric = metricConfig[metricMode]

  const chartData = useMemo<ChartRow[]>(() => {
    const filteredData =
      dayMode === "business"
        ? data.filter((item) => item.dia_util && item.dia_util_numero_mes !== null)
        : data

    const filteredPreviousData =
      dayMode === "business"
        ? previousData.filter(
          (item) => item.dia_util && item.dia_util_numero_mes !== null
        )
        : previousData

    const filteredLastYearData =
      dayMode === "business"
        ? lastYearData.filter(
          (item) => item.dia_util && item.dia_util_numero_mes !== null
        )
        : lastYearData

    const currentMap = new Map<number, DashboardMetricDailyPoint>()
    const previousMap = new Map<number, DashboardMetricDailyPoint>()
    const lastYearMap = new Map<number, DashboardMetricDailyPoint>()

    if (dayMode === "business") {
      filteredData.forEach((item) => {
        currentMap.set(item.dia_util_numero_mes as number, item)
      })

      filteredPreviousData.forEach((item) => {
        previousMap.set(item.dia_util_numero_mes as number, item)
      })

      filteredLastYearData.forEach((item) => {
        lastYearMap.set(item.dia_util_numero_mes as number, item)
      })

    } else {
      filteredData.forEach((item) => {
        currentMap.set(item.dia, item)
      })

      filteredPreviousData.forEach((item) => {
        previousMap.set(item.dia, item)
      })

      filteredLastYearData.forEach((item) => {
        lastYearMap.set(item.dia, item)
      })
    }

    const allKeys = Array.from(
      new Set([
        ...(dayMode === "business"
          ? filteredData.map((item) => item.dia_util_numero_mes as number)
          : filteredData.map((item) => item.dia)),
        ...(dayMode === "business"
          ? filteredPreviousData.map((item) => item.dia_util_numero_mes as number)
          : filteredPreviousData.map((item) => item.dia)),
        ...(dayMode === "business"
          ? filteredLastYearData.map((item) => item.dia_util_numero_mes as number)
          : filteredLastYearData.map((item) => item.dia))
      ])
    ).sort((a, b) => a - b)

    let faturamentoAcumuladoAtual = 0
    let faturamentoAcumuladoAnterior = 0
    let faturamentoAcumuladoAnoAnterior = 0
    let pedidosAcumuladosAtual = 0
    let pedidosAcumuladosAnterior = 0
    let pedidosAcumuladosAnoAnterior = 0

    return allKeys.map((key) => {
      const atualItem = currentMap.get(key)
      const anteriorItem = previousMap.get(key)
      const anoAnteriorItem = lastYearMap.get(key)

      const faturamentoAtual = atualItem?.faturamento ?? 0
      const faturamentoAnterior = anteriorItem?.faturamento ?? 0
      const faturamentoAnoAnterior = anoAnteriorItem?.faturamento ?? 0

      const pedidosAtual = atualItem?.pedidos ?? 0
      const pedidosAnterior = anteriorItem?.pedidos ?? 0
      const pedidosAnoAnterior = anoAnteriorItem?.pedidos ?? 0

      const ticketAtual = atualItem?.ticket_medio ?? 0
      const ticketAnterior = anteriorItem?.ticket_medio ?? 0
      const ticketAnoAnterior = anoAnteriorItem?.ticket_medio ?? 0

      const positivacoesAtual = atualItem?.positivacoes ?? 0
      const positivacoesAnterior = anteriorItem?.positivacoes ?? 0
      const positivacoesAnoAnterior = anoAnteriorItem?.positivacoes ?? 0

      const positivacoesAcumuladasAtual = atualItem?.positivacoes_acumuladas ?? 0
      const positivacoesAcumuladasAnterior = anteriorItem?.positivacoes_acumuladas ?? 0
      const positivacoesAcumuladasAnoAnterior = anoAnteriorItem?.positivacoes_acumuladas ?? 0

      const diaReal = atualItem?.dia ?? anteriorItem?.dia ?? anoAnteriorItem?.dia ?? 0
      const label =
        dayMode === "business"
          ? String(key)
          : String(key).padStart(2, "0")

      if (viewMode === "cumulative") {
        if (metricMode === "faturamento") {
          faturamentoAcumuladoAtual += faturamentoAtual
          faturamentoAcumuladoAnterior += faturamentoAnterior
          faturamentoAcumuladoAnoAnterior += faturamentoAnoAnterior

          return {
            dia: String(diaReal).padStart(2, "0"),
            label,
            atual: faturamentoAcumuladoAtual,
            anterior: faturamentoAcumuladoAnterior,
            anoAnterior: faturamentoAcumuladoAnoAnterior,
          }
        }

        if (metricMode === "pedidos") {
          pedidosAcumuladosAtual += pedidosAtual
          pedidosAcumuladosAnterior += pedidosAnterior
          pedidosAcumuladosAnoAnterior += pedidosAnoAnterior

          return {
            dia: String(diaReal).padStart(2, "0"),
            label,
            atual: pedidosAcumuladosAtual,
            anterior: pedidosAcumuladosAnterior,
            anoAnterior: pedidosAcumuladosAnoAnterior,
          }
        }

        if (metricMode === "ticket_medio") {
          faturamentoAcumuladoAtual += faturamentoAtual
          faturamentoAcumuladoAnterior += faturamentoAnterior
          faturamentoAcumuladoAnoAnterior += faturamentoAnoAnterior
          pedidosAcumuladosAtual += pedidosAtual
          pedidosAcumuladosAnterior += pedidosAnterior
          pedidosAcumuladosAnoAnterior += pedidosAnoAnterior

          return {
            dia: String(diaReal).padStart(2, "0"),
            label,
            atual:
              pedidosAcumuladosAtual > 0
                ? faturamentoAcumuladoAtual / pedidosAcumuladosAtual
                : 0,
            anterior:
              pedidosAcumuladosAnterior > 0
                ? faturamentoAcumuladoAnterior / pedidosAcumuladosAnterior
                : 0,
            anoAnterior:
              pedidosAcumuladosAnoAnterior > 0
                ? faturamentoAcumuladoAnoAnterior / pedidosAcumuladosAnoAnterior
                : 0,
          }
        }

        return {
          dia: String(diaReal).padStart(2, "0"),
          label,
          atual: positivacoesAcumuladasAtual,
          anterior: positivacoesAcumuladasAnterior,
          anoAnterior: positivacoesAcumuladasAnoAnterior,
        }
      }

      if (metricMode === "faturamento") {
        return {
          dia: String(diaReal).padStart(2, "0"),
          label,
          atual: faturamentoAtual,
          anterior: faturamentoAnterior,
          anoAnterior: faturamentoAnoAnterior,
        }
      }

      if (metricMode === "pedidos") {
        return {
          dia: String(diaReal).padStart(2, "0"),
          label,
          atual: pedidosAtual,
          anterior: pedidosAnterior,
          anoAnterior: pedidosAnoAnterior,
        }
      }

      if (metricMode === "ticket_medio") {
        return {
          dia: String(diaReal).padStart(2, "0"),
          label,
          atual: ticketAtual,
          anterior: ticketAnterior,
          anoAnterior: ticketAnoAnterior,
        }
      }

      return {
        dia: String(diaReal).padStart(2, "0"),
        label,
        atual: positivacoesAtual,
        anterior: positivacoesAnterior,
        anoAnterior: positivacoesAnoAnterior,
      }
    })
  }, [data, previousData, lastYearData, metricMode, viewMode, dayMode])

  const mobileTableData = useMemo<MobileTableRow[]>(() => {
    return [...chartData].reverse().map((item) => ({
      dia: item.dia,
      atual: item.atual,
      anterior: item.anterior,
      anoAnterior: item.anoAnterior,
    }))
  }, [chartData])

  return (
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6 xl:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Evolução de vendas
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline">
              Comparativo entre período atual e mês anterior
            </span>
            <span className="md:hidden">
              Comparativo diário entre mês atual e mês anterior
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    onClick={() => setDayMode("calendar")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dayMode === "calendar"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                  >
                    Corridos
                  </button>

                  <button
                    onClick={() => setDayMode("business")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dayMode === "business"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                  >
                    Úteis
                  </button>
                </div>

                <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                  <button
                    onClick={() => setViewMode("daily")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "daily"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                  >
                    Diário
                  </button>

                  <button
                    onClick={() => setViewMode("cumulative")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "cumulative"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                  >
                    Acumulado
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map(
                  (metricKey) => {
                    const metric = metricConfig[metricKey]
                    const isActive = metricMode === metricKey

                    return (
                      <button
                        key={metricKey}
                        onClick={() => setMetricMode(metricKey)}
                        className="min-w-0 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors"
                        style={{
                          borderColor: isActive ? metric.color : "#e2e8f0",
                          backgroundColor: isActive ? metric.color : "transparent",
                          color: isActive ? "#ffffff" : "#475569",
                        }}
                      >
                        {metric.shortLabel}
                      </button>
                    )
                  }
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
            <label className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showAnoAnterior}
                onChange={(e) => setShowAnoAnterior(e.target.checked)}
              />
              <span className={showAnoAnterior ? "font-semibold" : ""}>Ano Anterior</span>
            </label>
            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <button
                onClick={() => setViewMode("daily")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "daily"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                Diário
              </button>

              <button
                onClick={() => setViewMode("cumulative")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "cumulative"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                Acumulado
              </button>
            </div>

            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <button
                onClick={() => setDayMode("calendar")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dayMode === "calendar"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                Corridos
              </button>

              <button
                onClick={() => setDayMode("business")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${dayMode === "business"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
              >
                Úteis
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map(
                (metricKey) => {
                  const metric = metricConfig[metricKey]
                  const isActive = metricMode === metricKey
                  const isHovered = hoveredMetric === metricKey && !isActive

                  return (
                    <button
                      key={metricKey}
                      onClick={() => setMetricMode(metricKey)}
                      onMouseEnter={() => setHoveredMetric(metricKey)}
                      onMouseLeave={() => setHoveredMetric(null)}
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        borderColor: isActive ? metric.color : "#e2e8f0",
                        backgroundColor: isActive
                          ? metric.color
                          : isHovered
                            ? metric.hoverBg
                            : "transparent",
                        color: isActive
                          ? "#ffffff"
                          : isHovered
                            ? metric.hoverText
                            : undefined,
                      }}
                    >
                      {metric.label}
                    </button>
                  )
                }
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 hidden h-80 md:block">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Carregando gráfico...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetric.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={currentMetric.color} stopOpacity={0.04} />
                </linearGradient>

                <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0.04} />
                </linearGradient>

                <linearGradient id="colorAnoAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0b70f5" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#0b70f5" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(Number(value))
                }
              />
              <Tooltip
                formatter={(value, name) => {
                  const legend =
                    name === "atual" ? "Mês atual" : name === "anterior" ? "Mês anterior" : "Ano Anterior"
                  return [currentMetric.format(Number(value ?? 0)), legend]
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as ChartRow | undefined
                  return row ? `Dia ${row.dia}` : ""
                }}
              />

              {showAnoAnterior && (
                <Area
                  type="monotone"
                  dataKey="anoAnterior"
                  stroke="#0b70f5"
                  fill="url(#colorAnoAnterior)"
                  strokeWidth={2}
                  strokeDasharray="10 10"
                  dot={false}
                />
              )}

              <Area
                type="monotone"
                dataKey="anterior"
                stroke="#94A3B8"
                fill="url(#colorAnterior)"
                strokeWidth={2}
                dot={false}
              />

              <Area
                type="monotone"
                dataKey="atual"
                stroke={currentMetric.color}
                fill="url(#colorAtual)"
                strokeWidth={3}
                dot={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 md:hidden">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Carregando tabela...
          </div>
        ) : mobileTableData.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Sem dados para o período selecionado
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="w-14 px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Dia
                  </th>
                  <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Mês Atual
                  </th>
                  <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Mês Ant.
                  </th>
                </tr>
              </thead>

              <tbody>
                {mobileTableData.map((row) => (
                  <tr
                    key={row.dia}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="whitespace-nowrap px-2 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {row.dia}
                    </td>
                    <td className="wrap-break-word px-2 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {currentMetric.format(row.atual)}
                    </td>
                    <td className="wrap-break-word px-2 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {currentMetric.format(row.anterior)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}