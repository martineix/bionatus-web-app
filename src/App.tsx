import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/auth/login-page"
import DashboardPage from "@/pages/dashboard/dashboard-page"
import ClientesPage from "@/pages/clientes/clientes-page"
import ProdutosPage from "@/pages/produtos/produtos-page"
import RemocoesPage from "@/pages/remocoes/remocoes-page"
import PermissoesPage from "@/pages/permissoes/permissoes-page"
import ProtectedRoute from "@/routes/protected-route"
import RoleProtectedRoute from "@/routes/role-protected-route"

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

      <Route
        path="/remocoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute featureKey="remocoes">
              <RemocoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/permissoes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute>
              <PermissoesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}