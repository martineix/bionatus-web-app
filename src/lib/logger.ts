const isDev = import.meta.env.DEV

type LogContext = Record<string, unknown>

export const logger = {
  error(context: string, error: unknown, data?: LogContext) {
    if (isDev) {
      console.error(`[${context}]`, error, data ?? "")
    }
    // Em produção, integrar com Sentry/LogRocket aqui:
    // Sentry.captureException(error, { extra: { context, ...data } })
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
