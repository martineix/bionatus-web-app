import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export type ClientesTableColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: "left" | "right" | "center"
  sortValue?: (row: T) => string | number | null
}

type SortDirection = "asc" | "desc"

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

const PAGE_SIZE = 50

function alignClass(align: ClientesTableColumn<unknown>["align"]) {
  if (align === "right") return "text-right"
  if (align === "center") return "text-center"
  return "text-left"
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), "pt-BR")
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
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [rows])

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows

    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return rows

    return [...rows].sort((a, b) => {
      const result = compareValues(column.sortValue!(a), column.sortValue!(b))
      return sortDirection === "asc" ? result : -result
    })
  }, [rows, sortKey, sortDirection, columns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRows = sortedRows.slice(
    clampedPageIndex * PAGE_SIZE,
    clampedPageIndex * PAGE_SIZE + PAGE_SIZE
  )

  function handleSortClick(column: ClientesTableColumn<T>) {
    if (!column.sortValue) return

    if (sortKey !== column.key) {
      setSortKey(column.key)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortKey(null)
      setSortDirection("asc")
    }

    setPageIndex(0)
  }

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
        <>
          <div className="max-h-[70vh] overflow-auto rounded-xl">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {columns.map((col) => {
                    const sortable = !!col.sortValue
                    const isActive = sortKey === col.key

                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSortClick(col)}
                        className={`sticky top-0 z-10 bg-white px-3 py-2 font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300 ${alignClass(col.align)} ${
                          sortable ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            col.align === "right" ? "flex-row-reverse" : ""
                          }`}
                        >
                          {col.header}
                          {sortable &&
                            (isActive ? (
                              sortDirection === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                            ))}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr
                    key={getRowKey(row)}
                    className={`border-b border-slate-100 hover:bg-slate-100 dark:border-slate-900 dark:hover:bg-slate-800 ${
                      index % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3 text-slate-700 dark:text-slate-200 ${alignClass(col.align)} ${
                          col.align === "right" ? "tabular-nums" : ""
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>
              Página {clampedPageIndex + 1} de {pageCount}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={clampedPageIndex === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPageIndex >= pageCount - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700"
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
