import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { getMyProfile } from "@/lib/profile"
import { getMyPermissions } from "@/lib/permissions"

type Props = {
  children: React.ReactNode
  featureKey?: "remocoes"
}

export default function RoleProtectedRoute({ children, featureKey }: Props) {
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const profile = await getMyProfile()

        if (profile.role !== "representante") {
          if (mounted) {
            setBlocked(false)
            setLoading(false)
          }
          return
        }

        if (!featureKey) {
          if (mounted) {
            setBlocked(true)
            setLoading(false)
          }
          return
        }

        const permissions = await getMyPermissions()

        if (mounted) {
          setBlocked(!permissions[featureKey])
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setBlocked(false)
          setLoading(false)
        }
      }
    }

    check()

    return () => {
      mounted = false
    }
  }, [featureKey])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  if (blocked) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
