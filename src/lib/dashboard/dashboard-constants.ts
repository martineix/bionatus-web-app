import type { DashboardFiltersInput } from "@/lib/dashboard"

export const FILTERS_STORAGE_KEY = "dashboard-filters"
export const CHART_PREFERENCES_STORAGE_KEY = "dashboard-chart-preferences"

export const defaultFilters: DashboardFiltersInput = {
  ano: null,
  mes: null,
  dataInicio: null,
  dataFim: null,
  idRepresentante: null,
  mercado: null,
  contas: [],
  isBionatus: null,
}

export const channelOptions = [
  { value: 1, label: "1 - Marcas Próprias" },
  { value: 2, label: "2 - Licitações" },
  { value: 3, label: "3 - Varejo" },
  { value: 4, label: "4 - Redes" },
  { value: 5, label: "5 - Distribuição" },
  { value: 6, label: "6 - Televendas" },
  { value: 7, label: "7 - Outros" },
] as const

export type ChartViewMode = "daily" | "cumulative"
export type ChartMetricMode = "faturamento" | "pedidos" | "ticket_medio" | "positivacoes"
export type ChartDayMode = "calendar" | "business"

export type DashboardChartPreferences = {
  viewMode: ChartViewMode
  metricMode: ChartMetricMode
  dayMode: ChartDayMode
  showAnoAnterior: boolean
  showProjecao: boolean
}

export const defaultChartPreferences: DashboardChartPreferences = {
  viewMode: "daily",
  metricMode: "faturamento",
  dayMode: "calendar",
  showAnoAnterior: false,
  showProjecao: false,
}