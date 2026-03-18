import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { callClaude, buildWhatsAppLink, extractJSON } from '../lib/ai.js'
import ImageCreator from '../components/ImageCreator.jsx'

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_MAP = {
  draft:            { label: 'Rascunho',          badge: 'badge-gray',   color: '#9CA3AF' },
  rascunho:         { label: 'Rascunho',          badge: 'badge-gray',   color: '#9CA3AF' },
  in_review:        { label: 'Em revisão',         badge: 'badge-yellow', color: '#F59E0B' },
  revisão:          { label: 'Em revisão',         badge: 'badge-yellow', color: '#F59E0B' },
  pendente:         { label: 'Pendente',           badge: 'badge-yellow', color: '#F59E0B' },
  approved:         { label: 'Aprovado',           badge: 'badge-green',  color: '#22C55E' },
  aprovado:         { label: 'Aprovado',           badge: 'badge-green',  color: '#22C55E' },
  change_requested: { label: 'Alterar',            badge: 'badge-red',    color: '#EF4444' },
  publicado:        { label: 'Publicado',          badge: 'badge-purple', color: '#8B5CF6' },
}

const CATEGORIES = ['Educativo', 'Institucional', 'Promocional', 'Prova Social', 'Dica', 'Novidade', 'Sazonais', 'Produto/Serviço', 'Depoimento']

const CAT_COLORS = {
  'Educativo': '#4F46E5', 'Promocional': '#F59E0B', 'Institucional': '#22C55E',
  'Sazonais': '#EC4899', 'Produto/Serviço': '#06B6D4', 'Depoimento': '#8B5CF6',
  'Prova Social': '#8B5CF6', 'Dica': '#06B6D4', 'Novidade': '#F59E0B'
}

const IconCopy = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconCheck = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
const IconLink = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
const IconSpark = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>
const IconTrash = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
const IconEdit = () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
const IconWA = () => <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>

export default function PlanEditor() {
  const navigate = useNavigate()
  const { clientId, planId } = useParams()
  const [client, setClient] = useState(null)
  const [keywords, setKeywords] = useState([])
  const [services, setServices] = useState([])
  const [plan, setPlan] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingCalendar, setGeneratingCalendar] = useState(false)
  const [generatingPost, setGeneratingPost] = useState(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [savingPost, setSavingPost] = useState(false)
  const [aiError, setAiError] = useState('')
  const [approvalLink, setApprovalLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedField, setCopiedField] = useState('')

  useEffect(() => { loadData() }, [planId])

  async function loadData() {
    const [
      { data: c }, { data: p }, { data: ps },
      { data: kws }, { data: svcs }, { data: al },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('content_plans').select('*').eq('id', planId).single(),
      supabase.from('posts').select('*').eq('content_plan_id', planId).order('scheduled_date'),
      supabase.from('client_keywords').select('*').eq('client_id', clientId),
      supabase.from('client_services').select('*').eq('client_id', clientId).order('priority'),
      supabase.from('approval_links').select('token').eq('content_plan_id', planId).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
    ])
    setClient(c); setPlan(p); setPosts(ps || [])
    setKeywords(kws || []); setServices(svcs || [])
    if (al?.[0]) setApprovalLink(`${window.location.origin}/aprovar/${al[0].token}`)
    setLoading(false)
  }

  async function generateCalendar() {
    setGeneratingCalendar(true); setAiError('')
    try {
      const prompt = `Você é um estrategista de conteúdo para Google Meu Negócio no Brasil.
Objetivo: Montar um calendário mensal de postagens para um negócio local.
Dados do cliente:
- Empresa: ${client.company_name}
- Nicho: ${client.niche || 'não informado'}
- Cidade: ${client.city || 'não informada'}
- Público-alvo: ${client.target_audience || 'geral'}
- Tom de voz: ${client.tone_of_voice || 'profissional e acessível'}
- Serviços principais: ${services.map(s => s.name).join(', ') || 'não informado'}
- Objetivo do conteúdo: ${client.content_goal || 'gerar contato via WhatsApp'}
- Posts por semana: ${client.posts_per_week || 2}
- Temas prioritários: ${keywords.map(k => k.keyword).join(', ') || 'gerais'}
- CTA principal: ${client.main_cta || 'entre em contato pelo WhatsApp'}
- Mês: ${MONTHS[plan.month - 1]} ${plan.year}
Regras:
- Responder em PT-BR
- Distribuir temas de forma equilibrada ao longo do mês
- Variar entre conteúdo educativo, institucional, promocional e prova social
- Pensar em negócios locais e conversão para WhatsApp
- Gerar exatamente ${(client.posts_per_week || 2) * 4} posts
- Retornar SOMENTE o JSON, sem texto antes ou depois
Formato esperado (array JSON):
[{"week":1,"suggested_date":"${plan.year}-${String(plan.month).padStart(2,'0')}-05","theme":"Nome do tema","category":"Educativo","goal":"objetivo do post"}]`

      const text = await callClaude(prompt)
      const items = extractJSON(text)
      if (!Array.isArray(items)) throw new Error('Resposta da IA inválida. Tente novamente.')
      await supabase.from('posts').delete().eq('content_plan_id', planId)
      const { data } = await supabase.from('posts').insert(items.map(item => ({
        content_plan_id: planId, client_id: clientId,
        scheduled_date: item.suggested_date, week_of_month: item.week,
        theme: item.theme, category: item.category, internal_title: item.theme, status: 'rascunho',
      }))).select()
      setPosts(data || [])
    } catch(e) { setAiError(e.message) }
    finally { setGeneratingCalendar(false) }
  }

  async function generatePostContent(post) {
    setGeneratingPost(post.id); setAiError('')
    try {
      const [postText, waMsg] = await Promise.all([
        callClaude(`Você é um redator especialista em Google Meu Negócio.
Crie um texto de postagem em PT-BR para um negócio local.
Dados:
- Empresa: ${client.company_name}
- Nicho: ${client.niche || ''}
- Cidade: ${client.city || ''}
- Tema do post: ${post.theme}
- Categoria: ${post.category}
- Público-alvo: ${client.target_audience || ''}
- Tom de voz: ${client.tone_of_voice || 'profissional e acessível'}
- CTA principal: ${client.main_cta || 'entre em contato'}
- Serviços relacionados: ${services.map(s => s.name).join(', ')}
- Palavras-chave: ${keywords.map(k => k.keyword).join(', ')}
Regras: texto claro, natural, pensado para Google Meu Negócio, inclua CTA sutil para WhatsApp, máximo de 900 caracteres.
Retorne SOMENTE o JSON: {"internal_title":"","post_text":""}`),
        callClaude(`Crie uma mensagem curta de WhatsApp (máximo 3 linhas) como se fosse um cliente que viu o post no Google.
Empresa: ${client.company_name}, Tema: ${post.theme}, Serviço: ${services[0]?.name || client.niche || ''}, CTA: ${client.main_cta || 'entre em contato'}
Retorne SOMENTE o JSON: {"whatsapp_message":""}`)
      ])
      const textData = extractJSON(postText)
      const waData = extractJSON(waMsg)
      const waLink = client.whatsapp ? buildWhatsAppLink(client.whatsapp, waData?.whatsapp_message || '') : ''
      const updates = {
        internal_title: textData?.internal_title || post.theme,
        post_text: textData?.post_text || '',
        whatsapp_message: waData?.whatsapp_message || '',
        whatsapp_link: waLink, status: 'in_review',
      }
      await supabase.from('posts').update(updates).eq('id', post.id)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...updates } : p))
      if (selectedPost?.id === post.id) setSelectedPost(p => ({ ...p, ...updates }))
    } catch(e) { setAiError(e.message) }
    finally { setGeneratingPost(null) }
  }

  async function generateAllPosts() {
    setGeneratingAll(true); setAiError('')
    for (const post of posts.filter(p => !p.post_text)) {
      await generatePostContent(post)
    }
    setGeneratingAll(false)
  }

  async function savePost() {
    setSavingPost(true)
    const updates = {
      internal_title: editingPost.internal_title,
      post_text: editingPost.post_text,
      whatsapp_message: editingPost.whatsapp_message,
      scheduled_date: editingPost.scheduled_date,
      theme: editingPost.theme,
      category: editingPost.category,
      status: editingPost.status,
    }
    if (client.whatsapp && editingPost.whatsapp_message) {
      updates.whatsapp_link = buildWhatsAppLink(client.whatsapp, editingPost.whatsapp_message)
    }
    await supabase.from('posts').update(updates).eq('id', editingPost.id)
    setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...updates } : p))
    setSelectedPost({ ...editingPost, ...updates })
    setEditingPost(null); setSavingPost(false)
  }

  async function deletePost(id) {
    if (!confirm('Excluir este post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    if (selectedPost?.id === id) setSelectedPost(null)
  }

  async function updatePostStatus(postId, status) {
    await supabase.from('posts').update({ status }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
    if (selectedPost?.id === postId) setSelectedPost(p => ({ ...p, status }))
  }

  async function generateApprovalLink() {
    setGeneratingLink(true)
    const token = generateToken()
    const { data } = await supabase.from('approval_links').insert({
      content_plan_id: planId, client_id: clientId, token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    }).select().single()
    if (data) {
      const url = `${window.location.origin}/aprovar/${token}`
      setApprovalLink(url)
      copyToClipboard(url, 'link')
    }
    setGeneratingLink(false)
  }

  function copyToClipboard(text, field) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 2000)
  }

  async function updatePlanStatus(status) {
    await supabase.from('content_plans').update({ status }).eq('id', planId)
    setPlan(p => ({ ...p, status }))
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  const noApiKey = !import.meta.env.VITE_ANTHROPIC_KEY
  const withContent = posts.filter(p => p.post_text).length
  const progressPct = posts.length > 0 ? Math.round((withContent / posts.length) * 100) : 0
  const statusCounts = posts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* HEADER */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => navigate(`/clientes/${clientId}/planos`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18, padding: 0 }}>←</button>
            {client?.company_name} — {MONTHS[plan?.month - 1]} {plan?.year}
          </h1>
          <p>{posts.length} post{posts.length !== 1 ? 's' : ''} · {withContent} com conteúdo</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto', fontSize: 13 }} value={plan?.status}
            onChange={e => updatePlanStatus(e.target.value)}>
            <option value="draft">Rascunho</option>
            <option value="in_review">Em revisão</option>
            <option value="sent">Enviado</option>
            <option value="approved_partial">Aprovado parcial</option>
            <option value="approved_total">Aprovado total</option>
          </select>
          {posts.length === 0 && (
            <button className="btn btn-primary btn-sm" onClick={generateCalendar} disabled={generatingCalendar || noApiKey}>
              {generatingCalendar ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} />Gerando...</> : <><IconSpark /> Gerar calendário com IA</>}
            </button>
          )}
          {posts.length > 0 && posts.some(p => !p.post_text) && (
            <button className="btn btn-primary btn-sm" onClick={generateAllPosts} disabled={generatingAll || noApiKey}>
              {generatingAll ? <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} />Gerando {posts.filter(p => !p.post_text).length}...</> : <><IconSpark /> Gerar conteúdo ({posts.filter(p => !p.post_text).length} posts)</>}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={approvalLink ? () => copyToClipboard(approvalLink, 'link') : generateApprovalLink}
            disabled={generatingLink}>
            <IconLink />
            {generatingLink ? 'Gerando...' : approvalLink ? (copiedField === 'link' ? 'Copiado!' : 'Copiar link cliente') : 'Gerar link aprovação'}
          </button>
        </div>
      </div>

      {/* APPROVAL LINK BAR */}
      {approvalLink && (
        <div style={{ background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconLink />
          <span style={{ fontSize: 12, color: 'var(--primary)', flex: 1, wordBreak: 'break-all' }}>{approvalLink}</span>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => copyToClipboard(approvalLink, 'linkbar')}>
            {copiedField === 'linkbar' ? <><IconCheck /> Copiado</> : <><IconCopy /> Copiar</>}
          </button>
          <a href={approvalLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11, flexShrink: 0 }}>Abrir portal</a>
        </div>
      )}

      {/* PROGRESS + STATUS BAR */}
      {posts.length > 0 && (
        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>
              <span>Conteúdo gerado</span><span>{progressPct}%</span>
            </div>
            <div style={{ background: 'var(--gray-200)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#22C55E' : 'var(--primary)', height: '100%', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_MAP[status]?.color || '#9CA3AF' }} />
                <span style={{ color: 'var(--gray-500)' }}>{STATUS_MAP[status]?.label || status}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALERTS */}
      {noApiKey && (
        <div className="alert alert-error" style={{ margin: '12px 24px 0' }}>
          ⚠️ Configure <strong>VITE_ANTHROPIC_KEY</strong> nas variáveis de ambiente no Vercel para usar a geração com IA.
        </div>
      )}
      {aiError && (
        <div className="alert alert-error" style={{ margin: '12px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>❌ {aiError}</span>
          <button onClick={() => setAiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LISTA */}
        <div style={{ width: selectedPost ? 360 : '100%', borderRight: selectedPost ? '1px solid var(--gray-200)' : 'none', overflow: 'auto', padding: 20 }}>
          {posts.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗓️</div>
              <h3>Nenhum post ainda</h3>
              <p>Clique em "Gerar calendário com IA" para criar os posts do mês automaticamente.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {posts.map(post => {
                const st = STATUS_MAP[post.status] || STATUS_MAP.draft
                const catColor = CAT_COLORS[post.category] || '#6B7280'
                const isSelected = selectedPost?.id === post.id
                const isGenerating = generatingPost === post.id
                return (
                  <div key={post.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      borderLeft: `4px solid ${catColor}`,
                      outline: isSelected ? '2px solid var(--primary)' : 'none',
                      opacity: isGenerating ? 0.7 : 1,
                      transition: 'all 0.15s'
                    }}
                    onClick={() => { setSelectedPost(post); setEditingPost(null) }}>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>
                          {isGenerating && <span className="spinner" style={{ width: 10, height: 10, marginRight: 6 }} />}
                          {post.theme}
                        </div>
                        <span className={`badge ${st.badge}`} style={{ fontSize: 10, flexShrink: 0 }}>{st.label}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {post.scheduled_date ? new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'} · Sem. {post.week_of_month}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {post.category && <span style={{ fontSize: 10, background: `${catColor}20`, color: catColor, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{post.category}</span>}
                          {post.post_text
                            ? <span style={{ fontSize: 10, color: '#22C55E' }}>✓ texto</span>
                            : <button className="btn btn-secondary" style={{ fontSize: 10, padding: '2px 7px', lineHeight: 1.4 }}
                                onClick={e => { e.stopPropagation(); generatePostContent(post) }}
                                disabled={isGenerating || generatingAll || noApiKey}>
                                {isGenerating ? '...' : '✨ gerar'}
                              </button>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PAINEL DIREITO */}
        {selectedPost && (
          <div style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--gray-50)' }}>
            {editingPost ? (
              <PostEditor post={editingPost} onChange={setEditingPost} onSave={savePost} onCancel={() => setEditingPost(null)} saving={savingPost} client={client} />
            ) : (
              <PostViewer
                post={selectedPost}
                onEdit={() => setEditingPost({ ...selectedPost })}
                onDelete={() => deletePost(selectedPost.id)}
                onGenerate={() => generatePostContent(selectedPost)}
                onStatusChange={status => updatePostStatus(selectedPost.id, status)}
                generating={generatingPost === selectedPost.id}
                noApiKey={noApiKey}
                client={client}
                copiedField={copiedField}
                onCopy={copyToClipboard}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PostViewer({ post, onEdit, onDelete, onGenerate, onStatusChange, generating, noApiKey, client, copiedField, onCopy }) {
  const st = STATUS_MAP[post.status] || STATUS_MAP.draft

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{post.theme}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {post.category && <span style={{ fontSize: 11, background: `${CAT_COLORS[post.category] || '#6B7280'}20`, color: CAT_COLORS[post.category] || '#6B7280', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{post.category}</span>}
            <span className="badge badge-gray" style={{ fontSize: 11 }}>Semana {post.week_of_month}</span>
            {post.scheduled_date && <span className="badge badge-gray" style={{ fontSize: 11 }}>{new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={onEdit}><IconEdit /> Editar</button>
          <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={onDelete}><IconTrash /></button>
        </div>
      </div>

      {/* Status rápido */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-500)' }}>Status:</span>
          {[
            { v: 'rascunho', l: 'Rascunho' },
            { v: 'in_review', l: 'Em revisão' },
            { v: 'aprovado', l: 'Aprovado' },
            { v: 'publicado', l: 'Publicado' },
          ].map(s => (
            <button key={s.v} onClick={() => onStatusChange(s.v)} style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: post.status === s.v ? STATUS_MAP[s.v]?.color : 'var(--gray-100)',
              color: post.status === s.v ? 'white' : 'var(--gray-500)',
              transition: 'all 0.15s'
            }}>{s.l}</button>
          ))}
        </div>
      </div>

      {!post.post_text ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>Este post ainda não tem conteúdo gerado.</p>
            <button className="btn btn-primary" onClick={onGenerate} disabled={generating || noApiKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {generating ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Gerando...</> : <><IconSpark /> Gerar conteúdo com IA</>}
            </button>
          </div>
        </div>
      ) : (
        <>
          <Section title="📝 Texto do post" charCount={post.post_text.length} copied={copiedField === 'posttext'} onCopy={() => onCopy(post.post_text, 'posttext')}>
            <p style={{ fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--gray-700)' }}>{post.post_text}</p>
          </Section>

          {post.whatsapp_message && (
            <Section title="💬 Mensagem WhatsApp" copied={copiedField === 'wamsg'} onCopy={() => onCopy(post.whatsapp_message, 'wamsg')}>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--gray-700)' }}>{post.whatsapp_message}</p>
              {post.whatsapp_link && (
                <a href={post.whatsapp_link} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, background: '#25D366', color: 'white', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  <IconWA /> Testar link WhatsApp
                </a>
              )}
            </Section>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-secondary btn-sm" onClick={onGenerate} disabled={generating || noApiKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {generating ? <><span className="spinner" style={{ width: 12, height: 12 }} />Gerando...</> : <><IconSpark />Regenerar conteúdo</>}
            </button>
          </div>
        </>
      )}

      {/* Gerador de Criativos */}
      <ImageCreator post={post} client={client} />
    </div>
  )
}

function Section({ title, charCount, onCopy, copied, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-header" style={{ padding: '10px 16px' }}>
        <h3 style={{ fontSize: 13 }}>{title}{charCount !== undefined && <span style={{ color: 'var(--gray-400)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>{charCount} chars</span>}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onCopy} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
          {copied ? <><IconCheck />Copiado!</> : <><IconCopy />Copiar</>}
        </button>
      </div>
      <div className="card-body" style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function PostEditor({ post, onChange, onSave, onCancel, saving, client }) {
  const set = (field, value) => onChange(p => ({ ...p, [field]: value }))
  const waLink = client?.whatsapp && post.whatsapp_message ? buildWhatsAppLink(client.whatsapp, post.whatsapp_message) : ''

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Editar post</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Tema</label>
              <input className="form-input" value={post.theme || ''} onChange={e => set('theme', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={post.category || ''} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Data sugerida</label>
              <input className="form-input" type="date" value={post.scheduled_date || ''} onChange={e => set('scheduled_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={post.status || 'rascunho'} onChange={e => set('status', e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="in_review">Em revisão</option>
                <option value="aprovado">Aprovado</option>
                <option value="publicado">Publicado</option>
                <option value="change_requested">Alteração solicitada</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              Texto do post
              <span style={{ color: 'var(--gray-400)', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>{(post.post_text || '').length}/900</span>
            </label>
            <textarea className="form-textarea" rows={7} value={post.post_text || ''} onChange={e => set('post_text', e.target.value)} maxLength={900} placeholder="Texto do post para o Google Meu Negócio..." />
          </div>
          <div className="form-group">
            <label className="form-label">Mensagem WhatsApp</label>
            <textarea className="form-textarea" rows={3} value={post.whatsapp_message || ''} onChange={e => set('whatsapp_message', e.target.value)} placeholder="Mensagem que o cliente enviará pelo WhatsApp..." />
          </div>
          {waLink && (
            <div className="form-group">
              <label className="form-label">Link WhatsApp gerado</label>
              <div style={{ fontSize: 12, color: 'var(--primary)', wordBreak: 'break-all', background: 'var(--primary-light)', padding: '8px 12px', borderRadius: 6 }}>{waLink}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
