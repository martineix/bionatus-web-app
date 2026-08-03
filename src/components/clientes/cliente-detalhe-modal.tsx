import { useEffect, useState } from "react"
import { CalendarDays, MapPin, Phone, ShoppingBag, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrencyBRL } from "@/lib/format"
import {
  getClienteAtendimentosDetalhe,
  getClienteRecomprasDetalhe,
  getClienteVisitasDetalhe,
  type ClienteAtendimentoDetalheRow,
  type ClienteRecompraDetalheRow,
  type ClienteVisitaDetalheRow,
} from "@/lib/clientes/clientes-aberturas"

export type ClienteDetalheModalTipo = "recompra" | "visita" | "atendimento"

type ClienteDetalheModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: ClienteDetalheModalTipo
  cnpj: string
  nome: string
  dataAbertura: string
}

const TIPO_CONFIG: Record<ClienteDetalheModalTipo, { titulo: string; icon: typeof ShoppingBag; vazio: string }> = {
  recompra: { titulo: "Recompras", icon: ShoppingBag, vazio: "Nenhuma recompra encontrada." },
  visita: { titulo: "Visitas", icon: MapPin, vazio: "Nenhuma visita encontrada." },
  atendimento: { titulo: "Atendimentos", icon: Phone, vazio: "Nenhum atendimento encontrado." },
}

function formatDateBR(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("pt-BR")
}

export function ClienteDetalheModal({ open, onOpenChange, tipo, cnpj, nome, dataAbertura }: ClienteDetalheModalProps) {
  const [loading, setLoading] = useState(true)
  const [recompras, setRecompras] = useState<ClienteRecompraDetalheRow[]>([])
  const [visitas, setVisitas] = useState<ClienteVisitaDetalheRow[]>([])
  const [atendimentos, setAtendimentos] = useState<ClienteAtendimentoDetalheRow[]>([])

  useEffect(() => {
    if (!open) return

    let mounted = true
    setLoading(true)

    const fetchers: Record<ClienteDetalheModalTipo, () => Promise<void>> = {
      recompra: () =>
        getClienteRecomprasDetalhe(cnpj, dataAbertura).then((data) => {
          if (mounted) setRecompras(data)
        }),
      visita: () =>
        getClienteVisitasDetalhe(cnpj, dataAbertura).then((data) => {
          if (mounted) setVisitas(data)
        }),
      atendimento: () =>
        getClienteAtendimentosDetalhe(cnpj, dataAbertura).then((data) => {
          if (mounted) setAtendimentos(data)
        }),
    }

    fetchers[tipo]().finally(() => {
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [open, tipo, cnpj, dataAbertura])

  const config = TIPO_CONFIG[tipo]
  const Icon = config.icon

  const hasData =
    (tipo === "recompra" && recompras.length > 0) ||
    (tipo === "visita" && visitas.length > 0) ||
    (tipo === "atendimento" && atendimentos.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(92vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle>{config.titulo}</DialogTitle>
              <DialogDescription className="truncate">{nome}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : !hasData ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{config.vazio}</p>
          ) : (
            <div className="space-y-2">
              {tipo === "recompra" &&
                recompras.map((row) => (
                  <div
                    key={row.dataPedido}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                      {formatDateBR(row.dataPedido)}
                    </div>
                    <span className="text-sm font-semibold text-[#006426] dark:text-[#7DD3A2]">
                      {formatCurrencyBRL(row.valor)}
                    </span>
                  </div>
                ))}

              {tipo === "visita" &&
                visitas.map((row, index) => (
                  <div
                    key={`${row.dataVisita}-${index}`}
                    className="space-y-1.5 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                        {formatDateBR(row.dataVisita)}
                      </div>
                      {row.cidade && (
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3.5 w-3.5" />
                          {row.cidade}
                        </span>
                      )}
                    </div>
                    {row.usuario && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <User className="h-3.5 w-3.5" />
                        {row.usuario}
                      </div>
                    )}
                    {row.observacoes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">{row.observacoes}</p>
                    )}
                  </div>
                ))}

              {tipo === "atendimento" &&
                atendimentos.map((row, index) => (
                  <div
                    key={`${row.dataInicio}-${index}`}
                    className="space-y-1.5 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                        {formatDateBR(row.dataInicio)}
                        {row.dataFim && row.dataFim !== row.dataInicio && ` – ${formatDateBR(row.dataFim)}`}
                      </div>
                      {row.pedidoStatus && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {row.pedidoStatus}
                        </span>
                      )}
                    </div>
                    {row.usuario && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <User className="h-3.5 w-3.5" />
                        {row.usuario}
                      </div>
                    )}
                    {row.motivo && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">{row.motivo}</p>
                    )}
                    {row.pedidoNumero && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Pedido {row.pedidoNumero}</span>
                        {row.pedidoValor != null && (
                          <span className="font-medium text-[#006426] dark:text-[#7DD3A2]">
                            {formatCurrencyBRL(row.pedidoValor)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
