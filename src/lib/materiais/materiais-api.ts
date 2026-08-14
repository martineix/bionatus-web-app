import { supabase } from "@/lib/supabase"

export type MaterialArquivo = {
  id: string
  nome: string
  categoria: string
  mimeType: string
}

export type MaterialProduto = {
  produtoId: string
  produtoNome: string
  categorias: string[]
  arquivos: MaterialArquivo[]
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    throw new Error("Sessão não encontrada.")
  }

  return data.session.access_token
}

export async function getMateriais(): Promise<MaterialProduto[]> {
  const token = await getAccessToken()

  const response = await fetch(`${BACKEND_URL}/materiais`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error("Não foi possível carregar os materiais.")
  }

  const json = await response.json()
  return json.produtos as MaterialProduto[]
}

export async function getArquivoUrl(fileId: string, download: boolean): Promise<string> {
  const token = await getAccessToken()
  const params = new URLSearchParams({ token })
  if (download) params.set("download", "1")

  return `${BACKEND_URL}/materiais/arquivo/${fileId}?${params.toString()}`
}
