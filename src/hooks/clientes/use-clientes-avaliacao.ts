import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAvaliacao, type ClienteAvaliacaoRow } from "@/lib/clientes/clientes-avaliacao"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesAvaliacao() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteAvaliacaoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAvaliacao(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-avaliacao", error)
        toast.error("Não foi possível carregar a avaliação dos clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters])

  const filteredRows = rows.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      row.nome.toLowerCase().includes(term) ||
      row.cnpj.includes(term) ||
      (row.codigoCliente?.includes(term) ?? false)
    )
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
