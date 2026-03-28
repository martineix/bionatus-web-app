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
  loading?: boolean
}

type ViewMode = "daily" | "cumulative"
type MetricMode = "faturamento" | "pedidos" | "ticket_medio" | "positivacoes"

const metricConfig = {
  faturamento: {
    label: "Faturamento",
    color: "#006426",
    hoverBg: "#E4F1E8",
    hoverText: "#006426",
    format: (value: number) => formatCurrencyBRL(value),
  },
  pedidos: {
    label: "Pedidos",
    color: "#EFAF14",
    hoverBg: "#FFF4CF",
    hoverText: "#A56F00",
    format: (value: number) => formatNumberBR(value),
  },
  ticket_medio: {
    label: "Ticket Médio",
    color: "#00AFBE",
    hoverBg: "#DDF7FA",
    hoverText: "#007C87",
    format: (value: number) => formatCurrencyBRL(value),
  },
  positivacoes: {
    label: "Positivações",
    color: "#7832CD",
    hoverBg: "#EEE3FB",
    hoverText: "#7832CD",
    format: (value: number) => formatNumberBR(value),
  },
} as const

export default function DashboardSalesChart({
  data,
  previousData,
  loading = false,
}: DashboardSalesChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily")
  const [metricMode, setMetricMode] = useState<MetricMode>("faturamento")
  const [hoveredMetric, setHoveredMetric] = useState<MetricMode | null>(null)

  const currentMetric = metricConfig[metricMode]

  const chartData = useMemo(() => {
    const maxDay = Math.max(
      ...data.map((item) => item.dia),
      ...previousData.map((item) => item.dia),
      31
    )

    const currentMap = new Map<number, DashboardMetricDailyPoint>()
    const previousMap = new Map<number, DashboardMetricDailyPoint>()

    data.forEach((item) => {
      currentMap.set(item.dia, item)
    })

    previousData.forEach((item) => {
      previousMap.set(item.dia, item)
    })

    let faturamentoAcumuladoAtual = 0
    let faturamentoAcumuladoAnterior = 0
    let pedidosAcumuladosAtual = 0
    let pedidosAcumuladosAnterior = 0

    return Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1
      const atualItem = currentMap.get(day)
      const anteriorItem = previousMap.get(day)

      const faturamentoAtual = atualItem?.faturamento ?? 0
      const faturamentoAnterior = anteriorItem?.faturamento ?? 0

      const pedidosAtual = atualItem?.pedidos ?? 0
      const pedidosAnterior = anteriorItem?.pedidos ?? 0

      const ticketAtual = atualItem?.ticket_medio ?? 0
      const ticketAnterior = anteriorItem?.ticket_medio ?? 0

      const positivacoesAtual = atualItem?.positivacoes ?? 0
      const positivacoesAnterior = anteriorItem?.positivacoes ?? 0

      const positivacoesAcumuladasAtual =
        atualItem?.positivacoes_acumuladas ?? 0
      const positivacoesAcumuladasAnterior =
        anteriorItem?.positivacoes_acumuladas ?? 0

      if (viewMode === "cumulative") {
        if (metricMode === "faturamento") {
          faturamentoAcumuladoAtual += faturamentoAtual
          faturamentoAcumuladoAnterior += faturamentoAnterior

          return {
            dia: String(day).padStart(2, "0"),
            atual: faturamentoAcumuladoAtual,
            anterior: faturamentoAcumuladoAnterior,
          }
        }

        if (metricMode === "pedidos") {
          pedidosAcumuladosAtual += pedidosAtual
          pedidosAcumuladosAnterior += pedidosAnterior

          return {
            dia: String(day).padStart(2, "0"),
            atual: pedidosAcumuladosAtual,
            anterior: pedidosAcumuladosAnterior,
          }
        }

        if (metricMode === "ticket_medio") {
          faturamentoAcumuladoAtual += faturamentoAtual
          faturamentoAcumuladoAnterior += faturamentoAnterior
          pedidosAcumuladosAtual += pedidosAtual
          pedidosAcumuladosAnterior += pedidosAnterior

          return {
            dia: String(day).padStart(2, "0"),
            atual:
              pedidosAcumuladosAtual > 0
                ? faturamentoAcumuladoAtual / pedidosAcumuladosAtual
                : 0,
            anterior:
              pedidosAcumuladosAnterior > 0
                ? faturamentoAcumuladoAnterior / pedidosAcumuladosAnterior
                : 0,
          }
        }

        return {
          dia: String(day).padStart(2, "0"),
          atual: positivacoesAcumuladasAtual,
          anterior: positivacoesAcumuladasAnterior,
        }
      }

      if (metricMode === "faturamento") {
        return {
          dia: String(day).padStart(2, "0"),
          atual: faturamentoAtual,
          anterior: faturamentoAnterior,
        }
      }

      if (metricMode === "pedidos") {
        return {
          dia: String(day).padStart(2, "0"),
          atual: pedidosAtual,
          anterior: pedidosAnterior,
        }
      }

      if (metricMode === "ticket_medio") {
        return {
          dia: String(day).padStart(2, "0"),
          atual: ticketAtual,
          anterior: ticketAnterior,
        }
      }

      return {
        dia: String(day).padStart(2, "0"),
        atual: positivacoesAtual,
        anterior: positivacoesAnterior,
      }
    })
  }, [data, previousData, metricMode, viewMode])

  return (
    <div className="rounded-2xl border border-[#D0D9D6] bg-white p-6 shadow-sm xl:col-span-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Evolução de vendas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Comparativo entre período atual e mês anterior
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
              <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "daily"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Diário
                </button>

                <button
                  onClick={() => setViewMode("cumulative")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "cumulative"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Acumulado
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 p-1">
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
                            : "#ffffff",
                          color: isActive
                            ? "#ffffff"
                            : isHovered
                            ? metric.hoverText
                            : "#475569",
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
      </div>

      <div className="mt-6 h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
            Carregando gráfico...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
            Sem dados para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={currentMetric.color}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={currentMetric.color}
                    stopOpacity={0.04}
                  />
                </linearGradient>

                <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
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
                  const label =
                    name === "atual" ? "Período atual" : "Mês anterior"
                  return [currentMetric.format(Number(value ?? 0)), label]
                }}
                labelFormatter={(label) => `Dia ${label}`}
              />

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
    </div>
  )
}