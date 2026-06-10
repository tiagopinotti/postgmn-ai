import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import ClientOnboarding from './pages/ClientOnboarding'
import PerformanceDashboard from './pages/PerformanceDashboard'
import Reports from './pages/Reports'
import ReportView from './pages/ReportView'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Rotas verdadeiramente públicas — sem verificação de login
  if (location.pathname.startsWith('/aprovar/')) {
    return <Routes><Route path="/aprovar/:token" element={<ApprovalPortal />} /></Routes>
  }
  if (location.pathname.startsWith('/onboarding/')) {
    return <Routes><Route path="/onboarding/:userId" element={<ClientOnboarding />} /></Routes>
  }
  if (location.pathname.startsWith('/dashboard/')) {
    return <Routes><Route path="/dashboard/:id" element={<PerformanceDashboard />} /></Routes>
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  // Relatório público — sem login
  if (window.location.pathname.startsWith('/relatorio/')) {
    return <Routes><Route path="/relatorio/:token" element={<ReportView />} /></Routes>
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
