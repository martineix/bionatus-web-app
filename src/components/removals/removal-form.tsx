// src/components/removals/removal-form.tsx
import type { Dispatch, SetStateAction } from "react"

type RemovalFormProps = {
  sistema: number | ""
  pedido: string
  motivo: string
  saving: boolean
  setSistema: Dispatch<SetStateAction<number | "">>
  setPedido: Dispatch<SetStateAction<string>>
  setMotivo: Dispatch<SetStateAction<string>>
  handleSubmit: () => void
}

export function RemovalForm({
  sistema,
  pedido,
  motivo,
  saving,
  setSistema,
  setPedido,
  setMotivo,
  handleSubmit,
}: RemovalFormProps) {
  return (
    <div className="w-full h-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        Adicionar remoção
      </h3>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Exclui um pedido/nota das agregações do dashboard.
      </p>

      <div className="mt-5 grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sistema
          </label>
          <select
            value={sistema}
            onChange={(e) =>
              setSistema(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Selecione o sistema</option>
            <option value={1}>1 - Nexus</option>
            <option value={2}>2 - Sankhya</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Pedido
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Ex: 262170"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Motivo
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Solicitado por Fulano - Financeiro"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-[#006426] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adicionando..." : "Adicionar remoção"}
          </button>
        </div>
      </div>
    </div>
  )
}
