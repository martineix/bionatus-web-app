import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  getClientesAberturas,
  getClientesAberturasDetalhe,
  getRepresentantesAbertura,
  type ClienteAberturaDetalheRow,
  type ClienteAberturaPoint,
} from "@/lib/clientes/clientes-aberturas"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

function defaultRange() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: hoje.toISOString().slice(0, 10),
  }
}

export function useClientesAberturas() {
  const { filters, setFilters } = useClientesFilters()
  const [range, setRange] = useState(defaultRange)
  const [points, setPoints] = useState<ClienteAberturaPoint[]>([])
  const [detalhe, setDetalhe] = useState<ClienteAberturaDetalheRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetalhe, setLoadingDetalhe] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [representanteAbertura, setRepresentanteAbertura] = useState<string | null>(null)
  const [representantesOptions, setRepresentantesOptions] = useState<string[]>([])

  useEffect(() => {
    getRepresentantesAbertura()
      .then(setRepresentantesOptions)
      .catch((error) => {
        logger.error("use-clientes-aberturas-representantes", error)
      })
  }, [])

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAberturas(filters, range.dataInicio, range.dataFim, representanteAbertura)
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
  }, [filters, range, representanteAbertura])

  useEffect(() => {
    let mounted = true

    setLoadingDetalhe(true)
    getClientesAberturasDetalhe(filters, range.dataInicio, range.dataFim, representanteAbertura)
      .then((data) => {
        if (mounted) setDetalhe(data)
      })
      .catch((error) => {
        logger.error("use-clientes-aberturas-detalhe", error)
        toast.error("Não foi possível carregar o detalhe dos clientes abertos.")
      })
      .finally(() => {
        if (mounted) setLoadingDetalhe(false)
      })

    return () => {
      mounted = false
    }
  }, [filters, range, representanteAbertura])

  const detalheFiltrado = detalhe.filter((row) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      row.nome.toLowerCase().includes(term) ||
      row.cnpj.includes(term) ||
      (row.codigoCliente?.includes(term) ?? false)
    )
  })

  return {
    points,
    loading,
    detalhe: detalheFiltrado,
    loadingDetalhe,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    range,
    setRange,
    representanteAbertura,
    setRepresentanteAbertura,
    representantesOptions,
  }
}
