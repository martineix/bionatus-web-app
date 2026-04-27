import { useEffect, useMemo, useState } from "react"
import { Bell, GitCommitVertical, Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getGithubUpdates, type GithubUpdate } from "@/lib/dashboard"

const LAST_SEEN_COMMIT_KEY = "dashboard-last-seen-commit"

function formatUpdateDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  } catch {
    return ""
  }
}

export default function UpdatesBell() {
  const [updates, setUpdates] = useState<GithubUpdate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSeenCommit, setLastSeenCommit] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LAST_SEEN_COMMIT_KEY)
    setLastSeenCommit(saved)
  }, [])

  useEffect(() => {
    async function loadUpdates() {
      try {
        setLoading(true)
        setError(null)

        const data = await getGithubUpdates()
        setUpdates(data)
      } catch (err) {
        logger.error("updates-bell/fetchUpdates", err)
        setError("Não foi possível carregar os updates.")
      } finally {
        setLoading(false)
      }
    }

    loadUpdates()
  }, [])

  const newCount = useMemo(() => {
    if (updates.length === 0) return 0
    if (!lastSeenCommit) return updates.length

    const index = updates.findIndex((item) => item.id === lastSeenCommit)

    if (index === -1) {
      return updates.length
    }

    return index
  }, [updates, lastSeenCommit])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen && updates.length > 0) {
      const latestCommitId = updates[0].id
      localStorage.setItem(LAST_SEEN_COMMIT_KEY, latestCommitId)
      setLastSeenCommit(latestCommitId)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Últimas atualizações"
          title="Últimas atualizações"
        >
          <Bell className="h-4 w-4" />
          {newCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#006426] px-1 text-[10px] font-semibold text-white">
              {newCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-90 rounded-2xl border border-slate-200 p-3 shadow-lg dark:border-slate-700"
      >
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Últimas atualizações
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Commits mais recentes do projeto
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando updates...
          </div>
        ) : error ? (
          <div className="py-4 text-sm text-red-500">{error}</div>
        ) : updates.length === 0 ? (
          <div className="py-4 text-sm text-slate-500">
            Nenhum update encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {updates.map((item, index) => {
              const isNew = index < newCount

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    isNew
                      ? "border-[#297B49]/30 bg-[#297B49]/5"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <GitCommitVertical className="h-4 w-4 shrink-0 text-[#006426]" />
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-[#006426] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Novo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{item.sha}</span>
                        <span>•</span>
                        <span>{item.author}</span>
                      </div>
                    </div>

                    <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                      {formatUpdateDate(item.date)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}