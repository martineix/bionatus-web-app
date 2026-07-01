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
  const [breakdownByConta, setBreakdownByConta] = useState<DashboardBreakdownContaRow[]>([])
  const [breakdownByFabricante, setBreakdownByFabricante] = useState<DashboardFabricanteBreakdownRow[]>([])
  const [loading, setLoading] = useState(false)

  const loadBreakdown = useCallback(async () => {
    if (!filtersReady || !filters.dataInicio || !filters.dataFim) {
      setBreakdownByConta([])
      setBreakdownByFabricante([])
      return
    }

    try {
      setLoading(true)

      const [contaData, fabricanteData] = await Promise.all([
        getDashboardBreakdownByConta(filters),
        getDashboardFabricanteBreakdown(filters),
      ])

      setBreakdownByConta(contaData)
      setBreakdownByFabricante(fabricanteData)
    } catch (error) {
      logger.error("use-dashboard-breakdown/loadBreakdown", error)
    } finally {
      setLoading(false)
    }
  }, [filters, filtersReady])

  useEffect(() => {
    if (!filtersReady) return
    loadBreakdown()
  }, [filtersReady, filters.dataInicio, filters.dataFim, loadBreakdown])

  return { breakdownByConta, breakdownByFabricante, loading }
}
