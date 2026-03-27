import { useEffect, useState } from "react"
import AppShell from "@/components/layout/app-shell"
import DashboardFilters from "@/components/ui/myComponents/dashboard-filters"
import KpiCard from "@/components/ui/myComponents/kpi-card"
import {
  getDashboardKpis,
  getDashboardKpisComparison,
  getDashboardAvailableYears,
  getDashboardAvailableMonths,
  getDashboardSalesDaily,
  type DashboardFiltersInput,
  type DashboardKpis,
  type DashboardKpisComparison,
  type DashboardMonthOption,
  type DashboardDailySalesPoint,
} from "@/lib/dashboard"
import {
  formatCurrencyBRL,
  formatNumberBR,
  formatPercentBR,
  getPercentageChange,
} from "@/lib/format"
import {
  BadgeDollarSign,
  ShoppingCart,
  ReceiptText,
  Handshake,
} from "lucide-react"
import DashboardSalesChart from "@/components/ui/myComponents/dashboard-sales-chart"

const FILTERS_STORAGE_KEY = "dashboard-filters"

const defaultFilters: DashboardFiltersInput = {
  ano: null,
  mes: null,
  dataInicio: null,
  dataFim: null,
  idRepresentante: null,
  mercado: null,
  contas: null,
}

export default function DashboardPage() {

  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [kpisComparison, setKpisComparison] = useState<DashboardKpisComparison | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableMonths, setAvailableMonths] = useState<DashboardMonthOption[]>([])
  const [salesDaily, setSalesDaily] = useState<DashboardDailySalesPoint[]>([])
  const [salesPreviousDaily, setSalesPreviousDaily] = useState<DashboardDailySalesPoint[]>([])

  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<DashboardFiltersInput>(() => {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY)

    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return defaultFilters
      }
    }

    return defaultFilters
  })

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)

        let dataInicio: string | null = null
        let dataFim: string | null = null

        if (filters.ano && filters.mes) {
          const mes = String(filters.mes).padStart(2, "0")
          const ultimoDia = new Date(filters.ano, filters.mes, 0).getDate()

          dataInicio = `${filters.ano}-${mes}-01`
          dataFim = `${filters.ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`
        } else if (filters.ano) {
          dataInicio = `${filters.ano}-01-01`
          dataFim = `${filters.ano}-12-31`
        }

        const filtersToQuery: DashboardFiltersInput = {
          ...filters,
          dataInicio,
          dataFim,
        }

        let previousFilters: DashboardFiltersInput = {
          ...filters,
          dataInicio: null,
          dataFim: null,
        }

        if (filters.ano && filters.mes) {
          const currentDate = new Date(filters.ano, filters.mes - 1, 1)
          const previousDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
          )

          const previousYear = previousDate.getFullYear()
          const previousMonth = previousDate.getMonth() + 1
          const previousMonthPadded = String(previousMonth).padStart(2, "0")
          const previousLastDay = new Date(
            previousYear,
            previousMonth,
            0
          ).getDate()

          previousFilters = {
            ...filters,
            dataInicio: `${previousYear}-${previousMonthPadded}-01`,
            dataFim: `${previousYear}-${previousMonthPadded}-${String(
              previousLastDay
            ).padStart(2, "0")}`,
          }
        }

        const hasMonthComparison = !!filters.ano && !!filters.mes

        const comparisonPromise = hasMonthComparison
          ? getDashboardKpisComparison({
            dataInicio: dataInicio!,
            dataFim: dataFim!,
            dataInicioMesAnterior: previousFilters.dataInicio!,
            dataFimMesAnterior: previousFilters.dataFim!,
            dataInicioAnoAnterior: `${filters.ano! - 1}-${String(
              filters.mes!
            ).padStart(2, "0")}-01`,
            dataFimAnoAnterior: `${filters.ano! - 1}-${String(
              filters.mes!
            ).padStart(2, "0")}-${String(
              new Date(filters.ano! - 1, filters.mes!, 0).getDate()
            ).padStart(2, "0")}`,
            idRepresentante: filters.idRepresentante,
            mercado: filters.mercado,
            contas: filters.contas,
          })
          : Promise.resolve(null)

        const previousSalesPromise =
          hasMonthComparison
            ? getDashboardSalesDaily(previousFilters)
            : Promise.resolve([] as DashboardDailySalesPoint[])

        const [kpisData, comparisonData, salesData, salesPreviousData] =
          await Promise.all([
            getDashboardKpis(filtersToQuery),
            comparisonPromise,
            getDashboardSalesDaily(filtersToQuery),
            previousSalesPromise,
          ])

        setKpis(kpisData)
        setKpisComparison(comparisonData)
        setSalesDaily(salesData)
        setSalesPreviousDaily(salesPreviousData)
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [filters])

  useEffect(() => {
    async function loadYears() {
      try {
        const years = await getDashboardAvailableYears()
        setAvailableYears(years)
      } catch (error) {
        console.error("Erro ao buscar anos disponíveis:", error)
      }
    }

    loadYears()
  }, [])

  useEffect(() => {
    async function loadMonths() {
      try {
        if (!filters.ano) {
          setAvailableMonths([])
          return
        }

        const months = await getDashboardAvailableMonths(filters.ano)
        setAvailableMonths(months)
      } catch (error) {
        console.error("Erro ao buscar meses disponíveis:", error)
      }
    }

    loadMonths()
  }, [filters.ano])

  const hasComparison = !!filters.ano && !!filters.mes

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          availableYears={availableYears}
          availableMonths={availableMonths}
        />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Faturamento"
            value={
              loading
                ? "Carregando..."
                : formatCurrencyBRL(
                  kpisComparison?.faturamento_atual ?? kpis?.faturamento ?? 0
                )
            }
            icon={<BadgeDollarSign className="h-5 w-5" />}
            accentColor="#006426"
            accentBg="#D0D9D6"
            comparisons={
              hasComparison ?
                [
                  {
                    label: "vs Mês Anterior:",
                    value: formatCurrencyBRL(
                      kpisComparison?.faturamento_mes_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.faturamento_atual ?? 0,
                        kpisComparison?.faturamento_mes_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.faturamento_atual ?? 0) >=
                      (kpisComparison?.faturamento_mes_anterior ?? 0),
                  },
                  {
                    label: "vs Ano Anterior:",
                    value: formatCurrencyBRL(
                      kpisComparison?.faturamento_ano_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.faturamento_atual ?? 0,
                        kpisComparison?.faturamento_ano_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.faturamento_atual ?? 0) >=
                      (kpisComparison?.faturamento_ano_anterior ?? 0),
                  },
                ] : []}
          />

          <KpiCard
            title="Pedidos"
            value={
              loading
                ? "Carregando..."
                : formatNumberBR(
                  kpisComparison?.pedidos_atual ?? kpis?.pedidos ?? 0
                )
            }
            icon={<ShoppingCart className="h-5 w-5" />}
            accentColor="#297B49"
            accentBg="#E3ECE6"
            comparisons={
              hasComparison ?
                [
                  {
                    label: "vs Mês Anterior:",
                    value: formatNumberBR(kpisComparison?.pedidos_mes_anterior ?? 0),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.pedidos_atual ?? 0,
                        kpisComparison?.pedidos_mes_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.pedidos_atual ?? 0) >=
                      (kpisComparison?.pedidos_mes_anterior ?? 0),
                  },
                  {
                    label: "vs Ano Anterior:",
                    value: formatNumberBR(kpisComparison?.pedidos_ano_anterior ?? 0),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.pedidos_atual ?? 0,
                        kpisComparison?.pedidos_ano_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.pedidos_atual ?? 0) >=
                      (kpisComparison?.pedidos_ano_anterior ?? 0),
                  },
                ] : []}
          />

          <KpiCard
            title="Ticket Médio"
            value={
              loading
                ? "Carregando..."
                : formatCurrencyBRL(
                  kpisComparison?.ticket_medio_atual ??
                  kpis?.ticket_medio ??
                  0
                )
            }
            icon={<ReceiptText className="h-5 w-5" />}
            accentColor="#53936C"
            accentBg="#E8F0EB"
            comparisons={
              hasComparison ?
                [
                  {
                    label: "vs Mês Anterior:",
                    value: formatCurrencyBRL(
                      kpisComparison?.ticket_medio_mes_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.ticket_medio_atual ?? 0,
                        kpisComparison?.ticket_medio_mes_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.ticket_medio_atual ?? 0) >=
                      (kpisComparison?.ticket_medio_mes_anterior ?? 0),
                  },
                  {
                    label: "vs Ano Anterior:",
                    value: formatCurrencyBRL(
                      kpisComparison?.ticket_medio_ano_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.ticket_medio_atual ?? 0,
                        kpisComparison?.ticket_medio_ano_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.ticket_medio_atual ?? 0) >=
                      (kpisComparison?.ticket_medio_ano_anterior ?? 0),
                  },
                ] : []}
          />

          <KpiCard
            title="Positivações"
            value={
              loading
                ? "Carregando..."
                : formatNumberBR(
                  kpisComparison?.positivacoes_atual ??
                  kpis?.positivacoes ??
                  0
                )
            }
            icon={<Handshake className="h-5 w-5" />}
            accentColor="#7DAA90"
            accentBg="#EEF3F0"
            comparisons={
              hasComparison ?
                [
                  {
                    label: "vs Mês Anterior:",
                    value: formatNumberBR(
                      kpisComparison?.positivacoes_mes_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.positivacoes_atual ?? 0,
                        kpisComparison?.positivacoes_mes_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.positivacoes_atual ?? 0) >=
                      (kpisComparison?.positivacoes_mes_anterior ?? 0),
                  },
                  {
                    label: "vs Ano Anterior:",
                    value: formatNumberBR(
                      kpisComparison?.positivacoes_ano_anterior ?? 0
                    ),
                    change: formatPercentBR(
                      getPercentageChange(
                        kpisComparison?.positivacoes_atual ?? 0,
                        kpisComparison?.positivacoes_ano_anterior ?? 0
                      )
                    ),
                    positive:
                      (kpisComparison?.positivacoes_atual ?? 0) >=
                      (kpisComparison?.positivacoes_ano_anterior ?? 0),
                  },
                ] : []}
          />
        </div>

        <DashboardSalesChart
          data={salesDaily}
          previousData={salesPreviousDaily}
          loading={loading}
        />
      </div>
    </AppShell>
  )
}