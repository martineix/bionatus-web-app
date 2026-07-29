import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAvaliacaoRow = {
  cnpj: string
  nome: string
  estrelasAtividade: number | null
  estrelasFrequencia: number | null
  estrelasTicketMedio: number | null
  notaGeral: number | null
}

type ClienteAvaliacaoRowRaw = {
  cnpj: string
  nome: string | null
  estrelas_atividade: number | string | null
  estrelas_frequencia: number | string | null
  estrelas_ticket_medio: number | string | null
  nota_geral: number | string | null
}

function mapRow(row: ClienteAvaliacaoRowRaw): ClienteAvaliacaoRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    estrelasAtividade: toNullableNumber(row.estrelas_atividade),
    estrelasFrequencia: toNullableNumber(row.estrelas_frequencia),
    estrelasTicketMedio: toNullableNumber(row.estrelas_ticket_medio),
    notaGeral: toNullableNumber(row.nota_geral),
  }
}

export async function getClientesAvaliacao(
  filters: ClientesFiltersInput
): Promise<ClienteAvaliacaoRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_avaliacao",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteAvaliacaoRowRaw[]).map(mapRow)
}
