// src/lib/dashboard/dashboard-kpi-cards.tsx
import {
  BadgeDollarSign,
  ShoppingCart,
  ReceiptText,
  Handshake,
} from "lucide-react"

export const dashboardKpiCards = [
  {
    key: "faturamento",
    title: "Faturamento",
    icon: BadgeDollarSign,
    accentBg: "#006426",
    valueKey: "faturamento",
  },
  {
    key: "pedidos",
    title: "Pedidos",
    icon: ShoppingCart,
    accentBg: "#EFAF14",
    valueKey: "pedidos",
  },
  {
    key: "ticket_medio",
    title: "Ticket Médio",
    icon: ReceiptText,
    accentBg: "#00AFBE",
    valueKey: "ticket_medio",
  },
  {
    key: "positivacoes",
    title: "Positivações",
    icon: Handshake,
    accentBg: "#7832CD",
    valueKey: "positivacoes",
  },
] as const