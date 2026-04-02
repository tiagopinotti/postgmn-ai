import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from 'react-hot-toast'

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
  const [gmbData, setGmbData] = useState(null)
  const [gmbLoading, setGmbLoading] = useState(false)
  const [aiReport, setAiReport] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [screenshots, setScreenshots] = useState([])
  const [screenshotReport, setScreenshotReport] = useState('')
  const [screenshotLoading, setScreenshotLoading] = useState(false)
  const [branding, setBranding] = useState({ logo: '', color: '#4F46E5', agency_name: '' })
  const [zapMessage, setZapMessage] = useState('')
  const [savedReportId, setSavedReportId] = useState(null)

  useEffect(() => {
    async function loadBranding() {
      const { data } = await supabase.from('users').select('agency_logo_url, agency_primary_color, agency_name').eq('id', user.id).single()
      if (data) setBranding({ logo: data.agency_logo_url || '', color: data.agency_primary_color || '#4F46E5', agency_name: data.agency_name || '' })
    }
    loadBranding()
  }, [user])

  useEffect(() => {
    if (selectedClient !== 'all') loadSavedReport()
    else { setAiReport(''); setZapMessage(''); setSavedReportId(null) }
  }, [selectedClient, month, year])

  async function loadSavedReport() {
    const { data } = await supabase.from('reports_ai').select('id, report_text, zap_message').eq('client_id', selectedClient).eq('month', month).eq('year', year).maybeSingle()
    if (data) {
      setAiReport(data.report_text)
      setZapMessage(data.zap_message || '')
      setSavedReportId(data.id)
    } else {
      setAiReport('')
      setZapMessage('')
      setSavedReportId(null)
    }
  }

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.from('clients').select('id, company_name, niche').eq('user_id', user.id).order('company_name')
      setClients(data || [])
    }
    loadClients()
  }, [user])

  useEffect(() => {
    async function loadReport() {
      setLoading(true)
      const { data: myClients } = await supabase.from('clients').select('id, company_name, niche').eq('user_id', user.id)
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
        ? await supabase.from('posts').select('id, content_plan_id, status, category, scheduled_date').in('content_plan_id', planIds)
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
        const cPostIds = cPlans.flatMap(p => (posts || []).filter(post => post.content_plan_id === p.id).map(post => post.id))
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

  useEffect(() => {
    if (selectedClient !== 'all') loadGmbMetrics()
    else setGmbData(null)
  }, [selectedClient, month, year])

  async function loadGmbMetrics() {
    setGmbLoading(true)
    try {
      const res = await fetch('https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selectedClient, month, year })
      })
      const data = await res.json()
      setGmbData(data)
    } catch (e) {
      console.error('GMB metrics error:', e)
    }
    setGmbLoading(false)
  }

  async function generateAiReport() {
    if (!gmbData?.connected) return
    setAiLoading(true)

    // Buscar relatório do mês anterior para comparação
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const { data: prevReport } = await supabase.from('reports_ai').select('report_text').eq('client_id', selectedClient).eq('month', prevMonth).eq('year', prevYear).maybeSingle()

    const clientName = clients.find(c => c.id === selectedClient)?.company_name || 'Cliente'
    let prompt = `Você é um estrategista de marketing digital especializado em Google Meu Negócio. Gere um relatório profissional mensal em português para o cliente "${clientName}" referente a ${MONTHS[month - 1]} ${year}.

Dados reais do período:
- Total de Interações: ${gmbData.total_interactions || 0}
- Cliques no Site: ${gmbData.website_clicks || 0}
- Chamadas: ${gmbData.call_clicks || 0}
- Pedidos de Rota: ${gmbData.direction_requests || 0}
- Mensagens: ${gmbData.conversations || 0}
- Agendamentos: ${gmbData.bookings || 0}
- Impressões na Busca: ${gmbData.impressions_search || 0}
- Impressões no Maps: ${gmbData.impressions_maps || 0}`

    if (prevReport) {
      prompt += `\n\nO cenário do mês anterior (${MONTHS[prevMonth - 1]} ${prevYear}) foi: ${prevReport.report_text.substring(0, 1000)}. Compare os resultados atuais com os anteriores para destacar evolução ou declínio.`
    }

    prompt += `\n\nRetorne EXCLUSIVAMENTE um JSON no seguinte formato:
{
  "report": "Texto completo do relatório (Resumo, Destaques, Atenção, Próximos os, Conclusão). Use parágrafos e emojis.",
  "zap": "Mensagem curta para o WhatsApp apresentando o relatório em anexo."
}

Não use headers markdown.`

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY
      let content = ''
      if (import.meta.env.VITE_OPENAI_API_KEY) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1500, response_format: { type: 'json_object' } })
        })
        const data = await res.json()
        content = data.choices?.[0]?.message?.content
      } else if (import.meta.env.VITE_GEMINI_API_KEY) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
        })
        const data = await res.json()
        content = data.candidates?.[0]?.content?.parts?.[0]?.text
      }

      if (content) {
        const parsed = JSON.parse(content)
        setAiReport(parsed.report)
        setZapMessage(parsed.zap)

        await supabase.from('reports_ai').upsert({
          client_id: selectedClient,
          month,
          year,
          report_text: parsed.report,
          zap_message: parsed.zap,
          user_id: user.id
        })
      }
    } catch (e) {
      console.error('AI Report error:', e)
      setAiReport('Erro ao gerar: ' + e.message)
    }
    setAiLoading(false)
  }

  async function exportPDF() {
    if (!aiReport) return
    const element = document.createElement('div')
    element.style.padding = '40px'
    element.style.fontFamily = 'Inter, system-ui, sans-serif'
    element.style.color = '#1f2937'
    element.style.background = 'white'

    const clientName = clients.find(c => c.id === selectedClient)?.company_name || 'Cliente'

    element.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 2px solid ${branding.color}; padding-bottom: 20px;">
        <div>
          ${branding.logo ? `<img src="${branding.logo}" style="height: 50px; width: auto; margin-bottom: 10px;" />` : `<h1 style="margin: 0; color: ${branding.color};">${branding.agency_name || 'Agência'}</h1>`}
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 18px; color: ${branding.color};">Relatório Mensal de Performance</h2>
          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">${MONTHS[month - 1]} ${year}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 16px; margin-bottom: 10px; color: ${branding.color};">Resumo do Cliente</h3>
        <p style="margin: 0; font-size: 14px;"><strong>Cliente:</strong> ${clientName}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 40px;">
        ${[
    { label: 'Interações', value: gmbData?.total_interactions || 0 },
    { label: 'Visitas ao Site', value: gmbData?.website_clicks || 0 },
    { label: 'Chamadas', value: gmbData?.call_clicks || 0 },
    { label: 'Rotas', value: gmbData?.direction_requests || 0 },
    { label: 'Busca GMB', value: (gmbData?.impressions_search || 0).toLocaleString() },
    { label: 'Maps GMB', value: (gmbData?.impressions_maps || 0).toLocaleString() }
  ].map(s => `
          <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px;">${s.label}</div>
            <div style="font-size: 20px; font-weight: 700; color: ${branding.color};">${s.value}</div>
          </div>
        `).join('')}
      </div>

      <div style="line-height: 1.6; font-size: 14px; white-space: pre-wrap;">
        ${aiReport}
      </div>

      <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
        Relatório gerado por ${branding.agency_name || 'Agência'} via PostGMN AI.
      </div>
    `

    const opt = {
      margin: 10,
      filename: `Relatorio-${clientName.replace(/\s+/g, '-')}-${MONTHS[month - 1]}-${year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(element).save()
    } else {
      toast.error('Aguarde o carregamento do gerador de PDF...')
    }
  }

  function handleScreenshots(files) {
    const fileArray = Array.from(files).slice(0, 5)
    const readers = fileArray.map(f => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(f)
      })
    })
    Promise.all(readers).then(results => setScreenshots(prev => [...prev, ...results].slice(0, 5)))
  }

  async function generateScreenshotReport() {
    if (!screenshots.length) return
    setScreenshotLoading(true)
    const clientName = selectedClient !== 'all' ? clients.find(c => c.id === selectedClient)?.company_name : ''
    try {
      const res = await fetch('https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: screenshots,
          client_name: clientName || 'Cliente',
          month: MONTHS[month - 1],
          year
        })
      })
      const data = await res.json()
      setScreenshotReport(data.report || data.error || 'Erro ao gerar relatório.')
    } catch (e) {
      setScreenshotReport('Erro: ' + e.message)
    }
    setScreenshotLoading(false)
  }

  function exportCSV() {
    if (!clientReports.length) return
    const headers = ['Cliente', 'Nicho', 'Planos', 'Posts Total', 'Aprovados', 'Pendentes', 'Taxa Aprovação']
    const rows = clientReports.map(c => [c.company_name, c.niche || '', c.plans, c.totalPosts, c.approved, c.pending, `${c.approvalRate}%`])
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
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
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
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.company_name}</td>
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

            {/* GMB Performance Section */}
            {selectedClient !== 'all' && (
              <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                  <h3>📍 Performance Google Meu Negócio — {MONTHS[month - 1]} {year}</h3>
                </div>
                {gmbLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <div>Buscando dados do GMB...</div>
                  </div>
                ) : !gmbData?.connected ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                    <div>Este cliente não tem o Google Meu Negócio conectado.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Vá na ficha do cliente → aba "Google Meu Negócio" para conectar.</div>
                  </div>
                ) : (
                  <div className="card-body">
                    {/* GMB Metric Cards */}
                    <div className="stats-grid" style={{ marginBottom: 20 }}>
                      {[
                        { label: 'Total Interações', value: gmbData.total_interactions || 0, color: '#4F46E5', sub: 'ações no perfil' },
                        { label: 'Cliques no Site', value: gmbData.website_clicks || 0, color: '#22C55E', sub: 'visitas geradas' },
                        { label: 'Chamadas', value: gmbData.call_clicks || 0, color: '#F59E0B', sub: 'ligações recebidas' },
                        { label: 'Rotas', value: gmbData.direction_requests || 0, color: '#06B6D4', sub: 'pedidos de direção' },
                        { label: 'Impressões Busca', value: (gmbData.impressions_search || 0).toLocaleString(), color: '#8B5CF6', sub: 'Google Search' },
                        { label: 'Impressões Maps', value: (gmbData.impressions_maps || 0).toLocaleString(), color: '#EC4899', sub: 'Google Maps' },
                      ].map((s, i) => (
                        <div key={i} className="stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                          <div className="stat-label">{s.label}</div>
                          <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                          <div className="stat-sub">{s.sub}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI Report Generator */}
                    <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600 }}>✨ Relatório Mensal com IA</h4>
                        <button className="btn btn-primary btn-sm" onClick={generateAiReport} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {aiLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Gerando...</> : '✨ Gerar Relatório'}
                        </button>
                      </div>
                      {aiReport && (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 16 }}>
                          <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '16px 20px', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--gray-700)', border: '1px solid var(--gray-200)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--gray-200)', paddingBottom: 8 }}>
                              <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>Análise Estratégica ✨</span>
                              <button className="btn btn-outline btn-sm" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <IconDownload /> Baixar PDF Profissional
                              </button>
                            </div>
                            {aiReport}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: '#F0F9FF', borderRadius: 8, padding: 16, border: '1px solid #B9E6FE' }}>
                              <h5 style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                📱 Mensagem para WhatsApp
                              </h5>
                              <p style={{ fontSize: 13, color: '#0C4A6E', lineHeight: 1.5, marginBottom: 12 }}>{zapMessage || 'Gerando mensagem...'}</p>
                              <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => {
                                navigator.clipboard.writeText(zapMessage)
                                toast.success('Copiada para o WhatsApp!')
                              }}>Copiar para o Zap</button>
                            </div>

                            <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: 16, border: '1px solid var(--gray-200)' }}>
                              <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>Branding:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 6, background: branding.color || '#4F46E5' }} title="Cor da Agência" />
                                {branding.logo && <img src={branding.logo} style={{ height: 30, maxWidth: 60, objectFit: 'contain' }} alt="Logo Agência" />}
                                <span style={{ fontSize: 11, color: 'var(--gray-600)' }}>{branding.agency_name}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Screenshot-based AI Report */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3>📸 Relatório Visual com IA</h3>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Envie prints do Google Meu Negócio</span>
          </div>
          <div className="card-body">
            {selectedClient === 'all' ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>👆</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Selecione um cliente primeiro</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Use o filtro acima para escolher para qual cliente você quer gerar o relatório.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#EEF2FF', borderRadius: 8, marginBottom: 16, border: '1px solid #C7D2FE' }}>
                  <span style={{ fontSize: 18 }}>👤</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#4338CA' }}>
                      Relatório para: {clients.find(c => c.id === selectedClient)?.company_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6366F1' }}>{MONTHS[month - 1]} {year}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                  Tire screenshots da tela de Desempenho do Google Meu Negócio e envie aqui. A IA vai analisar os dados das imagens e gerar um relatório profissional completo.
                </p>
                <div
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#EEF2FF' }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.background = 'var(--gray-50)' }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.background = 'var(--gray-50)'; handleScreenshots(e.dataTransfer.files) }}
                  onClick={() => document.getElementById('screenshot-input').click()}
                  style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, padding: 30, textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)', transition: 'all 0.2s', marginBottom: 16 }}
                >
                  <input id="screenshot-input" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleScreenshots(e.target.files)} />
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Arraste ou clique para enviar screenshots</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Até 5 imagens • PNG, JPG</div>
                </div>
                {screenshots.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    {screenshots.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: 120, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                        <img src={img} alt={`Screenshot ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={(e) => { e.stopPropagation(); setScreenshots(s => s.filter((_, idx) => idx !== i)) }}
                          style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-primary" onClick={generateScreenshotReport} disabled={screenshotLoading || !screenshots.length}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
                  {screenshotLoading ? (<><span className="spinner" style={{ width: 14, height: 14 }} /> Analisando imagens...</>) : '✨ Gerar Relatório a partir dos Prints'}
                </button>
                {screenshotReport && (
                  <div style={{ marginTop: 20, background: 'white', borderRadius: 10, padding: '20px 24px', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--gray-700)', border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {screenshotReport}
                    <div style={{ marginTop: 16, display: 'flex', gap: 8, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(screenshotReport)}>📋 Copiar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setScreenshotReport(''); setScreenshots([]) }}>🗑️ Limpar</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
