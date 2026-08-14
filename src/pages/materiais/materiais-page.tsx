import { useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { ProdutoCard } from "@/components/materiais/produto-card"
import { ProdutoMateriaisModal } from "@/components/materiais/produto-materiais-modal"
import { useMateriais, CATEGORIAS_FILTRO, CATEGORIA_LABELS } from "@/hooks/materiais/use-materiais"
import type { MaterialProduto } from "@/lib/materiais/materiais-api"

export default function MateriaisPage() {
  const {
    produtos,
    totalProdutos,
    favoritos,
    busca,
    setBusca,
    categoria,
    setCategoria,
    loading,
    alternarFavorito,
  } = useMateriais()
  const [produtoAberto, setProdutoAberto] = useState<MaterialProduto | null>(null)

  return (
    <AppShell
      title="Central de Materiais Bionatus"
      subtitle="Encontre, visualize e compartilhe materiais promocionais dos nossos produtos."
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome do produto..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
            {CATEGORIAS_FILTRO.map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setCategoria(opcao)}
                className={
                  categoria === opcao
                    ? "rounded-full bg-[#006426] px-4 py-1.5 text-sm font-medium text-white dark:bg-[#7DD3A2] dark:text-slate-900"
                    : "rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                {CATEGORIA_LABELS[opcao]}
              </button>
            ))}
          </div>

          <div className="relative mt-4 sm:hidden">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none focus:border-[#297B49] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {CATEGORIAS_FILTRO.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {CATEGORIA_LABELS[opcao]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 opacity-60 dark:text-slate-400" />
          </div>
        </section>

        {!loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {produtos.length} de {totalProdutos} produto{totalProdutos === 1 ? "" : "s"} encontrado{totalProdutos === 1 ? "" : "s"}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : produtos.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {produtos.map((produto) => (
              <ProdutoCard
                key={produto.produtoId}
                produto={produto}
                favoritado={favoritos.has(produto.produtoId)}
                onToggleFavorito={() => alternarFavorito(produto.produtoId)}
                onAbrir={() => setProdutoAberto(produto)}
              />
            ))}
          </div>
        )}
      </div>

      <ProdutoMateriaisModal
        produto={produtoAberto}
        onOpenChange={(open) => {
          if (!open) setProdutoAberto(null)
        }}
      />
    </AppShell>
  )
}
