import { useCallback, useEffect, useState } from "react"
import { logger } from "@/lib/logger"
import {
  getDashboardBreakdownByConta,
  getDashboardFabricanteBreakdown,
} from "@/lib/dashboard/breakdown"
import type { DashboardBreakdownContaRow, DashboardFabricanteBreakdownRow } from "@/lib/dashboard/types"
import type { DashboardFiltersInput } from "@/lib/dashboard"

type Params = {
  filters: DashboardFiltersInput
  filtersReady?: boolean
}

export function useDashboardBreakdown({ filters, filtersReady }: Params) {
  const { dataInicio, dataFim, idRepresentante, mercado, contas, isBionatus } = filters

  const [breakdownByConta, setBreakdownByConta] = useState<DashboardBreakdownContaRow[]>([])
  const [breakdownByFabricante, setBreakdownByFabricante] = useState<DashboardFabricanteBreakdownRow[]>([])
  const [loading, setLoading] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contasKey = contas.join(",")

  const loadBreakdown = useCallback(async (signal?: AbortSignal) => {
    if (!filtersReady || !dataInicio || !dataFim) {
      setBreakdownByConta([])
      setBreakdownByFabricante([])
      return
    }

    try {
      setLoading(true)

      const f: DashboardFiltersInput = {
        ano: null,
        mes: null,
        dataInicio,
        dataFim,
        idRepresentante,
        mercado,
        contas,
        isBionatus,
      }

      const [contaData, fabricanteData] = await Promise.all([
        getDashboardBreakdownByConta(f),
        getDashboardFabricanteBreakdown(f),
      ])

      if (signal?.aborted) return

      setBreakdownByConta(contaData)
      setBreakdownByFabricante(fabricanteData)
    } catch (error) {
      if (!signal?.aborted) {
        logger.error("use-dashboard-breakdown/loadBreakdown", error)
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  // contasKey representa contas (array estável salvo quando o usuário muda canal)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersReady, dataInicio, dataFim, idRepresentante, mercado, contasKey, isBionatus])

  useEffect(() => {
    if (!filtersReady) return

    const controller = new AbortController()
    loadBreakdown(controller.signal)

    return () => controller.abort()
  }, [filtersReady, loadBreakdown])

  return { breakdownByConta, breakdownByFabricante, loading }
}
