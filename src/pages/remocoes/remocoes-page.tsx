// src/pages/remocoes/remocoes-page.tsx
import AppShell from "@/components/layout/app-shell"
import { RemovalForm } from "@/components/removals/removal-form"
import { RemovalTable } from "@/components/removals/removal-table"
import { useRemovals } from "@/hooks/removals/use-removals"

export default function RemocoesPage() {
  const {
    removals,
    loading,
    saving,
    sistema,
    pedido,
    motivo,
    setSistema,
    setPedido,
    setMotivo,
    handleSubmit,
    handleDelete,
  } = useRemovals()

  return (
    <AppShell
      title="Remoções"
      subtitle="Exclua pedidos/notas de cancelamento das agregações do dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-start">
        <RemovalForm
          sistema={sistema}
          pedido={pedido}
          motivo={motivo}
          saving={saving}
          setSistema={setSistema}
          setPedido={setPedido}
          setMotivo={setMotivo}
          handleSubmit={handleSubmit}
        />

        <RemovalTable
          removals={removals}
          loading={loading}
          handleDelete={handleDelete}
        />
      </div>
    </AppShell>
  )
}
