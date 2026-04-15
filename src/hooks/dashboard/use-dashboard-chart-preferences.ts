// src/hooks/dashboard/use-dashboard-chart-preferences.ts
import { useEffect, useState } from "react"
import {
  CHART_PREFERENCES_STORAGE_KEY,
  defaultChartPreferences,
  type DashboardChartPreferences,
} from "@/lib/dashboard/dashboard-constants"

export function useDashboardChartPreferences() {
  const [chartPreferences, setChartPreferences] =
    useState<DashboardChartPreferences>(() => {
      const saved = localStorage.getItem(CHART_PREFERENCES_STORAGE_KEY)

      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return {
            ...defaultChartPreferences,
            ...parsed,
          }
        } catch {
          return defaultChartPreferences
        }
      }

      return defaultChartPreferences
    })

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