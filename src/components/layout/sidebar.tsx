import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  Users,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white p-4 transition-[width, transform] duration-300 dark:border-slate-800 dark:bg-slate-950
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-72 lg:translate-x-0
        ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold text-[#006426] dark:text-[#7DD3A2]">
                Bionatus
              </h2>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onCloseMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            <button
              onClick={onToggleCollapse}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:inline-flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/dashboard"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "lg:justify-center" : "gap-3"
              } ${
                isActive
                  ? "bg-[#D0D9D6] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/clientes"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "lg:justify-center" : "gap-3"
              } ${
                isActive
                  ? "bg-[#D0D9D6] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`
            }
          >
            <Users className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Clientes</span>}
          </NavLink>

          <NavLink
            to="/produtos"
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "lg:justify-center" : "gap-3"
              } ${
                isActive
                  ? "bg-[#D0D9D6] text-[#006426] dark:bg-slate-800 dark:text-[#7DD3A2]"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`
            }
          >
            <Package className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Produtos</span>}
          </NavLink>
        </nav>
      </aside>
    </>
  )
}