// src/lib/dashboard/simulations.ts

import { supabase } from "../supabase"
import type {
  DashboardSimulacaoDeleteResult,
  DashboardSimulacaoDeleteRowRaw,
  DashboardSimulacaoInput,
  DashboardSimulacaoRow,
  DashboardSimulacaoRowRaw,
  DashboardSimulacaoUpdateInput,
} from "./types"
import { mapDashboardSimulacaoRow } from "./mappers"
import { getFirstRow, toNumber } from "./rpc-helpers"

export async function getDashboardSimulacoes(params: {
  dataInicio: string
  dataFim: string
}): Promise<DashboardSimulacaoRow[]> {
  const { data, error } = await supabase.rpc("get_dashboard_projecoes", {
    p_data_inicio: params.dataInicio,
    p_data_fim: params.dataFim,
  })

  if (error) throw error

  const rows = (data ?? []) as DashboardSimulacaoRowRaw[]
  return rows.map(mapDashboardSimulacaoRow)
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

  if (error) throw error

  const row = getFirstRow<DashboardSimulacaoRowRaw>(data)
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

  if (error) throw error

  const row = getFirstRow<DashboardSimulacaoRowRaw>(data)
  return row ? mapDashboardSimulacaoRow(row) : null
}

export async function deleteDashboardSimulacao(
  id: number
): Promise<DashboardSimulacaoDeleteResult | null> {
  const { data, error } = await supabase.rpc("delete_dashboard_projecao", {
    p_id: id,
  })

  if (error) throw error

  const row = getFirstRow<DashboardSimulacaoDeleteRowRaw>(data)
  if (!row) return null

  return {
    id: toNumber(row.id),
    data_ref: row.data_ref,
    contas: toNumber(row.contas),
    valor: toNumber(row.valor),
    observacao: row.observacao ?? null,
  }
}