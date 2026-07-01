// src/lib/dashboard/breakdown.ts
//
// ─── SQL NECESSÁRIO NO SUPABASE ──────────────────────────────────────────────
//
// 1) get_dashboard_breakdown_by_conta
//    NÃO filtra por p_mercado nem p_contas — sempre retorna todos os canais.
//
//    CREATE OR REPLACE FUNCTION get_dashboard_breakdown_by_conta(
//      p_data_inicio      date DEFAULT NULL,
//      p_data_fim         date DEFAULT NULL,
//      p_id_representante int  DEFAULT NULL
//    )
//    RETURNS TABLE (
//      mercado       int,
//      mercado_nome  text,
//      conta         int,
//      conta_nome    text,
//      faturamento   numeric,
//      pedidos       bigint,
//      ticket_medio  numeric,
//      positivacoes  bigint
//    ) ...
//
// 2) get_dashboard_breakdown_by_fabricante
//    NÃO filtra por p_is_bionatus — sempre retorna todos os fabricantes.
//
//    CREATE OR REPLACE FUNCTION get_dashboard_breakdown_by_fabricante(
//      p_data_inicio      date  DEFAULT NULL,
//      p_data_fim         date  DEFAULT NULL,
//      p_id_representante int   DEFAULT NULL,
//      p_mercado          int   DEFAULT NULL,
//      p_contas           int[] DEFAULT '{}'
//    )
//    RETURNS TABLE (
//      is_bionatus     int,
//      fabricante_nome text,
//      faturamento     numeric
//    ) ...
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../supabase"
import type {
  DashboardFiltersInput,
  DashboardBreakdownContaRow,
  DashboardBreakdownContaRowRaw,
  DashboardFabricanteBreakdownRow,
  DashboardFabricanteBreakdownRowRaw,
} from "./types"
import {
  mapDashboardBreakdownContaRow,
  mapDashboardFabricanteBreakdownRow,
} from "./mappers"

export async function getDashboardBreakdownByConta(
  filters: DashboardFiltersInput
): Promise<DashboardBreakdownContaRow[]> {
  if (!filters.dataInicio || !filters.dataFim) return []

  const { data, error } = await supabase.rpc(
    "get_dashboard_breakdown_by_conta",
    {
      p_data_inicio: filters.dataInicio,
      p_data_fim: filters.dataFim,
      p_id_representante: filters.idRepresentante,
    }
  )

  if (error) throw error

  return (data ?? []).map((row: DashboardBreakdownContaRowRaw) =>
    mapDashboardBreakdownContaRow(row)
  )
}

export async function getDashboardFabricanteBreakdown(
  filters: DashboardFiltersInput
): Promise<DashboardFabricanteBreakdownRow[]> {
  if (!filters.dataInicio || !filters.dataFim) return []

  const { data, error } = await supabase.rpc(
    "get_dashboard_breakdown_by_fabricante",
    {
      p_data_inicio: filters.dataInicio,
      p_data_fim: filters.dataFim,
      p_id_representante: filters.idRepresentante,
      p_mercado: filters.mercado,
      p_contas: filters.contas,
    }
  )

  if (error) throw error

  return (data ?? []).map((row: DashboardFabricanteBreakdownRowRaw) =>
    mapDashboardFabricanteBreakdownRow(row)
  )
}
