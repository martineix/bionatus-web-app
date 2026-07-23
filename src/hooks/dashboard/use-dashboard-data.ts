// src/hooks/dashboard/use-dashboard-data.ts
import { useCallback, useEffect, useRef, useState } from "react"
import { logger } from "@/lib/logger"
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
  const { ano, mes, dataInicio, dataFim, idRepresentante, mercado, contas, isBionatus } = filters

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const contasKey = contas.join(",")

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

  // Cancelamento compartilhado: qualquer chamada nova (filtro, botão Atualizar,
  // intervalo automático, simulação) supera e cancela a anterior, não importa
  // qual delas disparou primeiro — evita que uma resposta antiga sobrescreva
  // uma mais recente.
  const activeRequestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    async function loadYears() {
      try {
        const years = await getDashboardAvailableYears()
        setAvailableYears(years)
      } catch (error) {
        logger.error("use-dashboard-data/loadYears", error)
      }
    }

    loadYears()
  }, [])

  useEffect(() => {
    async function loadMonths() {
      try {
        if (!ano) {
          setAvailableMonths([])
          return
        }

        const months = await getDashboardAvailableMonths(ano)
        setAvailableMonths(months)
      } catch (error) {
        logger.error("use-dashboard-data/loadMonths", error)
      }
    }

    loadMonths()
  }, [ano])

  const loadDashboardData = useCallback(
    async (showLoading = true) => {
      if (!filtersReady) return
      if (!dataInicio || !dataFim) return

      activeRequestRef.current?.abort()
      const controller = new AbortController()
      activeRequestRef.current = controller
      const { signal } = controller

      try {
        if (showLoading) setLoading(true)
        else setRefreshing(true)

        const filtersToQuery: DashboardFiltersInput = {
          ano,
          mes,
          dataInicio,
          dataFim,
          idRepresentante,
          mercado,
          contas,
          isBionatus,
        }

        let previousFilters: DashboardFiltersInput = { ...filtersToQuery, dataInicio: null, dataFim: null }
        let lastYearFilters: DashboardFiltersInput = { ...filtersToQuery, dataInicio: null, dataFim: null }

        if (hasComparison && ano && mes) {
          const currentDate = new Date(ano, mes - 1, 1)
          const previousDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          )

          previousFilters = {
            ...filtersToQuery,
            ...getMonthDateRange(
              previousDate.getFullYear(),
              previousDate.getMonth() + 1
            ),
          }

          lastYearFilters = {
            ...filtersToQuery,
            ...getMonthDateRange(ano - 1, mes),
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
                idRepresentante,
                mercado,
                contas,
                isBionatus,
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

        if (signal.aborted) return

        setKpis(kpisData)
        setKpisComparison(comparisonData)
        setMetricsDaily(metricsData)
        setMetricsPreviousDaily(metricsPreviousData)
        setMetricsLastYearDaily(metricsLastYearData)
        setProjectionDaily(projectionData)
        setLastUpdated(new Date())
      } catch (error) {
        if (!signal.aborted) {
          logger.error("use-dashboard-data/loadDashboardData", error)
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    // contasKey representa contas (array) de forma estável
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersReady, ano, mes, dataInicio, dataFim, idRepresentante, mercado, contasKey, isBionatus, hasComparison]
  )

  useEffect(() => {
    if (!filtersReady) return
    if (!dataInicio || !dataFim) return
    loadDashboardData(true)
  }, [filtersReady, ano, mes, dataInicio, dataFim, idRepresentante, mercado, contasKey, isBionatus, loadDashboardData])

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
