import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/* ── SVG Icons ─────────────────────────────────────────────── */
const Icon = ({ children, size = 18 }) => <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{children}</svg>
const IconChart = () => <Icon><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></Icon>
const IconSave = () => <Icon size={14}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Icon>
const IconLink = () => <Icon size={14}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Icon>
const IconSparkle = () => <Icon size={14}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></Icon>
const IconCopy = () => <Icon size={14}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Icon>
const IconCheck = () => <Icon size={14}><polyline points="20 6 9 17 4 12"/></Icon>
const IconTrendUp = () => <svg width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const IconTrendDown = () => <svg width="12" height="12" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
const IconFilter = () => <Icon size={14}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Icon>
const IconTrash = () => <Icon size={14}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Icon>
const IconExternalLink = () => <Icon size={14}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></Icon>

/* ── Metric definitions ─────────────────────────────────────── */
const METRIC_FIELDS = [
  { key: 'overview_views',     label: 'Visão Geral',        icon: '👁️', color: '#6366F1', desc: 'Visualizações do perfil' },
  { key: 'call_clicks',        label: 'Chamadas',           icon: '📞', color: '#22C55E', desc: 'Ligações recebidas' },
  { key: 'chat_clicks',        label: 'Cliques no Chat',    icon: '💬', color: '#06B6D4', desc: 'Mensagens iniciadas' },
  { key: 'direction_requests', label: 'Orientações',        icon: '🗺️', color: '#F59E0B', desc: 'Rotas traçadas' },
  { key: 'website_clicks',     label: 'Clique no Website',  icon: '🌐', color: '#8B5CF6', desc: 'Acessos ao site' },
  { key: 'impressions_search', label: 'Impressões Busca',   icon: '🔍', color: '#EC4899', desc: 'Visualizações na busca Google' },
  { key: 'impressions_maps',   label: 'Impressões Maps',    icon: '📍', color: '#14B8A6', desc: 'Visualizações no Google Maps' },
  { key: 'bookings',           label: 'Reservas',           icon: '📅', color: '#F97316', desc: 'Reservas realizadas' },
]

/* ── Bar Chart Component ──────────────────────────────────── */
function BarChart({ data, previousData }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100)
        const prev = previousData?.[d.key]
        const diff = prev != null && prev > 0 ? Math.round(((d.value - prev) / prev) * 100) : null
        return (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{d.icon}</span> {d.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.value}</span>
                {diff != null && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: diff >= 0 ? '#22C55E' : '#EF4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {diff >= 0 ? <IconTrendUp /> : <IconTrendDown />}
                    {diff >= 0 ? '+' : ''}{diff}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ background: '#F3F4F6', borderRadius: 6, height: 8, overflow: 'hidden', position: 'relative' }}>
              {prev != null && (
                <div style={{ 
                  position: 'absolute', width: `${Math.round((prev / max) * 100)}%`, 
                  background: `${d.color}30`, height: '100%', borderRadius: 6 
                }} />
              )}
              <div style={{ 
                width: `${pct}%`, background: d.color, height: '100%', borderRadius: 6, 
                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'relative', zIndex: 1 
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Line chart for 6-month evolution ──────────────────────── */
function LineChart({ history }) {
  if (!history || history.length < 2) return <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, padding: 30 }}>Necessário pelo menos 2 meses de dados</div>

  const sorted = [...history].sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year).slice(-6)
  const max = Math.max(...sorted.map(s => s.total_interactions || 0), 1)
  const w = 400, h = 160, padX = 40, padY = 20
  const stepX = sorted.length > 1 ? (w - padX * 2) / (sorted.length - 1) : 0

  const points = sorted.map((s, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - (s.total_interactions || 0) / max) * (h - padY * 2),
    label: `${MONTHS[s.month - 1]?.slice(0, 3)}`,
    value: s.total_interactions || 0,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = pathD + ` L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: '100%', height: 200 }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padY + (1 - t) * (h - padY * 2)
        return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
      })}
      {/* Area */}
      <path d={areaD} fill="url(#lineGrad)"/>
      {/* Line */}
      <path d={pathD} fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Dots + Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#6366F1" strokeWidth="2.5"/>
          <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#4F46E5">{p.value}</text>
          <text x={p.x} y={h + 12} textAnchor="middle" fontSize="10" fill="#9CA3AF">{p.label}</text>
        </g>
      ))}
    </svg>
  )
}

/* ── Main Reports Component ───────────────────────────────── */
export default function Reports() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [metrics, setMetrics] = useState({})
  const [previousMetrics, setPreviousMetrics] = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  
  // AI Report
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiReport, setAiReport] = useState('')
  
  // Report links
  const [reportLinks, setReportLinks] = useState([])
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedLink, setCopiedLink] = useState(null)

  // Load clients
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.from('clients').select('id, company_name, niche').eq('user_id', user.id).order('company_name')
      setClients(data || [])
      if (data?.length > 0 && !selectedClient) setSelectedClient(data[0].id)
      setLoading(false)
    }
    loadClients()
  }, [user])

  // Load metrics for selected client + month
  const loadMetrics = useCallback(async () => {
    if (!selectedClient) return
    
    // Current month
    const { data: current } = await supabase
      .from('gmb_metrics')
      .select('*')
      .eq('client_id', selectedClient)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle()

    if (current) {
      setMetrics(current)
      setHasData(true)
    } else {
      setMetrics({ client_id: selectedClient, month, year })
      setHasData(false)
    }

    // Previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const { data: prev } = await supabase
      .from('gmb_metrics')
      .select('*')
      .eq('client_id', selectedClient)
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .maybeSingle()
    
    setPreviousMetrics(prev || null)

    // History (all months for this client)
    const { data: hist } = await supabase
      .from('gmb_metrics')
      .select('*')
      .eq('client_id', selectedClient)
      .order('year', { ascending: true })
      .order('month', { ascending: true })

    setHistory(hist || [])

    // Report links
    const { data: links } = await supabase
      .from('gmb_report_links')
      .select('*')
      .eq('client_id', selectedClient)
      .order('created_at', { ascending: false })

    setReportLinks(links || [])
    
    // Reset AI report
    setAiReport('')
  }, [selectedClient, month, year])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  // Save metrics
  async function saveMetrics() {
    setSaving(true)
    
    const totalInteractions = 
      (parseInt(metrics.overview_views) || 0) +
      (parseInt(metrics.call_clicks) || 0) +
      (parseInt(metrics.chat_clicks) || 0) +
      (parseInt(metrics.direction_requests) || 0) +
      (parseInt(metrics.website_clicks) || 0)

    const payload = {
      client_id: selectedClient,
      month,
      year,
      overview_views: parseInt(metrics.overview_views) || 0,
      call_clicks: parseInt(metrics.call_clicks) || 0,
      chat_clicks: parseInt(metrics.chat_clicks) || 0,
      direction_requests: parseInt(metrics.direction_requests) || 0,
      website_clicks: parseInt(metrics.website_clicks) || 0,
      impressions_search: parseInt(metrics.impressions_search) || 0,
      impressions_maps: parseInt(metrics.impressions_maps) || 0,
      bookings: parseInt(metrics.bookings) || 0,
      total_interactions: totalInteractions,
      conversations: parseInt(metrics.chat_clicks) || 0,
      fetched_at: new Date().toISOString(),
    }

    if (metrics.id) {
      await supabase.from('gmb_metrics').update(payload).eq('id', metrics.id)
    } else {
      await supabase.from('gmb_metrics').insert(payload)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadMetrics()
  }

  // Generate AI Report
  async function generateAIReport() {
    if (!hasData) { alert('Salve as métricas primeiro antes de gerar o relatório.'); return }
    setGeneratingAI(true)
    setAiReport('')

    const clientName = clients.find(c => c.id === selectedClient)?.company_name || 'Cliente'
    
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmb-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            previous_metrics: previousMetrics,
            client_name: clientName,
            month: MONTHS[month - 1],
            year,
          }),
        }
      )
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiReport(data.report)
    } catch (err) {
      alert('Erro ao gerar relatório: ' + err.message)
    }
    setGeneratingAI(false)
  }

  // Generate shareable link
  async function generateReportLink() {
    if (!hasData) { alert('Salve as métricas primeiro.'); return }
    setGeneratingLink(true)

    const clientName = clients.find(c => c.id === selectedClient)?.company_name || 'Cliente'
    
    // Get user/agency info
    const { data: userData } = await supabase.from('users').select('agency_name, agency_logo_url').eq('id', user.id).single()

    const token = crypto.randomUUID()
    const snapshot = { ...metrics, total_interactions: calcTotal() }

    await supabase.from('gmb_report_links').insert({
      client_id: selectedClient,
      month,
      year,
      token,
      metrics_snapshot: snapshot,
      ai_report_text: aiReport || null,
      agency_name: userData?.agency_name || 'PostGMN AI',
      agency_logo_url: userData?.agency_logo_url || null,
    })

    setGeneratingLink(false)
    loadMetrics()
  }

  function calcTotal() {
    return (parseInt(metrics.overview_views) || 0) +
      (parseInt(metrics.call_clicks) || 0) +
      (parseInt(metrics.chat_clicks) || 0) +
      (parseInt(metrics.direction_requests) || 0) +
      (parseInt(metrics.website_clicks) || 0)
  }

  function copyLink(token) {
    const url = `${window.location.origin}/relatorio/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(token)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  async function deleteLink(id) {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return
    await supabase.from('gmb_report_links').delete().eq('id', id)
    loadMetrics()
  }

  function updateMetric(key, value) {
    setMetrics(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const selectedClientName = clients.find(c => c.id === selectedClient)?.company_name || ''

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--gray-400)' }}>
      <div className="spinner" style={{ margin: '0 auto 12px' }} />
      <div>Carregando...</div>
    </div>
  )

  const chartData = METRIC_FIELDS.map(f => ({
    key: f.key,
    label: f.label,
    value: parseInt(metrics[f.key]) || 0,
    icon: f.icon,
    color: f.color,
  }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IconChart /> Performance GMB</h1>
          <p>Métricas do Google Meu Negócio — entrada manual com dashboard visual</p>
        </div>
      </div>

      <div className="page-body">
        {/* ── Filters ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: 13 }}>
              <IconFilter /> Filtros:
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 200 }} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto', minWidth: 130 }} value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {!selectedClient ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Selecione um cliente</div>
            <div style={{ fontSize: 13 }}>Escolha um cliente acima para inserir ou visualizar métricas do Google Meu Negócio.</div>
          </div>
        ) : (
          <>
            {/* ── Metric Input Form ───────────────────────── */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📝 Inserir Métricas — {selectedClientName}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                    {MONTHS[month - 1]} {year} {hasData && <span style={{ color: '#22C55E', fontWeight: 600 }}>· Dados salvos ✓</span>}
                  </div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={saveMetrics} 
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saved ? <><IconCheck /> Salvo!</> : saving ? 'Salvando...' : <><IconSave /> Salvar Métricas</>}
                </button>
              </div>
              <div className="card-body">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: 14 
                }}>
                  {METRIC_FIELDS.map(f => (
                    <div key={f.key} style={{
                      background: 'var(--gray-50)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      border: `2px solid ${parseInt(metrics[f.key]) > 0 ? f.color + '40' : 'transparent'}`,
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{f.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>{f.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{f.desc}</div>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="0"
                        value={metrics[f.key] || ''}
                        onChange={e => updateMetric(f.key, e.target.value)}
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          textAlign: 'center',
                          color: f.color,
                          background: 'white',
                          border: '1px solid var(--gray-200)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          width: '100%',
                        }}
                      />
                      {previousMetrics && previousMetrics[f.key] != null && (
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4, textAlign: 'center' }}>
                          Mês anterior: <strong>{previousMetrics[f.key]}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total interactions */}
                <div style={{
                  marginTop: 16,
                  background: 'linear-gradient(135deg, #4F46E520, #7C3AED15)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Interações</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Visão Geral + Chamadas + Chat + Orientações + Website</div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#4F46E5' }}>
                    {calcTotal()}
                    {previousMetrics && (
                      <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 8, color: calcTotal() >= (previousMetrics.total_interactions || 0) ? '#22C55E' : '#EF4444' }}>
                        {calcTotal() >= (previousMetrics.total_interactions || 0) ? '▲' : '▼'} 
                        {previousMetrics.total_interactions > 0 
                          ? ` ${Math.round(((calcTotal() - previousMetrics.total_interactions) / previousMetrics.total_interactions) * 100)}%`
                          : ''
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Dashboard Visual ────────────────────────── */}
            {hasData && (
              <>
                {/* KPI Cards */}
                <div className="stats-grid" style={{ marginBottom: 24 }}>
                  {METRIC_FIELDS.slice(0, 5).map(f => {
                    const val = parseInt(metrics[f.key]) || 0
                    const prev = previousMetrics?.[f.key]
                    const diff = prev != null && prev > 0 ? Math.round(((val - prev) / prev) * 100) : null
                    return (
                      <div key={f.key} className="stat-card" style={{ borderTop: `3px solid ${f.color}` }}>
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{f.icon}</span> {f.label}
                        </div>
                        <div className="stat-value" style={{ color: f.color }}>{val}</div>
                        <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {diff != null ? (
                            <>
                              {diff >= 0 ? <IconTrendUp /> : <IconTrendDown />}
                              <span style={{ color: diff >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                                {diff >= 0 ? '+' : ''}{diff}%
                              </span>
                              <span> vs mês anterior</span>
                            </>
                          ) : f.desc}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Charts side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                  <div className="card">
                    <div className="card-header"><h3>📊 Comparativo de Métricas</h3></div>
                    <div className="card-body">
                      <BarChart data={chartData} previousData={previousMetrics} />
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header"><h3>📈 Evolução — Total de Interações</h3></div>
                    <div className="card-body">
                      <LineChart history={history} />
                    </div>
                  </div>
                </div>

                {/* AI Report Generation */}
                <div className="card" style={{ marginBottom: 24, border: '2px solid #6366F120' }}>
                  <div className="card-header" style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🤖</span> Relatório com IA
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        onClick={generateAIReport}
                        disabled={generatingAI}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                      >
                        {generatingAI ? (
                          <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Gerando...</>
                        ) : (
                          <><IconSparkle /> Gerar Relatório com IA</>
                        )}
                      </button>
                      {aiReport && (
                        <button
                          className="btn btn-outline"
                          onClick={generateReportLink}
                          disabled={generatingLink}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          {generatingLink ? 'Criando...' : <><IconLink /> Gerar Link Compartilhável</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    {!aiReport && !generatingAI && (
                      <div style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Clique em "Gerar Relatório com IA" para criar uma análise completa</div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>A IA vai analisar as métricas e gerar um relatório profissional</div>
                      </div>
                    )}
                    {generatingAI && (
                      <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-500)' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px', width: 28, height: 28, borderWidth: 3 }} />
                        <div style={{ fontWeight: 600 }}>Analisando métricas com IA...</div>
                        <div style={{ fontSize: 12, marginTop: 4, color: 'var(--gray-400)' }}>Isso pode levar até 30 segundos</div>
                      </div>
                    )}
                    {aiReport && (
                      <div style={{
                        background: '#FAFAFA',
                        borderRadius: 12,
                        padding: 24,
                        fontSize: 14,
                        lineHeight: 1.8,
                        whiteSpace: 'pre-wrap',
                        color: '#1F2937',
                        border: '1px solid var(--gray-200)',
                        maxHeight: 500,
                        overflow: 'auto',
                      }}>
                        {aiReport}
                      </div>
                    )}
                    {aiReport && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" onClick={() => {
                          navigator.clipboard.writeText(aiReport)
                          alert('Relatório copiado!')
                        }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <IconCopy /> Copiar Texto
                        </button>
                        <button className="btn btn-outline" onClick={() => {
                          const msg = encodeURIComponent(aiReport)
                          window.open(`https://wa.me/?text=${msg}`, '_blank')
                        }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#25D366', borderColor: '#25D366' }}>
                          📱 Enviar via WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Report Links History ────────────────────── */}
            <div className="card">
              <div className="card-header">
                <h3>🔗 Relatórios Gerados — {selectedClientName}</h3>
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{reportLinks.length} relatório(s)</span>
              </div>
              {reportLinks.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div>Nenhum relatório gerado ainda para este cliente.</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Preencha as métricas, gere o relatório com IA e clique em "Gerar Link Compartilhável".</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        {['Mês/Ano', 'Interações', 'Chamadas', 'Chat', 'Orientações', 'Website', 'Data', 'Ações'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--gray-200)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportLinks.map((link, i) => {
                        const snap = link.metrics_snapshot || {}
                        return (
                          <tr key={link.id} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{MONTHS[link.month - 1]} {link.year}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ background: '#4F46E520', color: '#4F46E5', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                                {snap.total_interactions || 0}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>{snap.call_clicks || 0}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>{snap.chat_clicks || 0}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>{snap.direction_requests || 0}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>{snap.website_clicks || 0}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray-400)' }}>
                              {new Date(link.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => copyLink(link.token)}
                                  style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  {copiedLink === link.token ? <><IconCheck /> Copiado!</> : <><IconCopy /> Copiar</>}
                                </button>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => window.open(`/relatorio/${link.token}`, '_blank')}
                                  style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  <IconExternalLink /> Abrir
                                </button>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => deleteLink(link.id)}
                                  style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', borderColor: '#EF444440' }}
                                >
                                  <IconTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
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
