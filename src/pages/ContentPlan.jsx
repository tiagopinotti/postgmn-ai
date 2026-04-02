import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_LABELS = { draft: 'Rascunho', in_review: 'Em revisão', sent: 'Enviado', approved_partial: 'Aprovado parcial', approved_total: 'Aprovado' }
const STATUS_BADGE = { draft: 'badge-gray', in_review: 'badge-yellow', sent: 'badge-blue', approved_partial: 'badge-yellow', approved_total: 'badge-green' }

export default function ContentPlan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newMonth, setNewMonth] = useState(new Date().getMonth())
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [showNew, setShowNew] = useState(false)

  useEffect(() => { loadData() }, [clientId])

  async function loadData() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('content_plans').select('*, posts(count)').eq('client_id', clientId).order('year', { ascending: false }).order('month', { ascending: false })
    ])
    setClient(c)
    setPlans(p || [])
    setLoading(false)
  }

  async function createPlan() {
    setCreating(true)
    const { data, error } = await supabase.from('content_plans').insert({
      client_id: clientId,
      month: newMonth + 1,
      year: newYear,
      status: 'draft',
    }).select().single()
    setCreating(false)
    if (!error && data) {
      navigate(`/clientes/${clientId}/planos/${data.id}`)
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{client?.company_name}</h1>
          <p>Planos mensais de conteúdo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/clientes/${clientId}/editar`)}>Editar cliente</button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Novo plano</button>
        </div>
      </div>

      <div className="page-body">
        {showNew && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3>Criar novo plano</h3></div>
            <div className="card-body">
              <div className="form-grid-2" style={{ maxWidth: 400 }}>
                <div className="form-group">
                  <label className="form-label">Mês</label>
                  <select className="form-select" value={newMonth} onChange={e => setNewMonth(parseInt(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ano</label>
                  <select className="form-select" value={newYear} onChange={e => setNewYear(parseInt(e.target.value))}>
                    {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={createPlan} disabled={creating}>
                  {creating ? 'Criando...' : 'Criar plano'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum plano ainda</h3>
            <p>Crie o primeiro plano mensal para este cliente.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Novo plano</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {plans.map(plan => (
              <div key={plan.id} className="card" style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/clientes/${clientId}/planos/${plan.id}`)}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                        {MONTHS[plan.month - 1]}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{plan.year}</div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[plan.status] || 'badge-gray'}`}>
                      {STATUS_LABELS[plan.status] || plan.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                    {plan.posts?.[0]?.count ?? 0} posts
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
