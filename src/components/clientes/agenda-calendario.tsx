import type { ClienteAgendaRow } from "@/lib/clientes/clientes-agenda"

type AgendaCalendarioProps = {
  ano: number
  mes: number
  rowsByDia: Map<number, ClienteAgendaRow[]>
  isMobile: boolean
  onDiaClick: (dia: number) => void
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function buildMonthCells(ano: number, mes: number) {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const cells: (number | null)[] = []

  for (let i = 0; i < primeiroDia.getDay(); i++) cells.push(null)
  for (let dia = 1; dia <= diasNoMes; dia++) cells.push(dia)
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

function formatDiaSemanaBR(ano: number, mes: number, dia: number) {
  const data = new Date(ano, mes - 1, dia)
  const label = data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function AgendaCalendario({ ano, mes, rowsByDia, isMobile, onDiaClick }: AgendaCalendarioProps) {
  const hoje = new Date()
  const isHoje = (dia: number) =>
    hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes && hoje.getDate() === dia

  if (isMobile) {
    const diasComClientes = Array.from(rowsByDia.keys()).sort((a, b) => a - b)

    return (
      <div className="space-y-2">
        {diasComClientes.map((dia) => {
          const clientes = rowsByDia.get(dia) ?? []
          return (
            <button
              type="button"
              key={dia}
              onClick={() => onDiaClick(dia)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left dark:border-slate-800"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatDiaSemanaBR(ano, mes, dia)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {clientes.slice(0, 2).map((c) => c.nome).join(", ")}
                  {clientes.length > 2 ? ` e mais ${clientes.length - 2}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#E4F1E8] px-2 py-0.5 text-xs font-semibold text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]">
                {clientes.length}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const cells = buildMonthCells(ano, mes)

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="bg-slate-50 px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400"
        >
          {label}
        </div>
      ))}

      {cells.map((dia, index) => {
        if (dia === null) {
          return <div key={`vazio-${index}`} className="min-h-[92px] bg-slate-50/50 dark:bg-slate-900/40" />
        }

        const clientes = rowsByDia.get(dia) ?? []

        return (
          <button
            type="button"
            key={dia}
            disabled={clientes.length === 0}
            onClick={() => onDiaClick(dia)}
            className={`min-h-[92px] bg-white p-1.5 text-left transition-colors dark:bg-slate-950 ${
              clientes.length > 0 ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" : "cursor-default"
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isHoje(dia)
                  ? "bg-[#006426] text-white dark:bg-[#7DD3A2] dark:text-slate-950"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {dia}
            </span>

            <div className="mt-1 space-y-0.5">
              {clientes.slice(0, 3).map((cliente) => (
                <p key={cliente.cnpj} className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                  {cliente.nome}
                </p>
              ))}
              {clientes.length > 3 && (
                <p className="text-[11px] font-medium text-[#297B49] dark:text-[#7DD3A2]">
                  +{clientes.length - 3} mais
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
