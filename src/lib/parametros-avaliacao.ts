import { supabase } from "./supabase"

export type ParametroFaixa = {
  criterio: "atividade" | "frequencia" | "ticket_medio"
  estrela: number
  minValor: number
  maxValor: number
}

export type ParametroPeso = {
  criterio: "atividade" | "frequencia" | "ticket_medio"
  pesoPercentual: number
}

export type ParametroAbc = {
  classe: "A" | "B" | "C"
  percentual: number
}

type ParametroFaixaRaw = {
  criterio: string
  estrela: number | string
  min_valor: number | string
  max_valor: number | string
}

type ParametroPesoRaw = {
  criterio: string
  peso_percentual: number | string
}

type ParametroAbcRaw = {
  classe: string
  percentual: number | string
}

export async function listParametrosFaixas(): Promise<ParametroFaixa[]> {
  const { data, error } = await supabase.rpc("list_parametros_avaliacao_faixas")
  if (error) throw error

  return ((data ?? []) as ParametroFaixaRaw[]).map((row) => ({
    criterio: row.criterio as ParametroFaixa["criterio"],
    estrela: Number(row.estrela),
    minValor: Number(row.min_valor),
    maxValor: Number(row.max_valor),
  }))
}

export async function updateParametroFaixa(
  criterio: ParametroFaixa["criterio"],
  estrela: number,
  minValor: number,
  maxValor: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_avaliacao_faixa", {
    p_criterio: criterio,
    p_estrela: estrela,
    p_min_valor: minValor,
    p_max_valor: maxValor,
  })
  if (error) throw error
}

export async function listParametrosPesos(): Promise<ParametroPeso[]> {
  const { data, error } = await supabase.rpc("list_parametros_avaliacao_pesos")
  if (error) throw error

  return ((data ?? []) as ParametroPesoRaw[]).map((row) => ({
    criterio: row.criterio as ParametroPeso["criterio"],
    pesoPercentual: Number(row.peso_percentual),
  }))
}

export async function updateParametroPeso(
  criterio: ParametroPeso["criterio"],
  pesoPercentual: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_avaliacao_peso", {
    p_criterio: criterio,
    p_peso_percentual: pesoPercentual,
  })
  if (error) throw error
}

export async function listParametrosAbc(): Promise<ParametroAbc[]> {
  const { data, error } = await supabase.rpc("list_parametros_curva_abc")
  if (error) throw error

  return ((data ?? []) as ParametroAbcRaw[]).map((row) => ({
    classe: row.classe as ParametroAbc["classe"],
    percentual: Number(row.percentual),
  }))
}

export async function updateParametroAbc(
  classe: ParametroAbc["classe"],
  percentual: number
): Promise<void> {
  const { error } = await supabase.rpc("update_parametro_curva_abc", {
    p_classe: classe,
    p_percentual: percentual,
  })
  if (error) throw error
}
