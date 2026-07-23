const isDev = import.meta.env.DEV

type LogContext = Record<string, unknown>

export const logger = {
  error(context: string, error: unknown, data?: LogContext) {
    // Sempre loga, inclusive em produção — hoje é a única forma de saber que algo falhou.
    // Se integrar um serviço de erro (Sentry/LogRocket), reportar aqui também:
    // Sentry.captureException(error, { extra: { context, ...data } })
    console.error(`[${context}]`, error, data ?? "")
  },

  warn(context: string, message: string, data?: LogContext) {
    if (isDev) {
      console.warn(`[${context}] ${message}`, data ?? "")
    }
  },

  info(context: string, message: string, data?: LogContext) {
    if (isDev) {
      console.info(`[${context}] ${message}`, data ?? "")
    }
  },
}
