import AppShell from "@/components/layout/app-shell"
import KpiCard from "@/components/ui/myComponents/kpi-card"
import { BadgeDollarSign, ShoppingCart, ReceiptText, Handshake } from "lucide-react"

export default function DashboardPage() {
    return (
        <AppShell
            title="Dashboard"
            subtitle="Visão geral do desempenho comercial"
        >
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title="Faturamento"
                    value="R$ 2.551.716,25"
                    previousLabel="Ano Passado:"
                    previousValue="R$ 4.751.450,97"
                    change="44,2%"
                    positive={false}
                    icon={<BadgeDollarSign className="h-5 w-5" />}
                    accentColor="#006426"
                    accentBg="#D0D9D6"
                />

                <KpiCard
                    title="Pedidos"
                    value="1.434"
                    previousLabel="Ano Passado:"
                    previousValue="2.790"
                    change="48,6%"
                    positive={false}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    accentColor="#9A6700"
                    accentBg="#F6E7B8"
                />

                <KpiCard
                    title="Ticket Médio"
                    value="R$ 1.779,44"
                    previousLabel="Ano Passado:"
                    previousValue="R$ 1.638,51"
                    change="8,6%"
                    positive={true}
                    icon={<ReceiptText className="h-5 w-5" />}
                    accentColor="#2C5282"
                    accentBg="#D6E6F8"
                />

                <KpiCard
                    title="Positivações"
                    value="1.188"
                    previousLabel="Ano Passado:"
                    previousValue="1.852"
                    change="35,9%"
                    positive={false}
                    icon={<Handshake className="h-5 w-5" />}
                    accentColor="#7A4E0E"
                    accentBg="#F3DFC3"
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Evolução de vendas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Aqui depois vamos colocar gráfico e filtros.
                    </p>

                    <div className="mt-6 flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
                        Área do gráfico
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Resumo rápido
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Indicadores complementares da operação.
                    </p>

                    <div className="mt-6 space-y-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Ticket médio</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                R$ 0,00
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Pedidos</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                0
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Positivação</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                0%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    )
}