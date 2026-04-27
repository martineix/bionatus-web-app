import { Component, type ErrorInfo, type ReactNode } from "react"
import { logger } from "@/lib/logger"

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("ErrorBoundary", error, { componentStack: info.componentStack ?? "" })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Algo deu errado ao carregar este componente.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
