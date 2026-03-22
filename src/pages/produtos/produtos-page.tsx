import AppShell from "@/components/layout/app-shell"

export default function ProdutosPage() {
  return (
    <AppShell
      title="Produtos"
      subtitle="Performance, mix, cobertura e oportunidades do portfólio"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Produtos vendidos</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top produtos</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Cross-selling</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0</h3>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Cobertura</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">0%</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Mix e desempenho
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Espaço para ranking, tendência e distribuição do mix.
          </p>

          <div className="mt-6 flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400">
            Área de análise de produtos
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Insights rápidos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores estratégicos do portfólio.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Produtos com maior giro</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Produtos com menor giro</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Combinações frequentes</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">0</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}