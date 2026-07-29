import { useState, type RefObject } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Users,
  Ban,
  ShieldCheck,
  FolderCog,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react"

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  asideRef?: RefObject<HTMLElement | null>
  closeButtonRef?: RefObject<HTMLButtonElement | null>
  hideRemocoes?: boolean
  hideAdminItems?: boolean
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
}

const topNavItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    to: "/produtos",
    label: "Produtos",
    icon: Package,
  },
]

const cadastrosNavItems: NavItem[] = [
  {
    to: "/remocoes",
    label: "Remoções",
    icon: Ban,
  },
  {
    to: "/permissoes",
    label: "Permissões",
    icon: ShieldCheck,
  },
]

const CADASTROS_PATHS = new Set(cadastrosNavItems.map((item) => item.to))

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  asideRef,
  closeButtonRef,
  hideRemocoes = false,
  hideAdminItems = false,
}: SidebarProps) {
  const location = useLocation()
  const [cadastrosOpen, setCadastrosOpen] = useState(() =>
    CADASTROS_PATHS.has(location.pathname)
  )

  const showLabels = mobileOpen || !collapsed

  const visibleCadastrosItems = cadastrosNavItems.filter((item) => {
    if (item.to === "/remocoes" && hideRemocoes) return false
    if (item.to === "/permissoes" && hideAdminItems) return false
    return true
  })

  function renderNavItem(item: NavItem, indent = false) {
    const Icon = item.icon

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        aria-label={!showLabels ? item.label : undefined}
        className={({ isActive }) =>
          `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${showLabels ? "gap-3" : "lg:justify-center"
          } ${indent && showLabels ? "ml-4" : ""} ${isActive
            ? "bg-[#D0D9D6] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          }`
        }
        title={!showLabels ? item.label : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {showLabels && <span>{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        ref={asideRef}
        id="mobile-sidebar"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white p-4 transition-[width,transform] duration-300 dark:border-slate-800 dark:bg-slate-950
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-72 lg:translate-x-0
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          {showLabels && (
            <div>
              <h2 className="text-xl font-bold text-[#006426] dark:text-[#7DD3A2]">
                Bionatus
              </h2>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              ref={closeButtonRef}
              onClick={onCloseMobile}
              aria-label="Fechar menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="space-y-2" aria-label="Navegação principal">
          {topNavItems.map((item) => renderNavItem(item))}

          {visibleCadastrosItems.length > 0 &&
            (showLabels ? (
              <div>
                <button
                  type="button"
                  onClick={() => setCadastrosOpen((prev) => !prev)}
                  aria-expanded={cadastrosOpen}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FolderCog className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">Cadastros</span>
                  {cadastrosOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {cadastrosOpen && (
                  <div className="mt-2 space-y-2">
                    {visibleCadastrosItems.map((item) => renderNavItem(item, true))}
                  </div>
                )}
              </div>
            ) : (
              visibleCadastrosItems.map((item) => renderNavItem(item))
            ))}
        </nav>
      </aside>
    </>
  )
}
