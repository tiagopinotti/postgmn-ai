import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS = {
  draft: { label: 'Rascunho', badge: 'badge-gray' },
  in_review: { label: 'Em revisão', badge: 'badge-yellow' },
  approved: { label: 'Aprovado ✓', badge: 'badge-green' },
  change_requested: { label: 'Alteração solicitada', badge: 'badge-red' },
}

export default function ApprovalPortal() {
  const { token } = useParams()
  const [link, setLink] = useState(null)
  const [client, setClient] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)
  const [success, setSuccess] = useState('')
  const [feedbacks, setFeedbacks] = useState({})

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
    await supabase.from('posts').update({ status: 'approved', approved_by_client: true, client_feedback: feedbacks[postId] || '' }).eq('id', postId)
    await supabase.from('approvals').insert({ post_id: postId, client_id: client.id, status: 'approved', comment: feedbacks[postId] || '', approved_at: new Date().toISOString() })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved', approved_by_client: true } : p))
    setSaving(null)
  }

  async function requestChange(postId) {
    if (!feedbacks[postId]?.trim()) { alert('Por favor escreva o que precisa ser alterado.'); return }
    setSaving(postId)
    await supabase.from('posts').update({ status: 'change_requested', client_feedback: feedbacks[postId] }).eq('id', postId)
    await supabase.from('approvals').insert({ post_id: postId, client_id: client.id, status: 'change_requested', comment: feedbacks[postId] })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'change_requested' } : p))
    setSaving(null)
  }

  async function approveAll() {
    setSaving('all')
    const pending = posts.filter(p => p.status !== 'approved')
    for (const post of pending) {
      await supabase.from('posts').update({ status: 'approved', approved_by_client: true }).eq('id', post.id)
      await supabase.from('approvals').insert({ post_id: post.id, client_id: client.id, status: 'approved', approved_at: new Date().toISOString() })
    }
    setPosts(prev => prev.map(p => ({ ...p, status: 'approved', approved_by_client: true })))
    setSuccess('Todos os posts foram aprovados!')
    setSaving(null)
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

  const approved = posts.filter(p => p.status === 'approved').length
  const total = posts.length

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', padding: '24px', color: 'white' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portal de Aprovação</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{client?.company_name}</h1>
          <p style={{ opacity: 0.8, fontSize: 14 }}>{approved}/{total} posts aprovados</p>
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 6 }}>
            <div style={{ background: 'white', height: 6, borderRadius: 8, width: `${total ? (approved/total)*100 : 0}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

        {/* APROVAR TUDO */}
        {posts.some(p => p.status !== 'approved') && (
          <div className="card" style={{ marginBottom: 24, border: '2px solid #4F46E5' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>Aprovar todos os posts de uma vez</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{total - approved} posts pendentes</div>
              </div>
              <button className="btn btn-primary" onClick={approveAll} disabled={saving === 'all'}>
                {saving === 'all' ? 'Aprovando...' : '✓ Aprovar tudo'}
              </button>
            </div>
          </div>
        )}

        {/* POSTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post, i) => (
            <div key={post.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Post {i + 1} — {post.theme}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                    {post.scheduled_date} · {post.category}
                  </div>
                </div>
                <span className={`badge ${STATUS[post.status]?.badge || 'badge-gray'}`}>
                  {STATUS[post.status]?.label || post.status}
                </span>
              </div>
              <div className="card-body">
                {/* TEXTO DO POST */}
                {post.post_text && (
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', border: '1px solid var(--gray-200)' }}>
                    {post.post_text}
                  </div>
                )}

                {/* WHATSAPP */}
                {post.whatsapp_link && (
                  <div style={{ marginBottom: 16 }}>
                    <a href={post.whatsapp_link} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: 'white', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      💬 Enviar mensagem pelo WhatsApp
                    </a>
                  </div>
                )}

                {/* FEEDBACK */}
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Observação (opcional)</label>
                  <textarea className="form-textarea" rows={2}
                    placeholder="Escreva aqui se quiser pedir alguma alteração..."
                    value={feedbacks[post.id] || ''}
                    onChange={e => setFeedbacks(f => ({ ...f, [post.id]: e.target.value }))}
                    disabled={post.status === 'approved'}
                  />
                </div>

                {/* AÇÕES */}
                {post.status !== 'approved' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ background: '#22C55E' }}
                      onClick={() => approvePost(post.id)} disabled={saving === post.id}>
                      {saving === post.id ? '...' : '✓ Aprovar'}
                    </button>
                    <button className="btn btn-secondary"
                      onClick={() => requestChange(post.id)} disabled={saving === post.id}>
                      ✎ Pedir alteração
                    </button>
                  </div>
                )}
                {post.status === 'approved' && (
                  <div style={{ color: '#15803D', fontWeight: 600, fontSize: 13 }}>✓ Aprovado</div>
                )}
                {post.status === 'change_requested' && (
                  <div style={{ color: '#DC2626', fontWeight: 600, fontSize: 13 }}>✎ Alteração solicitada</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--gray-400)', fontSize: 12 }}>
          Powered by PostGMN AI
        </div>
      </div>
    </div>
  )
}
