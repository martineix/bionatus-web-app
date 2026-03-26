import { supabase } from "./supabase"

export type DashboardKpis = {
  faturamento: number
  pedidos: number
  ticket_medio: number
  positivacoes: number
}

export type DashboardFiltersInput = {
  ano: number | null
  mes: number | null
  dataInicio: string | null
  dataFim: string | null
  idRepresentante: number | null
  mercado: number | null
  contas: number | null
}

export type DashboardDailySalesPoint = {
  data_ref: string
  dia: number
  faturamento: number
}

export type DashboardKpisComparison = {
  faturamento_atual: number
  faturamento_mes_anterior: number
  faturamento_ano_anterior: number
  pedidos_atual: number
  pedidos_mes_anterior: number
  pedidos_ano_anterior: number
  ticket_medio_atual: number
  ticket_medio_mes_anterior: number
  ticket_medio_ano_anterior: number
  positivacoes_atual: number
  positivacoes_mes_anterior: number
  positivacoes_ano_anterior: number
}

export async function getDashboardKpis(filters: DashboardFiltersInput): Promise<DashboardKpis> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
  })

  if (error) {
    throw error
  }

  const row = data?.[0]

  if (!row) {
    return {
      faturamento: 0,
      pedidos: 0,
      ticket_medio: 0,
      positivacoes: 0,
    }
  }

  return {
    faturamento: Number(row.faturamento ?? 0),
    pedidos: Number(row.pedidos ?? 0),
    ticket_medio: Number(row.ticket_medio ?? 0),
    positivacoes: Number(row.positivacoes ?? 0),
  }
}

export async function getDashboardAvailableYears(): Promise<number[]> {
  const { data, error } = await supabase.rpc("get_dashboard_available_years")

  if (error) {
    throw error
  }

  return (data ?? []).map((row: { ano: number | string }) => Number(row.ano))
}

export type DashboardMonthOption = {
  mes: number
  ano_mes: string
}

export async function getDashboardAvailableMonths(ano: number | null): Promise<DashboardMonthOption[]> {
  const { data, error } = await supabase.rpc("get_dashboard_available_months", { p_ano: ano })

  if (error) {
    throw error
  }

  return (data ?? []).map((row: { mes: number | string; ano_mes: string }) => ({
    mes: Number(row.mes),
    ano_mes: row.ano_mes,
  }))
}

export async function getDashboardSalesDaily(filters: DashboardFiltersInput): Promise<DashboardDailySalesPoint[]> {
  const { data, error } = await supabase.rpc("get_dashboard_sales_daily", {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: {
      data_ref: string
      dia: number | string
      faturamento: number | string
    }) => ({
      data_ref: row.data_ref,
      dia: Number(row.dia),
      faturamento: Number(row.faturamento ?? 0),
    })
  )
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
  contas: number | null
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
  })

  if (error) throw error

  const row = data?.[0]

  if (!row) {
    return {
      faturamento_atual: 0,
      faturamento_mes_anterior: 0,
      faturamento_ano_anterior: 0,
      pedidos_atual: 0,
      pedidos_mes_anterior: 0,
      pedidos_ano_anterior: 0,
      ticket_medio_atual: 0,
      ticket_medio_mes_anterior: 0,
      ticket_medio_ano_anterior: 0,
      positivacoes_atual: 0,
      positivacoes_mes_anterior: 0,
      positivacoes_ano_anterior: 0,
    }
  }

  return {
    faturamento_atual: Number(row.faturamento_atual ?? 0),
    faturamento_mes_anterior: Number(row.faturamento_mes_anterior ?? 0),
    faturamento_ano_anterior: Number(row.faturamento_ano_anterior ?? 0),
    pedidos_atual: Number(row.pedidos_atual ?? 0),
    pedidos_mes_anterior: Number(row.pedidos_mes_anterior ?? 0),
    pedidos_ano_anterior: Number(row.pedidos_ano_anterior ?? 0),
    ticket_medio_atual: Number(row.ticket_medio_atual ?? 0),
    ticket_medio_mes_anterior: Number(row.ticket_medio_mes_anterior ?? 0),
    ticket_medio_ano_anterior: Number(row.ticket_medio_ano_anterior ?? 0),
    positivacoes_atual: Number(row.positivacoes_atual ?? 0),
    positivacoes_mes_anterior: Number(row.positivacoes_mes_anterior ?? 0),
    positivacoes_ano_anterior: Number(row.positivacoes_ano_anterior ?? 0),
  }
}