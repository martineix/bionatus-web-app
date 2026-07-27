// src/components/removals/removal-table.tsx
import { useState } from "react"
import { X } from "lucide-react"
import type { RemovalRow } from "@/lib/removals"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [pendingDelete, setPendingDelete] = useState<RemovalRow | null>(null)

  function confirmDelete(item: RemovalRow) {
    setPendingDelete(item)
  }

  function handleConfirmedDelete() {
    if (pendingDelete) {
      handleDelete(pendingDelete.id)
    }
    setPendingDelete(null)
  }

  return (
    <div className="w-full h-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Remoções cadastradas
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pedidos/notas excluídos das agregações do dashboard.
      </p>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir remoção</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Tem certeza que deseja excluir a remoção do pedido ${pendingDelete.pedido} (${sistemaLabels[pendingDelete.sistema] ?? pendingDelete.sistema})? Essa ação não pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmedDelete}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
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
                    onClick={() => confirmDelete(item)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-300 text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
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
                          onClick={() => confirmDelete(item)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-red-300 text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
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
