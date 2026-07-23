// src/components/removals/removal-table.tsx
import { X } from "lucide-react"
import type { RemovalRow } from "@/lib/removals"

type RemovalTableProps = {
  removals: RemovalRow[]
  loading: boolean
  handleDelete: (id: number) => void
}

const sistemaLabels: Record<number, string> = {
  1: "Nexus",
  2: "Sankhya",
}

function formatDateTimeBR(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function RemovalTable({ removals, loading, handleDelete }: RemovalTableProps) {
  function confirmDelete(id: number) {
    if (window.confirm("Tem certeza que deseja excluir esta remoção?")) {
      handleDelete(id)
    }
  }

  return (
    <div className="w-full h-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Remoções cadastradas
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pedidos/notas excluídos das agregações do dashboard.
      </p>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Carregando...
        </div>
      ) : removals.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nenhuma remoção cadastrada.
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="mt-5 space-y-3 sm:hidden">
            {removals.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {sistemaLabels[item.sistema] ?? item.sistema} · Pedido {item.pedido}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.motivo || "Sem motivo informado"}
                  </p>

                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Removido por {item.removedByNome} em {formatDateTimeBR(item.createdAt)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmDelete(item.id)}
                    className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                    aria-label="Excluir remoção"
                    title="Excluir"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Tablet */}
          <div className="mt-5 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Sistema
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Pedido
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Motivo
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Removido por
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Data
                  </th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {removals.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-900"
                  >
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {sistemaLabels[item.sistema] ?? item.sistema}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.pedido}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.motivo || "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {item.removedByNome}
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                      {formatDateTimeBR(item.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => confirmDelete(item.id)}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                          aria-label="Excluir remoção"
                          title="Excluir"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
