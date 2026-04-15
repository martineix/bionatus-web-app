// src/pages/dashboard-page.tsx
import { useEffect } from "react"
import AppShell from "@/components/layout/app-shell"
import DashboardFilters from "@/components/ui/myComponents/dashboard-filters"
import { DashboardKpisSection } from "@/components/dashboard/dashboard-kpis-section"
import { DashboardChartSection } from "@/components/dashboard/dashboard-chart-section"
import { DashboardSimulationSection } from "@/components/dashboard/dashboard-simulation-section"
import { useDashboardFilters } from "@/hooks/dashboard/use-dashboard-filters"
import { useDashboardChartPreferences } from "@/hooks/dashboard/use-dashboard-chart-preferences"
import { useDashboardData } from "@/hooks/dashboard/use-dashboard-data"
import { useDashboardSimulations } from "@/hooks/dashboard/use-dashboard-simulations"

export default function DashboardPage() {
  const { filters, setFilters, hasComparison } = useDashboardFilters()
  const { chartPreferences, setChartPreferences } = useDashboardChartPreferences()

  const {
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
  } = useDashboardData({ filters, hasComparison })

  const simulations = useDashboardSimulations({
    ano: filters.ano,
    mes: filters.mes,
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim,
    onAfterChange: () => loadDashboardData(false),
  })

  const canShowProjectionControls =
  chartPreferences.showProjecao &&
  chartPreferences.viewMode === "cumulative" &&
  chartPreferences.dayMode === "business" &&
  chartPreferences.metricMode === "faturamento"

  useEffect(() => {
    if (filters.dataInicio && filters.dataFim) {
      simulations.loadSimulacoes()
    }
  }, [filters.dataInicio, filters.dataFim, simulations])

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão Geral"
      onRefresh={() => loadDashboardData(false)}
      refreshing={refreshing}
      lastUpdated={lastUpdated}
    >
      <div className="space-y-6">
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          availableYears={availableYears}
          availableMonths={availableMonths}
        />

        <DashboardKpisSection
          loading={loading}
          hasComparison={hasComparison}
          kpis={kpis}
          kpisComparison={kpisComparison}
        />

        <DashboardChartSection
          metricsDaily={metricsDaily}
          metricsPreviousDaily={metricsPreviousDaily}
          metricsLastYearDaily={metricsLastYearDaily}
          projectionDaily={projectionDaily}
          loading={loading}
          chartPreferences={chartPreferences}
          setChartPreferences={setChartPreferences}
        />

        {canShowProjectionControls && (
          <DashboardSimulationSection {...simulations} />
        )}

      </div>
    </AppShell>
  )
}