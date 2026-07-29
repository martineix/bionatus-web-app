import type { ClientesFiltersInput } from "./clientes-filters-types"

export function buildClientesRpcFilters(filters: ClientesFiltersInput) {
  return {
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
  }
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
