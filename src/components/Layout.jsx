import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const IconDash = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
const IconClients = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconCal = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IconBell = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const IconChart = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
const IconSettings = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const IconOut = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    async function loadUnread() {
      const { data: clients } = await supabase.from('clients').select('id').eq('user_id', user.id)
      if (!clients?.length) return
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true })
        .in('client_id', clients.map(c => c.id)).eq('is_read', false)
      setUnread(count || 0)
    }
    loadUnread()
  }, [user, location])

  const isPlanEditor = location.pathname.match(/\/planos\/[^/]+$/)
  if (isPlanEditor) return <div>{children}</div>

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>PostGMN AI</h2>
          <span>Google Meu Negócio</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Principal</div>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><IconDash /> Dashboard</NavLink>
            <NavLink to="/calendario" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><IconCal /> Calendário</NavLink>
            <NavLink to="/clientes" className={({ isActive }) => `nav-item${isActive && !location.pathname.includes('/novo') ? ' active' : ''}`}><IconClients /> Clientes</NavLink>
            <NavLink to="/notificacoes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <IconBell />
              <span>Notificações</span>
              {unread > 0 && <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px' }}>{unread}</span>}
            </NavLink>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Análise</div>
            <NavLink to="/relatorios" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><IconChart /> Relatórios</NavLink>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Conta</div>
            <NavLink to="/configuracoes" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><IconSettings /> Configurações</NavLink>
          </div>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{(user?.email?.[0] || 'A').toUpperCase()}</div>
            <div className="sidebar-user-info"><div className="sidebar-user-email">{user?.email}</div></div>
            <button className="btn-signout" onClick={async () => { await signOut(); navigate('/login') }} title="Sair"><IconOut /></button>
          </div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
