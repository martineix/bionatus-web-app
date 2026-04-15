// src/lib/dashboard/rpc-helpers.ts
import type { DashboardFiltersInput } from "./types"

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildDashboardRpcFilters(filters: DashboardFiltersInput) {
  return {
    p_data_inicio: filters.dataInicio,
    p_data_fim: filters.dataFim,
    p_id_representante: filters.idRepresentante,
    p_mercado: filters.mercado,
    p_contas: filters.contas,
    p_is_bionatus: filters.isBionatus,
  }
}

export function getFirstRow<T>(data: T[] | null | undefined): T | null {
  return data?.[0] ?? null
}