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