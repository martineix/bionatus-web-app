import { ChevronDown, ChevronUp } from "lucide-react"
import { formatCurrencyBRL, formatNumberBR } from "@/lib/format"
import type { ClienteHistoricoItemRow, ClienteHistoricoItemTipo } from "@/lib/clientes/clientes-historico-compras"

function formatDateBR(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}

function TipoBadge({ tipo }: { tipo: ClienteHistoricoItemTipo }) {
  if (tipo === "devolucao") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
        Devolução
      </span>
    )
  }
  if (tipo === "bonificacao") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        Bonificação
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-emerald-950/40 dark:text-[#7DD3A2]">
      Venda
    </span>
  )
}

type HistoricoPedidoCardProps = {
  pedido: string
  itens: ClienteHistoricoItemRow[]
  isOpen: boolean
  onToggle: () => void
}

export function HistoricoPedidoCard({ pedido, itens, isOpen, onToggle }: HistoricoPedidoCardProps) {
  const primeiroItem = itens[0]
  const totalPedido = itens.reduce((soma, item) => soma + item.valorTotal, 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D0D9D6] dark:border-slate-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#006426] dark:text-[#7DD3A2]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pedido {pedido}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {primeiroItem ? formatDateBR(primeiroItem.dataPedido) : "—"}
            {` · ${itens.length} item${itens.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <p className="shrink-0 text-sm font-semibold text-[#006426] dark:text-[#7DD3A2]">
          {formatCurrencyBRL(totalPedido)}
        </p>
      </button>

      {isOpen && (
        <div className="divide-y divide-slate-100 bg-white px-4 dark:divide-slate-800 dark:bg-slate-950">
          {itens.map((item) => (
            <div key={item.itemId} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.produto ?? "Produto sem descrição"}
                </p>
                <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrencyBRL(item.valorTotal)}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                {item.marca && <span className="truncate">{item.marca}</span>}
                <TipoBadge tipo={item.tipo} />
                <span className="shrink-0">
                  {formatNumberBR(item.quantidade)} und{item.quantidade === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
