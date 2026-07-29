import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { getMyProfile } from "@/lib/profile"

type Props = {
  children: React.ReactNode
}

export default function RoleProtectedRoute({ children }: Props) {
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let mounted = true

    getMyProfile()
      .then((profile) => {
        if (!mounted) return
        setBlocked(profile.role === "representante")
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setBlocked(false)
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>
  }

  if (blocked) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
