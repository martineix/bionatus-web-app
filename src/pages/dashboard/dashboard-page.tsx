// src/pages/dashboard-page.tsx
import { useEffect, useState } from "react"
import AppShell from "@/components/layout/app-shell"
import DashboardFilters from "@/components/ui/myComponents/dashboard-filters"
import { DashboardKpisSection } from "@/components/dashboard/dashboard-kpis-section"
import { DashboardChartSection } from "@/components/dashboard/dashboard-chart-section"
import { DashboardSimulationSection } from "@/components/dashboard/dashboard-simulation-section"
import { DashboardBreakdownSection } from "@/components/dashboard/dashboard-breakdown-section"
import { useDashboardFilters } from "@/hooks/dashboard/use-dashboard-filters"
import { useDashboardChartPreferences } from "@/hooks/dashboard/use-dashboard-chart-preferences"
import { useDashboardData } from "@/hooks/dashboard/use-dashboard-data"
import { useDashboardSimulations } from "@/hooks/dashboard/use-dashboard-simulations"
import { useDashboardBreakdown } from "@/hooks/dashboard/use-dashboard-breakdown"
import { getMyProfile } from "@/lib/profile"
import { getMyPermissions, type Permissions } from "@/lib/permissions"

export default function DashboardPage() {
  const { filters, setFilters, hasComparison, filtersReady } =
    useDashboardFilters()

  const [isRepresentanteView, setIsRepresentanteView] = useState(false)
  const [permissions, setPermissions] = useState<Permissions>({
    remocoes: true,
    dashboardProjecaoCheckbox: true,
    dashboardSimulacao: true,
  })

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))

    getMyPermissions()
      .then(setPermissions)
      .catch(() => {})
  }, [])

  const { chartPreferences, setChartPreferences } =
    useDashboardChartPreferences()

  const {
    kpis,
    kpisComparison,
    availableYears,
    availableMonths,
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    pendenteFaturamento,
    metaRepresentante,
    loading,
    refreshing,
    lastUpdated,
    loadDashboardData,
  } = useDashboardData({ filters, hasComparison, filtersReady, isRepresentanteView })

  const {
    breakdownByConta,
    breakdownByFabricante,
    loading: breakdownLoading,
    error: breakdownError,
  } = useDashboardBreakdown({ filters, filtersReady })

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

  const { loadSimulacoes } = simulations

  useEffect(() => {
    if (!filtersReady) return

    if (filters.dataInicio && filters.dataFim) {
      loadSimulacoes()
    }
  }, [filtersReady, filters.dataInicio, filters.dataFim, loadSimulacoes])

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
          pendenteFaturamento={pendenteFaturamento}
          metaRepresentante={metaRepresentante}
        />

        <DashboardChartSection
          metricsDaily={metricsDaily}
          metricsPreviousDaily={metricsPreviousDaily}
          metricsLastYearDaily={metricsLastYearDaily}
          projectionDaily={projectionDaily}
          loading={loading}
          chartPreferences={chartPreferences}
          setChartPreferences={setChartPreferences}
          hideProjecao={!permissions.dashboardProjecaoCheckbox}
        />

        <DashboardBreakdownSection
          breakdownByConta={breakdownByConta}
          breakdownByFabricante={breakdownByFabricante}
          loading={breakdownLoading}
          error={breakdownError}
        />

        {canShowProjectionControls && permissions.dashboardSimulacao && <DashboardSimulationSection {...simulations} />}
      </div>
    </AppShell>
  )
}