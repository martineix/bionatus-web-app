import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import AppShell from "@/components/layout/app-shell"
import {
  ClientesFilters,
  InlineSelectField,
  activeControlClass,
  defaultControlClass,
} from "@/components/clientes/clientes-filters"
import { AgendaCalendario } from "@/components/clientes/agenda-calendario"
import { AgendaDiaModal } from "@/components/clientes/agenda-dia-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAgenda } from "@/hooks/clientes/use-clientes-agenda"
import { useIsMobile } from "@/hooks/use-is-mobile"
import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

const MESES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export default function AgendaPage() {
  const {
    ano,
    mes,
    rows,
    loading,
    filters,
    setFilters,
    representanteNome,
    setRepresentanteNome,
    representantesOptions,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = useClientesAgenda()
  const isMobile = useIsMobile()
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

  const rowsByDia = useMemo(() => {
    const map = new Map<number, ClienteAgendaRow[]>()
    rows.forEach((row) => {
      const dia = Number(row.previsaoProximaCompra.slice(8, 10))
      const lista = map.get(dia) ?? []
      lista.push(row)
      map.set(dia, lista)
    })
    return map
  }, [rows])

  const clientesDoDiaSelecionado = diaSelecionado !== null ? rowsByDia.get(diaSelecionado) ?? [] : []

  return (
    <AppShell
      title="Agenda de Clientes"
      subtitle="Previsão de compra por dia, com base no intervalo médio de cada cliente"
    >
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters}>
          <div className="lg:w-55 lg:min-w-45">
            <InlineSelectField
              label="Representante"
              value={representanteNome ?? ""}
              onChange={(value) => setRepresentanteNome(value === "" ? null : value)}
              className={representanteNome !== null ? activeControlClass : defaultControlClass}
            >
              <option value="">Todos</option>
              {representantesOptions.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </InlineSelectField>
          </div>
        </ClientesFilters>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                aria-label="Mês anterior"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                aria-label="Próximo mês"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {MESES_LABEL[mes - 1]} de {ano}
              </h2>
            </div>

            <button
              type="button"
              onClick={goToCurrentMonth}
              className="text-xs font-medium text-[#297B49] hover:underline dark:text-[#7DD3A2]"
            >
              Hoje
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma previsão de compra para este mês.
            </p>
          ) : (
            <AgendaCalendario
              ano={ano}
              mes={mes}
              rowsByDia={rowsByDia}
              isMobile={isMobile}
              onDiaClick={setDiaSelecionado}
            />
          )}
        </section>
      </div>

      {diaSelecionado !== null && (
        <AgendaDiaModal
          open
          onOpenChange={(open) => {
            if (!open) setDiaSelecionado(null)
          }}
          dataLabel={`${String(diaSelecionado).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`}
          clientes={clientesDoDiaSelecionado}
        />
      )}
    </AppShell>
  )
}
