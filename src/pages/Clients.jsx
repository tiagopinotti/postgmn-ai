import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Clients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [user])

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('company_name')
    setClients(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let list = clients
    if (filter === 'active') list = list.filter(c => c.is_active)
    if (filter === 'inactive') list = list.filter(c => !c.is_active)
    if (search) list = list.filter(c =>
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.niche?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(list)
  }, [search, filter, clients])

  async function toggleActive(id, current) {
    await supabase.from('clients').update({ is_active: !current }).eq('id', id)
    loadClients()
  }

  const niches = [...new Set(clients.map(c => c.niche).filter(Boolean))]

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>
          + Novo cliente
        </button>
      </div>

      <div className="page-body">
        <div className="toolbar">
          <div className="search-input-wrapper">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" placeholder="Buscar cliente, nicho ou cidade..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px', color: 'var(--gray-300)' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h3>{search || filter !== 'all' ? 'Nenhum resultado' : 'Nenhum cliente ainda'}</h3>
            <p>{search || filter !== 'all' ? 'Tente outro filtro ou busca.' : 'Cadastre seu primeiro cliente para começar.'}</p>
            {!search && filter === 'all' && (
              <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>+ Novo cliente</button>
            )}
          </div>
        ) : (
          <div className="client-list">
            {filtered.map(c => (
              <div key={c.id} className="client-card" onClick={() => navigate(`/clientes/${c.id}/planos`)}>
                <div className="client-card-header">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="client-avatar">{getEmoji(c.niche)}</div>
                    <div>
                      <div className="client-name">{c.company_name}</div>
                      <div className="client-niche">{c.niche || 'Sem nicho'}</div>
                    </div>
                  </div>
                  <span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {c.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="client-meta">
                  {c.city && <span>📍 {c.city}</span>}
                  {c.posts_per_week && <span>📅 {c.posts_per_week}x/semana</span>}
                  {c.whatsapp && <span>💬 WhatsApp</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function getEmoji(niche) {
  const map = {
    'odontologia': '🦷', 'dentista': '🦷',
    'academia': '💪', 'fitness': '💪',
    'restaurante': '🍽️', 'alimentação': '🍽️',
    'imóveis': '🏠', 'imobiliária': '🏠',
    'escola': '📚', 'educação': '📚', 'curso': '📚',
    'clínica': '🏥', 'saúde': '🏥', 'médico': '🏥',
    'beleza': '💄', 'salão': '💄', 'estética': '💄',
    'advocacia': '⚖️', 'jurídico': '⚖️',
    'contabilidade': '📊', 'financeiro': '📊',
    'tecnologia': '💻', 'ti': '💻',
    'pet': '🐾', 'veterinário': '🐾',
  }
  if (!niche) return '🏢'
  const lower = niche.toLowerCase()
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v
  }
  return '🏢'
}
