import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Sidebar from "./sidebar"
import Topbar from "./topbar"
import ScrollToTopButton from "./scroll-to-top-button"
import { getMyProfile, getCachedProfile } from "@/lib/profile"
import { getMyPermissions, getCachedPermissions, type Permissions } from "@/lib/permissions"

// Enquanto o perfil/permissões reais ainda não carregaram, assume o estado
// mais restrito (nada de admin, nada de itens condicionados a permissão) —
// evita mostrar por um instante algo que o usuário não deveria ver. Um admin
// pode ver esses itens "aparecerem" com um pequeno atraso; um representante
// nunca vê o que não deveria, nem por um frame.
const RESTRICTED_PERMISSIONS: Permissions = {
  remocoes: false,
  dashboardProjecaoCheckbox: false,
  dashboardSimulacao: false,
}

type AppShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  lastUpdated?: Date | null
}

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed"
const DESKTOP_BREAKPOINT = 1024

function getInitialSidebarCollapsed() {
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (saved === null) return false
    return JSON.parse(saved)
  } catch {
    return false
  }
}

export default function AppShell({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing = false,
  lastUpdated = null,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(getInitialSidebarCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const wasMobileOpenRef = useRef(false)
  const [isRepresentanteView, setIsRepresentanteView] = useState(() => {
    const cached = getCachedProfile()
    return cached ? cached.role === "representante" : true
  })
  const [permissions, setPermissions] = useState<Permissions>(
    () => getCachedPermissions() ?? RESTRICTED_PERMISSIONS
  )

  useEffect(() => {
    getMyProfile()
      .then((profile) => setIsRepresentanteView(profile.role === "representante"))
      .catch(() => setIsRepresentanteView(false))

    getMyPermissions()
      .then(setPermissions)
      .catch(() => {})
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  const handleCloseMobileMenu = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const handleOpenMobileMenu = useCallback(() => {
    setMobileOpen(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileOpen])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) {
        setMobileOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      wasMobileOpenRef.current = true
      closeButtonRef.current?.focus()
    } else if (wasMobileOpenRef.current) {
      wasMobileOpenRef.current = false
      menuButtonRef.current?.focus()
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false)
        return
      }

      if (event.key !== "Tab") return

      const container = asideRef.current
      if (!container) return

      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-[#F0F0F0] dark:bg-slate-900">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobileMenu}
        asideRef={asideRef}
        closeButtonRef={closeButtonRef}
        hideRemocoes={!permissions.remocoes}
        hideAdminItems={isRepresentanteView}
      />

      <div
        className={`ml-0 flex min-h-screen flex-col transition-[margin] duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
      >
        <Topbar
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onOpenMobileMenu={handleOpenMobileMenu}
          mobileOpen={mobileOpen}
          menuButtonRef={menuButtonRef}
        />

        <main className="flex-1 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          {children}
        </main>
      </div>

      <ScrollToTopButton />
    </div>
  )
}