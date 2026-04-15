// src/components/dashboard/simulation-form.tsx
import { channelOptions } from "@/lib/dashboard/dashboard-constants"

export function SimulationForm({
    simulationDate,
    simulationChannel,
    simulationValue,
    editingSimulationId,
    savingSimulation,
    setSimulationDate,
    setSimulationChannel,
    setSimulationValue,
    handleSubmitSimulation,
    resetSimulationForm,
}: any) {
    return (
        <div className="w-full rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Simulador de projeção
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Insira cenários por data, canal e valor para análise.
            </p>

            <div className="mt-5 grid gap-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Data
                    </label>
                    <input
                        type="date"
                        value={simulationDate}
                        onChange={(e) => setSimulationDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Canal
                    </label>
                    <select
                        value={simulationChannel}
                        onChange={(e) =>
                            setSimulationChannel(e.target.value ? Number(e.target.value) : "")
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="">Selecione um canal</option>
                        {channelOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Valor
                    </label>
                    <input
                        type="text"
                        value={simulationValue}
                        onChange={(e) => setSimulationValue(e.target.value)}
                        placeholder="R$ 0,00"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#006426] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleSubmitSimulation}
                        disabled={savingSimulation}
                        className="rounded-xl bg-[#006426] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {savingSimulation
                            ? "Salvando..."
                            : editingSimulationId
                                ? "Salvar edição"
                                : "Inserir"}
                    </button>

                    {editingSimulationId && (
                        <button
                            type="button"
                            onClick={resetSimulationForm}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}