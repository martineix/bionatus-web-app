import { useState } from "react"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { ClientesDataTable, ClienteNomeCell, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import { useClientesCurvaAbc } from "@/hooks/clientes/use-clientes-curva-abc"
import { formatCurrencyBRL, formatPercentBR } from "@/lib/format"
import type { ClienteCurvaAbcRow } from "@/lib/clientes/clientes-curva-abc"

const CLASSE_BADGE: Record<ClienteCurvaAbcRow["classe"], string> = {
  A: "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  C: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

type ClasseFiltro = "todas" | ClienteCurvaAbcRow["classe"]

const CLASSE_OPTIONS: { value: ClasseFiltro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
]

const columns: ClientesTableColumn<ClienteCurvaAbcRow>[] = [
  {
    key: "nome",
    header: "Cliente",
    render: (row) => <ClienteNomeCell nome={row.nome} cnpj={row.cnpj} codigoCliente={row.codigoCliente} />,
    sortValue: (row) => row.nome,
  },
  {
    key: "valor",
    header: "Valor total (vida)",
    align: "right",
    render: (row) => formatCurrencyBRL(row.valorTotalLiquido),
    sortValue: (row) => row.valorTotalLiquido,
  },
  {
    key: "participacao",
    header: "% Participação",
    align: "right",
    render: (row) => formatPercentBR(row.pctParticipacao),
    sortValue: (row) => row.pctParticipacao,
  },
  {
    key: "acumulado",
    header: "% Acumulado",
    align: "right",
    render: (row) => formatPercentBR(row.pctAcumulado),
    sortValue: (row) => row.pctAcumulado,
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
    sortValue: (row) => row.classe,
  },
  {
    key: "intervalo",
    header: "Intervalo médio (dias)",
    align: "right",
    render: (row) => (row.intervaloMedioDias === null ? "—" : row.intervaloMedioDias),
    sortValue: (row) => row.intervaloMedioDias,
  },
]

export default function CurvaAbcPage() {
  const { rows, loading, searchTerm, setSearchTerm, filters, setFilters } = useClientesCurvaAbc()
  const [classeFiltro, setClasseFiltro] = useState<ClasseFiltro>("todas")

  const rowsFiltradas =
    classeFiltro === "todas" ? rows : rows.filter((row) => row.classe === classeFiltro)

  return (
    <AppShell title="Curva ABC" subtitle="Classificação de clientes por valor">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
            Classe
          </span>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
            {CLASSE_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setClasseFiltro(option.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  index > 0 ? "border-l border-slate-200 dark:border-slate-700" : ""
                } ${
                  classeFiltro === option.value
                    ? "bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ClientesDataTable
          columns={columns}
          rows={rowsFiltradas}
          loading={loading}
          getRowKey={(row) => row.cnpj}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
        />
      </div>
    </AppShell>
  )
}
