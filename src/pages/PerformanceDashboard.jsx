import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostImageRender from '../components/PostImageRender'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const IconArrowUp = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
const IconChart = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
const IconCalendar = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>

function MetricCard({ label, value, color }) {
  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '16px', 
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
      border: '1px solid var(--gray-100)',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: '100px'
    }}>
      <div style={{ 
        fontSize: '11px', 
        color: 'var(--gray-500)', 
        fontWeight: 700, 
        textTransform: 'uppercase', 
        marginBottom: '6px', 
        letterSpacing: '0.05em',
        lineHeight: 1.4
      }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || 'var(--gray-900)' }}>{value}</div>
    </div>
  )
}

export default function PerformanceDashboard() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [client, setClient] = useState(null)
  const [agency, setAgency] = useState(null)
  const [nextMonthPosts, setNextMonthPosts] = useState([])
  const [dbTemplates, setDbTemplates] = useState([])

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Get Report AI
        const { data: reportData, error: rError } = await supabase
          .from('reports_ai')
          .select('*, clients(*, users(*))')
          .eq('id', id)
          .single()

        if (rError) throw rError
        setReport(reportData)
        setClient(reportData.clients)
        setAgency(reportData.clients?.users)

        // 2. Load GMB Metrics for that month/year
        const { data: mData } = await supabase
          .from('gmb_metrics')
          .select('*')
          .eq('client_id', reportData.client_id)
          .eq('month', reportData.month)
          .eq('year', reportData.year)
          .single()
        setMetrics(mData)

        // 3. Load Templates
        const { data: tpls } = await supabase
          .from('post_templates')
          .select('*')
          .eq('client_id', reportData.client_id)
        setDbTemplates(tpls || [])

        // 4. Load Next Month Programming
        const nextMonthDate = new Date(reportData.year, reportData.month, 1) // reportData.month is March (3), JS Date(2026, 3, 1) is April 1st
        const nextYear = nextMonthDate.getFullYear()
        const nextMonthNum = nextMonthDate.getMonth() + 1
        
        // Final of that month (1st of the month after next)
        const afterNextMonthDate = new Date(nextYear, nextMonthNum, 1)
        const afterNextYear = afterNextMonthDate.getFullYear()
        const afterNextMonthNum = afterNextMonthDate.getMonth() + 1

        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('client_id', reportData.client_id)
          .gte('scheduled_date', `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-01`)
          .lt('scheduled_date', `${afterNextYear}-${String(afterNextMonthNum).padStart(2, '0')}-01`)
          .order('scheduled_date')
        
        setNextMonthPosts(postsData || [])

      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    if (id) loadData()
  }, [id])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Carregando seu Dashboard...</span>
    </div>
  )

  const primaryColor = agency?.agency_primary_color || '#4F46E5'
  const clientName = client?.company_name || 'Cliente'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: 60 }}>
      {/* Header Premium */}
      <div style={{ background: primaryColor, color: 'white', padding: '60px 20px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)' }} />
        
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
          {agency?.agency_logo_url ? (
            <img src={agency.agency_logo_url} alt="Agency Logo" style={{ height: 44, marginBottom: 20, filter: 'brightness(0) invert(1)' }} />
          ) : (
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>{agency?.agency_name || 'Performance GMN'}</div>
          )}
          
          <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Dashboard de Performance
          </h1>
          <p style={{ opacity: 0.9, fontSize: '18px', fontWeight: 500 }}>
            {clientName} • {MONTHS[report.month - 1]} {report.year}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '-40px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* Metric Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          <MetricCard label="Interações Totais" value={metrics?.total_interactions || 0} color={primaryColor} />
          <MetricCard label="Solicitações de Rotas" value={metrics?.direction_requests || 0} color="#06B6D4" />
          <MetricCard label="Chamadas" value={metrics?.call_clicks || 0} color="#F59E0B" />
          <MetricCard label="Cliques no Chat" value={metrics?.conversations || 0} color="#8B5CF6" />
          <MetricCard label="Cliques no Site" value={metrics?.website_clicks || 0} color="#10B981" />
        </div>

        {/* AI Analysis Section */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid var(--gray-100)', marginBottom: '40px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ padding: 8, background: primaryColor + '15', color: primaryColor, borderRadius: 12 }}>
              <IconChart />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Análise Estratégica do Mês</h2>
          </div>
          
          <div style={{ color: 'var(--gray-700)', lineHeight: 1.8, fontSize: '15px', whiteSpace: 'pre-wrap' }}>
            {report.report_text}
          </div>
        </div>

        {/* Current Month Programming */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ padding: 8, background: '#10B98115', color: '#10B981', borderRadius: 12 }}>
            <IconCalendar />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Planejamento: {MONTHS[report.month % 12]} {report.month === 12 ? report.year + 1 : report.year}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {nextMonthPosts.length > 0 ? nextMonthPosts.map((post, idx) => (
            <div key={post.id} style={{ 
              background: 'white', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              border: '1px solid var(--gray-100)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-400)' }}>POST #{idx + 1}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, background: '#F3F4F6', color: 'var(--gray-600)', padding: '4px 10px', borderRadius: '20px' }}>
                  {new Date(post.scheduled_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              
              <div style={{ aspectRatio: '4/3', width: '100%', background: '#F9FAFB' }}>
                <PostImageRender 
                  template={dbTemplates.find(t => t.id === post.image_template)}
                  text={post.image_text}
                  imageUrl={post.image_url}
                  settings={post.image_settings}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-900)', marginBottom: '8px' }}>
                  {post.theme || 'Sem tema'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gray-500)', height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                  {post.post_text}
                </div>
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--gray-400)', background: 'white', borderRadius: '20px', border: '2px dashed var(--gray-100)' }}>
              Nenhuma postagem programada para este período.
            </div>
          )}
        </div>

      </div>

      <footer style={{ textAlign: 'center', marginTop: 60, padding: 20, color: 'var(--gray-400)', fontSize: 13, borderTop: '1px solid var(--gray-100)' }}>
        Gerado por <strong>{agency?.agency_name || 'PostGMN AI'}</strong>
      </footer>
    </div>
  )
}
