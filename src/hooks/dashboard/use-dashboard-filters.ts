import { useEffect, useState } from "react"
import type { DashboardFiltersInput } from "@/lib/dashboard"
import {
  FILTERS_STORAGE_KEY,
  defaultFilters,
} from "@/lib/dashboard/dashboard-constants"
import {
  getMonthDateRange,
  getYearDateRange,
} from "@/lib/dashboard/dashboard-helpers"

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFiltersInput>(() => {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY)

    if (saved) {
      try {
        const parsed = JSON.parse(saved)

        return {
          ...defaultFilters,
          ...parsed,
          contas: Array.isArray(parsed.contas) ? parsed.contas : [],
          isBionatus:
            parsed.isBionatus === 0 || parsed.isBionatus === 1
              ? parsed.isBionatus
              : null,
        }
      } catch {
        return defaultFilters
      }
    }

    return defaultFilters
  })

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    let nextDataInicio: string | null = null
    let nextDataFim: string | null = null

    if (filters.ano && filters.mes) {
      const range = getMonthDateRange(filters.ano, filters.mes)
      nextDataInicio = range.dataInicio
      nextDataFim = range.dataFim
    } else if (filters.ano) {
      const range = getYearDateRange(filters.ano)
      nextDataInicio = range.dataInicio
      nextDataFim = range.dataFim
    }

    setFilters((prev) => {
      if (
        prev.dataInicio === nextDataInicio &&
        prev.dataFim === nextDataFim
      ) {
        return prev
      }

      return {
        ...prev,
        dataInicio: nextDataInicio,
        dataFim: nextDataFim,
      }
    })
  }, [filters.ano, filters.mes])

  const hasComparison = !!filters.ano && !!filters.mes

  return {
    filters,
    setFilters,
    hasComparison,
  }
}