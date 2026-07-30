import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, ClienteNomeCell, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { StarRating } from "@/components/clientes/star-rating"
import { useClientesAvaliacao } from "@/hooks/clientes/use-clientes-avaliacao"
import type { ClienteAvaliacaoRow } from "@/lib/clientes/clientes-avaliacao"

const columns: ClientesTableColumn<ClienteAvaliacaoRow>[] = [
  {
    key: "nome",
    header: "Cliente",
    render: (row) => <ClienteNomeCell nome={row.nome} cnpj={row.cnpj} codigoCliente={row.codigoCliente} />,
    sortValue: (row) => row.nome,
  },
  {
    key: "atividade",
    header: "Atividade",
    align: "center",
    render: (row) => <StarRating value={row.estrelasAtividade} />,
    sortValue: (row) => row.estrelasAtividade,
  },
  {
    key: "frequencia",
    header: "Frequência",
    align: "center",
    render: (row) => <StarRating value={row.estrelasFrequencia} />,
    sortValue: (row) => row.estrelasFrequencia,
  },
  {
    key: "ticket",
    header: "Ticket Médio",
    align: "center",
    render: (row) => <StarRating value={row.estrelasTicketMedio} />,
    sortValue: (row) => row.estrelasTicketMedio,
  },
  {
    key: "geral",
    header: "Nota Geral",
    align: "center",
    render: (row) => <StarRating value={row.notaGeral} />,
    sortValue: (row) => row.notaGeral,
  },
]

export default function AvaliacaoPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesAvaliacao()

  return (
    <AppShell title="Avaliação de Clientes" subtitle="Notas por atividade, frequência e ticket médio">
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
