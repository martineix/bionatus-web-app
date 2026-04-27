// src/hooks/dashboard/use-dashboard-simulations.ts
import { useCallback, useState } from "react"
import { toast } from "sonner"
import {
  deleteDashboardSimulacao,
  getDashboardSimulacoes,
  insertDashboardSimulacao,
  updateDashboardSimulacao,
  type DashboardSimulacaoRow,
} from "@/lib/dashboard"
import { parseCurrencyInput } from "@/lib/dashboard/dashboard-helpers"
import { logger } from "@/lib/logger"

type Params = {
  ano: number | null
  mes: number | null
  dataInicio: string | null
  dataFim: string | null
  onAfterChange?: () => Promise<void> | void
}

export function useDashboardSimulations({
  ano,
  mes,
  dataInicio,
  dataFim,
  onAfterChange,
}: Params) {
  const [projectionSimulations, setProjectionSimulations] = useState<DashboardSimulacaoRow[]>([])
  const [savingSimulation, setSavingSimulation] = useState(false)

  const [simulationDate, setSimulationDate] = useState("")
  const [simulationChannel, setSimulationChannel] = useState<number | "">("")
  const [simulationValue, setSimulationValue] = useState("")
  const [editingSimulationId, setEditingSimulationId] = useState<number | null>(null)

  function resetSimulationForm() {
    setEditingSimulationId(null)
    setSimulationDate("")
    setSimulationChannel("")
    setSimulationValue("")
  }

  const loadSimulacoes = useCallback(async () => {
    if (!dataInicio || !dataFim || !mes) {
      setProjectionSimulations([])
      return
    }

    try {
      const data = await getDashboardSimulacoes({ dataInicio, dataFim })
      setProjectionSimulations(data)
    } catch (error) {
      logger.error("use-dashboard-simulations/loadSimulacoes", error)
    }
  }, [dataInicio, dataFim, mes])

  async function handleSubmitSimulation() {
    if (!simulationDate || simulationChannel === "" || !simulationValue) return

    if (!ano || !mes || !dataInicio || !dataFim) {
      toast.warning("Selecione ano e mês no filtro principal antes de inserir uma simulação.")
      return
    }

    const selectedDate = new Date(`${simulationDate}T00:00:00`)
    const selectedYear = selectedDate.getFullYear()
    const selectedMonth = selectedDate.getMonth() + 1

    if (selectedYear !== ano || selectedMonth !== mes) {
      toast.warning("A data da simulação precisa estar dentro do mês selecionado no dashboard.")
      return
    }

    const numericValue = parseCurrencyInput(simulationValue)

    if (numericValue <= 0) {
      toast.warning("Informe um valor válido para a simulação.")
      return
    }

    try {
      setSavingSimulation(true)

      if (editingSimulationId) {
        await updateDashboardSimulacao({
          id: editingSimulationId,
          data_ref: simulationDate,
          contas: simulationChannel,
          valor: numericValue,
          observacao: null,
        })
      } else {
        await insertDashboardSimulacao({
          data_ref: simulationDate,
          contas: simulationChannel,
          valor: numericValue,
          observacao: null,
        })
      }

      resetSimulationForm()
      await loadSimulacoes()
      await onAfterChange?.()
    } catch (error) {
      logger.error("use-dashboard-simulations/handleSubmitSimulation", error)
      toast.error("Não foi possível salvar a simulação.")
    } finally {
      setSavingSimulation(false)
    }
  }

  function handleEditSimulation(item: DashboardSimulacaoRow) {
    setEditingSimulationId(item.id)
    setSimulationDate(item.data_ref)
    setSimulationChannel(item.contas)
    setSimulationValue(String(item.valor))
  }

  async function handleDeleteSimulation(id: number) {
    try {
      await deleteDashboardSimulacao(id)

      if (editingSimulationId === id) {
        resetSimulationForm()
      }

      await loadSimulacoes()
      await onAfterChange?.()
    } catch (error) {
      logger.error("use-dashboard-simulations/handleDeleteSimulation", error)
      toast.error("Não foi possível excluir a simulação.")
    }
  }

  return {
    projectionSimulations,
    savingSimulation,
    simulationDate,
    simulationChannel,
    simulationValue,
    editingSimulationId,
    setSimulationDate,
    setSimulationChannel,
    setSimulationValue,
    resetSimulationForm,
    loadSimulacoes,
    handleSubmitSimulation,
    handleEditSimulation,
    handleDeleteSimulation,
  }
}