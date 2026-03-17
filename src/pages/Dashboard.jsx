import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ clients: 0, plans: 0, posts: 0, pending: 0 })
  const [recentClients, setRecentClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: clients },
        { count: plans },
        { count: posts },
        { count: pending },
        { data: recent }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('content_plans').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('clients').select('id, company_name, niche, city, is_active').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      ])
      setStats({ clients: clients || 0, plans: plans || 0, posts: posts || 0, pending: pending || 0 })
      setRecentClients(recent || [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral da sua operação</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>
          + Novo cliente
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Clientes ativos</div>
            <div className="stat-value">{stats.clients}</div>
            <div className="stat-sub">total cadastrados</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Planos mensais</div>
            <div className="stat-value">{stats.plans}</div>
            <div className="stat-sub">criados</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Posts gerados</div>
            <div className="stat-value">{stats.posts}</div>
            <div className="stat-sub">no total</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Posts em rascunho</div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-sub">aguardando revisão</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Clientes recentes</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/clientes')}>Ver todos</button>
          </div>
          <div className="table-wrapper">
            {recentClients.length === 0 ? (
              <div className="empty-state">
                <h3>Nenhum cliente ainda</h3>
                <p>Comece cadastrando seu primeiro cliente.</p>
                <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>+ Novo cliente</button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Nicho</th>
                    <th>Cidade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClients.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/clientes/${c.id}/editar`)}>
                      <td style={{ fontWeight: 500 }}>{c.company_name}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{c.niche || '—'}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{c.city || '—'}</td>
                      <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
