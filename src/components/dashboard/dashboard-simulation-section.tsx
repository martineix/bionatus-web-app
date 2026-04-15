// src/components/dashboard/dashboard-simulation-section.tsx
import { SimulationForm } from "./simulation-form"
import { SimulationTable } from "./simulation-table"

export function DashboardSimulationSection(props: any) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="w-full min-w-0">
        <SimulationForm {...props} />
      </div>

      <div className="w-full min-w-0">
        <SimulationTable {...props} />
      </div>
    </div>
  )
}