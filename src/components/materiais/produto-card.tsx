import { Download, Eye, Share2, Star } from "lucide-react"
import type { MaterialProduto } from "@/lib/materiais/materiais-api"

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

export function ProdutoCard({ produto, favoritado, onToggleFavorito, onAbrir }: ProdutoCardProps) {
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

      <div className={`flex h-24 items-center justify-center rounded-xl ${corDoProduto(produto.produtoNome)}`}>
        <span className="px-2 text-center text-sm font-semibold text-white">
          {produto.produtoNome}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{produto.produtoNome}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {produto.categorias.join(" • ")}
        </p>
      </div>

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </button>
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" /> Baixar
        </button>
        <button
          type="button"
          onClick={onAbrir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#006426] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#00551f] dark:bg-[#7DD3A2] dark:text-slate-900"
        >
          <Share2 className="h-3.5 w-3.5" /> Enviar
        </button>
      </div>
    </div>
  )
}
