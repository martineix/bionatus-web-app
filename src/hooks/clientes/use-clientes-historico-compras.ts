import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  buscarClientesHistorico,
  getClienteHistoricoCompras,
  type ClienteHistoricoBusca,
  type ClienteHistoricoItemRow,
} from "@/lib/clientes/clientes-historico-compras"
import { logger } from "@/lib/logger"

export function useClientesHistoricoCompras() {
  const [termo, setTermo] = useState("")
  const [resultados, setResultados] = useState<ClienteHistoricoBusca[]>([])
  const [buscando, setBuscando] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteHistoricoBusca | null>(null)
  const [itens, setItens] = useState<ClienteHistoricoItemRow[]>([])
  const [loadingItens, setLoadingItens] = useState(false)

  const mountedRef = useRef(true)
  const clienteSelecionadoRef = useRef<ClienteHistoricoBusca | null>(null)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    clienteSelecionadoRef.current = clienteSelecionado
  }, [clienteSelecionado])

  useEffect(() => {
    if (clienteSelecionado) return

    const termoLimpo = termo.trim()
    if (termoLimpo.length < 2) {
      setResultados([])
      return
    }

    let mounted = true
    const timeout = setTimeout(() => {
      setBuscando(true)
      buscarClientesHistorico(termoLimpo)
        .then((data) => {
          if (mounted) setResultados(data)
        })
        .catch((error) => {
          logger.error("use-clientes-historico-compras-busca", error)
          toast.error("Não foi possível buscar clientes.")
        })
        .finally(() => {
          if (mounted) setBuscando(false)
        })
    }, 300)

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [termo, clienteSelecionado])

  function selecionarCliente(cliente: ClienteHistoricoBusca) {
    setClienteSelecionado(cliente)
    setLoadingItens(true)

    const cnpjFetched = cliente.cnpj

    getClienteHistoricoCompras(cnpjFetched)
      .then((data) => {
        if (mountedRef.current && clienteSelecionadoRef.current?.cnpj === cnpjFetched) {
          setItens(data)
        }
      })
      .catch((error) => {
        if (mountedRef.current) {
          logger.error("use-clientes-historico-compras-itens", error)
          toast.error("Não foi possível carregar o histórico de compras.")
        }
      })
      .finally(() => {
        if (mountedRef.current && clienteSelecionadoRef.current?.cnpj === cnpjFetched) {
          setLoadingItens(false)
        }
      })
  }

  function limparSelecao() {
    setClienteSelecionado(null)
    setItens([])
    setTermo("")
    setResultados([])
  }

  return {
    termo,
    setTermo,
    resultados,
    buscando,
    clienteSelecionado,
    itens,
    loadingItens,
    selecionarCliente,
    limparSelecao,
  }
}
