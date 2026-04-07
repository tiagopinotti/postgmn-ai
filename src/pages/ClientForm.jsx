import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { drawTemplateThumbnail, LAYOUTS } from '../lib/imageRenderer.js'

const TABS = ['Dados gerais', 'Estratégia', 'Guia visual', 'Serviços', 'Google Meu Negócio']

const DEFAULT_FORM = {
  company_name: '', contact_name: '', niche: '', city: '', phone: '',
  whatsapp: '', gbp_url: '', website: '', instagram: '', address: '',
  description: '', target_audience: '', tone_of_voice: 'profissional e acessível',
  main_cta: '', content_goal: '', posts_per_week: 2, is_active: true,
  opening_date: '', operating_hours: '', delivery_cities: '',
  has_restroom: 'Sim', has_accessibility: 'Sim', has_wheelchair_restroom: 'Sim',
}

export default function ClientForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [keywords, setKeywords] = useState([])
  const [kwInput, setKwInput] = useState('')
  const [services, setServices] = useState([])
  const [svcInput, setSvcInput] = useState('')
  const [visual, setVisual] = useState({ color_palette: [], visual_style: '', font_notes: '', notes: '' })
  const [colorInput, setColorInput] = useState('#4F46E5')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gmb, setGmb] = useState(null)
  const [gmbLoading, setGmbLoading] = useState(false)
  const [templates, setTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [tplSaving, setTplSaving] = useState(false)

  useEffect(() => {
    if (isEditing) loadClient()
  }, [id])

  useEffect(() => {
    if (isEditing && id && tab === 4) loadGmbStatus()
  }, [id, tab])

  async function loadGmbStatus() {
    setGmbLoading(true)
    try {
      // First check if connected and get locations
      const locRes = await fetch('https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: id })
      })
      const locData = await locRes.json()
      
      if (locData.error === 'Not connected') {
        setGmb({ connected: false })
        setGmbLoading(false)
        return
      }

      // If a location is already selected, fetch metrics too
      if (locData.current_location_id) {
        const metRes = await fetch('https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: id, month: new Date().getMonth() + 1, year: new Date().getFullYear() })
        })
        const metData = await metRes.json()
        setGmb({ ...metData, locations: locData.locations, google_email: locData.google_email })
      } else {
        setGmb({ connected: true, needs_location: true, locations: locData.locations || [], google_email: locData.google_email, debug_error: locData.debug_error })
      }
    } catch (e) {
      console.error('GMB load error', e)
    }
    setGmbLoading(false)
  }

  async function selectGmbLocation(loc) {
    setGmbLoading(true)
    await fetch('https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, action: 'select', location_id: loc.id, location_name: loc.title })
    })
    await loadGmbStatus()
  }

  async function connectGmb() {
    const res = await fetch(`https://ubcwcmtdgcmbqghlpuds.supabase.co/functions/v1/gmb-auth?client_id=${id}`)
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function disconnectGmb() {
    await supabase.from('gmb_connections').delete().eq('client_id', id)
    setGmb(null)
  }

  async function loadClient() {
    setLoading(true)
    const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
    if (client) {
      setForm({ ...DEFAULT_FORM, ...client })
      const [{ data: kws }, { data: svcs }, { data: vg }, { data: tpls }] = await Promise.all([
        supabase.from('client_keywords').select('*').eq('client_id', id),
        supabase.from('client_services').select('*').eq('client_id', id).order('priority'),
        supabase.from('client_visual_guidelines').select('*').eq('client_id', id).single(),
        supabase.from('post_templates').select('*').eq('client_id', id).order('sort_order'),
      ])
      setKeywords(kws || [])
      setServices(svcs || [])
      setTemplates(tpls || [])
      if (vg) setVisual({ color_palette: vg.color_palette || [], visual_style: vg.visual_style || '', font_notes: vg.font_notes || '', notes: vg.notes || '' })
    }
    setLoading(false)
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  async function handleSave() {
    setError('')
    if (!form.company_name.trim()) { setError('Nome da empresa é obrigatório.'); setTab(0); return }
    setSaving(true)
    try {
      let clientId = id
      if (!isEditing) {
        const { data, error: err } = await supabase.from('clients').insert({ ...form, user_id: user.id }).select().single()
        if (err) { setError(err.message); return }
        clientId = data.id
      } else {
        const { error: err } = await supabase.from('clients').update(form).eq('id', id)
        if (err) { setError(err.message); return }
      }

      // Keywords
      await supabase.from('client_keywords').delete().eq('client_id', clientId)
      if (keywords.length > 0) {
        await supabase.from('client_keywords').insert(keywords.map(k => ({ client_id: clientId, keyword: k.keyword || k })))
      }

      // Services
      await supabase.from('client_services').delete().eq('client_id', clientId)
      if (services.length > 0) {
        await supabase.from('client_services').insert(services.map((s, i) => ({ client_id: clientId, name: s.name || s, priority: i })))
      }

      // Visual guidelines
      const { data: existingVg } = await supabase.from('client_visual_guidelines').select('id').eq('client_id', clientId).single()
      const vgData = { client_id: clientId, ...visual }
      if (existingVg) {
        await supabase.from('client_visual_guidelines').update(vgData).eq('client_id', clientId)
      } else {
        await supabase.from('client_visual_guidelines').insert(vgData)
      }

      navigate('/clientes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    navigate('/clientes')
  }

  function addKeyword() {
    const kw = kwInput.trim()
    if (!kw) return
    setKeywords(prev => [...prev, { keyword: kw }])
    setKwInput('')
  }

  function removeKeyword(i) {
    setKeywords(prev => prev.filter((_, idx) => idx !== i))
  }

  function addService() {
    const svc = svcInput.trim()
    if (!svc) return
    setServices(prev => [...prev, { name: svc }])
    setSvcInput('')
  }

  function removeService(i) {
    setServices(prev => prev.filter((_, idx) => idx !== i))
  }

  function addColor() {
    if (!visual.color_palette.includes(colorInput)) {
      setVisual(v => ({ ...v, color_palette: [...v.color_palette, colorInput] }))
    }
  }

  function removeColor(c) {
    setVisual(v => ({ ...v, color_palette: v.color_palette.filter(x => x !== c) }))
  }

  // Template functions
  async function uploadFile(file, folder) {
    const ext = file.name.split('.').pop()
    const path = `${folder}/${id}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('template-assets').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('template-assets').getPublicUrl(path)
    return publicUrl
  }

  function openNewTemplate() {
    setEditingTemplate({ 
      name: '', layout: 'default', bg_color: '#4F46E5', text_color: '#1a1a1a', text_bg_color: '#FFFFFF', 
      font_size: 42, text_padding: 30, text_box_x: null, text_box_y: null,
      tags: [], is_default: false, _tagInput: '' 
    })
  }

  async function saveTemplate() {
    if (!editingTemplate?.name?.trim()) return
    setTplSaving(true)
    try {
      const payload = {
        client_id: id,
        name: editingTemplate.name,
        bg_color: editingTemplate.bg_color,
        bg_image_url: editingTemplate.bg_image_url || null,
        logo_url: editingTemplate.logo_url || null,
        text_color: editingTemplate.text_color,
        text_bg_color: editingTemplate.text_bg_color,
        tags: editingTemplate.tags || [],
        is_default: editingTemplate.is_default,
        sort_order: editingTemplate.sort_order || templates.length,
        layout: editingTemplate.layout || 'default',
        font_size: parseInt(editingTemplate.font_size) || 42,
        text_padding: parseInt(editingTemplate.text_padding) || 30,
        text_box_x: editingTemplate.text_box_x === null ? null : parseInt(editingTemplate.text_box_x),
        text_box_y: editingTemplate.text_box_y === null ? null : parseInt(editingTemplate.text_box_y)
      }
      if (editingTemplate.id) {
        await supabase.from('post_templates').update(payload).eq('id', editingTemplate.id)
      } else {
        await supabase.from('post_templates').insert(payload)
      }
      const { data } = await supabase.from('post_templates').select('*').eq('client_id', id).order('sort_order')
      setTemplates(data || [])
      setEditingTemplate(null)
    } catch (e) { setError(e.message) }
    setTplSaving(false)
  }

  async function deleteTemplate(tplId) {
    if (!confirm('Excluir este template?')) return
    await supabase.from('post_templates').delete().eq('id', tplId)
    setTemplates(prev => prev.filter(t => t.id !== tplId))
  }

  async function handleTemplateFileUpload(field, file) {
    try {
      const url = await uploadFile(file, field === 'logo_url' ? 'logos' : 'backgrounds')
      setEditingTemplate(prev => ({ ...prev, [field]: url }))
    } catch (e) { setError('Erro no upload: ' + e.message) }
  }

  // Template thumbnail component
  function TemplateThumbnail({ tpl }) {
    const ref = useRef(null)
    useEffect(() => { if (ref.current) drawTemplateThumbnail(ref.current, tpl) }, [tpl.bg_color, tpl.bg_image_url, tpl.logo_url, tpl.text_bg_color, tpl.text_color, tpl.layout, tpl.font_size, tpl.text_padding, tpl.text_box_x, tpl.text_box_y])
    return <canvas ref={ref} style={{ width: '100%', height: 'auto', borderRadius: 6 }} />
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Carregando...</span></div>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isEditing ? 'Editar cliente' : 'Novo cliente'}</h1>
          <p>{isEditing ? form.company_name : 'Preencha os dados do cliente'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditing && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Excluir</button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/clientes')}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab-btn${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* TAB 0: DADOS GERAIS */}
        {tab === 0 && (
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <div className="form-section-title"><span>🏢</span> Informações básicas</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nome da empresa <span>*</span></label>
                    <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Ex: Clínica Sorriso Perfeito" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Responsável</label>
                    <input className="form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Nome do contato" />
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Nicho</label>
                    <input className="form-input" value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Odontologia" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Ex: São Paulo - SP" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Posts por semana</label>
                    <select className="form-select" value={form.posts_per_week} onChange={e => set('posts_per_week', parseInt(e.target.value))}>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}x por semana</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp</label>
                    <input className="form-input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="5511999999999" />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title"><span>🔗</span> Links e redes sociais</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Link do Perfil GBP</label>
                    <input className="form-input" value={form.gbp_url} onChange={e => set('gbp_url', e.target.value)} placeholder="https://g.co/kgs/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Site</label>
                    <input className="form-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://seusite.com.br" />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Instagram</label>
                    <input className="form-input" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@usuario" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Endereço</label>
                    <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro" />
                  </div>
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title"><span>⏱️</span> Operação e Estrutura</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Data de abertura (Ano/Mês)</label>
                    <input className="form-input" value={form.opening_date || ''} onChange={e => set('opening_date', e.target.value)} placeholder="Ex: Março de 2010" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário de funcionamento</label>
                    <input className="form-input" value={form.operating_hours || ''} onChange={e => set('operating_hours', e.target.value)} placeholder="Ex: Seg a Sex, das 8h às 18h" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">A empresa entrega ou atende o cliente em casa?</label>
                  <input className="form-input" value={form.delivery_cities || ''} onChange={e => set('delivery_cities', e.target.value)} placeholder="Ex: Sim. Atendemos São Paulo e ABC..." />
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Tem banheiro pro cliente?</label>
                    <select className="form-select" value={form.has_restroom || 'Sim'} onChange={e => set('has_restroom', e.target.value)}>
                      <option>Sim</option><option>Não</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Entrada com acessibilidade?</label>
                    <select className="form-select" value={form.has_accessibility || 'Sim'} onChange={e => set('has_accessibility', e.target.value)}>
                      <option>Sim</option><option>Não</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Banheiro para cadeirantes?</label>
                    <select className="form-select" value={form.has_wheelchair_restroom || 'Sim'} onChange={e => set('has_wheelchair_restroom', e.target.value)}>
                      <option>Sim</option><option>Não</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title"><span>⚙️</span> Status</div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                    <span>Cliente ativo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ESTRATÉGIA */}
        {tab === 1 && (
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <div className="form-section-title"><span>🎯</span> Identidade e estratégia</div>
                <div className="form-group">
                  <label className="form-label">Descrição do negócio</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="O que a empresa faz, o que a diferencia..." rows={3} />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Público-alvo</label>
                    <input className="form-input" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder="Ex: Mães de 25 a 45 anos" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tom de voz</label>
                    <select className="form-select" value={form.tone_of_voice} onChange={e => set('tone_of_voice', e.target.value)}>
                      <option>profissional e acessível</option>
                      <option>descontraído e próximo</option>
                      <option>técnico e especialista</option>
                      <option>inspirador e motivador</option>
                      <option>formal e institucional</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">CTA principal</label>
                    <input className="form-input" value={form.main_cta} onChange={e => set('main_cta', e.target.value)} placeholder="Ex: Agende pelo WhatsApp" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Objetivo do conteúdo</label>
                    <input className="form-input" value={form.content_goal} onChange={e => set('content_goal', e.target.value)} placeholder="Ex: Gerar agendamentos" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title"><span>🔑</span> Palavras-chave</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="form-input" value={kwInput} onChange={e => setKwInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Digite e pressione Enter..." />
                  <button className="btn btn-secondary" onClick={addKeyword}>Adicionar</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {keywords.map((k, i) => (
                    <span key={i} className="badge badge-blue" style={{ gap: 6, padding: '4px 10px', fontSize: 12 }}>
                      {k.keyword || k}
                      <button onClick={() => removeKeyword(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                  {keywords.length === 0 && <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>Nenhuma palavra-chave adicionada.</span>}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title"><span>💡</span> Notas estratégicas do cliente</div>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 8 }}>
                  Cole aqui informações que o cliente enviar: promoções, eventos, novidades, datas especiais, ou qualquer contexto relevante. A IA vai usar isso na hora de gerar a estratégia e os posts.
                </p>
                <textarea className="form-textarea" value={form.strategy_notes || ''} onChange={e => set('strategy_notes', e.target.value)}
                  placeholder="Ex: Em maio teremos semana de portas abertas com aulas gratuitas. O cliente pediu foco em matrículas para o segundo semestre..."
                  rows={4} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUIA VISUAL */}
        {tab === 2 && (
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: '#EEF2FF', borderRadius: 8, marginBottom: 20, border: '1px solid #C7D2FE' }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div style={{ fontSize: 12, color: '#4338CA', lineHeight: 1.5 }}>
                  <strong>Como a IA usa essas informações:</strong> A paleta de cores, estilo visual, tipografia e observações são enviados para a IA ao gerar o calendário de conteúdo, textos dos posts e imagens. Quanto mais detalhado, mais personalizado será o resultado.
                </div>
              </div>
              <div className="form-section">
                <div className="form-section-title"><span>🎨</span> Paleta de cores</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                  <input type="color" value={colorInput} onChange={e => setColorInput(e.target.value)}
                    style={{ width: 48, height: 36, border: '1px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <input className="form-input" value={colorInput} onChange={e => setColorInput(e.target.value)} style={{ maxWidth: 120 }} />
                  <button className="btn btn-secondary" onClick={addColor}>+ Adicionar cor</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {(visual.color_palette || []).map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, background: c, borderRadius: 8, border: '2px solid var(--gray-200)', cursor: 'pointer', marginBottom: 4 }}
                        title={c} onClick={() => removeColor(c)} />
                      <div style={{ fontSize: 10, color: 'var(--gray-500)' }}>{c}</div>
                      <div style={{ fontSize: 10, color: 'var(--danger)', cursor: 'pointer' }} onClick={() => removeColor(c)}>remover</div>
                    </div>
                  ))}
                  {visual.color_palette?.length === 0 && <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>Nenhuma cor adicionada.</span>}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title"><span>✏️</span> Estilo e tipografia</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Estilo visual</label>
                    <select className="form-select" value={visual.visual_style} onChange={e => setVisual(v => ({ ...v, visual_style: e.target.value }))}>
                      <option value="">Selecione...</option>
                      <option>minimalista</option>
                      <option>moderno</option>
                      <option>clean e profissional</option>
                      <option>colorido e vibrante</option>
                      <option>elegante e sofisticado</option>
                      <option>rústico e artesanal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notas de tipografia</label>
                    <input className="form-input" value={visual.font_notes} onChange={e => setVisual(v => ({ ...v, font_notes: e.target.value }))} placeholder="Ex: fontes sem serifa, bold nos títulos" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observações gerais do guia</label>
                  <textarea className="form-textarea" value={visual.notes} onChange={e => setVisual(v => ({ ...v, notes: e.target.value }))} placeholder="Evitar X, sempre incluir Y, estilo de referência..." rows={3} />
                </div>
              </div>

              {/* TEMPLATE MANAGER */}
              {isEditing && (
                <div className="form-section">
                  <div className="form-section-title"><span>🖼️</span> Templates de Post</div>
                  <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>
                    Crie variações de arte para cada serviço ou tipo de post. A IA vai selecionar automaticamente o template certo ao gerar o calendário.
                  </p>

                  {/* Template Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ border: '2px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                        onClick={() => setEditingTemplate({ ...t, _tagInput: '' })}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}>
                        <TemplateThumbnail tpl={t} />
                        <div style={{ padding: '8px 10px', background: 'white', borderTop: '1px solid var(--gray-100)' }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{t.name}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {(t.tags || []).map((tag, i) => (
                              <span key={i} style={{ fontSize: 9, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4 }}>{tag}</span>
                            ))}
                          </div>
                          {t.is_default && <span style={{ fontSize: 9, color: '#22C55E', fontWeight: 600 }}>★ Padrão</span>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}

                    {/* Add button */}
                    <div onClick={openNewTemplate}
                      style={{ border: '2px dashed var(--gray-300)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, cursor: 'pointer', transition: 'all 0.2s', color: 'var(--gray-400)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.color = 'var(--gray-400)' }}>
                      <div style={{ fontSize: 28 }}>+</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Novo Template</div>
                    </div>
                  </div>

                  {/* Template Edit Modal */}
                  {editingTemplate && (
                    <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 20, border: '1px solid var(--gray-200)', marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700 }}>{editingTemplate.id ? '✏️ Editar Template' : '➕ Novo Template'}</h4>
                        <button onClick={() => setEditingTemplate(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--gray-400)' }}>×</button>
                      </div>

                      <div className="form-grid-2">
                        {/* Left: Form */}
                        <div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                              <label className="form-label">Nome do template *</label>
                              <input className="form-input" value={editingTemplate.name} onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
                                placeholder="Ex: Curso de Inglês, Promoção, Comunicado" />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div className="form-group">
                                <label className="form-label">Layout</label>
                                <select className="form-select" value={editingTemplate.layout || 'default'} onChange={e => setEditingTemplate(p => ({ ...p, layout: e.target.value }))}>
                                  <option value="default">960x720 (Texto no Topo)</option>
                                  <option value="left">960x720 (Texto na Esquerda)</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label className="form-label">Tam. Fonte: <strong>{editingTemplate.font_size || 42}</strong></label>
                                <input type="range" min="20" max="100" step="1" value={editingTemplate.font_size || 42} onChange={e => setEditingTemplate(p => ({ ...p, font_size: e.target.value }))} style={{ width: '100%', marginTop: 8 }} />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
                            <div className="form-group">
                              <label className="form-label">Posição Horizontal (X): <strong>{editingTemplate.text_box_x ?? 'Auto'}</strong></label>
                              <input type="range" min="0" max="1000" step="5" value={editingTemplate.text_box_x ?? LAYOUTS[editingTemplate.layout || 'default'].textBox.x} onChange={e => setEditingTemplate(p => ({ ...p, text_box_x: parseInt(e.target.value) }))} style={{ width: '100%' }} />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Posição Vertical (Y): <strong>{editingTemplate.text_box_y ?? 'Auto'}</strong></label>
                              <input type="range" min="0" max="1000" step="5" value={editingTemplate.text_box_y ?? LAYOUTS[editingTemplate.layout || 'default'].textBox.y} onChange={e => setEditingTemplate(p => ({ ...p, text_box_y: parseInt(e.target.value) }))} style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                              <label className="form-label">Padding (Espaçamento Interno): <strong>{editingTemplate.text_padding || 30}px</strong></label>
                              <input type="range" min="0" max="150" step="2" value={editingTemplate.text_padding || 30} onChange={e => setEditingTemplate(p => ({ ...p, text_padding: parseInt(e.target.value) }))} style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>Cor de fundo</label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input type="color" value={editingTemplate.bg_color} onChange={e => setEditingTemplate(p => ({ ...p, bg_color: e.target.value }))}
                                  style={{ width: 36, height: 32, border: '1px solid var(--gray-200)', borderRadius: 4, cursor: 'pointer', padding: 1 }} />
                                <input className="form-input" value={editingTemplate.bg_color} onChange={e => setEditingTemplate(p => ({ ...p, bg_color: e.target.value }))} style={{ fontSize: 11 }} />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>Cor do texto</label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input type="color" value={editingTemplate.text_color} onChange={e => setEditingTemplate(p => ({ ...p, text_color: e.target.value }))}
                                  style={{ width: 36, height: 32, border: '1px solid var(--gray-200)', borderRadius: 4, cursor: 'pointer', padding: 1 }} />
                                <input className="form-input" value={editingTemplate.text_color} onChange={e => setEditingTemplate(p => ({ ...p, text_color: e.target.value }))} style={{ fontSize: 11 }} />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>Fundo do texto</label>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input type="color" value={editingTemplate.text_bg_color?.slice(0, 7) || '#FFFFFF'} onChange={e => setEditingTemplate(p => ({ ...p, text_bg_color: e.target.value + 'EE' }))}
                                  style={{ width: 36, height: 32, border: '1px solid var(--gray-200)', borderRadius: 4, cursor: 'pointer', padding: 1 }} />
                                <input className="form-input" value={editingTemplate.text_bg_color} onChange={e => setEditingTemplate(p => ({ ...p, text_bg_color: e.target.value }))} style={{ fontSize: 11 }} />
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>Logo (PNG transparente)</label>
                              <input type="file" accept="image/*" onChange={e => e.target.files[0] && handleTemplateFileUpload('logo_url', e.target.files[0])}
                                style={{ fontSize: 11, width: '100%' }} />
                              {editingTemplate.logo_url && <img src={editingTemplate.logo_url} alt="Logo" style={{ height: 30, marginTop: 4, objectFit: 'contain' }} />}
                            </div>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: 11 }}>Imagem de fundo</label>
                              <input type="file" accept="image/*" onChange={e => e.target.files[0] && handleTemplateFileUpload('bg_image_url', e.target.files[0])}
                                style={{ fontSize: 11, width: '100%' }} />
                              {editingTemplate.bg_image_url && <img src={editingTemplate.bg_image_url} alt="BG" style={{ height: 30, marginTop: 4, objectFit: 'cover', borderRadius: 4 }} />}
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11 }}>Tags (para IA selecionar automaticamente)</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input className="form-input" value={editingTemplate._tagInput || ''} onChange={e => setEditingTemplate(p => ({ ...p, _tagInput: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editingTemplate._tagInput?.trim(); if (v) setEditingTemplate(p => ({ ...p, tags: [...(p.tags || []), v], _tagInput: '' })) } }}
                                placeholder="Ex: inglês, english, idiomas" style={{ fontSize: 12 }} />
                              <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => { const v = editingTemplate._tagInput?.trim(); if (v) setEditingTemplate(p => ({ ...p, tags: [...(p.tags || []), v], _tagInput: '' })) }}>+</button>
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                              {(editingTemplate.tags || []).map((tag, i) => (
                                <span key={i} className="badge badge-blue" style={{ fontSize: 10, gap: 4, padding: '2px 8px' }}>
                                  {tag}
                                  <button onClick={() => setEditingTemplate(p => ({ ...p, tags: p.tags.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 11 }}>×</button>
                                </span>
                              ))}
                            </div>
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                            <input type="checkbox" checked={editingTemplate.is_default} onChange={e => setEditingTemplate(p => ({ ...p, is_default: e.target.checked }))} />
                            Usar como template padrão
                          </label>
                        </div>

                        {/* Right: Preview */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>Preview</div>
                          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
                            <TemplateThumbnail tpl={editingTemplate} />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button className="btn btn-primary btn-sm" onClick={saveTemplate} disabled={tplSaving || !editingTemplate.name?.trim()}>
                          {tplSaving ? 'Salvando...' : editingTemplate.id ? 'Salvar alterações' : 'Criar template'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingTemplate(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SERVIÇOS */}
        {tab === 3 && (
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <div className="form-section-title"><span>📋</span> Serviços e produtos</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input className="form-input" value={svcInput} onChange={e => setSvcInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addService())}
                    placeholder="Nome do serviço ou produto..." />
                  <button className="btn btn-secondary" onClick={addService}>Adicionar</button>
                </div>
                {services.length === 0 ? (
                  <div style={{ color: 'var(--gray-400)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                    Nenhum serviço cadastrado ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 6, border: '1px solid var(--gray-200)' }}>
                        <span style={{ flex: 1, fontWeight: 500 }}>{s.name || s}</span>
                        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>#{i + 1}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => removeService(i)} style={{ color: 'var(--danger)' }}>Remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Aba 4: Google Meu Negócio ── */}
        {tab === 4 && isEditing && (
          <div className="card">
            <div className="card-header">
              <h3>📍 Google Meu Negócio</h3>
            </div>
            <div className="card-body">
              {gmbLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: 'var(--gray-400)' }}>Carregando dados do GMB...</div>
                </div>
              ) : !gmb?.connected ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
                  <h3 style={{ marginBottom: 8 }}>Conectar Perfil do Google</h3>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                    Vincule a conta do Google Meu Negócio deste cliente para puxar métricas de desempenho automaticamente.
                  </p>
                  <button className="btn btn-primary" onClick={connectGmb} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Conectar com Google
                  </button>
                </div>
              ) : gmb?.needs_location ? (
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Escolha o Perfil</h3>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                        Conta conectada: <strong>{gmb.google_email}</strong>
                      </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444', fontSize: 11 }} onClick={disconnectGmb}>Desconectar</button>
                  </div>
                  {gmb.locations?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: 'var(--gray-400)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>😔</div>
                      <div>Nenhum perfil do Google Meu Negócio encontrado nesta conta.</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Verifique se a conta Google conectada é a administradora do perfil GMB.</div>
                      {gmb.debug_error && <div style={{ fontSize: 11, marginTop: 8, color: '#EF4444', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>Erro da API: {gmb.debug_error}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {gmb.locations.map((loc) => (
                        <button key={loc.id} onClick={() => selectGmbLocation(loc)} style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                          background: 'var(--gray-50)', border: '2px solid var(--gray-200)', borderRadius: 10,
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%'
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.background = '#EEF2FF' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'var(--gray-50)' }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#4F46E5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                            📍
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{loc.title}</div>
                            {loc.address && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{loc.address}</div>}
                            {loc.account_name && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>Conta: {loc.account_name}</div>}
                          </div>
                          <span style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>Selecionar →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Connection Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>✅ Conectado</div>
                      {gmb.location_name && <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{gmb.location_name}</div>}
                      {gmb.google_email && <div style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>{gmb.google_email}</div>}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#EF4444', fontSize: 11 }} onClick={disconnectGmb}>Desconectar</button>
                  </div>

                  {/* Metrics Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Total Interações', value: gmb.total_interactions || 0, color: '#4F46E5', icon: '📊' },
                      { label: 'Cliques no Site', value: gmb.website_clicks || 0, color: '#22C55E', icon: '🌐' },
                      { label: 'Chamadas', value: gmb.call_clicks || 0, color: '#F59E0B', icon: '📞' },
                      { label: 'Orientações', value: gmb.direction_requests || 0, color: '#06B6D4', icon: '🧭' },
                      { label: 'Mensagens', value: gmb.conversations || 0, color: '#8B5CF6', icon: '💬' },
                      { label: 'Agendamentos', value: gmb.bookings || 0, color: '#EC4899', icon: '📅' },
                    ].map((m, i) => (
                      <div key={i} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 8, borderLeft: `3px solid ${m.color}` }}>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4 }}>{m.icon} {m.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Impressions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '14px 16px', background: '#EEF2FF', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#4338CA', fontWeight: 500 }}>🔍 Impressões na Busca</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#4338CA', marginTop: 4 }}>{(gmb.impressions_search || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '14px 16px', background: '#FEF3C7', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>🗺️ Impressões no Maps</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#92400E', marginTop: 4 }}>{(gmb.impressions_maps || 0).toLocaleString()}</div>
                    </div>
                  </div>

                  {gmb.error && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: '#FEF2F2', borderRadius: 8, color: '#991B1B', fontSize: 13 }}>
                      ⚠️ {gmb.error}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {tab === 4 && !isEditing && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
              Salve o cliente primeiro para poder conectar o Google Meu Negócio.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}>← Anterior</button>
          {tab < TABS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setTab(t => t + 1)}>Próximo →</button>
          ) : tab === 4 ? null : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : '✓ Salvar cliente'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
