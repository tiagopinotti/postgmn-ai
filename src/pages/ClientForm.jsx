import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const TABS = ['Dados gerais', 'Estratégia', 'Guia visual', 'Serviços']

const DEFAULT_FORM = {
  company_name: '', contact_name: '', niche: '', city: '', phone: '',
  whatsapp: '', gbp_url: '', website: '', instagram: '', address: '',
  description: '', target_audience: '', tone_of_voice: 'profissional e acessível',
  main_cta: '', content_goal: '', posts_per_week: 2, is_active: true,
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

  useEffect(() => {
    if (isEditing) loadClient()
  }, [id])

  async function loadClient() {
    setLoading(true)
    const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
    if (client) {
      setForm({ ...DEFAULT_FORM, ...client })
      const [{ data: kws }, { data: svcs }, { data: vg }] = await Promise.all([
        supabase.from('client_keywords').select('*').eq('client_id', id),
        supabase.from('client_services').select('*').eq('client_id', id).order('priority'),
        supabase.from('client_visual_guidelines').select('*').eq('client_id', id).single(),
      ])
      setKeywords(kws || [])
      setServices(svcs || [])
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
            </div>
          </div>
        )}

        {/* TAB 2: GUIA VISUAL */}
        {tab === 2 && (
          <div className="card">
            <div className="card-body">
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}>← Anterior</button>
          {tab < TABS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setTab(t => t + 1)}>Próximo →</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : '✓ Salvar cliente'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
