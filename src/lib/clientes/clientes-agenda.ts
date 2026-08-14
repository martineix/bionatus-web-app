import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAgendaRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  representante: string | null
  dataUltimaCompra: string
  intervaloMedioDias: number
  previsaoProximaCompra: string
  cidade: string | null
}

type ClienteAgendaRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  representante: string | null
  data_ultima_compra: string
  intervalo_medio_dias: number | string
  previsao_proxima_compra: string
  cidade: string | null
}

export async function getClientesAgenda(
  ano: number,
  mes: number,
  filters: ClientesFiltersInput,
  representanteNome: string | null,
  cidade: string | null
): Promise<ClienteAgendaRow[]> {
  const { data, error } = await supabase.rpc("get_clientes_agenda", {
    p_ano: ano,
    p_mes: mes,
    ...buildClientesRpcFilters(filters),
    p_representante_nome: representanteNome,
    p_cidade: cidade,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAgendaRowRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    representante: row.representante,
    dataUltimaCompra: row.data_ultima_compra,
    intervaloMedioDias: toNumber(row.intervalo_medio_dias),
    previsaoProximaCompra: row.previsao_proxima_compra,
    cidade: row.cidade,
  }))
}

export async function getCidadesClientes(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_cidades_clientes")

  if (error) throw error

  return ((data ?? []) as { cidade: string }[]).map((row) => row.cidade)
}
