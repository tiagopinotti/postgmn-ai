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
import PerformanceDashboard from './pages/PerformanceDashboard'
import ClientOnboarding from './pages/ClientOnboarding'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import UpdatePassword from './pages/UpdatePassword'
import Layout from './components/Layout'
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#ffebee', height: '100vh' }}>
          <h2>Algo deu errado na página!</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ fontSize: 11, marginTop: 10 }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: 10 }}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}


function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  // Rotas públicas (sem login)
  if (
    window.location.pathname.startsWith('/aprovar/') || 
    window.location.pathname.startsWith('/onboarding/') ||
    window.location.pathname.startsWith('/performance/')
  ) {
    return (
      <Routes>
        <Route path="/aprovar/:token" element={<ApprovalPortal />} />
        <Route path="/onboarding/:userId" element={<ClientOnboarding />} />
        <Route path="/performance/:id" element={<PerformanceDashboard />} />
      </Routes>
    )
  }

  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/update-password" element={<UpdatePassword />} />
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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
