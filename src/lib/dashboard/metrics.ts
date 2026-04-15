// src/lib/dashboard/metrics.ts

import { supabase } from "../supabase"
import type {
  DashboardFiltersInput,
  DashboardKpis,
  DashboardKpisComparison,
  DashboardMetricDailyPoint,
  DashboardMonthOption,
} from "./types"
import {
  mapDashboardKpisComparisonRow,
  mapDashboardKpisRow,
  mapDashboardMetricDailyPoint,
  mapDashboardMonthOption,
} from "./mappers"
import {
  buildDashboardRpcFilters,
  getFirstRow,
  toNumber,
} from "./rpc-helpers"

type DashboardYearRowRaw = {
  ano: number | string
}

type DashboardMonthOptionRaw = {
  mes: number | string
  ano_mes: string
}

export async function getDashboardKpis(
  filters: DashboardFiltersInput
): Promise<DashboardKpis> {
  const { data, error } = await supabase.rpc(
    "get_dashboard_kpis",
    buildDashboardRpcFilters(filters)
  )

  if (error) throw error

  const row = getFirstRow(data)
  return mapDashboardKpisRow(row)
}

export async function getDashboardAvailableYears(): Promise<number[]> {
  const { data, error } = await supabase.rpc("get_dashboard_available_years")

  if (error) throw error

  const rows = (data ?? []) as DashboardYearRowRaw[]
  return rows.map((row) => toNumber(row.ano))
}

export async function getDashboardAvailableMonths(
  ano: number | null
): Promise<DashboardMonthOption[]> {
  const { data, error } = await supabase.rpc("get_dashboard_available_months", {
    p_ano: ano,
  })

  if (error) throw error

  const rows = (data ?? []) as DashboardMonthOptionRaw[]
  return rows.map(mapDashboardMonthOption)
}

export async function getDashboardKpisComparison(params: {
  dataInicio: string
  dataFim: string
  dataInicioMesAnterior: string
  dataFimMesAnterior: string
  dataInicioAnoAnterior: string
  dataFimAnoAnterior: string
  idRepresentante: number | null
  mercado: number | null
  contas: number[]
  isBionatus: number | null
}): Promise<DashboardKpisComparison> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis_comparison", {
    p_data_inicio: params.dataInicio,
    p_data_fim: params.dataFim,
    p_data_inicio_mes_anterior: params.dataInicioMesAnterior,
    p_data_fim_mes_anterior: params.dataFimMesAnterior,
    p_data_inicio_ano_anterior: params.dataInicioAnoAnterior,
    p_data_fim_ano_anterior: params.dataFimAnoAnterior,
    p_id_representante: params.idRepresentante,
    p_mercado: params.mercado,
    p_contas: params.contas,
    p_is_bionatus: params.isBionatus,
  })

  if (error) throw error

  const row = getFirstRow(data)
  return mapDashboardKpisComparisonRow(row)
}

type DashboardMetricDailyPointRaw = {
  data_ref: string
  dia: number | string
  faturamento: number | string
  pedidos: number | string
  ticket_medio: number | string
  positivacoes: number | string
  positivacoes_acumuladas: number | string
  dia_util: boolean | null
  dia_util_numero_mes: number | string | null
}

export async function getDashboardMetricsDaily(
  filters: DashboardFiltersInput
): Promise<DashboardMetricDailyPoint[]> {
  const { data, error } = await supabase.rpc(
    "get_dashboard_metrics_daily",
    buildDashboardRpcFilters(filters)
  )

  if (error) throw error

  const rows = (data ?? []) as DashboardMetricDailyPointRaw[]
  return rows.map(mapDashboardMetricDailyPoint)
}