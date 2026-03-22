import { NavLink } from "react-router-dom"
import {
    PanelLeftClose,
    PanelLeftOpen,
    LayoutDashboard,
    Package,
    Users,
} from "lucide-react"

type SidebarProps = {
    collapsed: boolean
    onToggleCollapse: () => void
}

export default function Sidebar({ collapsed, onToggleCollapse, }: SidebarProps) {
    return (
        <aside
            className={`min-h-screen border-r bg-white p-4 transition-all duration-300 ${collapsed ? "w-20" : "w-64"
                }`}
        >
            <div className="mb-6 flex items-center justify-between">
                {!collapsed && (
                    <div>
                        <h2 className="text-xl font-bold text-[#006426]">Bionatus</h2>
                        {/* <p className="text-sm text-slate-500">Web App</p> */}
                    </div>
                )}

                <button
                    onClick={onToggleCollapse}
                    //   className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                    className="inline-flex h-10 w-10 items-center justify-center"
                >
                    {collapsed ? (
                        <PanelLeftOpen className="h-5 w-5" />
                    ) : (
                        <PanelLeftClose className="h-5 w-5" />
                    )}
                </button>
            </div>

            <nav className="space-y-2">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : "gap-3"
                        } ${isActive
                            ? "bg-[#D0D9D6] text-[#006426]"
                            : "text-slate-700 hover:bg-slate-100"
                        }`
                    }
                >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink
                    to="/clientes"
                    className={({ isActive }) =>
                        `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : "gap-3"
                        } ${isActive
                            ? "bg-[#D0D9D6] text-[#006426]"
                            : "text-slate-700 hover:bg-slate-100"
                        }`
                    }
                >
                    <Users className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Clientes</span>}
                </NavLink>

                <NavLink
                    to="/produtos"
                    className={({ isActive }) =>
                        `flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${collapsed ? "justify-center" : "gap-3"
                        } ${isActive
                            ? "bg-[#D0D9D6] text-[#006426]"
                            : "text-slate-700 hover:bg-slate-100"
                        }`
                    }
                >
                    <Package className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Produtos</span>}
                </NavLink>
            </nav>
        </aside>
    )
}