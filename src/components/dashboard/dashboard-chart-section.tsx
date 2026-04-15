// src/components/dashboard/dashboard-chart-section.tsx
import DashboardSalesChart from "@/components/ui/myComponents/dashboard-sales-chart"

export function DashboardChartSection({
    metricsDaily,
    metricsPreviousDaily,
    metricsLastYearDaily,
    projectionDaily,
    loading,
    chartPreferences,
    setChartPreferences,
}: any) {
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
                setChartPreferences((prev: any) => ({ ...prev, viewMode: value }))
            }
            onMetricModeChange={(value) =>
                setChartPreferences((prev: any) => ({ ...prev, metricMode: value }))
            }
            onDayModeChange={(value) =>
                setChartPreferences((prev: any) => ({ ...prev, dayMode: value }))
            }
            onShowAnoAnteriorChange={(value) =>
                setChartPreferences((prev: any) => ({
                    ...prev,
                    showAnoAnterior: value,
                }))
            }
            onShowProjecaoChange={(value) =>
                setChartPreferences((prev: any) => ({
                    ...prev,
                    showProjecao: value,
                }))
            }
        />
    )
}