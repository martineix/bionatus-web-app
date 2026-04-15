// src/lib/dashboard/types.ts

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
  contas: number[]
  isBionatus: number | null
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

export type DashboardMonthOption = {
  mes: number
  ano_mes: string
}

export type DashboardMetricDailyPoint = {
  data_ref: string
  dia: number
  faturamento: number
  pedidos: number
  ticket_medio: number
  positivacoes: number
  positivacoes_acumuladas: number
  dia_util: boolean
  dia_util_numero_mes: number | null
}

export type DashboardProjectionDailyPoint = {
  data_ref: string
  dia: number
  dia_util: boolean
  dia_util_numero_mes: number | null
  projecao_acumulada: number | null
  fechamento_projetado: number | null
  percentual_referencia: number | null
}

export type DashboardSimulacaoRow = {
  id: number
  data_ref: string
  dia_mes: number
  dia_util: number | null
  ano: number
  mes: number
  nome_mes: string
  contas: number
  conta_nome: string
  valor: number
  observacao: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DashboardSimulacaoInput = {
  data_ref: string
  contas: number
  valor: number
  observacao?: string | null
}

export type DashboardSimulacaoUpdateInput = {
  id: number
  data_ref: string
  contas: number
  valor: number
  observacao?: string | null
}

export type DashboardSimulacaoDeleteResult = {
  id: number
  data_ref: string
  contas: number
  valor: number
  observacao: string | null
}

/**
 * Tipos "raw" retornados pela RPC, antes do parse.
 */
export type DashboardSimulacaoRowRaw = {
  id: number | string
  data_ref: string
  dia_mes: number | string
  dia_util: number | string | null
  ano: number | string
  mes: number | string
  nome_mes: string
  contas: number | string
  conta_nome: string
  valor: number | string
  observacao: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type DashboardSimulacaoDeleteRowRaw = {
  id: number | string
  data_ref: string
  contas: number | string
  valor: number | string
  observacao: string | null
}

export type GithubUpdate = {
  id: string
  sha: string
  title: string
  date: string
  author: string
}