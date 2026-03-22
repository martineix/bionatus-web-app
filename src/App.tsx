import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/auth/login-page"
import DashboardPage from "@/pages/dashboard/dashboard-page"
import ProtectedRoute from "@/routes/protected-route"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}