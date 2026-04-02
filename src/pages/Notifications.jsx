import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    const { data: clients } = await supabase.from('clients').select('id').eq('user_id', user.id)
    if (!clients?.length) { setLoading(false); return }
    const ids = clients.map(c => c.id)
    const { data } = await supabase.from('notifications').select('*').in('client_id', ids).order('created_at', { ascending: false }).limit(50)
    
    // For notifications without links, try to build them from approvals
    const enriched = data || []
    for (const n of enriched) {
      if (!n.link && (n.type === 'change_request' || n.type === 'approval')) {
        const { data: approvals } = await supabase.from('approvals')
          .select('post_id, posts!inner(id, content_plan_id, client_id)')
          .eq('client_id', n.client_id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (approvals?.[0]?.posts) {
          const post = approvals[0].posts
          n.link = `/clientes/${post.client_id}/planos/${post.content_plan_id}`
        }
      }
    }
    
    setNotifications(enriched)
    setLoading(false)
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
              <div 
                key={n.id} 
                onClick={() => n.link && navigate(n.link)}
                style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 12, alignItems: 'flex-start', background: n.is_read ? 'white' : '#EEF2FF', cursor: n.link ? 'pointer' : 'default', transition: 'background 0.2s' }}
                onMouseEnter={e => { if(n.link) e.currentTarget.style.background = '#F5F3FF' }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'white' : '#EEF2FF' }}
              >
                <span style={{ fontSize: 20 }}>{getIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{n.message}</div>}
                  {n.link && <div style={{ fontSize: 11, color: '#4F46E5', marginTop: 6, fontWeight: 500 }}>📝 Clique para ir ao post →</div>}
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
