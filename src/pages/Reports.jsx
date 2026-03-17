import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const IconChart = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
const IconDownload = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconFilter = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
const IconTrend = ({ up }) => up
  ? <svg width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  : <svg width="12" height="12" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 80, flex: 1 }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, padding: 20 }}>Sem dados</div>

  let offset = 0
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const segments = data.map(d => {
    const pct = d.value / total
    const seg = { ...d, pct, offset, strokeDash: pct * circumference, strokeOffset: circumference * (1 - offset) }
    offset += pct
    return seg
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="16"/>
        {segments.map((s, i) => s.value > 0 && (
          <circle key={i} cx="50" cy="50" r={radius} fill="none"
            stroke={s.color} strokeWidth="16"
            strokeDasharray={`${s.strokeDash} ${circumference - s.strokeDash}`}
            strokeDashoffset={s.strokeOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        ))}
        <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="#111827">{total}</text>
      </svg>
      <div style={{ flex: 1 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--gray-700)', flex: 1 }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Reports() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('all')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [clientReports, setClientReports] = useState([])

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.from('clients').select('id, name, niche').eq('user_id', user.id).order('name')
      setClients(data || [])
    }
    loadClients()
  }, [user])

  useEffect(() => {
    async function loadReport() {
      setLoading(true)
      const { data: myClients } = await supabase.from('clients').select('id, name, niche').eq('user_id', user.id)
      if (!myClients?.length) { setLoading(false); return }

      const targetClients = selectedClient === 'all' ? myClients : myClients.filter(c => c.id === selectedClient)
      const clientIds = targetClients.map(c => c.id)

      // Load plans for the month
      const { data: plans } = await supabase.from('content_plans')
        .select('id, client_id, month, year, status')
        .in('client_id', clientIds)
        .eq('month', month)
        .eq('year', year)

      const planIds = plans?.map(p => p.id) || []

      // Load posts
      const { data: posts } = planIds.length
        ? await supabase.from('posts').select('id, plan_id, status, category, scheduled_date').in('plan_id', planIds)
        : { data: [] }

      // Load approvals
      const { data: approvals } = planIds.length
        ? await supabase.from('approvals').select('id, post_id, status, created_at').in('post_id', (posts || []).map(p => p.id))
        : { data: [] }

      const totalPosts = posts?.length || 0
      const published = posts?.filter(p => p.status === 'publicado').length || 0
      const approved = posts?.filter(p => p.status === 'aprovado').length || 0
      const pending = posts?.filter(p => p.status === 'pendente' || p.status === 'rascunho').length || 0
      const rejected = posts?.filter(p => p.status === 'revisão').length || 0
      const approvalRate = totalPosts > 0 ? Math.round(((approved + published) / totalPosts) * 100) : 0

      // Category breakdown
      const cats = {}
      posts?.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1 })

      // Per client breakdown
      const perClient = targetClients.map(client => {
        const cPlans = plans?.filter(p => p.client_id === client.id) || []
        const cPostIds = cPlans.flatMap(p => (posts || []).filter(post => post.plan_id === p.id).map(post => post.id))
        const cPosts = (posts || []).filter(p => cPostIds.includes(p.id))
        const cApproved = cPosts.filter(p => p.status === 'aprovado' || p.status === 'publicado').length
        const cTotal = cPosts.length
        return {
          ...client,
          totalPosts: cTotal,
          approved: cApproved,
          pending: cPosts.filter(p => p.status === 'pendente' || p.status === 'rascunho').length,
          approvalRate: cTotal > 0 ? Math.round((cApproved / cTotal) * 100) : 0,
          plans: cPlans.length
        }
      }).filter(c => c.totalPosts > 0 || c.plans > 0).sort((a, b) => b.totalPosts - a.totalPosts)

      setReport({ totalPosts, published, approved, pending, rejected, approvalRate, cats, plans: plans?.length || 0, totalApprovals: approvals?.length || 0 })
      setClientReports(perClient)
      setLoading(false)
    }
    loadReport()
  }, [user, month, year, selectedClient])

  function exportCSV() {
    if (!clientReports.length) return
    const headers = ['Cliente', 'Nicho', 'Planos', 'Posts Total', 'Aprovados', 'Pendentes', 'Taxa Aprovação']
    const rows = clientReports.map(c => [c.name, c.niche || '', c.plans, c.totalPosts, c.approved, c.pending, `${c.approvalRate}%`])
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${MONTHS[month - 1]}-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const donutData = report ? [
    { label: 'Publicado', value: report.published, color: '#22C55E' },
    { label: 'Aprovado', value: report.approved, color: '#4F46E5' },
    { label: 'Pendente', value: report.pending, color: '#F59E0B' },
    { label: 'Revisão', value: report.rejected, color: '#EF4444' },
  ] : []

  const categoryColors = { 'Educativo': '#4F46E5', 'Promocional': '#F59E0B', 'Institucional': '#22C55E', 'Sazonais': '#EC4899', 'Produto/Serviço': '#06B6D4', 'Depoimento': '#8B5CF6' }
  const maxCat = Math.max(...Object.values(report?.cats || {}), 1)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconChart /> Relatórios</h1>
          <p>Métricas mensais de performance por cliente</p>
        </div>
        <button className="btn btn-outline" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconDownload /> Exportar CSV
        </button>
      </div>

      <div className="page-body">
        {/* Filtros */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 13 }}>
              <IconFilter /> Filtros:
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto', minWidth: 180 }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="all">Todos os clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div>Carregando relatório...</div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total de Posts', value: report?.totalPosts || 0, color: 'var(--primary)', sub: `${report?.plans || 0} plano(s) ativo(s)` },
                { label: 'Publicados', value: report?.published || 0, color: '#22C55E', sub: 'no ar' },
                { label: 'Aprovados', value: report?.approved || 0, color: '#4F46E5', sub: 'aguardando publicação' },
                { label: 'Pendentes', value: report?.pending || 0, color: '#F59E0B', sub: 'aguardando aprovação' },
                { label: 'Taxa de Aprovação', value: `${report?.approvalRate || 0}%`, color: report?.approvalRate >= 70 ? '#22C55E' : report?.approvalRate >= 40 ? '#F59E0B' : '#EF4444', sub: 'aprovados + publicados / total' },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Donut status */}
              <div className="card">
                <div className="card-header"><h3>Distribuição por Status</h3></div>
                <div className="card-body">
                  <DonutChart data={donutData} />
                </div>
              </div>

              {/* Categorias */}
              <div className="card">
                <div className="card-header"><h3>Posts por Categoria</h3></div>
                <div className="card-body">
                  {Object.keys(report?.cats || {}).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, padding: 20 }}>Sem dados de categoria</div>
                  ) : (
                    Object.entries(report?.cats || {}).sort((a, b) => b[1] - a[1]).map(([cat, qty]) => (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, width: 120, color: 'var(--gray-700)', flexShrink: 0 }}>{cat}</span>
                        <MiniBar value={qty} max={maxCat} color={categoryColors[cat] || '#6B7280'} />
                        <span style={{ fontSize: 12, fontWeight: 600, width: 24, textAlign: 'right' }}>{qty}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Tabela por cliente */}
            <div className="card">
              <div className="card-header">
                <h3>Performance por Cliente — {MONTHS[month - 1]} {year}</h3>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{clientReports.length} cliente(s)</span>
              </div>
              {clientReports.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <div>Nenhum dado encontrado para o período selecionado.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Crie planos de conteúdo e gere posts para ver os relatórios.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        {['Cliente', 'Nicho', 'Planos', 'Total Posts', 'Publicados', 'Aprovados', 'Pendentes', 'Taxa Aprov.'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--gray-200)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientReports.map((c, i) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--gray-500)', fontSize: 12 }}>{c.niche || '—'}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{c.plans}</span></td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.totalPosts}</td>
                          <td style={{ padding: '12px 16px' }}><span style={{ color: '#22C55E', fontWeight: 600 }}>{c.published || 0}</span></td>
                          <td style={{ padding: '12px 16px' }}><span style={{ color: '#4F46E5', fontWeight: 600 }}>{c.approved}</span></td>
                          <td style={{ padding: '12px 16px' }}><span style={{ color: '#F59E0B', fontWeight: 600 }}>{c.pending}</span></td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: c.approvalRate >= 70 ? '#22C55E' : c.approvalRate >= 40 ? '#F59E0B' : '#EF4444' }}>{c.approvalRate}%</span>
                              {c.approvalRate >= 70 ? <IconTrend up={true} /> : <IconTrend up={false} />}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {clientReports.length > 1 && (
                      <tfoot>
                        <tr style={{ background: 'var(--gray-100)', fontWeight: 600 }}>
                          <td style={{ padding: '12px 16px' }} colSpan={3}>Total Geral</td>
                          <td style={{ padding: '12px 16px' }}>{clientReports.reduce((s, c) => s + c.totalPosts, 0)}</td>
                          <td style={{ padding: '12px 16px', color: '#22C55E' }}>{clientReports.reduce((s, c) => s + (c.published || 0), 0)}</td>
                          <td style={{ padding: '12px 16px', color: '#4F46E5' }}>{clientReports.reduce((s, c) => s + c.approved, 0)}</td>
                          <td style={{ padding: '12px 16px', color: '#F59E0B' }}>{clientReports.reduce((s, c) => s + c.pending, 0)}</td>
                          <td style={{ padding: '12px 16px' }}>{report?.approvalRate}%</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
