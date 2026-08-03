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
  dataFim: string,
  representanteAbertura: string | null = null
): Promise<ClienteAberturaPoint[]> {
  const { data, error } = await supabase.rpc("get_clientes_aberturas", {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
    p_representante_abertura: representanteAbertura,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAberturaPointRaw[]).map((row) => ({
    anoMes: row.ano_mes,
    qtdClientes: toNumber(row.qtd_clientes),
  }))
}

export async function getRepresentantesAbertura(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_representantes_abertura")

  if (error) throw error

  return ((data ?? []) as { representante: string }[]).map((row) => row.representante)
}

export type ClienteAberturaDetalheRow = {
  cnpj: string
  nome: string
  codigoCliente: string | null
  dataAbertura: string
  representanteAbertura: string | null
  qtdRecompras: number
  qtdVisitas: number
  qtdAtendimentos: number
}

type ClienteAberturaDetalheRowRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
  data_abertura: string
  representante_abertura: string | null
  qtd_recompras: number | string
  qtd_visitas: number | string
  qtd_atendimentos: number | string
}

export async function getClientesAberturasDetalhe(
  filters: ClientesFiltersInput,
  dataInicio: string,
  dataFim: string,
  representanteAbertura: string | null = null
): Promise<ClienteAberturaDetalheRow[]> {
  const { data, error } = await supabase.rpc("get_clientes_aberturas_detalhe", {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_id_representante: null,
    p_mercado: filters.mercado,
    p_contas: filters.contas.length ? filters.contas : null,
    p_is_bionatus: filters.isBionatus,
    p_representante_abertura: representanteAbertura,
  })

  if (error) throw error

  return ((data ?? []) as ClienteAberturaDetalheRowRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
    dataAbertura: row.data_abertura,
    representanteAbertura: row.representante_abertura,
    qtdRecompras: toNumber(row.qtd_recompras),
    qtdVisitas: toNumber(row.qtd_visitas),
    qtdAtendimentos: toNumber(row.qtd_atendimentos),
  }))
}

export type ClienteRecompraDetalheRow = {
  dataPedido: string
  valor: number
}

type ClienteRecompraDetalheRowRaw = {
  data_pedido: string
  valor: number | string
}

export async function getClienteRecomprasDetalhe(
  cnpj: string,
  dataAbertura: string
): Promise<ClienteRecompraDetalheRow[]> {
  const { data, error } = await supabase.rpc("get_cliente_recompras_detalhe", {
    p_cnpj: cnpj,
    p_data_abertura: dataAbertura,
  })

  if (error) throw error

  return ((data ?? []) as ClienteRecompraDetalheRowRaw[]).map((row) => ({
    dataPedido: row.data_pedido,
    valor: toNumber(row.valor),
  }))
}

export type ClienteVisitaDetalheRow = {
  dataVisita: string
  usuario: string | null
  cidade: string | null
  observacoes: string | null
}

export async function getClienteVisitasDetalhe(
  cnpj: string,
  dataAbertura: string
): Promise<ClienteVisitaDetalheRow[]> {
  const { data, error } = await supabase.rpc("get_cliente_visitas_detalhe", {
    p_cnpj: cnpj,
    p_data_abertura: dataAbertura,
  })

  if (error) throw error

  return ((data ?? []) as {
    data_visita: string
    usuario: string | null
    cidade: string | null
    observacoes: string | null
  }[]).map((row) => ({
    dataVisita: row.data_visita,
    usuario: row.usuario,
    cidade: row.cidade,
    observacoes: row.observacoes,
  }))
}

export type ClienteAtendimentoDetalheRow = {
  dataInicio: string
  dataFim: string | null
  usuario: string | null
  motivo: string | null
  observacoes: string | null
  pedidoNumero: string | null
  pedidoValor: number | null
  pedidoStatus: string | null
}

export async function getClienteAtendimentosDetalhe(
  cnpj: string,
  dataAbertura: string
): Promise<ClienteAtendimentoDetalheRow[]> {
  const { data, error } = await supabase.rpc("get_cliente_atendimentos_detalhe", {
    p_cnpj: cnpj,
    p_data_abertura: dataAbertura,
  })

  if (error) throw error

  return ((data ?? []) as {
    data_inicio: string
    data_fim: string | null
    usuario: string | null
    motivo: string | null
    observacoes: string | null
    pedido_numero: string | null
    pedido_valor: number | string | null
    pedido_status: string | null
  }[]).map((row) => ({
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    usuario: row.usuario,
    motivo: row.motivo,
    observacoes: row.observacoes,
    pedidoNumero: row.pedido_numero,
    pedidoValor: row.pedido_valor == null ? null : toNumber(row.pedido_valor),
    pedidoStatus: row.pedido_status,
  }))
}
