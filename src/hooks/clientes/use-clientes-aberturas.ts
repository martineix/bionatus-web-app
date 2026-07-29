import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getClientesAberturas, type ClienteAberturaPoint } from "@/lib/clientes/clientes-aberturas"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

function defaultRange() {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setMonth(inicio.getMonth() - 11)
  inicio.setDate(1)

  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: hoje.toISOString().slice(0, 10),
  }
}

export function useClientesAberturas() {
  const { filters, setFilters } = useClientesFilters()
  const [range, setRange] = useState(defaultRange)
  const [points, setPoints] = useState<ClienteAberturaPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAberturas(filters, range.dataInicio, range.dataFim)
      .then((data) => {
        if (mounted) setPoints(data)
      })
      .catch((error) => {
        logger.error("use-clientes-aberturas", error)
        toast.error("Não foi possível carregar as aberturas de clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [filters, range])

  return { points, loading, filters, setFilters, range, setRange }
}
