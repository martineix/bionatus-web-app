import { useMemo, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import {
  ClientesDataTable,
  ClienteNomeCell,
  type ClientesTableColumn,
} from "@/components/clientes/clientes-data-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesHistoricoCompras } from "@/hooks/clientes/use-clientes-historico-compras"
import { formatCurrencyBRL, formatNumberBR } from "@/lib/format"
import type { ClienteHistoricoItemRow, ClienteHistoricoItemTipo } from "@/lib/clientes/clientes-historico-compras"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

function ProdutoCell({ produto, marca }: { produto: string | null; marca: string | null }) {
  return (
    <div className="flex flex-col">
      <span>{produto ?? "Produto sem descrição"}</span>
      {marca && <span className="text-xs text-slate-500 dark:text-slate-400">{marca}</span>}
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: ClienteHistoricoItemTipo }) {
  if (tipo === "devolucao") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-slate-800 dark:text-red-300">
        Devolução
      </span>
    )
  }
  if (tipo === "bonificacao") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-slate-800 dark:text-blue-300">
        Bonificação
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
      Venda
    </span>
  )
}

const historicoColumns: ClientesTableColumn<ClienteHistoricoItemRow>[] = [
  {
    key: "data",
    header: "Data",
    render: (row) => formatDateBR(row.dataPedido),
    sortValue: (row) => new Date(row.dataPedido).getTime(),
  },
  {
    key: "produto",
    header: "Produto",
    render: (row) => <ProdutoCell produto={row.produto} marca={row.marca} />,
    sortValue: (row) => row.produto,
  },
  {
    key: "quantidade",
    header: "Qtd.",
    align: "right",
    render: (row) => formatNumberBR(row.quantidade),
    sortValue: (row) => row.quantidade,
  },
  {
    key: "valor_unitario",
    header: "Valor unit.",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorUnitario),
    sortValue: (row) => row.valorUnitario,
  },
  {
    key: "valor_total",
    header: "Valor total",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotal),
    sortValue: (row) => row.valorTotal,
  },
  {
    key: "tipo",
    header: "Tipo",
    align: "center",
    render: (row) => <TipoBadge tipo={row.tipo} />,
    sortValue: (row) => row.tipo,
  },
  {
    key: "representante",
    header: "Representante",
    render: (row) => row.representante ?? "—",
    sortValue: (row) => row.representante,
  },
]

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

  const itensFiltrados = itens.filter((item) => {
    const term = itemSearchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      (item.produto?.toLowerCase().includes(term) ?? false) ||
      (item.marca?.toLowerCase().includes(term) ?? false)
    )
  })

  const resumo = useMemo(() => {
    const totalGasto = itens.filter((i) => i.tipo === "venda").reduce((soma, i) => soma + i.valorTotal, 0)
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

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Total gasto (vendas)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrencyBRL(resumo.totalGasto)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Pedidos
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdPedidos}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                    Itens
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {resumo.qtdItens}
                  </p>
                </div>
              </div>
            </section>

            <ClientesDataTable
              columns={historicoColumns}
              rows={itensFiltrados}
              loading={loadingItens}
              getRowKey={(row) => row.itemId}
              searchTerm={itemSearchTerm}
              onSearchTermChange={setItemSearchTerm}
              searchPlaceholder="Buscar por produto ou marca..."
              emptyMessage="Nenhum item encontrado para este cliente."
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
