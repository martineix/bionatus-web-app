import { supabase } from "@/lib/supabase"

export async function getFavoritos(): Promise<string[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return []

  const { data, error } = await supabase
    .from("materiais_favoritos")
    .select("produto_id")
    .eq("profile_id", userData.user.id)

  if (error) throw error

  return (data ?? []).map((row) => row.produto_id as string)
}

export async function toggleFavorito(produtoId: string, favoritado: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error("Usuário não autenticado.")

  if (favoritado) {
    const { error } = await supabase
      .from("materiais_favoritos")
      .insert({ profile_id: userData.user.id, produto_id: produtoId })

    if (error) throw error
  } else {
    const { error } = await supabase
      .from("materiais_favoritos")
      .delete()
      .eq("profile_id", userData.user.id)
      .eq("produto_id", produtoId)

    if (error) throw error
  }
}
