import { useEffect, useState } from "react"
import type { DashboardFiltersInput } from "@/lib/dashboard"
import { logger } from "@/lib/logger"
import {
  getDashboardAvailableMonths,
  getDashboardAvailableYears,
} from "@/lib/dashboard"
import {
  FILTERS_STORAGE_KEY,
  defaultFilters,
} from "@/lib/dashboard/dashboard-constants"
import {
  getMonthDateRange,
  getYearDateRange,
} from "@/lib/dashboard/dashboard-helpers"

function getInitialFilters(): DashboardFiltersInput {
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
}

export function useDashboardFilters() {
  const [filters, setFilters] = useState<DashboardFiltersInput>(getInitialFilters)
  const [filtersReady, setFiltersReady] = useState(false)

  useEffect(() => {
    async function initializeFilters() {
      try {
        const saved = localStorage.getItem(FILTERS_STORAGE_KEY)

        // Se já houver filtro salvo, não sobrescreve
        if (saved) {
          setFiltersReady(true)
          return
        }

        const years = await getDashboardAvailableYears()

        if (!years.length) {
          setFiltersReady(true)
          return
        }

        const latestYear = Math.max(...years)
        const months = await getDashboardAvailableMonths(latestYear)

        if (!months.length) {
          setFilters((prev) => ({
            ...prev,
            ano: latestYear,
          }))
          setFiltersReady(true)
          return
        }

        const latestMonth = Math.max(...months.map((item) => item.mes))

        setFilters((prev) => ({
          ...prev,
          ano: latestYear,
          mes: latestMonth,
        }))

        setFiltersReady(true)
      } catch (error) {
        logger.error("use-dashboard-filters/initializeFilters", error)
        setFiltersReady(true)
      }
    }

    initializeFilters()
  }, [])

  useEffect(() => {
    if (!filtersReady) return
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  }, [filters, filtersReady])

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

  return { filters, setFilters, hasComparison, filtersReady, }
}