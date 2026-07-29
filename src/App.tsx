import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/auth/login-page"
import DashboardPage from "@/pages/dashboard/dashboard-page"
import AtividadePage from "@/pages/clientes/atividade-page"
import FrequenciaPage from "@/pages/clientes/frequencia-page"
import CurvaAbcPage from "@/pages/clientes/curva-abc-page"
import AvaliacaoPage from "@/pages/clientes/avaliacao-page"
import AberturasPage from "@/pages/clientes/aberturas-page"
import ProdutosPage from "@/pages/produtos/produtos-page"
import RemocoesPage from "@/pages/remocoes/remocoes-page"
import PermissoesPage from "@/pages/permissoes/permissoes-page"
import AvaliacaoClientesPage from "@/pages/cadastros/avaliacao-clientes-page"
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
        path="/clientes/atividade"
        element={
          <ProtectedRoute>
            <AtividadePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/frequencia"
        element={
          <ProtectedRoute>
            <FrequenciaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/curva-abc"
        element={
          <ProtectedRoute>
            <CurvaAbcPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/avaliacao"
        element={
          <ProtectedRoute>
            <AvaliacaoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clientes/aberturas"
        element={
          <ProtectedRoute>
            <AberturasPage />
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

      <Route
        path="/cadastros/avaliacao-clientes"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute>
              <AvaliacaoClientesPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
