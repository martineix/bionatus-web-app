import { LogOut, Menu, Moon, RefreshCcw, Sun } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { signOut } from "@/lib/auth"
import { useTheme } from "@/providers/theme-provider"

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

  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {onRefresh && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lastUpdated
                  ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Ainda não atualizado"}
              </p>

              <button
                onClick={onRefresh}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={refreshing}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-300" />
            ) : (
              <Moon className="h-4 w-4 text-blue-700"/>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}