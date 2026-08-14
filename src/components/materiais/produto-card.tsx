import { useEffect, useState } from "react"
import { Eye, Star } from "lucide-react"
import { getArquivoUrl, type MaterialProduto } from "@/lib/materiais/materiais-api"
import { logger } from "@/lib/logger"

type ProdutoCardProps = {
  produto: MaterialProduto
  favoritado: boolean
  onToggleFavorito: () => void
  onAbrir: () => void
}

const PALETA_CORES = [
  "bg-teal-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-blue-600",
  "bg-pink-500",
  "bg-lime-600",
]

function corDoProduto(nome: string) {
  const soma = nome.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PALETA_CORES[soma % PALETA_CORES.length]
}

function arquivoCapa(produto: MaterialProduto) {
  return produto.arquivos.find(
    (arquivo) => arquivo.categoria === "Capa" && arquivo.mimeType.startsWith("image/")
  )
}

export function ProdutoCard({ produto, favoritado, onToggleFavorito, onAbrir }: ProdutoCardProps) {
  const [capaUrl, setCapaUrl] = useState<string | null>(null)
  const [capaComErro, setCapaComErro] = useState(false)

  useEffect(() => {
    const arquivo = arquivoCapa(produto)
    if (!arquivo) return

    let ativo = true
    getArquivoUrl(arquivo.id, false)
      .then((url) => {
        if (ativo) setCapaUrl(url)
      })
      .catch((error) => {
        logger.error("produto-card-capa", error)
      })

    return () => {
      ativo = false
    }
  }, [produto])

  const mostrarImagem = capaUrl !== null && !capaComErro

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onToggleFavorito}
        aria-label={favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={favoritado}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800"
      >
        <Star className={`h-4 w-4 ${favoritado ? "fill-amber-400 text-amber-400" : ""}`} />
      </button>

      {mostrarImagem ? (
        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-white">
          <img
            src={capaUrl}
            alt={produto.produtoNome}
            onError={() => setCapaComErro(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className={`flex h-24 items-center justify-center rounded-xl ${corDoProduto(produto.produtoNome)}`}>
          <span className="px-2 text-center text-sm font-semibold text-white">
            {produto.produtoNome}
          </span>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{produto.produtoNome}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {produto.categorias.join(" • ")}
        </p>
      </div>

      <div className="mt-1">
        <button
          type="button"
          onClick={onAbrir}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#006426] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00551f] dark:bg-[#7DD3A2] dark:text-slate-900"
        >
          <Eye className="h-3.5 w-3.5" /> Ver materiais
        </button>
      </div>
    </div>
  )
}
