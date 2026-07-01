import { Fragment, useMemo, useState } from "react"
import { BarChart3, ChevronDown, ChevronRight, PieChart as PieChartIcon } from "lucide-react"
import { Pie, PieChart, Tooltip } from "recharts"
import { formatCurrencyBRL, formatNumberBR } from "@/lib/format"
import type {
  DashboardBreakdownContaRow,
  DashboardFabricanteBreakdownRow,
} from "@/lib/dashboard/types"

type Props = {
  breakdownByConta: DashboardBreakdownContaRow[]
  breakdownByFabricante: DashboardFabricanteBreakdownRow[]
  loading: boolean
}

const FABRICANTE_COLORS: Record<string, string> = {
  BIONATUS: "#006426",
  TERCEIROS: "#94A3B8",
  "Em branco": "#CBD5E1",
}

const fmtTicket = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatPct(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`
}

export function DashboardBreakdownSection({
  breakdownByConta,
  breakdownByFabricante,
  loading,
}: Props) {
  const [expandedMercados, setExpandedMercados] = useState<Set<number>>(
    new Set([1, 2])
  )

  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { mercado_nome: string; rows: DashboardBreakdownContaRow[] }
    >()
    for (const row of breakdownByConta) {
      const existing = map.get(row.mercado)
      if (existing) {
        existing.rows.push(row)
      } else {
        map.set(row.mercado, { mercado_nome: row.mercado_nome, rows: [row] })
      }
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [breakdownByConta])

  const total = useMemo(() => {
    const faturamento = breakdownByConta.reduce((s, r) => s + r.faturamento, 0)
    const pedidos = breakdownByConta.reduce((s, r) => s + r.pedidos, 0)
    const positivacoes = breakdownByConta.reduce((s, r) => s + r.positivacoes, 0)
    return {
      faturamento,
      pedidos,
      positivacoes,
      ticket_medio: pedidos > 0 ? faturamento / pedidos : 0,
    }
  }, [breakdownByConta])

  const mercadoTotals = useMemo(() => {
    const map = new Map<number, { faturamento: number; pedidos: number; positivacoes: number }>()
    for (const row of breakdownByConta) {
      const e = map.get(row.mercado) ?? { faturamento: 0, pedidos: 0, positivacoes: 0 }
      map.set(row.mercado, {
        faturamento: e.faturamento + row.faturamento,
        pedidos: e.pedidos + row.pedidos,
        positivacoes: e.positivacoes + row.positivacoes,
      })
    }
    return map
  }, [breakdownByConta])

  const donutData = useMemo(
    () =>
      breakdownByFabricante.map((row) => ({
        name: row.fabricante_nome,
        value: row.faturamento,
        fill: FABRICANTE_COLORS[row.fabricante_nome] ?? "#94A3B8",
        percentage:
          total.faturamento > 0 ? (row.faturamento / total.faturamento) * 100 : 0,
      })),
    [breakdownByFabricante, total.faturamento]
  )

  function toggleMercado(mercado: number) {
    setExpandedMercados((prev) => {
      const next = new Set(prev)
      if (next.has(mercado)) next.delete(mercado)
      else next.add(mercado)
      return next
    })
  }

  if (!loading && breakdownByConta.length === 0) return null

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">

      {/* ── CARD TABELA ── */}
      <section className="min-w-0 flex-1 rounded-2xl border border-[#D0D9D6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Breakdown por Canal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Faturamento segmentado por mercado e canal
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              *Não afetado por filtros de período, canal ou fabricante
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Mercado
                  </th>
                  <th className="pb-2.5 pr-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    $ Fat.
                  </th>
                  <th className="hidden pb-2.5 pr-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell dark:text-slate-400">
                    % Fat.
                  </th>
                  <th className="pb-2.5 pr-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pedidos
                  </th>
                  <th className="hidden pb-2.5 pr-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell dark:text-slate-400">
                    $ Ticket
                  </th>
                  <th className="hidden pb-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-500 md:table-cell dark:text-slate-400">
                    Posit.
                  </th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([mercadoId, { mercado_nome, rows }]) => {
                  const mt = mercadoTotals.get(mercadoId) ?? { faturamento: 0, pedidos: 0, positivacoes: 0 }
                  const mercadoTicket = mt.pedidos > 0 ? mt.faturamento / mt.pedidos : 0
                  const mercadoPct = total.faturamento > 0 ? (mt.faturamento / total.faturamento) * 100 : 0
                  const isExpanded = expandedMercados.has(mercadoId)

                  return (
                    <Fragment key={`mercado-${mercadoId}`}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
                        onClick={() => toggleMercado(mercadoId)}
                      >
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-1.5">
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                              : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            }
                            {mercado_nome.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrencyBRL(mt.faturamento)}
                        </td>
                        <td className="hidden py-2.5 pr-3 text-right font-semibold text-slate-900 md:table-cell dark:text-slate-100">
                          {formatPct(mercadoPct)}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatNumberBR(mt.pedidos)}
                        </td>
                        <td className="hidden py-2.5 pr-3 text-right font-semibold text-slate-900 md:table-cell dark:text-slate-100">
                          {fmtTicket.format(mercadoTicket)}
                        </td>
                        <td className="hidden py-2.5 text-right font-semibold text-slate-900 md:table-cell dark:text-slate-100">
                          {formatNumberBR(mt.positivacoes)}
                        </td>
                      </tr>

                      {isExpanded && rows.map((row) => {
                        const pct = total.faturamento > 0 ? (row.faturamento / total.faturamento) * 100 : 0
                        return (
                          <tr
                            key={`conta-${row.conta}`}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-900/30"
                          >
                            <td className="py-2 pl-7 text-slate-700 dark:text-slate-300">{row.conta_nome}</td>
                            <td className="py-2 pr-3 text-right text-slate-700 dark:text-slate-300">{formatCurrencyBRL(row.faturamento)}</td>
                            <td className="hidden py-2 pr-3 text-right text-slate-500 md:table-cell dark:text-slate-400">{formatPct(pct)}</td>
                            <td className="py-2 pr-3 text-right text-slate-700 dark:text-slate-300">{formatNumberBR(row.pedidos)}</td>
                            <td className="hidden py-2 pr-3 text-right text-slate-700 md:table-cell dark:text-slate-300">{fmtTicket.format(row.ticket_medio)}</td>
                            <td className="hidden py-2 text-right text-slate-700 md:table-cell dark:text-slate-300">{formatNumberBR(row.positivacoes)}</td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}

                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                  <td className="py-3 font-bold text-slate-900 dark:text-slate-100">Total Geral</td>
                  <td className="py-3 pr-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatCurrencyBRL(total.faturamento)}</td>
                  <td className="hidden py-3 pr-3 text-right font-bold text-slate-900 md:table-cell dark:text-slate-100">100,0%</td>
                  <td className="py-3 pr-3 text-right font-bold text-slate-900 dark:text-slate-100">{formatNumberBR(total.pedidos)}</td>
                  <td className="hidden py-3 pr-3 text-right font-bold text-slate-900 md:table-cell dark:text-slate-100">{fmtTicket.format(total.ticket_medio)}</td>
                  <td className="hidden py-3 text-right font-bold text-slate-900 md:table-cell dark:text-slate-100">{formatNumberBR(total.positivacoes)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── CARD GRÁFICO DE ROSCA ── */}
      {!loading && donutData.length > 0 && (
        <section className="flex w-full flex-col rounded-2xl border border-[#D0D9D6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:w-96 lg:shrink-0">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F0F0] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Fabricante
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                % sobre o faturamento
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                *Falta ajuste de produtos ainda
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center p-5">
            <PieChart width={180} height={180}>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrencyBRL(typeof value === "number" ? value : 0),
                  "Faturamento",
                ]}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
            </PieChart>

            <div className="mt-4 w-full space-y-2.5">
              {donutData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formatPct(entry.percentage)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
