export function parseCurrencyInput(value: string) {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatDateBR(date: string) {
  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
  } catch {
    return date
  }
}

export function getMonthDateRange(year: number, month: number) {
  const paddedMonth = String(month).padStart(2, "0")
  const lastDay = new Date(year, month, 0).getDate()

  return {
    dataInicio: `${year}-${paddedMonth}-01`,
    dataFim: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function getYearDateRange(year: number) {
  return {
    dataInicio: `${year}-01-01`,
    dataFim: `${year}-12-31`,
  }
}