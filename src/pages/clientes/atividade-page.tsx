import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, ClienteNomeCell, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesAtividade } from "@/hooks/clientes/use-clientes-atividade"
import { formatCurrencyBRL } from "@/lib/format"
import type { ClienteAtividadeRow } from "@/lib/clientes/clientes-atividade"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

const columns: ClientesTableColumn<ClienteAtividadeRow>[] = [
  {
    key: "nome",
    header: "Cliente",
    render: (row) => <ClienteNomeCell nome={row.nome} cnpj={row.cnpj} codigoCliente={row.codigoCliente} />,
    sortValue: (row) => row.nome,
  },
  {
    key: "dias",
    header: "Dias sem comprar",
    align: "right",
    render: (row) => (row.diasDesdeUltimaCompra === null ? "—" : row.diasDesdeUltimaCompra),
    sortValue: (row) => row.diasDesdeUltimaCompra,
  },
  {
    key: "data_ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
    sortValue: (row) => (row.dataUltimaCompra ? new Date(row.dataUltimaCompra).getTime() : null),
  },
  {
    key: "valor_ultima",
    header: "Valor última compra",
    align: "right",
    render: (row) => (row.valorUltimaCompra === null ? "—" : formatCurrencyBRL(row.valorUltimaCompra)),
    sortValue: (row) => row.valorUltimaCompra,
  },
  {
    key: "total",
    header: "Total comprado (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
    sortValue: (row) => row.valorTotalLiquido,
  },
  {
    key: "qtd",
    header: "Qtd. pedidos",
    align: "right",
    render: (row) => row.qtdPedidos,
    sortValue: (row) => row.qtdPedidos,
  },
  {
    key: "ticket",
    header: "Ticket médio",
    align: "right",
    render: (row) => (row.ticketMedio === null ? "—" : formatCurrencyBRL(row.ticketMedio)),
    sortValue: (row) => row.ticketMedio,
  },
]

export default function AtividadePage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesAtividade()

  return (
    <AppShell title="Atividade de Clientes" subtitle="Recência e histórico de compras por cliente">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <ClientesDataTable
          columns={columns}
          rows={rows}
          loading={loading}
          getRowKey={(row) => row.cnpj}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>
    </AppShell>
  )
}
