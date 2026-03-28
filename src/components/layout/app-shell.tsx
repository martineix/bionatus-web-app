import { useEffect, useState, type ReactNode } from "react"
import Sidebar from "./sidebar"
import Topbar from "./topbar"

type AppShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  lastUpdated?: Date | null
}

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed"

export default function AppShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)

    if (saved === null) return false

    try {
      return JSON.parse(saved)
    } catch {
      return false
    }
  })

  const [mobileOpen, setMobileOpen] = useState(false)

  function handleToggleSidebar() {
    setCollapsed((prev) => !prev)
  }

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed))
  }, [collapsed])

  return (
    <div className="min-h-screen bg-[#F0F0F0] dark:bg-slate-900">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={`ml-0 flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <Topbar
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}