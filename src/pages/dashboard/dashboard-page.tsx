import { useEffect, useState } from "react"
import AppShell from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMyProfile } from "@/lib/profile"

type Profile = {
    id: string
    nome: string | null
    email: string | null
    role: string | null
}

export default function DashboardPage() {
    const [profile, setProfile] = useState<Profile | null>(null)

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await getMyProfile()
                setProfile(data)
            } catch (error) {
                console.error(error)
            }
        }
        loadProfile()
    }, [])

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {profile?.nome || "usuário"}</h1>
          <p className="text-muted-foreground">
            Bem vindo ao sistema Bionatus.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">--</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">--</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">--</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">--</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}