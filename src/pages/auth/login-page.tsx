import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { signInWithPassword } from "@/lib/auth"
import logoBionatus from "@/assets/logo-bionatus.svg"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    const previousColorScheme = root.style.colorScheme
    const previousBodyBg = body.style.backgroundColor
    const hadDarkClass = root.classList.contains("dark")

    root.classList.remove("dark")
    root.style.colorScheme = "light"
    body.style.backgroundColor = "#F0F0F0"

    return () => {
      root.style.colorScheme = previousColorScheme
      body.style.backgroundColor = previousBodyBg

      if (hadDarkClass) {
        root.classList.add("dark")
      }
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await signInWithPassword(email, password)

    if (error) {
      console.error("Erro no Login:", error)
      setError(error.message)
      setLoading(false)
      return
    }

    navigate("/")
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.85fr_1fr]">
        <section className="relative hidden lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 100, 38, 0.45), rgba(0, 100, 38, 0.78)), url('https://images.unsplash.com/photo-1761361413429-f9044b300694?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000')",
            }}
          />

          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-md">
                Dashboard Comercial
              </div>
            </div>

            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                Bionatus
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/90 xl:text-lg">
                Acompanhe indicadores estratégicos, performance comercial e
                análises de vendas em uma experiência moderna, responsiva e
                centralizada.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-md">
            <div className="rounded-[28px] border border-[#D0D9D6] bg-white p-8 text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-10">
              <div className="mb-8">
                <img
                  src={logoBionatus}
                  alt="Bionatus"
                  className="h-12 w-full object-contain"
                />

                <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                  Entrar
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Acesse sua conta para visualizar o dashboard comercial.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seuemail@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">
                    Senha
                  </Label>

                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-white pr-11 text-slate-900 placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Visualizar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#006426] text-white hover:bg-[#297B49]"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <p className="mt-6 pt-5 text-center text-xs leading-4 text-slate-400">
                Bionatus • Ambiente Interno <br />
                por David Martinez
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
} 