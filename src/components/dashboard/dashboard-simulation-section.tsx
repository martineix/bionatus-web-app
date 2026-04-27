// src/components/dashboard/dashboard-simulation-section.tsx
import type { Dispatch, SetStateAction } from "react"
import type { DashboardSimulacaoRow } from "@/lib/dashboard"
import { SimulationForm } from "./simulation-form"
import { SimulationTable } from "./simulation-table"

type DashboardSimulationSectionProps = {
  projectionSimulations: DashboardSimulacaoRow[]
  savingSimulation: boolean
  simulationDate: string
  simulationChannel: number | ""
  simulationValue: string
  editingSimulationId: number | null
  setSimulationDate: Dispatch<SetStateAction<string>>
  setSimulationChannel: Dispatch<SetStateAction<number | "">>
  setSimulationValue: Dispatch<SetStateAction<string>>
  resetSimulationForm: () => void
  handleSubmitSimulation: () => void
  handleEditSimulation: (item: DashboardSimulacaoRow) => void
  handleDeleteSimulation: (id: number) => void
}

export function DashboardSimulationSection(props: DashboardSimulationSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-stretch">
      <div className="w-full min-w-0 h-full">
        <SimulationForm {...props} />
      </div>

      <div className="w-full min-w-0 h-full">
        <SimulationTable {...props} />
      </div>
    </div>
  )
}