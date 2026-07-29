import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesCurvaAbc } from "@/hooks/clientes/use-clientes-curva-abc"
import { formatCurrencyBRL, formatPercentBR } from "@/lib/format"
import type { ClienteCurvaAbcRow } from "@/lib/clientes/clientes-curva-abc"

const CLASSE_BADGE: Record<ClienteCurvaAbcRow["classe"], string> = {
  A: "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  C: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

const columns: ClientesTableColumn<ClienteCurvaAbcRow>[] = [
  { key: "nome", header: "Cliente", render: (row) => row.nome },
  {
    key: "valor",
    header: "Valor total (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
  },
  {
    key: "participacao",
    header: "% Participação",
    align: "right",
    render: (row) => formatPercentBR(row.pctParticipacao),
  },
  {
    key: "acumulado",
    header: "% Acumulado",
    align: "right",
    render: (row) => formatPercentBR(row.pctAcumulado),
  },
  {
    key: "classe",
    header: "Classe",
    align: "center",
    render: (row) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CLASSE_BADGE[row.classe]}`}>
        {row.classe}
      </span>
    ),
  },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "—" : row.intervaloMedioDias),
  },
]

export default function CurvaAbcPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesCurvaAbc()

  return (
    <AppShell title="Curva ABC" subtitle="Classificação de clientes por valor">
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
