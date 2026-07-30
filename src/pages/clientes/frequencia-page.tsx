import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesFrequencia } from "@/hooks/clientes/use-clientes-frequencia"
import type { ClienteFrequenciaRow } from "@/lib/clientes/clientes-frequencia"

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

const columns: ClientesTableColumn<ClienteFrequenciaRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome, sortValue: (row) => row.nome },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "Sem histórico suficiente" : row.intervaloMedioDias),
    sortValue: (row) => row.intervaloMedioDias,
  },
  {
    key: "ultima",
    header: "Última compra",
    align: "right",
    render: (row) => formatDateBR(row.dataUltimaCompra),
    sortValue: (row) => (row.dataUltimaCompra ? new Date(row.dataUltimaCompra).getTime() : null),
  },
  {
    key: "previsao",
    header: "Previsão próxima compra",
    align: "right",
    render: (row) => (row.previsaoProximaCompra === null ? "—" : formatDateBR(row.previsaoProximaCompra)),
    sortValue: (row) => (row.previsaoProximaCompra ? new Date(row.previsaoProximaCompra).getTime() : null),
  },
]

export default function FrequenciaPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesFrequencia()

  return (
    <AppShell title="Frequência de Compra" subtitle="Intervalo médio entre compras e previsão da próxima">
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
