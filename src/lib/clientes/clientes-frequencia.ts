import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteFrequenciaRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  qtdPedidos: number
  intervaloMedioDias: number | null
  dataUltimaCompra: string | null
  previsaoProximaCompra: string | null
}

type ClienteFrequenciaRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  qtd_pedidos: number | string
  intervalo_medio_dias: number | string | null
  data_ultima_compra: string | null
  previsao_proxima_compra: string | null
}

function mapRow(row: ClienteFrequenciaRowRaw): ClienteFrequenciaRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    qtdPedidos: toNumber(row.qtd_pedidos),
    intervaloMedioDias: toNullableNumber(row.intervalo_medio_dias),
    dataUltimaCompra: row.data_ultima_compra,
    previsaoProximaCompra: row.previsao_proxima_compra,
  }
}

export async function getClientesFrequencia(
  filters: ClientesFiltersInput
): Promise<ClienteFrequenciaRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_frequencia",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteFrequenciaRowRaw[]).map(mapRow)
}
