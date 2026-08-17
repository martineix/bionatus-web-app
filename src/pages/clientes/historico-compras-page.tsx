import { useMemo, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import { ClienteNomeCell } from "@/components/clientes/clientes-data-table"
import { HistoricoPedidoCard } from "@/components/clientes/historico-compras-pedido-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesHistoricoCompras } from "@/hooks/clientes/use-clientes-historico-compras"
import { formatCurrencyBRL } from "@/lib/format"

function tamanhoFonteValor(valorFormatado: string) {
  if (valorFormatado.length <= 9) return "text-lg"
  if (valorFormatado.length <= 13) return "text-base"
  return "text-sm"
}

export default function HistoricoComprasPage() {
  const {
    termo,
    setTermo,
    resultados,
    buscando,
    clienteSelecionado,
    itens,
    loadingItens,
    selecionarCliente,
    limparSelecao,
  } = useClientesHistoricoCompras()
  const [itemSearchTerm, setItemSearchTerm] = useState("")
  const [pedidosAbertos, setPedidosAbertos] = useState<Set<string>>(new Set())

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const term = itemSearchTerm.trim().toLowerCase()
      if (!term) return true
      return (
        (item.produto?.toLowerCase().includes(term) ?? false) ||
        (item.marca?.toLowerCase().includes(term) ?? false) ||
        (item.codigoProduto?.toLowerCase().includes(term) ?? false) ||
        (item.ean?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [itens, itemSearchTerm])

  const pedidosAgrupados = useMemo(() => {
    const grupos = new Map<string, typeof itensFiltrados>()
    for (const item of itensFiltrados) {
      const lista = grupos.get(item.pedido) ?? []
      lista.push(item)
      grupos.set(item.pedido, lista)
    }
    return Array.from(grupos.entries()).map(([pedido, itensDoPedido]) => ({
      pedido,
      itens: itensDoPedido,
    }))
  }, [itensFiltrados])

  const resumo = useMemo(() => {
    const totalGasto = itens
      .filter((i) => i.tipo !== "bonificacao")
      .reduce((soma, i) => soma + i.valorTotal, 0)
    const qtdPedidos = new Set(itens.map((i) => i.pedido)).size
    return { totalGasto, qtdPedidos, qtdItens: itens.length }
  }, [itens])

  return (
    <AppShell
      title="Histórico de Compras"
      subtitle="Busque um cliente e veja todo o histórico de itens comprados por ele"
    >
      <div className="space-y-6">
        {!clienteSelecionado ? (
          <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Buscar por nome, CNPJ ou código..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {buscando && (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            )}

            {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum cliente encontrado.
              </p>
            )}

            {!buscando && resultados.length > 0 && (
              <div className="mt-3 space-y-2">
                {resultados.map((resultado) => (
                  <button
                    type="button"
                    key={resultado.cnpj}
                    onClick={() => selecionarCliente(resultado)}
                    className="flex w-full items-center rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <ClienteNomeCell
                      nome={resultado.nome}
                      cnpj={resultado.cnpj}
                      codigoCliente={resultado.codigoCliente}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={limparSelecao}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#297B49] hover:underline dark:text-[#7DD3A2]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Nova busca
              </button>

              <ClienteNomeCell
                nome={clienteSelecionado.nome}
                cnpj={clienteSelecionado.cnpj}
                codigoCliente={clienteSelecionado.codigoCliente}
              />

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="truncate text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    $ Compras
                  </p>
                  <p
                    className={`mt-1 truncate font-semibold text-slate-900 dark:text-slate-100 ${tamanhoFonteValor(formatCurrencyBRL(resumo.totalGasto))}`}
                  >
                    {formatCurrencyBRL(resumo.totalGasto)}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="truncate text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    # Pedidos
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdPedidos}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="truncate text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    # Itens
                  </p>
                  <p className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdItens}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <input
                type="text"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
                placeholder="Buscar por produto, marca, código ou EAN..."
                className="mb-4 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] sm:max-w-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />

              {loadingItens ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : pedidosAgrupados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum item encontrado para este cliente.
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidosAgrupados.map((grupo) => (
                    <HistoricoPedidoCard
                      key={grupo.pedido}
                      pedido={grupo.pedido}
                      itens={grupo.itens}
                      isOpen={pedidosAbertos.has(grupo.pedido)}
                      onToggle={() =>
                        setPedidosAbertos((prev) => {
                          const proximo = new Set(prev)
                          if (proximo.has(grupo.pedido)) proximo.delete(grupo.pedido)
                          else proximo.add(grupo.pedido)
                          return proximo
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
