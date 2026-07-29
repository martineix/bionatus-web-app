import { supabase } from "@/lib/supabase"
import { buildClientesRpcFilters, toNumber, toNullableNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAtividadeRow = {
  cnpj: string
  nome: string
  diasDesdeUltimaCompra: number | null
  dataUltimaCompra: string | null
  valorUltimaCompra: number | null
  valorTotalLiquido: number
  qtdPedidos: number
  ticketMedio: number | null
}

type ClienteAtividadeRowRaw = {
  cnpj: string
  nome: string | null
  dias_desde_ultima_compra: number | string | null
  data_ultima_compra: string | null
  valor_ultima_compra: number | string | null
  valor_total_liquido: number | string
  qtd_pedidos: number | string
  ticket_medio: number | string | null
}

function mapRow(row: ClienteAtividadeRowRaw): ClienteAtividadeRow {
  return {
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    diasDesdeUltimaCompra: toNullableNumber(row.dias_desde_ultima_compra),
    dataUltimaCompra: row.data_ultima_compra,
    valorUltimaCompra: toNullableNumber(row.valor_ultima_compra),
    valorTotalLiquido: toNumber(row.valor_total_liquido),
    qtdPedidos: toNumber(row.qtd_pedidos),
    ticketMedio: toNullableNumber(row.ticket_medio),
  }
}

export async function getClientesAtividade(
  filters: ClientesFiltersInput
): Promise<ClienteAtividadeRow[]> {
  const { data, error } = await supabase.rpc(
    "get_clientes_atividade",
    buildClientesRpcFilters(filters)
  )

  if (error) throw error

  return ((data ?? []) as ClienteAtividadeRowRaw[]).map(mapRow)
}
