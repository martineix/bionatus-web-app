import { LogOut, Menu, Moon, RefreshCcw, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { signOut } from "@/lib/auth"
import { useTheme } from "@/providers/theme-provider"
import UpdatesBell from "../ui/myComponents/updates-bell"

type TopbarProps = {
  title: string
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  lastUpdated?: Date | null
  onOpenMobileMenu?: () => void
}

export default function Topbar({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
  onOpenMobileMenu,
}: TopbarProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  async function handleLogout() {
    await signOut()
    navigate("/login")
  }

  const updatedLabel = lastUpdated
    ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Ainda não atualizado"

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80 dark:border-slate-800 dark:bg-slate-950/95 dark:supports-backdrop-filter:bg-slate-950/80 lg:static lg:bg-white lg:backdrop-blur-0 lg:supports-backdrop-filter:bg-white dark:lg:bg-slate-950">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                {title}
              </h1>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                <span className="sm:hidden">{updatedLabel}</span>
                <span className="hidden sm:inline">
                  {subtitle ?? "Visão Geral"} || {updatedLabel}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <UpdatesBell />
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-10 sm:w-auto sm:px-4"
                disabled={refreshing}
                aria-label={refreshing ? "Atualizando" : "Atualizar"}
                title={refreshing ? "Atualizando" : "Atualizar"}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="ml-2 hidden sm:inline">
                  {refreshing ? "Atualizando..." : "Atualizar"}
                </span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Alternar tema"
              title="Alternar tema"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-300" />
              ) : (
                <Moon className="h-4 w-4 text-blue-700" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-10 sm:w-auto sm:px-4"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* {onRefresh && (
          <div className="mt-2 hidden sm:flex justify-end">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {updatedLabel}
            </p>
          </div>
        )} */}
      </div>
    </header>
  )
}