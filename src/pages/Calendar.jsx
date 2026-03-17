import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const STATUS_COLOR = {
  draft: '#9CA3AF', in_review: '#F59E0B',
  approved: '#22C55E', change_requested: '#EF4444',
}
const CATEGORY_COLOR = {
  'Educativo': '#3B82F6', 'Institucional': '#8B5CF6',
  'Promocional': '#F59E0B', 'Prova Social': '#10B981',
  'Dica': '#06B6D4', 'Novidade': '#F97316',
}

export default function Calendar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [hoveredPost, setHoveredPost] = useState(null)

  useEffect(() => { loadData() }, [user, currentDate, selectedClient])

  async function loadData() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end = `${year}-${String(month).padStart(2,'0')}-31`

    const { data: clientsData } = await supabase.from('clients').select('id, company_name').eq('user_id', user.id)
    setClients(clientsData || [])

    let query = supabase.from('posts').select('*, clients(company_name)')
      .gte('scheduled_date', start).lte('scheduled_date', end)
      .order('scheduled_date')

    if (selectedClient !== 'all') query = query.eq('client_id', selectedClient)

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const postsByDay = {}
  posts.forEach(post => {
    if (!post.scheduled_date) return
    const day = parseInt(post.scheduled_date.split('-')[2])
    if (!postsByDay[day]) postsByDay[day] = []
    postsByDay[day].push(post)
  })

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Calendário</h1>
          <p>{posts.length} posts em {MONTHS[month]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto' }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
            <option value="all">Todos os clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
      </div>

      <div className="page-body">
        {/* LEGEND */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(CATEGORY_COLOR).map(([cat, color]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              {cat}
            </div>
          ))}
        </div>

        <div className="card">
          {/* NAV */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>←</button>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[month]} {year}</h3>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}>→</button>
          </div>

          {/* DAYS HEADER */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--gray-200)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* CALENDAR GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
              const dayPosts = day ? (postsByDay[day] || []) : []
              return (
                <div key={i} style={{
                  minHeight: 90,
                  padding: '6px',
                  borderRight: i % 7 !== 6 ? '1px solid var(--gray-100)' : 'none',
                  borderBottom: '1px solid var(--gray-100)',
                  background: !day ? 'var(--gray-50)' : 'white',
                }}>
                  {day && (
                    <>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: isToday ? 700 : 400,
                        background: isToday ? 'var(--primary)' : 'transparent',
                        color: isToday ? 'white' : 'var(--gray-700)',
                        marginBottom: 4,
                      }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayPosts.slice(0, 3).map(post => (
                          <div key={post.id}
                            style={{
                              fontSize: 10, padding: '2px 5px', borderRadius: 4, cursor: 'pointer',
                              background: CATEGORY_COLOR[post.category] || '#9CA3AF',
                              color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              borderLeft: `3px solid ${STATUS_COLOR[post.status] || '#9CA3AF'}`,
                            }}
                            title={`${post.theme} — ${post.clients?.company_name}`}
                            onClick={() => navigate(`/clientes/${post.client_id}/planos/${post.content_plan_id}`)}>
                            {post.theme}
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div style={{ fontSize: 10, color: 'var(--gray-400)', paddingLeft: 4 }}>+{dayPosts.length - 3} mais</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* STATUS LEGEND */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gray-500)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              {{draft:'Rascunho',in_review:'Em revisão',approved:'Aprovado',change_requested:'Alteração'}[status]}
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>(borda esquerda indica status)</span>
        </div>
      </div>
    </>
  )
}
