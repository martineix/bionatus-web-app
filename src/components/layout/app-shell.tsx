import { useState, type ReactNode } from "react"
import Sidebar from "./sidebar"
import Topbar from "./topbar"

type AppShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AppShell({ title, subtitle, children, }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  function handleToggleSidebar() {
    setCollapsed((prev) => !prev)
  }

  return (
    <div className="flex min-h-screen bg-[#F0F0F0]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}