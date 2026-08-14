import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  getClientesAgenda,
  getCidadesClientes,
  type ClienteAgendaRow,
} from "@/lib/clientes/clientes-agenda"
import { getRepresentantesAbertura } from "@/lib/clientes/clientes-aberturas"
import { useClientesFilters } from "./use-clientes-filters"
import { logger } from "@/lib/logger"

function anoMesAtual() {
  const hoje = new Date()
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

export function useClientesAgenda() {
  const { filters, setFilters } = useClientesFilters()
  const [{ ano, mes }, setAnoMes] = useState(anoMesAtual)
  const [representanteNome, setRepresentanteNome] = useState<string | null>(null)
  const [representantesOptions, setRepresentantesOptions] = useState<string[]>([])
  const [cidade, setCidade] = useState<string | null>(null)
  const [cidadesOptions, setCidadesOptions] = useState<string[]>([])
  const [rows, setRows] = useState<ClienteAgendaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRepresentantesAbertura()
      .then(setRepresentantesOptions)
      .catch((error) => {
        logger.error("use-clientes-agenda-representantes", error)
      })

    getCidadesClientes()
      .then(setCidadesOptions)
      .catch((error) => {
        logger.error("use-clientes-agenda-cidades", error)
      })
  }, [])

  useEffect(() => {
    let mounted = true

    setLoading(true)
    getClientesAgenda(ano, mes, filters, representanteNome, cidade)
      .then((data) => {
        if (mounted) setRows(data)
      })
      .catch((error) => {
        logger.error("use-clientes-agenda", error)
        toast.error("Não foi possível carregar a agenda de clientes.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [ano, mes, filters, representanteNome, cidade])

  function goToPreviousMonth() {
    setAnoMes((atual) =>
      atual.mes === 1 ? { ano: atual.ano - 1, mes: 12 } : { ano: atual.ano, mes: atual.mes - 1 }
    )
  }

  function goToNextMonth() {
    setAnoMes((atual) =>
      atual.mes === 12 ? { ano: atual.ano + 1, mes: 1 } : { ano: atual.ano, mes: atual.mes + 1 }
    )
  }

  function goToCurrentMonth() {
    setAnoMes(anoMesAtual())
  }

  return {
    ano,
    mes,
    rows,
    loading,
    filters,
    setFilters,
    representanteNome,
    setRepresentanteNome,
    representantesOptions,
    cidade,
    setCidade,
    cidadesOptions,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  }
}
