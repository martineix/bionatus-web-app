// src/components/dashboard/simulation-table.tsx
import { Pencil, X } from "lucide-react"
import { formatCurrencyBRL } from "@/lib/format"
import { formatDateBR } from "@/lib/dashboard/dashboard-helpers"

export function SimulationTable({
    projectionSimulations,
    handleEditSimulation,
    handleDeleteSimulation,
}: any) {
    return (
        <div className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Simulações inseridas
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Cenários cadastrados para projeção e acompanhamento.
            </p>

            {projectionSimulations.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nenhuma simulação inserida.
                </div>
            ) : (
                <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                                    Data
                                </th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                                    Dia útil
                                </th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">
                                    Canal
                                </th>
                                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-slate-300">
                                    Valor
                                </th>
                                <th className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">
                                    Ações
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {projectionSimulations.map((item: any) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-slate-100 dark:border-slate-900"
                                >
                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                        {formatDateBR(item.data_ref)}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                        {item.dia_util ?? "-"}
                                    </td>
                                    <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                                        {item.conta_nome}
                                    </td>
                                    <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-200">
                                        {formatCurrencyBRL(item.valor)}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleEditSimulation(item)}
                                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSimulation(item.id)}
                                                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}