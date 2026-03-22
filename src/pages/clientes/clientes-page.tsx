import AppShell from "@/components/layout/app-shell"

export default function ClientesPage() {
  return (
    <AppShell
      title="Clientes"
      subtitle="Análises, segmentações e indicadores da base de clientes"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total de clientes</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Clientes ativos</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Curva A</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Recorrentes</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Visão por segmentação
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aqui depois vamos mostrar curva ABC, perfil e clusters.
          </p>

          <div className="mt-6 flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
            Área de análise de clientes
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Oportunidades
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Espaço para recorrência, reativação e potencial de compra.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Clientes sem compra recente</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Clientes com potencial</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Clientes reativados</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}