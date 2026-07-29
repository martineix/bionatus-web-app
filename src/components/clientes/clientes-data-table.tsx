import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export type ClientesTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: "left" | "right" | "center"
}

type ClientesDataTableProps<T> = {
  columns: ClientesTableColumn<T>[]
  rows: T[]
  loading: boolean
  getRowKey: (row: T) => string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  emptyMessage?: string
  searchPlaceholder?: string
}

function alignClass(align: ClientesTableColumn<unknown>["align"]) {
  if (align === "right") return "text-right"
  if (align === "center") return "text-center"
  return "text-left"
}

export function ClientesDataTable<T>({
  columns,
  rows,
  loading,
  getRowKey,
  searchTerm,
  onSearchTermChange,
  emptyMessage = "Nenhum cliente encontrado.",
  searchPlaceholder = "Buscar por cliente ou CNPJ...",
}: ClientesDataTableProps<T>) {
  return (
    <div className="w-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="mb-4 h-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 ${alignClass(col.align)}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={getRowKey(row)} className="border-b border-slate-100 dark:border-slate-900">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-3 py-3 text-slate-700 dark:text-slate-200 ${alignClass(col.align)}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
