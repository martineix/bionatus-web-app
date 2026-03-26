export function formatCurrencyBRL(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value)
}

export function formatNumberBR(value: number) {
    return new Intl.NumberFormat("pt-BR").format(value)
}

export function formatPercentBR(value: number) {
    return `${value.toFixed(1).replace(".", ",")}%`
}

export function getPercentageChange(current: number, previous: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}