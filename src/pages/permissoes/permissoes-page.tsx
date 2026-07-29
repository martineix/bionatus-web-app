// src/pages/permissoes/permissoes-page.tsx
import { useEffect, useState } from "react"
import { toast } from "sonner"
import AppShell from "@/components/layout/app-shell"
import {
  listRolePermissions,
  updateRolePermission,
  type RolePermissionRow,
} from "@/lib/permissions"

const FEATURE_LABELS: Record<string, string> = {
  remocoes: "Acesso à tela de Remoções",
  dashboard_projecao_checkbox: "Checkbox de Projeção no gráfico",
  dashboard_simulacao: "Seção de simulação de projeção",
}

export default function PermissoesPage() {
  const [permissions, setPermissions] = useState<RolePermissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    listRolePermissions()
      .then(setPermissions)
      .catch(() => toast.error("Não foi possível carregar as permissões."))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggle(featureKey: string, allowed: boolean) {
    setSavingKey(featureKey)

    try {
      await updateRolePermission(featureKey, allowed)
      setPermissions((prev) =>
        prev.map((row) => (row.feature_key === featureKey ? { ...row, allowed } : row))
      )
      toast.success("Permissão atualizada.")
    } catch {
      toast.error("Não foi possível atualizar a permissão.")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AppShell title="Permissões" subtitle="Controle o que representantes podem acessar">
      <div className="space-y-3">
        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        )}

        {!loading &&
          permissions.map((row) => (
            <label
              key={row.feature_key}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {FEATURE_LABELS[row.feature_key] ?? row.feature_key}
              </span>

              <input
                type="checkbox"
                checked={row.allowed}
                disabled={savingKey === row.feature_key}
                onChange={(e) => handleToggle(row.feature_key, e.target.checked)}
              />
            </label>
          ))}
      </div>
    </AppShell>
  )
}
