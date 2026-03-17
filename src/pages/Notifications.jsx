import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    const { data: clients } = await supabase.from('clients').select('id').eq('user_id', user.id)
    if (!clients?.length) { setLoading(false); return }
    const ids = clients.map(c => c.id)
    const { data } = await supabase.from('notifications').select('*').in('client_id', ids).order('created_at', { ascending: false }).limit(50)
    setNotifications(data || [])
    setLoading(false)
    // Mark all as read
    await supabase.from('notifications').update({ is_read: true }).in('client_id', ids).eq('is_read', false)
  }

  async function clearAll() {
    const { data: clients } = await supabase.from('clients').select('id').eq('user_id', user.id)
    if (!clients?.length) return
    await supabase.from('notifications').delete().in('client_id', clients.map(c => c.id))
    setNotifications([])
  }

  const getIcon = (type) => ({ approval: '✅', change_request: '✏️', new_plan: '📅', system: '🔔' }[type] || '🔔')
  const timeAgo = (date) => {
    const d = new Date(date), now = new Date()
    const mins = Math.floor((now - d) / 60000)
    if (mins < 60) return `${mins}m atrás`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h atrás`
    return `${Math.floor(hrs / 24)}d atrás`
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div><h1>Notificações</h1><p>{notifications.filter(n => !n.is_read).length} não lidas</p></div>
        {notifications.length > 0 && <button className="btn btn-secondary btn-sm" onClick={clearAll}>Limpar tudo</button>}
      </div>
      <div className="page-body">
        <div className="card">
          {notifications.length === 0 ? (
            <div className="empty-state"><h3>Nenhuma notificação</h3><p>Você está em dia!</p></div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.is_read ? 'white' : '#EEF2FF' }}>
                <span style={{ fontSize: 20 }}>{getIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{n.message}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
