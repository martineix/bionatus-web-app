import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/auth/login-page"
import DashboardPage from "@/pages/dashboard/dashboard-page"
import ClientesPage from "@/pages/clientes/clientes-page"
import ProdutosPage from "@/pages/produtos/produtos-page"
import ProtectedRoute from "@/routes/protected-route"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <ClientesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/produtos"
        element={
          <ProtectedRoute>
            <ProdutosPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}