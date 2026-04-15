// src/lib/dashboard/projections.ts

import { supabase } from "../supabase"
import type {
  DashboardFiltersInput,
  DashboardProjectionDailyPoint,
} from "./types"
import { mapDashboardProjectionDailyPoint } from "./mappers"
import { buildDashboardRpcFilters } from "./rpc-helpers"

type DashboardProjectionDailyPointRaw = {
  data_ref: string
  dia: number | string
  dia_util: boolean | null
  dia_util_numero_mes: number | string | null
  projecao_acumulada: number | string | null
  fechamento_projetado: number | string | null
  percentual_referencia: number | string | null
}

export async function getDashboardProjectionDaily(
  filters: DashboardFiltersInput
): Promise<DashboardProjectionDailyPoint[]> {
  if (!filters.dataInicio || !filters.dataFim) {
    return []
  }

  const { data, error } = await supabase.rpc(
    "get_dashboard_projection_daily_v4",
    buildDashboardRpcFilters(filters)
  )

  if (error) throw error

  const rows = (data ?? []) as DashboardProjectionDailyPointRaw[]
  return rows.map(mapDashboardProjectionDailyPoint)
}