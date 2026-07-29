import { useEffect, useState } from "react"
import type { ClientesFiltersInput } from "@/lib/clientes/clientes-filters-types"

const STORAGE_KEY = "clientes-filters"

const defaultFilters: ClientesFiltersInput = {
  mercado: null,
  contas: [],
  isBionatus: null,
}

function getInitialFilters(): ClientesFiltersInput {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return defaultFilters

  try {
    const parsed = JSON.parse(saved)
    return {
      mercado: typeof parsed.mercado === "number" ? parsed.mercado : null,
      contas: Array.isArray(parsed.contas) ? parsed.contas : [],
      isBionatus: parsed.isBionatus === 0 || parsed.isBionatus === 1 ? parsed.isBionatus : null,
    }
  } catch {
    return defaultFilters
  }
}

export function useClientesFilters() {
  const [filters, setFilters] = useState<ClientesFiltersInput>(getInitialFilters)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  return { filters, setFilters }
}
