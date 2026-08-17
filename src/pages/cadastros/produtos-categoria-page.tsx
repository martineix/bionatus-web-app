import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import AppShell from "@/components/layout/app-shell"
import { ClientesDataTable, type ClientesTableColumn } from "@/components/clientes/clientes-data-table"
import {
  getProdutosCategoriaCatalogo,
  upsertProdutoCategoria,
  CATEGORIAS_PRODUTO,
  type ProdutoCategoriaRow,
  type ProdutoCategoriaOpcao,
} from "@/lib/produtos/produtos-categoria"
import { logger } from "@/lib/logger"

export default function ProdutosCategoriaPage() {
  const [produtos, setProdutos] = useState<ProdutoCategoriaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [salvandoEan, setSalvandoEan] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    getProdutosCategoriaCatalogo()
      .then((data) => {
        if (mounted) setProdutos(data)
      })
      .catch((error) => {
        logger.error("produtos-categoria", error)
        toast.error("Não foi possível carregar os produtos.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function alterarCategoria(ean: string, valor: ProdutoCategoriaOpcao | "") {
    const categoria = valor === "" ? null : valor
    const anterior = produtos
    setProdutos((prev) => prev.map((p) => (p.ean === ean ? { ...p, categoria } : p)))
    setSalvandoEan(ean)

    try {
      await upsertProdutoCategoria(ean, categoria)
    } catch (error) {
      logger.error("produtos-categoria-salvar", error)
      toast.error("Não foi possível salvar a categoria.")
      setProdutos(anterior)
    } finally {
      setSalvandoEan(null)
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase()
    if (!termo) return produtos
    return produtos.filter(
      (p) => p.produto.toLowerCase().includes(termo) || p.ean.toLowerCase().includes(termo)
    )
  }, [produtos, searchTerm])

  const columns: ClientesTableColumn<ProdutoCategoriaRow>[] = [
    {
      key: "produto",
      header: "Produto",
      render: (row) => row.produto,
      sortValue: (row) => row.produto,
    },
    {
      key: "ean",
      header: "EAN",
      render: (row) => row.ean,
      sortValue: (row) => row.ean,
    },
    {
      key: "ultima_venda",
      header: "Última venda",
      render: (row) =>
        row.ultimaVenda
          ? new Date(`${row.ultimaVenda}T00:00:00`).toLocaleDateString("pt-BR")
          : "Nunca vendido",
      sortValue: (row) => (row.ultimaVenda ? new Date(row.ultimaVenda).getTime() : 0),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (row) => (
        <select
          value={row.categoria ?? ""}
          disabled={salvandoEan === row.ean}
          onChange={(e) => alterarCategoria(row.ean, e.target.value as ProdutoCategoriaOpcao | "")}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#297B49] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">— Sem categoria —</option>
          {CATEGORIAS_PRODUTO.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      ),
      sortValue: (row) => row.categoria ?? "",
    },
  ]

  return (
    <AppShell
      title="Categoria dos Produtos"
      subtitle="Classifique cada produto do catálogo em Alimentos, Medicamentos ou Terceiros."
    >
      <ClientesDataTable
        columns={columns}
        rows={produtosFiltrados}
        loading={loading}
        getRowKey={(row) => row.ean}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        searchPlaceholder="Buscar por produto ou EAN..."
        emptyMessage="Nenhum produto encontrado."
      />
    </AppShell>
  )
}
