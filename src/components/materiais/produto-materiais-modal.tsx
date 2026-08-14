import { useState } from "react"
import { toast } from "sonner"
import { Download, Eye, Share2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getArquivoUrl, type MaterialProduto } from "@/lib/materiais/materiais-api"
import { logger } from "@/lib/logger"

type ProdutoMateriaisModalProps = {
  produto: MaterialProduto | null
  onOpenChange: (open: boolean) => void
}

export function ProdutoMateriaisModal({ produto, onOpenChange }: ProdutoMateriaisModalProps) {
  const [carregandoId, setCarregandoId] = useState<string | null>(null)

  async function visualizar(fileId: string) {
    const novaAba = window.open("", "_blank")
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, false)
      if (novaAba) novaAba.location.href = url
    } catch (error) {
      novaAba?.close()
      logger.error("materiais-visualizar", error)
      toast.error("Não foi possível abrir o arquivo.")
    } finally {
      setCarregandoId(null)
    }
  }

  async function baixar(fileId: string) {
    const novaAba = window.open("", "_blank")
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, true)
      if (novaAba) novaAba.location.href = url
    } catch (error) {
      novaAba?.close()
      logger.error("materiais-baixar", error)
      toast.error("Não foi possível baixar o arquivo.")
    } finally {
      setCarregandoId(null)
    }
  }

  async function enviar(fileId: string) {
    setCarregandoId(fileId)
    try {
      const url = await getArquivoUrl(fileId, false)
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado para a área de transferência.")
    } catch (error) {
      logger.error("materiais-enviar", error)
      toast.error("Não foi possível copiar o link.")
    } finally {
      setCarregandoId(null)
    }
  }

  const categorias = produto ? [...new Set(produto.arquivos.map((a) => a.categoria))] : []

  return (
    <Dialog open={produto !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(92vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
          <DialogTitle>{produto?.produtoNome}</DialogTitle>
          <DialogDescription>
            {produto?.arquivos.length ?? 0} arquivo{(produto?.arquivos.length ?? 0) === 1 ? "" : "s"} disponíve{(produto?.arquivos.length ?? 0) === 1 ? "l" : "is"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {categorias.map((categoria) => (
            <div key={categoria}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {categoria}
              </h4>
              <div className="space-y-2">
                {produto?.arquivos
                  .filter((arquivo) => arquivo.categoria === categoria)
                  .map((arquivo) => (
                    <div
                      key={arquivo.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                        {arquivo.nome}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => visualizar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Visualizar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => baixar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Baixar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => enviar(arquivo.id)}
                          disabled={carregandoId === arquivo.id}
                          aria-label="Copiar link para enviar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
