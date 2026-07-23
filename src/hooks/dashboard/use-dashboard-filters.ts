import { useCallback, useEffect, useState } from "react"
import { z } from "zod"
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

const dashboardFiltersSchema = z.object({
  ano: z.number().nullable(),
  mes: z.number().nullable(),
  dataInicio: z.string().nullable(),
  dataFim: z.string().nullable(),
  idRepresentante: z.number().nullable(),
  mercado: z.number().nullable(),
  contas: z.array(z.number()),
  isBionatus: z.union([z.literal(0), z.literal(1), z.null()]),
})

function getInitialFilters(): DashboardFiltersInput {
  const saved = localStorage.getItem(FILTERS_STORAGE_KEY)
  if (!saved) return defaultFilters

  try {
    const parsed = JSON.parse(saved)
    const result = dashboardFiltersSchema.safeParse(parsed)
    if (result.success) return result.data

    return {
      ...defaultFilters,
      ...dashboardFiltersSchema.partial().parse(parsed),
    }
  } catch {
    return defaultFilters
  }
}

function withDerivedDates(filters: DashboardFiltersInput): DashboardFiltersInput {
  if (filters.ano && filters.mes) {
    return { ...filters, ...getMonthDateRange(filters.ano, filters.mes) }
  }

  if (filters.ano) {
    return { ...filters, ...getYearDateRange(filters.ano) }
  }

  return { ...filters, dataInicio: null, dataFim: null }
}

export function useDashboardFilters() {
  const [filters, setRawFilters] = useState<DashboardFiltersInput>(() =>
    withDerivedDates(getInitialFilters())
  )
  const [filtersReady, setFiltersReady] = useState(false)

  const setFilters = useCallback(
    (update: React.SetStateAction<DashboardFiltersInput>) => {
      setRawFilters((prev) => {
        const next =
          typeof update === "function"
            ? (update as (prev: DashboardFiltersInput) => DashboardFiltersInput)(prev)
            : update

        return withDerivedDates(next)
      })
    },
    []
  )

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
  }, [setFilters])

  useEffect(() => {
    if (!filtersReady) return
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  }, [filters, filtersReady])

  const hasComparison = !!filters.ano && !!filters.mes

  return { filters, setFilters, hasComparison, filtersReady, }
}