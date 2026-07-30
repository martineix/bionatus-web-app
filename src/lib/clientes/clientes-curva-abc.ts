import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteCurvaAbcRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  valorTotalLiquido: number
  pctParticipacao: number
  pctAcumulado: number
  classe: "A" | "B" | "C"
  intervaloMedioDias: number | null
}

type ClienteCurvaAbcRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  valor_total_liquido: number | string
  pct_participacao: number | string
  pct_acumulado: number | string
  classe: string
  intervalo_medio_dias: number | string | null
}

function mapRow(row: ClienteCurvaAbcRowRaw): ClienteCurvaAbcRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    valorTotalLiquido: toNumber(row.valor_total_liquido),
    pctParticipacao: toNumber(row.pct_participacao),
    pctAcumulado: toNumber(row.pct_acumulado),
    classe: row.classe as ClienteCurvaAbcRow["classe"],
    intervaloMedioDias: toNullableNumber(row.intervalo_medio_dias),
  }
}

export async function getClientesCurvaAbc(
  filters: ClientesFiltersInput
): Promise<ClienteCurvaAbcRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_curva_abc",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteCurvaAbcRowRaw[]).map(mapRow)
}
