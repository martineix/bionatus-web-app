import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import AppShell from "@/components/layout/app-shell"
import { ClientesFilters } from "@/components/clientes/clientes-filters"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientesAberturas } from "@/hooks/clientes/use-clientes-aberturas"

export default function AberturasPage() {
  const { points, loading, filters, setFilters, range, setRange } = useClientesAberturas()

  return (
    <AppShell title="Aberturas de Clientes" subtitle="Novos clientes por mês (primeira compra)">
      <div className="space-y-6">
        <ClientesFilters filters={filters} onChange={setFilters} />

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                De
              </label>
              <input
                type="date"
                value={range.dataInicio}
                onChange={(e) => setRange((prev) => ({ ...prev, dataInicio: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-slate-500 dark:text-slate-400">
                Até
              </label>
              <input
                type="date"
                value={range.dataFim}
                onChange={(e) => setRange((prev) => ({ ...prev, dataFim: e.target.value }))}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D0D9D6] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="anoMes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtdClientes" name="Clientes abertos" fill="#297B49" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
