import { CalendarDays, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ClienteNomeCell } from "@/components/clientes/clientes-data-table"
import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

type AgendaDiaModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataLabel: string
  clientes: ClienteAgendaRow[]
}

function formatPrevisaoRelativa(previsaoProximaCompra: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const previsao = new Date(`${previsaoProximaCompra}T00:00:00`)
  const diffDias = Math.round((previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return "Previsto pra hoje"
  if (diffDias > 0) return `Em ${diffDias} dia${diffDias > 1 ? "s" : ""}`
  return `${Math.abs(diffDias)} dia${Math.abs(diffDias) > 1 ? "s" : ""} atrás`
}

export function AgendaDiaModal({ open, onOpenChange, dataLabel, clientes }: AgendaDiaModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(92vw,32rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4F1E8] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle>{dataLabel}</DialogTitle>
              <DialogDescription>
                {clientes.length} cliente{clientes.length > 1 ? "s" : ""} com previsão de compra
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 overflow-y-auto px-6 py-4">
          {clientes.map((cliente) => (
            <div
              key={cliente.cnpj}
              className="space-y-1.5 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
            >
              <ClienteNomeCell nome={cliente.nome} cnpj={cliente.cnpj} codigoCliente={cliente.codigoCliente} />

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {cliente.representante ?? "—"}
                </span>
                <span className="font-medium text-[#297B49] dark:text-[#7DD3A2]">
                  {formatPrevisaoRelativa(cliente.previsaoProximaCompra)}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Intervalo médio: {cliente.intervaloMedioDias} dias
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
