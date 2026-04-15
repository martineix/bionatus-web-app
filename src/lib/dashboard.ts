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

export async function getDashboardKpis(
  filters: DashboardFiltersInput
): Promise<DashboardKpis> {
  const { data, error } = await supabase.rpc("get_dashboard_kpis", {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
    p_is_bionatus: filters.isBionatus,
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

export async function getDashboardAvailableMonths(
  ano: number | null
): Promise<DashboardMonthOption[]> {
  const { data, error } = await supabase.rpc("get_dashboard_available_months", {
    p_ano: ano,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map((row: { mes: number | string; ano_mes: string }) => ({
    mes: Number(row.mes),
    ano_mes: row.ano_mes,
  }))
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

  if (error) {
    throw error
  }

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

export async function getDashboardMetricsDaily(
  filters: DashboardFiltersInput
): Promise<DashboardMetricDailyPoint[]> {
  const { data, error } = await supabase.rpc("get_dashboard_metrics_daily", {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
    p_is_bionatus: filters.isBionatus,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: {
      data_ref: string
      dia: number | string
      faturamento: number | string
      pedidos: number | string
      ticket_medio: number | string
      positivacoes: number | string
      positivacoes_acumuladas: number | string
      dia_util: boolean | null
      dia_util_numero_mes: number | string | null
    }) => ({
      data_ref: row.data_ref,
      dia: Number(row.dia),
      faturamento: Number(row.faturamento ?? 0),
      pedidos: Number(row.pedidos ?? 0),
      ticket_medio: Number(row.ticket_medio ?? 0),
      positivacoes: Number(row.positivacoes ?? 0),
      positivacoes_acumuladas: Number(row.positivacoes_acumuladas ?? 0),
      dia_util: Boolean(row.dia_util),
      dia_util_numero_mes:
        row.dia_util_numero_mes === null || row.dia_util_numero_mes === undefined
          ? null
          : Number(row.dia_util_numero_mes),
    })
  )
}

// Busca as informações de atualização do GITHUB

export type GithubUpdate = {
  id: string
  sha: string
  title: string
  date: string
  author: string
}

export async function getGithubUpdates(): Promise<GithubUpdate[]> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-updates`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error("Erro ao buscar updates do GitHub.")
  }

  const json = await response.json()
  return json.updates ?? []
}

// calcular projeção ponderada

export type DashboardProjectionDailyPoint = {
  data_ref: string
  dia: number
  dia_util: boolean
  dia_util_numero_mes: number | null
  projecao_acumulada: number | null
  fechamento_projetado: number | null
  percentual_referencia: number | null
}

export async function getDashboardProjectionDaily(filters: DashboardFiltersInput): Promise<DashboardProjectionDailyPoint[]> {
  
  if (!filters.dataInicio || !filters.dataFim) {
    return []
  }

  const { data, error } = await supabase.rpc("get_dashboard_projection_daily_v4", {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
    p_is_bionatus: filters.isBionatus,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (row: {
      data_ref: string
      dia: number | string
      dia_util: boolean | null
      dia_util_numero_mes: number | string | null
      projecao_acumulada: number | string | null
      fechamento_projetado: number | string | null
      percentual_referencia: number | string | null
    }) => ({
      data_ref: row.data_ref,
      dia: Number(row.dia),
      dia_util: Boolean(row.dia_util),
      dia_util_numero_mes:
        row.dia_util_numero_mes === null || row.dia_util_numero_mes === undefined
          ? null
          : Number(row.dia_util_numero_mes),
      projecao_acumulada:
        row.projecao_acumulada === null || row.projecao_acumulada === undefined
          ? null
          : Number(row.projecao_acumulada),
      fechamento_projetado:
        row.fechamento_projetado === null || row.fechamento_projetado === undefined
          ? null
          : Number(row.fechamento_projetado),
      percentual_referencia:
        row.percentual_referencia === null || row.percentual_referencia === undefined
          ? null
          : Number(row.percentual_referencia),
    })
  )
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

function mapDashboardSimulacaoRow(row: {
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
}): DashboardSimulacaoRow {
  return {
    id: Number(row.id),
    data_ref: row.data_ref,
    dia_mes: Number(row.dia_mes),
    dia_util:
      row.dia_util === null || row.dia_util === undefined
        ? null
        : Number(row.dia_util),
    ano: Number(row.ano),
    mes: Number(row.mes),
    nome_mes: row.nome_mes,
    contas: Number(row.contas),
    conta_nome: row.conta_nome,
    valor: Number(row.valor ?? 0),
    observacao: row.observacao ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getDashboardSimulacoes(params: {
  dataInicio: string
  dataFim: string
}): Promise<DashboardSimulacaoRow[]> {
  const { data, error } = await supabase.rpc("get_dashboard_projecoes", {
    p_data_inicio: params.dataInicio,
    p_data_fim: params.dataFim,
  })

  if (error) {
    throw error
  }

  return (data ?? []).map(mapDashboardSimulacaoRow)
}

export async function insertDashboardSimulacao(
  input: DashboardSimulacaoInput
): Promise<DashboardSimulacaoRow | null> {
  const { data, error } = await supabase.rpc("insert_dashboard_projecao", {
    p_data_ref: input.data_ref,
    p_contas: input.contas,
    p_valor: input.valor,
    p_observacao: input.observacao ?? null,
  })

  if (error) {
    throw error
  }

  const row = data?.[0]
  return row ? mapDashboardSimulacaoRow(row) : null
}

export async function updateDashboardSimulacao(
  input: DashboardSimulacaoUpdateInput
): Promise<DashboardSimulacaoRow | null> {
  const { data, error } = await supabase.rpc("update_dashboard_projecao", {
    p_id: input.id,
    p_data_ref: input.data_ref,
    p_contas: input.contas,
    p_valor: input.valor,
    p_observacao: input.observacao ?? null,
  })

  if (error) {
    throw error
  }

  const row = data?.[0]
  return row ? mapDashboardSimulacaoRow(row) : null
}

export async function deleteDashboardSimulacao(
  id: number
): Promise<DashboardSimulacaoDeleteResult | null> {
  const { data, error } = await supabase.rpc("delete_dashboard_projecao", {
    p_id: id,
  })

  if (error) {
    throw error
  }

  const row = data?.[0]

  if (!row) {
    return null
  }

  return {
    id: Number(row.id),
    data_ref: row.data_ref,
    contas: Number(row.contas),
    valor: Number(row.valor ?? 0),
    observacao: row.observacao ?? null,
  }
}