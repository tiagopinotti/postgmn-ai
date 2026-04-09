import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const METRIC_DEFS = [
  { key: 'overview_views',     label: 'Visão Geral',      icon: '👁️', color: '#6366F1', desc: 'Visualizações do perfil' },
  { key: 'call_clicks',        label: 'Chamadas',         icon: '📞', color: '#22C55E', desc: 'Ligações recebidas' },
  { key: 'chat_clicks',        label: 'Chat',             icon: '💬', color: '#06B6D4', desc: 'Mensagens via chat' },
  { key: 'direction_requests', label: 'Orientações',      icon: '🗺️', color: '#F59E0B', desc: 'Rotas traçadas' },
  { key: 'website_clicks',     label: 'Website',          icon: '🌐', color: '#8B5CF6', desc: 'Acessos ao site' },
  { key: 'impressions_search', label: 'Busca Google',     icon: '🔍', color: '#EC4899', desc: 'Impressões na busca' },
  { key: 'impressions_maps',   label: 'Google Maps',      icon: '📍', color: '#14B8A6', desc: 'Impressões no Maps' },
  { key: 'bookings',           label: 'Reservas',         icon: '📅', color: '#F97316', desc: 'Reservas realizadas' },
]

export default function ReportView() {
  const { token } = useParams()
  const [report, setReport] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReport()
  }, [token])

  async function loadReport() {
    const { data } = await supabase
      .from('gmb_report_links')
      .select('*, clients(company_name, niche, city)')
      .eq('token', token)
      .single()

    if (!data) {
      setError('Relatório não encontrado ou link inválido.')
      setLoading(false)
      return
    }

    setReport(data)
    setClient(data.clients)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32, borderWidth: 3 }} />
        <div style={{ color: '#6B7280', fontSize: 14 }}>Carregando relatório...</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#1F2937' }}>Relatório não encontrado</h2>
        <p style={{ color: '#6B7280' }}>{error}</p>
      </div>
    </div>
  )

  const snap = report.metrics_snapshot || {}
  const totalInteractions = snap.total_interactions || 0
  const metrics = METRIC_DEFS.map(m => ({ ...m, value: snap[m.key] || 0 }))
  const maxMetric = Math.max(...metrics.map(m => m.value), 1)

  // Determine top metric
  const topMetric = [...metrics].sort((a, b) => b.value - a.value)[0]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6366F1 100%)',
        padding: '32px 24px 40px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -20,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Agency branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            {report.agency_logo_url ? (
              <img src={report.agency_logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{report.agency_name || 'PostGMN AI'}</span>
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 6 }}>
            Relatório de Performance
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{client?.company_name || 'Cliente'}</h1>
          <p style={{ fontSize: 15, opacity: 0.85 }}>
            {MONTHS[report.month - 1]} {report.year}
            {client?.city && <span> · {client.city}</span>}
          </p>

          {/* Total interactions hero */}
          <div style={{
            marginTop: 24,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Interações</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>{totalInteractions}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Destaque do mês</div>
              <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span>{topMetric?.icon}</span> {topMetric?.label}: {topMetric?.value}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 60px' }}>

        {/* Metric Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 12,
          marginTop: -20,
          position: 'relative',
          zIndex: 2,
        }}>
          {metrics.map(m => (
            <div key={m.key} style={{
              background: 'white',
              borderRadius: 14,
              padding: '18px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #F3F4F6',
              textAlign: 'center',
              transition: 'transform 0.2s',
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', marginTop: 6 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginTop: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #F3F4F6',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#1F2937' }}>📊 Comparativo de Métricas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metrics.filter(m => m.value > 0).sort((a, b) => b.value - a.value).map(m => {
              const pct = Math.round((m.value / maxMetric) * 100)
              return (
                <div key={m.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{m.icon}</span> {m.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</span>
                  </div>
                  <div style={{ background: '#F3F4F6', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${m.color}, ${m.color}CC)`,
                      height: '100%',
                      borderRadius: 8,
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Report Text */}
        {report.ai_report_text && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 28,
            marginTop: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #F3F4F6',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span> Análise de Performance
            </h3>
            <div style={{
              fontSize: 14,
              lineHeight: 1.9,
              color: '#374151',
              whiteSpace: 'pre-wrap',
            }}>
              {report.ai_report_text}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: 40,
          padding: '20px 0',
          borderTop: '1px solid #E5E7EB',
          color: '#9CA3AF',
          fontSize: 12,
        }}>
          <div>Relatório gerado por <strong style={{ color: '#6366F1' }}>{report.agency_name || 'PostGMN AI'}</strong></div>
          <div style={{ marginTop: 4 }}>
            Gerado em {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}
