// src/components/dashboard/dashboard-chart-section.tsx
import type { Dispatch, SetStateAction } from "react"
import DashboardSalesChart from "@/components/ui/myComponents/dashboard-sales-chart"
import type {
  DashboardMetricDailyPoint,
  DashboardProjectionDailyPoint,
} from "@/lib/dashboard"
import type { DashboardChartPreferences } from "@/lib/dashboard/dashboard-constants"

type DashboardChartSectionProps = {
  metricsDaily: DashboardMetricDailyPoint[]
  metricsPreviousDaily: DashboardMetricDailyPoint[]
  metricsLastYearDaily: DashboardMetricDailyPoint[]
  projectionDaily: DashboardProjectionDailyPoint[]
  loading: boolean
  chartPreferences: DashboardChartPreferences
  setChartPreferences: Dispatch<SetStateAction<DashboardChartPreferences>>
}

export function DashboardChartSection({
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    loading,
    chartPreferences,
    setChartPreferences,
}: DashboardChartSectionProps) {
    return (
        <DashboardSalesChart
            data={metricsDaily}
            previousData={metricsPreviousDaily}
            lastYearData={metricsLastYearDaily}
            projectionData={projectionDaily}
            loading={loading}
            viewMode={chartPreferences.viewMode}
            metricMode={chartPreferences.metricMode}
            dayMode={chartPreferences.dayMode}
            showAnoAnterior={chartPreferences.showAnoAnterior}
            showProjecao={chartPreferences.showProjecao}
            onViewModeChange={(value) =>
                setChartPreferences((prev) => ({ ...prev, viewMode: value }))
            }
            onMetricModeChange={(value) =>
                setChartPreferences((prev) => ({ ...prev, metricMode: value }))
            }
            onDayModeChange={(value) =>
                setChartPreferences((prev) => ({ ...prev, dayMode: value }))
            }
            onShowAnoAnteriorChange={(value) =>
                setChartPreferences((prev) => ({
                    ...prev,
                    showAnoAnterior: value,
                }))
            }
            onShowProjecaoChange={(value) =>
                setChartPreferences((prev) => ({
                    ...prev,
                    showProjecao: value,
                }))
            }
        />
    )
}