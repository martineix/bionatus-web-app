// src/hooks/dashboard/use-dashboard-data.ts
import { useCallback, useEffect, useState } from "react"
import {
  getDashboardAvailableMonths,
  getDashboardAvailableYears,
  getDashboardKpis,
  getDashboardKpisComparison,
  getDashboardMetricsDaily,
  getDashboardProjectionDaily,
  type DashboardFiltersInput,
  type DashboardKpis,
  type DashboardKpisComparison,
  type DashboardMetricDailyPoint,
  type DashboardProjectionDailyPoint,
  type DashboardMonthOption,
} from "@/lib/dashboard"
import { getMonthDateRange } from "@/lib/dashboard/dashboard-helpers"

type UseDashboardDataParams = {
  filters: DashboardFiltersInput
  hasComparison: boolean
  filtersReady?: boolean
}

export function useDashboardData({ filters, hasComparison, filtersReady}: UseDashboardDataParams) {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [kpisComparison, setKpisComparison] = useState<DashboardKpisComparison | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableMonths, setAvailableMonths] = useState<DashboardMonthOption[]>([])
  const [metricsDaily, setMetricsDaily] = useState<DashboardMetricDailyPoint[]>([])
  const [metricsPreviousDaily, setMetricsPreviousDaily] = useState<DashboardMetricDailyPoint[]>([])
  const [metricsLastYearDaily, setMetricsLastYearDaily] = useState<DashboardMetricDailyPoint[]>([])
  const [projectionDaily, setProjectionDaily] = useState<DashboardProjectionDailyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function loadYears() {
      try {
        const years = await getDashboardAvailableYears()
        setAvailableYears(years)
      } catch (error) {
        console.error("Erro ao buscar anos disponíveis:", error)
      }
    }

    loadYears()
  }, [])

  useEffect(() => {
    async function loadMonths() {
      try {
        if (!filters.ano) {
          setAvailableMonths([])
          return
        }

        const months = await getDashboardAvailableMonths(filters.ano)
        setAvailableMonths(months)
      } catch (error) {
        console.error("Erro ao buscar meses disponíveis:", error)
      }
    }

    loadMonths()
  }, [filters.ano])

  const loadDashboardData = useCallback(
    async (showLoading = true) => {
      if (!filtersReady) return
      if (!filters.dataInicio || !filters.dataFim) return

      try {
        if (showLoading) setLoading(true)
        else setRefreshing(true)

        const filtersToQuery = { ...filters }

        let previousFilters: DashboardFiltersInput = { ...filters, dataInicio: null, dataFim: null, }

        let lastYearFilters: DashboardFiltersInput = { ...filters, dataInicio: null, dataFim: null, }

        if (hasComparison && filters.ano && filters.mes) {
          const currentDate = new Date(filters.ano, filters.mes - 1, 1)
          const previousDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          )

          previousFilters = {
            ...filters,
            ...getMonthDateRange(
              previousDate.getFullYear(),
              previousDate.getMonth() + 1
            ),
          }

          lastYearFilters = {
            ...filters,
            ...getMonthDateRange(filters.ano - 1, filters.mes),
          }
        }

        const comparisonPromise =
          hasComparison && filtersToQuery.dataInicio && filtersToQuery.dataFim
            ? getDashboardKpisComparison({
                dataInicio: filtersToQuery.dataInicio,
                dataFim: filtersToQuery.dataFim,
                dataInicioMesAnterior: previousFilters.dataInicio!,
                dataFimMesAnterior: previousFilters.dataFim!,
                dataInicioAnoAnterior: lastYearFilters.dataInicio!,
                dataFimAnoAnterior: lastYearFilters.dataFim!,
                idRepresentante: filters.idRepresentante,
                mercado: filters.mercado,
                contas: filters.contas,
                isBionatus: filters.isBionatus,
              })
            : Promise.resolve(null)

        const previousMetricsPromise = hasComparison
          ? getDashboardMetricsDaily(previousFilters)
          : Promise.resolve([] as DashboardMetricDailyPoint[])

        const lastYearMetricsPromise = hasComparison
          ? getDashboardMetricsDaily(lastYearFilters)
          : Promise.resolve([] as DashboardMetricDailyPoint[])

        const projectionPromise =
          hasComparison && filtersToQuery.dataInicio && filtersToQuery.dataFim
            ? getDashboardProjectionDaily(filtersToQuery)
            : Promise.resolve([] as DashboardProjectionDailyPoint[])

        const [
          kpisData,
          comparisonData,
          metricsData,
          metricsPreviousData,
          metricsLastYearData,
          projectionData,
        ] = await Promise.all([
          getDashboardKpis(filtersToQuery),
          comparisonPromise,
          getDashboardMetricsDaily(filtersToQuery),
          previousMetricsPromise,
          lastYearMetricsPromise,
          projectionPromise,
        ])

        setKpis(kpisData)
        setKpisComparison(comparisonData)
        setMetricsDaily(metricsData)
        setMetricsPreviousDaily(metricsPreviousData)
        setMetricsLastYearDaily(metricsLastYearData)
        setProjectionDaily(projectionData)
        setLastUpdated(new Date())
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filters, hasComparison, filtersReady]
  )

  useEffect(() => {
    if (!filtersReady) return
    if (!filters.dataInicio || !filters.dataFim) return

    loadDashboardData(true)
  }, [filtersReady, filters.dataInicio, filters.dataFim, loadDashboardData])

  useEffect(() => {
    if (!filtersReady) return
    
    const interval = setInterval(() => { loadDashboardData(false) }, 15 * 60 * 1000)

    return () => clearInterval(interval)
  }, [filtersReady, loadDashboardData])

  return {
    kpis,
    kpisComparison,
    availableYears,
    availableMonths,
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    loading,
    refreshing,
    lastUpdated,
    loadDashboardData,
  }
}