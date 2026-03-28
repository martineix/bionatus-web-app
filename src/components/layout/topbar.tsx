import { LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { signOut } from "@/lib/auth"

type TopbarProps = {
  title: string
  subtitle?: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate("/login")
  }

  return (
    <header className="border-b bg-white px-6 py-2">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4"/>Sair
          </button>
        </div>
      </div>
    </header>
  )
}