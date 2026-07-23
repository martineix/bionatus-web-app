// src/hooks/removals/use-removals.ts
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { deleteRemoval, getRemovals, insertRemoval, type RemovalRow } from "@/lib/removals"
import { logger } from "@/lib/logger"

export function useRemovals() {
  const [removals, setRemovals] = useState<RemovalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [sistema, setSistema] = useState<number | "">("")
  const [pedido, setPedido] = useState("")
  const [motivo, setMotivo] = useState("")

  const loadRemovals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getRemovals()
      setRemovals(data)
    } catch (error) {
      logger.error("use-removals/loadRemovals", error)
      toast.error("Não foi possível carregar as remoções.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRemovals()
  }, [loadRemovals])

  function resetForm() {
    setSistema("")
    setPedido("")
    setMotivo("")
  }

  async function handleSubmit() {
    if (sistema === "" || !pedido) {
      toast.warning("Selecione o sistema e informe o número do pedido.")
      return
    }

    const numericPedido = Number(pedido)

    if (!Number.isFinite(numericPedido) || numericPedido <= 0 || !Number.isInteger(numericPedido)) {
      toast.warning("Informe um número de pedido válido.")
      return
    }

    try {
      setSaving(true)
      await insertRemoval(sistema, numericPedido, motivo)
      resetForm()
      await loadRemovals()
      toast.success("Remoção adicionada.")
    } catch (error) {
      logger.error("use-removals/handleSubmit", error)
      const message =
        error instanceof Error ? error.message : "Não foi possível adicionar a remoção."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteRemoval(id)
      await loadRemovals()
      toast.success("Remoção excluída.")
    } catch (error) {
      logger.error("use-removals/handleDelete", error)
      toast.error("Não foi possível excluir a remoção.")
    }
  }

  return {
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
  }
}
