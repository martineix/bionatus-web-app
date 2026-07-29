// src/lib/permissions.ts
import { supabase } from "./supabase"

export type Permissions = {
  remocoes: boolean
  dashboardProjecaoCheckbox: boolean
  dashboardSimulacao: boolean
}

export type RolePermissionRow = {
  feature_key: string
  allowed: boolean
}

export async function getMyPermissions(): Promise<Permissions> {
  const { data, error } = await supabase.rpc("get_my_permissions")

  if (error) {
    throw error
  }

  const rows = (data ?? []) as RolePermissionRow[]
  const byKey = new Map(rows.map((row) => [row.feature_key, row.allowed]))

  return {
    remocoes: byKey.get("remocoes") ?? true,
    dashboardProjecaoCheckbox: byKey.get("dashboard_projecao_checkbox") ?? true,
    dashboardSimulacao: byKey.get("dashboard_simulacao") ?? true,
  }
}

export async function listRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.rpc("list_role_permissions")

  if (error) {
    throw error
  }

  return (data ?? []) as RolePermissionRow[]
}

export async function updateRolePermission(
  featureKey: string,
  allowed: boolean
): Promise<void> {
  const { error } = await supabase.rpc("update_role_permission", {
    p_feature_key: featureKey,
    p_allowed: allowed,
  })

  if (error) {
    throw error
  }
}
