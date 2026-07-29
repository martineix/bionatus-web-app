import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAtividade, type ClienteAtividadeRow } from "@/lib/clientes/clientes-atividade"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

export function useClientesAtividade() {
  const { filters, setFilters } = useClientesFilters()
  const [rows, setRows] = useState<ClienteAtividadeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAtividade(filters)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-atividade", error)
        toast.error("Não foi possível carregar a atividade dos clientes.")
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
    return row.nome.toLowerCase().includes(term) || row.cnpj.includes(term)
  })

  return { rows: filteredRows, loading, searchTerm, setSearchTerm, filters, setFilters }
}
