// src/lib/dashboard/mappers.ts

import type {
  DashboardKpis,
  DashboardKpisComparison,
  DashboardMetricDailyPoint,
  DashboardMonthOption,
  DashboardProjectionDailyPoint,
  DashboardSimulacaoRow,
  DashboardSimulacaoRowRaw,
} from "./types"
import { toNumber, toNullableNumber } from "./rpc-helpers"

type DashboardKpisRowRaw = {
  faturamento?: unknown
  pedidos?: unknown
  ticket_medio?: unknown
  positivacoes?: unknown
}

type DashboardKpisComparisonRowRaw = {
  faturamento_atual?: unknown
  faturamento_mes_anterior?: unknown
  faturamento_ano_anterior?: unknown
  pedidos_atual?: unknown
  pedidos_mes_anterior?: unknown
  pedidos_ano_anterior?: unknown
  ticket_medio_atual?: unknown
  ticket_medio_mes_anterior?: unknown
  ticket_medio_ano_anterior?: unknown
  positivacoes_atual?: unknown
  positivacoes_mes_anterior?: unknown
  positivacoes_ano_anterior?: unknown
}

type DashboardMonthOptionRaw = {
  mes: number | string
  ano_mes: string
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

type DashboardProjectionDailyPointRaw = {
  data_ref: string
  dia: number | string
  dia_util: boolean | null
  dia_util_numero_mes: number | string | null
  projecao_acumulada: number | string | null
  fechamento_projetado: number | string | null
  percentual_referencia: number | string | null
}

export function mapDashboardKpisRow(row: unknown): DashboardKpis {
  const value = (row ?? {}) as DashboardKpisRowRaw

  return {
    faturamento: toNumber(value.faturamento),
    pedidos: toNumber(value.pedidos),
    ticket_medio: toNumber(value.ticket_medio),
    positivacoes: toNumber(value.positivacoes),
  }
}

export function mapDashboardKpisComparisonRow(
  row: unknown
): DashboardKpisComparison {
  const value = (row ?? {}) as DashboardKpisComparisonRowRaw

  return {
    faturamento_atual: toNumber(value.faturamento_atual),
    faturamento_mes_anterior: toNumber(value.faturamento_mes_anterior),
    faturamento_ano_anterior: toNumber(value.faturamento_ano_anterior),
    pedidos_atual: toNumber(value.pedidos_atual),
    pedidos_mes_anterior: toNumber(value.pedidos_mes_anterior),
    pedidos_ano_anterior: toNumber(value.pedidos_ano_anterior),
    ticket_medio_atual: toNumber(value.ticket_medio_atual),
    ticket_medio_mes_anterior: toNumber(value.ticket_medio_mes_anterior),
    ticket_medio_ano_anterior: toNumber(value.ticket_medio_ano_anterior),
    positivacoes_atual: toNumber(value.positivacoes_atual),
    positivacoes_mes_anterior: toNumber(value.positivacoes_mes_anterior),
    positivacoes_ano_anterior: toNumber(value.positivacoes_ano_anterior),
  }
}

export function mapDashboardMonthOption(
  row: DashboardMonthOptionRaw
): DashboardMonthOption {
  return {
    mes: toNumber(row.mes),
    ano_mes: row.ano_mes ?? "",
  }
}

export function mapDashboardMetricDailyPoint(
  row: DashboardMetricDailyPointRaw
): DashboardMetricDailyPoint {
  return {
    data_ref: row.data_ref,
    dia: toNumber(row.dia),
    faturamento: toNumber(row.faturamento),
    pedidos: toNumber(row.pedidos),
    ticket_medio: toNumber(row.ticket_medio),
    positivacoes: toNumber(row.positivacoes),
    positivacoes_acumuladas: toNumber(row.positivacoes_acumuladas),
    dia_util: Boolean(row.dia_util),
    dia_util_numero_mes: toNullableNumber(row.dia_util_numero_mes),
  }
}

export function mapDashboardProjectionDailyPoint(
  row: DashboardProjectionDailyPointRaw
): DashboardProjectionDailyPoint {
  return {
    data_ref: row.data_ref,
    dia: toNumber(row.dia),
    dia_util: Boolean(row.dia_util),
    dia_util_numero_mes: toNullableNumber(row.dia_util_numero_mes),
    projecao_acumulada: toNullableNumber(row.projecao_acumulada),
    fechamento_projetado: toNullableNumber(row.fechamento_projetado),
    percentual_referencia: toNullableNumber(row.percentual_referencia),
  }
}

export function mapDashboardSimulacaoRow(
  row: DashboardSimulacaoRowRaw
): DashboardSimulacaoRow {
  return {
    id: toNumber(row.id),
    data_ref: row.data_ref,
    dia_mes: toNumber(row.dia_mes),
    dia_util: toNullableNumber(row.dia_util),
    ano: toNumber(row.ano),
    mes: toNumber(row.mes),
    nome_mes: row.nome_mes,
    contas: toNumber(row.contas),
    conta_nome: row.conta_nome,
    valor: toNumber(row.valor),
    observacao: row.observacao ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}