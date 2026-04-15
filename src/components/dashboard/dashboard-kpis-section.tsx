// src/components/dashboard/dashboard-kpis-section.tsx
import KpiCard from "@/components/ui/myComponents/kpi-card"
import {
  formatCurrencyBRL,
  formatNumberBR,
  formatPercentBR,
  getPercentageChange,
} from "@/lib/format"
import { dashboardKpiCards } from "@/lib/dashboard/dashboard-kpi-cards"

export function DashboardKpisSection({
  loading,
  hasComparison,
  kpis,
  kpisComparison,
}: any) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {dashboardKpiCards.map((card) => {
        const Icon = card.icon

        const currentValue = kpisComparison?.[`${card.valueKey}_atual`] ?? kpis?.[card.valueKey] ?? 0
        const previousMonthValue = kpisComparison?.[`${card.valueKey}_mes_anterior`] ?? 0
        const previousYearValue = kpisComparison?.[`${card.valueKey}_ano_anterior`] ?? 0

        const formatValue =
          card.valueKey === "faturamento" || card.valueKey === "ticket_medio"
            ? formatCurrencyBRL
            : formatNumberBR

        return (
          <KpiCard
            key={card.key}
            title={card.title}
            value={loading ? "Carregando..." : formatValue(currentValue)}
            icon={<Icon className="h-5 w-5" />}
            accentColor="#FFF"
            accentBg={card.accentBg}
            comparisons={
              hasComparison
                ? [
                  {
                    label: "vs mês anterior:",
                    value: formatValue(previousMonthValue),
                    change: formatPercentBR(getPercentageChange(currentValue, previousMonthValue)),
                    positive: currentValue >= previousMonthValue,
                  },
                  {
                    label: "vs ano anterior:",
                    value: formatValue(previousYearValue),
                    change: formatPercentBR(getPercentageChange(currentValue, previousYearValue)),
                    positive: currentValue >= previousYearValue,
                  },
                ]
                : []
            }
          />
        )
      })}
    </div>
  )
}