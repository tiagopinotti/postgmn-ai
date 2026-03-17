import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientForm from './pages/ClientForm'
import ContentPlan from './pages/ContentPlan'
import PlanEditor from './pages/PlanEditor'
import Calendar from './pages/Calendar'
import Notifications from './pages/Notifications'
import ApprovalPortal from './pages/ApprovalPortal'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  // Portal de aprovação — público, sem login
  if (window.location.pathname.startsWith('/aprovar/')) {
    return <Routes><Route path="/aprovar/:token" element={<ApprovalPortal />} /></Routes>
  }

  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/notificacoes" element={<Notifications />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/novo" element={<ClientForm />} />
        <Route path="/clientes/:id/editar" element={<ClientForm />} />
        <Route path="/clientes/:clientId/planos" element={<ContentPlan />} />
        <Route path="/clientes/:clientId/planos/:planId" element={<PlanEditor />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
