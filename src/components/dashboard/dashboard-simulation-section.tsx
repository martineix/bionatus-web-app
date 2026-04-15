// src/components/dashboard/dashboard-simulation-section.tsx
import { SimulationForm } from "./simulation-form"
import { SimulationTable } from "./simulation-table"

export function DashboardSimulationSection(props: any) {
    return (
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <SimulationForm {...props} />
            <SimulationTable {...props} />
        </div>
    )
}