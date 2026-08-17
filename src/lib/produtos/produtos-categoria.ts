import { supabase } from "@/lib/supabase"

export type ProdutoCategoriaOpcao = "Alimentos" | "Medicamentos" | "Terceiros" | "Outros"

export const CATEGORIAS_PRODUTO: ProdutoCategoriaOpcao[] = ["Alimentos", "Medicamentos", "Terceiros", "Outros"]

export type ProdutoCategoriaRow = {
  ean: string
  produto: string
  categoria: ProdutoCategoriaOpcao | null
  ultimaVenda: string | null
}

type ProdutoCategoriaRowRaw = {
  ean: string
  produto: string | null
  categoria: string | null
  ultima_venda: string | null
}

export async function getProdutosCategoriaCatalogo(): Promise<ProdutoCategoriaRow[]> {
  const { data, error } = await supabase.rpc("get_produtos_categoria_catalogo")

  if (error) throw error

  return ((data ?? []) as ProdutoCategoriaRowRaw[]).map((row) => ({
    ean: row.ean,
    produto: row.produto ?? "Produto sem descrição",
    categoria: (row.categoria as ProdutoCategoriaOpcao | null) ?? null,
    ultimaVenda: row.ultima_venda,
  }))
}

export async function upsertProdutoCategoria(
  ean: string,
  categoria: ProdutoCategoriaOpcao | null
): Promise<void> {
  const { error } = await supabase.rpc("upsert_produto_categoria", {
    p_ean: ean,
    p_categoria: categoria,
  })

  if (error) throw error
}
