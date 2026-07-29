// src/pages/cadastros/avaliacao-clientes-page.tsx
import { useEffect, useState } from "react"
import { toast } from "sonner"
import AppShell from "@/components/layout/app-shell"
import {
  listParametrosFaixas,
  updateParametroFaixa,
  listParametrosPesos,
  updateParametroPeso,
  listParametrosAbc,
  updateParametroAbc,
  type ParametroFaixa,
  type ParametroPeso,
  type ParametroAbc,
} from "@/lib/parametros-avaliacao"

const CRITERIO_LABELS: Record<ParametroFaixa["criterio"], string> = {
  atividade: "Atividade (dias sem comprar)",
  frequencia: "Frequência (intervalo médio em dias)",
  ticket_medio: "Ticket Médio (R$)",
}

function FaixasSection({
  criterio,
  faixas,
  onSave,
}: {
  criterio: ParametroFaixa["criterio"]
  faixas: ParametroFaixa[]
  onSave: (estrela: number, minValor: number, maxValor: number) => Promise<void>
}) {
  const [drafts, setDrafts] = useState<Record<number, { min: string; max: string }>>({})
  const [savingEstrela, setSavingEstrela] = useState<number | null>(null)

  function getDraft(faixa: ParametroFaixa) {
    return drafts[faixa.estrela] ?? { min: String(faixa.minValor), max: String(faixa.maxValor) }
  }

  async function handleSave(faixa: ParametroFaixa) {
    const draft = getDraft(faixa)
    const minValor = Number(draft.min)
    const maxValor = Number(draft.max)

    if (!Number.isFinite(minValor) || !Number.isFinite(maxValor)) {
      toast.warning("Informe valores numéricos válidos.")
      return
    }

    setSavingEstrela(faixa.estrela)
    try {
      await onSave(faixa.estrela, minValor, maxValor)
      toast.success("Faixa atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a faixa.")
    } finally {
      setSavingEstrela(null)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {CRITERIO_LABELS[criterio]}
      </h3>

      <div className="mt-3 space-y-2">
        {faixas
          .filter((f) => f.criterio === criterio)
          .sort((a, b) => b.estrela - a.estrela)
          .map((faixa) => {
            const draft = getDraft(faixa)

            return (
              <div key={faixa.estrela} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-16 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {faixa.estrela}★
                </span>

                <input
                  type="number"
                  value={draft.min}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [faixa.estrela]: { ...draft, min: e.target.value } }))
                  }
                  className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />

                <span className="text-slate-400">até</span>

                <input
                  type="number"
                  value={draft.max}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [faixa.estrela]: { ...draft, max: e.target.value } }))
                  }
                  className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />

                <button
                  type="button"
                  onClick={() => handleSave(faixa)}
                  disabled={savingEstrela === faixa.estrela}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default function AvaliacaoClientesPage() {
  const [faixas, setFaixas] = useState<ParametroFaixa[]>([])
  const [pesos, setPesos] = useState<ParametroPeso[]>([])
  const [abc, setAbc] = useState<ParametroAbc[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPeso, setSavingPeso] = useState<string | null>(null)
  const [savingClasse, setSavingClasse] = useState<string | null>(null)
  const [pesoDrafts, setPesoDrafts] = useState<Record<string, string>>({})
  const [abcDrafts, setAbcDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([listParametrosFaixas(), listParametrosPesos(), listParametrosAbc()])
      .then(([faixasData, pesosData, abcData]) => {
        setFaixas(faixasData)
        setPesos(pesosData)
        setAbc(abcData)
      })
      .catch(() => toast.error("Não foi possível carregar os parâmetros."))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveFaixa(
    criterio: ParametroFaixa["criterio"],
    estrela: number,
    minValor: number,
    maxValor: number
  ) {
    await updateParametroFaixa(criterio, estrela, minValor, maxValor)
    setFaixas((prev) =>
      prev.map((f) => (f.criterio === criterio && f.estrela === estrela ? { ...f, minValor, maxValor } : f))
    )
  }

  async function handleSavePeso(criterio: ParametroPeso["criterio"]) {
    const draft = pesoDrafts[criterio] ?? String(pesos.find((p) => p.criterio === criterio)?.pesoPercentual ?? 0)
    const pesoPercentual = Number(draft)

    if (!Number.isFinite(pesoPercentual)) {
      toast.warning("Informe um peso numérico válido.")
      return
    }

    setSavingPeso(criterio)
    try {
      await updateParametroPeso(criterio, pesoPercentual)
      setPesos((prev) => prev.map((p) => (p.criterio === criterio ? { ...p, pesoPercentual } : p)))
      toast.success("Peso atualizado.")
    } catch {
      toast.error("Não foi possível atualizar o peso.")
    } finally {
      setSavingPeso(null)
    }
  }

  async function handleSaveAbc(classe: ParametroAbc["classe"]) {
    const draft = abcDrafts[classe] ?? String(abc.find((a) => a.classe === classe)?.percentual ?? 0)
    const percentual = Number(draft)

    if (!Number.isFinite(percentual)) {
      toast.warning("Informe um percentual numérico válido.")
      return
    }

    setSavingClasse(classe)
    try {
      await updateParametroAbc(classe, percentual)
      setAbc((prev) => prev.map((a) => (a.classe === classe ? { ...a, percentual } : a)))
      toast.success("Corte atualizado.")
    } catch {
      toast.error("Não foi possível atualizar o corte.")
    } finally {
      setSavingClasse(null)
    }
  }

  if (loading) {
    return (
      <AppShell title="Avaliação de Clientes" subtitle="Parametrize as faixas de estrelas e os cortes da Curva ABC">
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      </AppShell>
    )
  }

  return (
    <AppShell title="Avaliação de Clientes" subtitle="Parametrize as faixas de estrelas e os cortes da Curva ABC">
      <div className="space-y-6">
        <FaixasSection criterio="atividade" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("atividade", e, min, max)} />
        <FaixasSection criterio="frequencia" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("frequencia", e, min, max)} />
        <FaixasSection criterio="ticket_medio" faixas={faixas} onSave={(e, min, max) => handleSaveFaixa("ticket_medio", e, min, max)} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pesos da Nota Geral (%)
          </h3>
          <div className="mt-3 space-y-2">
            {pesos.map((peso) => (
              <div key={peso.criterio} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-56 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {CRITERIO_LABELS[peso.criterio]}
                </span>
                <input
                  type="number"
                  value={pesoDrafts[peso.criterio] ?? String(peso.pesoPercentual)}
                  onChange={(e) => setPesoDrafts((prev) => ({ ...prev, [peso.criterio]: e.target.value }))}
                  className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleSavePeso(peso.criterio)}
                  disabled={savingPeso === peso.criterio}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cortes da Curva ABC (% do faturamento acumulado)
          </h3>
          <div className="mt-3 space-y-2">
            {abc.map((item) => (
              <div key={item.classe} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-900">
                <span className="w-16 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Classe {item.classe}
                </span>
                <input
                  type="number"
                  value={abcDrafts[item.classe] ?? String(item.percentual)}
                  onChange={(e) => setAbcDrafts((prev) => ({ ...prev, [item.classe]: e.target.value }))}
                  className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleSaveAbc(item.classe)}
                  disabled={savingClasse === item.classe}
                  className="ml-auto h-9 rounded-lg bg-[#297B49] px-3 text-sm font-medium text-white disabled:opacity-60"
                >
                  Salvar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
