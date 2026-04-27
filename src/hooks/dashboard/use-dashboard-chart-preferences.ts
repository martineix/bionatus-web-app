// src/hooks/dashboard/use-dashboard-chart-preferences.ts
import { useEffect, useState } from "react"
import { z } from "zod"
import {
  CHART_PREFERENCES_STORAGE_KEY,
  defaultChartPreferences,
  type DashboardChartPreferences,
} from "@/lib/dashboard/dashboard-constants"

const chartPreferencesSchema = z.object({
  viewMode: z.enum(["daily", "cumulative"]),
  metricMode: z.enum(["faturamento", "pedidos", "ticket_medio", "positivacoes"]),
  dayMode: z.enum(["calendar", "business"]),
  showAnoAnterior: z.boolean(),
  showProjecao: z.boolean(),
})

function loadChartPreferences(): DashboardChartPreferences {
  const saved = localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY)
  if (!saved) return defaultChartPreferences

  try {
    const parsed = JSON.parse(saved)
    const result = chartPreferencesSchema.safeParse(parsed)
    if (result.success) return result.data
    return { ...defaultChartPreferences, ...chartPreferencesSchema.partial().parse(parsed) }
  } catch {
    return defaultChartPreferences
  }
}

export function useDashboardChartPreferences() {
  const [chartPreferences, setChartPreferences] =
    useState<DashboardChartPreferences>(loadChartPreferences)

  useEffect(() => {
    localStorage.setItem(
      CHART_PREFERENCES_STORAGE_KEY,
      JSON.stringify(chartPreferences)
    )
  }, [chartPreferences])

  return {
    chartPreferences,
    setChartPreferences,
  }
}