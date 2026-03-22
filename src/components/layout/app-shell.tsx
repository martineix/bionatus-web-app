import type { ReactNode } from "react"
import { LayoutDashboard, Package, ShoppingCart, Users, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth"

type Props = {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-r bg-background p-4">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Bionatus</h2>
            <p className="text-sm text-muted-foreground">Web App</p>
          </div>

          <nav className="space-y-2">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted">
              <Users className="h-4 w-4" />
              Usuários
            </button>

            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted">
              <Package className="h-4 w-4" />
              Produtos
            </button>

            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted">
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </button>
          </nav>

          <div className="mt-8">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>

        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}