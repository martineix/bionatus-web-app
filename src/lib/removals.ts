// src/lib/removals.ts
import { supabase } from "./supabase"

export type RemovalRow = {
  id: number
  sistema: number
  pedido: number
  motivo: string | null
  removedByNome: string
  createdAt: string
}

type RemovalRowRaw = {
  id: number | string
  sistema: number | string
  pedido: number | string
  motivo: string | null
  removed_by_nome: string | null
  created_at: string
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapRemovalRow(row: RemovalRowRaw): RemovalRow {
  return {
    id: toNumber(row.id),
    sistema: toNumber(row.sistema),
    pedido: toNumber(row.pedido),
    motivo: row.motivo,
    removedByNome: row.removed_by_nome ?? "Desconhecido",
    createdAt: row.created_at,
  }
}

export async function getRemovals(): Promise<RemovalRow[]> {
  const { data, error } = await supabase.rpc("list_removals")

  if (error) {
    throw error
  }

  return ((data ?? []) as RemovalRowRaw[]).map(mapRemovalRow)
}

export async function insertRemoval(
  sistema: number,
  pedido: number,
  motivo: string
): Promise<RemovalRow> {
  const { data, error } = await supabase.rpc("insert_removal", {
    p_sistema: sistema,
    p_pedido: pedido,
    p_motivo: motivo.trim() === "" ? null : motivo,
  })

  if (error) {
    throw error
  }

  return mapRemovalRow((data as RemovalRowRaw[])[0])
}

export async function deleteRemoval(id: number): Promise<void> {
  const { error } = await supabase.rpc("delete_removal", { p_id: id })

  if (error) {
    throw error
  }
}
