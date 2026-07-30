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

export function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "")

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }

  return value
}