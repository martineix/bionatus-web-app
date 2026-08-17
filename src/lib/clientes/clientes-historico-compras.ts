import { supabase } from "@/lib/supabase"
import { toNumber } from "./clientes-rpc-helpers"

export type ClienteHistoricoBusca = {
  cnpj: string
  nome: string
  codigoCliente: string | null
}

export type ClienteHistoricoItemTipo = "venda" | "bonificacao" | "devolucao"

export type ClienteHistoricoItemRow = {
  itemId: string
  dataPedido: string
  pedido: string
  tipo: ClienteHistoricoItemTipo
  produto: string | null
  marca: string | null
  codigoProduto: string | null
  ean: string | null
  quantidade: number
  valorUnitario: number
  valorTotal: number
  representante: string | null
}

type ClienteHistoricoBuscaRaw = {
  cnpj: string
  nome: string | null
  codigo_cliente: string | null
}

type ClienteHistoricoItemRowRaw = {
  item_id: string
  data_pedido: string
  pedido: string
  tipo: string
  produto: string | null
  marca: string | null
  codigo_produto: string | null
  ean: string | null
  quantidade: number | string
  valor_unitario: number | string
  valor_total: number | string
  representante: string | null
}

export async function buscarClientesHistorico(termo: string): Promise<ClienteHistoricoBusca[]> {
  const { data, error } = await supabase.rpc("buscar_clientes_historico", { p_termo: termo })

  if (error) throw error

  return ((data ?? []) as ClienteHistoricoBuscaRaw[]).map((row) => ({
    cnpj: row.cnpj,
    nome: row.nome ?? "Cliente sem nome cadastrado",
    codigoCliente: row.codigo_cliente,
  }))
}

export async function getClienteHistoricoCompras(cnpj: string): Promise<ClienteHistoricoItemRow[]> {
  const { data, error } = await supabase.rpc("get_cliente_historico_compras", { p_cnpj: cnpj })

  if (error) throw error

  return ((data ?? []) as ClienteHistoricoItemRowRaw[]).map((row) => ({
    itemId: row.item_id,
    dataPedido: row.data_pedido,
    pedido: row.pedido,
    tipo: row.tipo as ClienteHistoricoItemTipo,
    produto: row.produto,
    marca: row.marca,
    codigoProduto: row.codigo_produto,
    ean: row.ean,
    quantidade: toNumber(row.quantidade),
    valorUnitario: toNumber(row.valor_unitario),
    valorTotal: toNumber(row.valor_total),
    representante: row.representante,
  }))
}
