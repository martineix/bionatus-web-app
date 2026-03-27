import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import type { DashboardDailySalesPoint } from "@/lib/dashboard"
import { formatCurrencyBRL } from "@/lib/format"

type DashboardSalesChartProps = {
  data: DashboardDailySalesPoint[]
  previousData: DashboardDailySalesPoint[]
  loading?: boolean
}

type ViewMode = "daily" | "cumulative"

export default function DashboardSalesChart({
  data,
  previousData,
  loading = false,
}: DashboardSalesChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("daily")

  const chartData = useMemo(() => {
    const maxDay = Math.max(
      ...data.map((item) => item.dia),
      ...previousData.map((item) => item.dia),
      31
    )

    const currentMap = new Map<number, number>()
    const previousMap = new Map<number, number>()

    data.forEach((item) => {
      currentMap.set(item.dia, item.faturamento)
    })

    previousData.forEach((item) => {
      previousMap.set(item.dia, item.faturamento)
    })

    let acumuladoAtual = 0
    let acumuladoAnterior = 0

    return Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1
      const atual = currentMap.get(day) ?? 0
      const anterior = previousMap.get(day) ?? 0

      if (viewMode === "cumulative") {
        acumuladoAtual += atual
        acumuladoAnterior += anterior

        return {
          dia: String(day).padStart(2, "0"),
          atual: acumuladoAtual,
          anterior: acumuladoAnterior,
        }
      }

      return {
        dia: String(day).padStart(2, "0"),
        atual,
        anterior,
      }
    })
  }, [data, previousData, viewMode])

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Evolução de vendas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Comparativo entre período atual e mês anterior
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-1">
          <button
            onClick={() => setViewMode("daily")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "daily"
                ? "bg-[#006426] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Diário
          </button>

          <button
            onClick={() => setViewMode("cumulative")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "cumulative"
                ? "bg-[#006426] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Acumulado
          </button>
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
                  <stop offset="5%" stopColor="#006426" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#006426" stopOpacity={0.04} />
                </linearGradient>

                <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A0A0A0"stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#A0A0A0" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fontWeight: "bold" }} />
              <YAxis
                tick={{ fontSize: 10, }}
                tickFormatter={(value) =>
                  new Intl.NumberFormat("pt-BR", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value, name) => {
                  const label =
                    name === "atual" ? "Período atual" : "Mês anterior"
                  return [formatCurrencyBRL(Number(value ?? 0)), label]
                }}
                labelFormatter={(label) => `Dia ${label}`}
              />

              <Legend  align='right' verticalAlign='top'/>

              <Area
                type="monotone"
                dataKey="anterior"
                stroke="#D0D0D0"
                fill="url(#colorAnterior)"
                strokeWidth={2}
                dot={false}
              />

              <Area
                type="monotone"
                dataKey="atual"
                stroke="#006426"
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