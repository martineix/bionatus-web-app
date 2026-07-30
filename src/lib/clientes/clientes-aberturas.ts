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

export type ClienteAberturaDetalheRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  dataAbertura: string
  representanteAbertura: string | null
  qtdRecompras: number
}

type ClienteAberturaDetalheRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  data_abertura: string
  representante_abertura: string | null
  qtd_recompras: number | string
}

export async function getClientesAberturasDetalhe(
  filters: ClientesFiltersInput,
  dataInicio: string,
  dataFim: string
): Promise<ClienteAberturaDetalheRow[]> {
  const { data, error } = await supabase.rpc("get_clientes_aberturas_detalhe", {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAberturaDetalheRowRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    dataAbertura: row.data_abertura,
    representanteAbertura: row.representante_abertura,
    qtdRecompras: toNumber(row.qtd_recompras),
  }))
}
