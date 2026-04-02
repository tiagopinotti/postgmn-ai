import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PostImageRender from '../components/PostImageRender'
import ApprovalCalendar from '../components/ApprovalCalendar'

const STATUS = {
  draft:            { label: 'Rascunho',           badge: 'badge-gray'   },
  rascunho:         { label: 'Rascunho',           badge: 'badge-gray'   },
  in_review:        { label: 'Aguardando',          badge: 'badge-yellow' },
  pendente:         { label: 'Aguardando',          badge: 'badge-yellow' },
  approved:         { label: 'Aprovado ✓',          badge: 'badge-green'  },
  aprovado:         { label: 'Aprovado ✓',          badge: 'badge-green'  },
  change_requested: { label: 'Alteração solicitada', badge: 'badge-red'  },
}


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
      .select('*, clients(*, users(webhook_url)), content_plans(*)')
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

  async function dispatchWebhook(eventStr, postObj, commentStr = '') {
    const webhookUrl = client?.users?.webhook_url
    if (!webhookUrl) return
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventStr,           // "aprovado" ou "alteracao"
          post_id: postObj.id,
          theme: postObj.theme,
          client_name: client.company_name,
          comment: commentStr
        })
      })
    } catch(e) {
      console.warn('Webhook dispatch failed', e)
    }
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
    
    const targetPost = posts.find(p => p.id === postId)
    if (targetPost) dispatchWebhook('aprovado', targetPost, feedbacks[postId] || '')

    await supabase.from('notifications').insert({
      client_id: client.id, type: 'approval',
      title: `${client.company_name} aprovou um post`,
      message: `Post: ${targetPost?.theme}\n${feedbacks[postId] ? `Comentário: ${feedbacks[postId]}` : ''}`.trim(),
      link: `/clientes/${client.id}/planos/${targetPost?.content_plan_id || ''}`
    })

    const updated = posts.map(p => p.id === postId ? { ...p, status: 'aprovado', approved_by_client: true } : p)
    setPosts(updated)
    setSaving(null)
    // Se todos aprovados: ativa banner e dispara webhook
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
    
    const targetPost = posts.find(p => p.id === postId)
    if (targetPost) dispatchWebhook('alteracao', targetPost, feedbacks[postId])

    await supabase.from('notifications').insert({
      client_id: client.id, type: 'change_request',
      title: `${client.company_name} pediu alteração`,
      message: `Post: ${targetPost?.theme}\nComentário: ${feedbacks[postId] || ''}`.trim(),
      link: `/clientes/${client.id}/planos/${targetPost?.content_plan_id || ''}`
    })

    const updated = posts.map(p => p.id === postId ? { ...p, status: 'change_requested' } : p)
    setPosts(updated)
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
      dispatchWebhook('aprovado', post, '')
    }
    
    if (pending.length > 0) {
      await supabase.from('notifications').insert({
        client_id: client.id, type: 'approval',
        title: `${client.company_name} aprovou todos de uma vez`,
        message: `${pending.length} posts foram aprovados diretamente pelo portal.`,
        link: `/clientes/${client.id}/planos/${pending[0]?.content_plan_id || ''}`
      })
    }

    const allUpdated = posts.map(p => ({ ...p, status: 'aprovado', approved_by_client: true }))
    setPosts(allUpdated)
    setAllApproved(true)
    setSaving(null)
  }

  const handleScrollToPost = (postId) => {
    const el = document.getElementById(`post-${postId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'box-shadow 0.3s'
      el.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.4)'
      setTimeout(() => el.style.boxShadow = '', 1500)
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
            <p style={{ opacity: 0.9, fontSize: 14 }}>
              Obrigado! A equipe já foi notificada e vai publicar os conteúdos nas datas previstas.
            </p>
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

        <ApprovalCalendar year={plan?.year} month={plan?.month} posts={posts} onPostClick={handleScrollToPost} />

        {/* LISTA DE POSTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post, i) => {
            const st = STATUS[post.status] || STATUS.in_review
            const isApproved = post.status === 'aprovado' || post.status === 'approved'
            const isChanged = post.status === 'change_requested'

            return (
              <div key={post.id} id={`post-${post.id}`} className="card" style={{
                borderLeft: `4px solid ${isApproved ? '#22C55E' : isChanged ? '#EF4444' : '#E5E7EB'}`,
                scrollMarginTop: 40 // offset to avoid strict sticking to edge
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
                  {/* CRIATIVO E TEXTO DO POST */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                    {post.image_url ? (
                       <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
                          <img src={post.image_url} alt="Post preview" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--gray-200)', objectFit: 'cover' }} />
                       </div>
                    ) : post.image_text && (
                       <div style={{ flex: '1 1 300px', maxWidth: 440 }}>
                         <PostImageRender templateKey={post.image_template} text={post.image_text} />
                       </div>
                    )}
                    {post.post_text && (
                      <div style={{
                        flex: '1 1 300px',
                        background: '#F9FAFB', borderRadius: 8, padding: '14px 16px',
                        fontSize: 14, lineHeight: 1.75,
                        whiteSpace: 'pre-wrap', border: '1px solid var(--gray-200)', color: '#1F2937'
                      }}>
                        {post.post_text}
                      </div>
                    )}
                  </div>

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


        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--gray-400)', fontSize: 11 }}>
          Powered by PostGMN AI
        </div>
      </div>
    </div>
  )
}
