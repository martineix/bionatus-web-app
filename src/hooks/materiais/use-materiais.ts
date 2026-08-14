import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { getMateriais, type MaterialProduto } from "@/lib/materiais/materiais-api"
import { getFavoritos, toggleFavorito } from "@/lib/materiais/materiais-favoritos"
import { logger } from "@/lib/logger"

export type CategoriaFiltro = "Todos" | "Ficha Técnica" | "Lâmina" | "Vídeo" | "Foto"

export const CATEGORIAS_FILTRO: CategoriaFiltro[] = [
  "Todos",
  "Ficha Técnica",
  "Lâmina",
  "Vídeo",
  "Foto",
]

// Rótulo exibido no chip (plural, igual ao mockup aprovado) vs. valor usado na comparação
// com `produto.categorias` (sempre no singular, igual ao que o backend produz).
export const CATEGORIA_LABELS: Record<CategoriaFiltro, string> = {
  Todos: "Todos",
  "Ficha Técnica": "Ficha técnica",
  Lâmina: "Lâminas",
  Vídeo: "Vídeos",
  Foto: "Fotos",
}

export function useMateriais() {
  const [produtos, setProdutos] = useState<MaterialProduto[]>([])
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState<CategoriaFiltro>("Todos")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([getMateriais(), getFavoritos()])
      .then(([produtosData, favoritosData]) => {
        if (!mounted) return
        setProdutos(produtosData)
        setFavoritos(new Set(favoritosData))
      })
      .catch((error) => {
        logger.error("use-materiais", error)
        toast.error("Não foi possível carregar os materiais.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      const bateBusca = termo === "" || produto.produtoNome.toLowerCase().includes(termo)
      const bateCategoria = categoria === "Todos" || produto.categorias.includes(categoria)
      return bateBusca && bateCategoria
    })
  }, [produtos, busca, categoria])

  async function alternarFavorito(produtoId: string) {
    const jaFavoritado = favoritos.has(produtoId)
    const anterior = favoritos
    const proximo = new Set(favoritos)

    if (jaFavoritado) {
      proximo.delete(produtoId)
    } else {
      proximo.add(produtoId)
    }
    setFavoritos(proximo)

    try {
      await toggleFavorito(produtoId, !jaFavoritado)
    } catch (error) {
      logger.error("use-materiais-favorito", error)
      toast.error("Não foi possível salvar o favorito.")
      setFavoritos(anterior)
    }
  }

  return {
    produtos: produtosFiltrados,
    totalProdutos: produtos.length,
    favoritos,
    busca,
    setBusca,
    categoria,
    setCategoria,
    loading,
    alternarFavorito,
  }
}
