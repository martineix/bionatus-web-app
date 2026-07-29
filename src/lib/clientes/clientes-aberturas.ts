import { supabase } from "@/lib/supabase"
import { toNumber } from "./clientes-rpc-helpers"
import type { ClientesFiltersInput } from "./clientes-filters-types"

export type ClienteAberturaPoint = {
  anoMes: string
  qtdClientes: number
}

type ClienteAberturaPointRaw = {
  ano_mes: string
  qtd_clientes: number | string
}

export async function getClientesAberturas(
  filters: ClientesFiltersInput,
  dataInicio: string,
  dataFim: string
): Promise<ClienteAberturaPoint[]> {
  const { data, error } = await supabase.rpc("get_clientes_aberturas", {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAberturaPointRaw[]).map((row) => ({
    anoMes: row.ano_mes,
    qtdClientes: toNumber(row.qtd_clientes),
  }))
}
