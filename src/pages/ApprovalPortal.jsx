import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS = {
  draft:            { label: 'Rascunho',           badge: 'badge-gray'   },
  rascunho:         { label: 'Rascunho',           badge: 'badge-gray'   },
  in_review:        { label: 'Aguardando',          badge: 'badge-yellow' },
  pendente:         { label: 'Aguardando',          badge: 'badge-yellow' },
  approved:         { label: 'Aprovado ✓',          badge: 'badge-green'  },
  aprovado:         { label: 'Aprovado ✓',          badge: 'badge-green'  },
  change_requested: { label: 'Alteração solicitada', badge: 'badge-red'  },
}

const IconWA = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
)

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function ApprovalPortal() {
  const { token } = useParams()
  const [link, setLink] = useState(null)
  const [client, setClient] = useState(null)
  const [plan, setPlan] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const [feedbacks, setFeedbacks] = useState({})
  const [allApproved, setAllApproved] = useState(false)

  useEffect(() => { loadPortal() }, [token])

  async function loadPortal() {
    const { data: linkData } = await supabase
      .from('approval_links')
      .select('*, clients(*), content_plans(*)')
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (!linkData) { setError('Link inválido ou expirado.'); setLoading(false); return }
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      setError('Este link expirou.'); setLoading(false); return
    }

    setLink(linkData)
    setClient(linkData.clients)
    setPlan(linkData.content_plans)

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('content_plan_id', linkData.content_plan_id)
      .order('scheduled_date')

    setPosts(postsData || [])
    const fb = {}
    postsData?.forEach(p => { fb[p.id] = p.client_feedback || '' })
    setFeedbacks(fb)
    setLoading(false)
  }

  async function approvePost(postId) {
    setSaving(postId)
    await supabase.from('posts').update({
      status: 'aprovado', approved_by_client: true, client_feedback: feedbacks[postId] || ''
    }).eq('id', postId)
    await supabase.from('approvals').insert({
      post_id: postId, client_id: client.id, status: 'approved',
      comment: feedbacks[postId] || '', approved_at: new Date().toISOString()
    })
    const updated = posts.map(p => p.id === postId ? { ...p, status: 'aprovado', approved_by_client: true } : p)
    setPosts(updated)
    setSaving(null)
    // Verificar se todos aprovados
    if (updated.every(p => p.status === 'aprovado' || p.status === 'approved')) {
      setAllApproved(true)
    }
  }

  async function requestChange(postId) {
    if (!feedbacks[postId]?.trim()) { alert('Escreva o que precisa ser alterado antes de pedir a alteração.'); return }
    setSaving(postId)
    await supabase.from('posts').update({
      status: 'change_requested', client_feedback: feedbacks[postId]
    }).eq('id', postId)
    await supabase.from('approvals').insert({
      post_id: postId, client_id: client.id, status: 'change_requested', comment: feedbacks[postId]
    })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'change_requested' } : p))
    setSaving(null)
  }

  async function approveAll() {
    setSaving('all')
    const pending = posts.filter(p => p.status !== 'aprovado' && p.status !== 'approved')
    for (const post of pending) {
      await supabase.from('posts').update({ status: 'aprovado', approved_by_client: true }).eq('id', post.id)
      await supabase.from('approvals').insert({
        post_id: post.id, client_id: client.id, status: 'approved', approved_at: new Date().toISOString()
      })
    }
    setPosts(prev => prev.map(p => ({ ...p, status: 'aprovado', approved_by_client: true })))
    setAllApproved(true)
    setSaving(null)
  }

  function buildGroupMessage() {
    const monthName = plan ? MONTHS[(plan.month || 1) - 1] + ' ' + plan.year : ''
    const approvedList = posts
      .filter(p => p.status === 'aprovado' || p.status === 'approved')
      .map((p, i) => `${i + 1}. ${p.theme}`)
      .join('\n')
    return `✅ *Textos aprovados — ${client?.company_name}*\n\nPlano de ${monthName} aprovado!\n\n*Posts aprovados:*\n${approvedList}\n\n_Aprovado pelo portal PostGMN AI_`
  }

  function openGroupWhatsApp() {
    const msg = encodeURIComponent(buildGroupMessage())
    const groupLink = client?.whatsapp_group_link
    if (groupLink) {
      // Link de grupo: https://chat.whatsapp.com/XXX — abre o grupo direto
      window.open(groupLink, '_blank')
    } else {
      // Fallback: abre WA Web com mensagem (usuário seleciona o grupo)
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div className="loading"><div className="spinner" /><span>Carregando...</span></div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Link inválido</h2>
        <p style={{ color: 'var(--gray-500)' }}>{error}</p>
      </div>
    </div>
  )

  const approvedCount = posts.filter(p => p.status === 'aprovado' || p.status === 'approved').length
  const total = posts.length
  const allDone = approvedCount === total && total > 0

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', padding: '24px', color: 'white' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Portal de Aprovação</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{client?.company_name}</h1>
          <p style={{ opacity: 0.8, fontSize: 14 }}>
            {plan ? `Plano de ${MONTHS[(plan.month || 1) - 1]} ${plan.year} · ` : ''}{approvedCount}/{total} posts aprovados
          </p>
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 6 }}>
            <div style={{ background: 'white', height: 6, borderRadius: 8, width: `${total ? (approvedCount / total) * 100 : 0}%`, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* BANNER TUDO APROVADO */}
        {(allDone || allApproved) && (
          <div style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: 'white', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Todos os posts aprovados!</h2>
            <p style={{ opacity: 0.9, fontSize: 14, marginBottom: 20 }}>
              Obrigado! A equipe já foi notificada e vai publicar os conteúdos nas datas previstas.
            </p>
            <button
              onClick={openGroupWhatsApp}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'white', color: '#16A34A', border: 'none',
                padding: '12px 24px', borderRadius: 10, fontSize: 15,
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}>
              <IconWA />
              Avisar a equipe no WhatsApp
            </button>
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
              Abrirá o WhatsApp com a mensagem de aprovação pronta
            </div>
          </div>
        )}

        {/* APROVAR TUDO */}
        {!allDone && posts.some(p => p.status !== 'aprovado' && p.status !== 'approved') && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid #4F46E5' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Aprovar todos os posts de uma vez</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{total - approvedCount} post(s) aguardando aprovação</div>
              </div>
              <button
                onClick={approveAll}
                disabled={saving === 'all'}
                style={{
                  background: '#22C55E', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: 8, fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: saving === 'all' ? 0.6 : 1
                }}>
                {saving === 'all' ? 'Aprovando...' : '✓ Aprovar tudo'}
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE POSTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post, i) => {
            const st = STATUS[post.status] || STATUS.in_review
            const isApproved = post.status === 'aprovado' || post.status === 'approved'
            const isChanged = post.status === 'change_requested'

            return (
              <div key={post.id} className="card" style={{
                borderLeft: `4px solid ${isApproved ? '#22C55E' : isChanged ? '#EF4444' : '#E5E7EB'}`
              }}>
                <div className="card-header">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Post {i + 1} — {post.theme}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                      {post.scheduled_date
                        ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                        : '—'} {post.category ? `· ${post.category}` : ''}
                    </div>
                  </div>
                  <span className={`badge ${st.badge}`}>{st.label}</span>
                </div>

                <div className="card-body">
                  {/* TEXTO DO POST */}
                  {post.post_text && (
                    <div style={{
                      background: '#F9FAFB', borderRadius: 8, padding: '14px 16px',
                      marginBottom: 16, fontSize: 14, lineHeight: 1.75,
                      whiteSpace: 'pre-wrap', border: '1px solid var(--gray-200)', color: '#1F2937'
                    }}>
                      {post.post_text}
                    </div>
                  )}

                  {/* OBSERVAÇÃO */}
                  {!isApproved && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label" style={{ fontSize: 13 }}>Observação (opcional)</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="Escreva aqui se quiser pedir alguma alteração neste post..."
                        value={feedbacks[post.id] || ''}
                        onChange={e => setFeedbacks(f => ({ ...f, [post.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* AÇÕES */}
                  {!isApproved && !isChanged && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => approvePost(post.id)}
                        disabled={saving === post.id}
                        style={{
                          background: '#22C55E', color: 'white', border: 'none',
                          padding: '10px 22px', borderRadius: 8, fontSize: 14,
                          fontWeight: 600, cursor: 'pointer',
                          opacity: saving === post.id ? 0.6 : 1, transition: 'opacity 0.15s'
                        }}>
                        {saving === post.id ? 'Aprovando...' : '✓ Aprovar'}
                      </button>
                      <button
                        onClick={() => requestChange(post.id)}
                        disabled={saving === post.id}
                        style={{
                          background: '#EF4444', color: 'white', border: 'none',
                          padding: '10px 18px', borderRadius: 8, fontSize: 14,
                          fontWeight: 600, cursor: 'pointer',
                          opacity: saving === post.id ? 0.6 : 1, transition: 'opacity 0.15s'
                        }}>
                        ✎ Pedir alteração
                      </button>
                    </div>
                  )}

                  {/* ESTADO FINAL */}
                  {isApproved && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803D', fontWeight: 600, fontSize: 13 }}>
                      <span style={{ fontSize: 16 }}>✓</span> Aprovado — obrigado!
                    </div>
                  )}
                  {isChanged && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ color: '#DC2626', fontWeight: 600, fontSize: 13 }}>
                        ✎ Alteração solicitada — nossa equipe irá revisar.
                      </div>
                      {feedbacks[post.id] && (
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
                          "{feedbacks[post.id]}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* BOTÃO AVISAR GRUPO (sempre visível no rodapé se tiver aprovados) */}
        {approvedCount > 0 && !allDone && (
          <div style={{ marginTop: 24, padding: '16px 20px', background: 'white', borderRadius: 12, border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Já aprovou alguns posts?</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Avise a equipe pelo WhatsApp sobre os aprovados até agora</div>
            </div>
            <button
              onClick={openGroupWhatsApp}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#25D366', color: 'white', border: 'none',
                padding: '10px 16px', borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: 'pointer', flexShrink: 0
              }}>
              <IconWA /> Avisar equipe
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--gray-400)', fontSize: 11 }}>
          Powered by PostGMN AI
        </div>
      </div>
    </div>
  )
}
