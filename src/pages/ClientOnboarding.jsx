import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ClientOnboarding() {
  const { userId } = useParams()
  const [form, setForm] = useState({
    companyName: '',
    niche: '',
    descriptionText: '',
    openingDate: '',
    phone: '',
    whatsapp: '',
    website: '',
    deliveryCities: '',
    operatingHours: '',
    hasRestroom: 'Sim',
    hasAccessibility: 'Sim',
    hasWheelchairRestroom: 'Sim'
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!form.companyName || !form.niche || !form.descriptionText) {
      setError('Por favor, preencha os campos obrigatórios (*).')
      setLoading(false)
      return
    }

    const finalDescription = `[Descrição]
${form.descriptionText}

[Informações Adicionais]
- Data de abertura: ${form.openingDate || 'Não informado'}
- Entrega / Atende em casa: ${form.deliveryCities || 'Não'}
- Horário de funcionamento: ${form.operatingHours || 'Não informado'}
- Banheiro para clientes: ${form.hasRestroom}
- Entrada com acessibilidade: ${form.hasAccessibility}
- Banheiro p/ cadeira de rodas: ${form.hasWheelchairRestroom}`

    const { error: err } = await supabase.from('clients').insert({
      user_id: userId,
      company_name: form.companyName,
      niche: form.niche,
      description: form.descriptionText,
      phone: form.phone,
      whatsapp: form.whatsapp,
      website: form.website,
      target_audience: '',
      tone_of_voice: 'profissional e acessível',
      posts_per_week: 2,
      is_active: true,
      opening_date: form.openingDate,
      operating_hours: form.operatingHours,
      delivery_cities: form.deliveryCities,
      has_restroom: form.hasRestroom,
      has_accessibility: form.hasAccessibility,
      has_wheelchair_restroom: form.hasWheelchairRestroom
    })

    if (err) {
      setError('Ocorreu um erro ao enviar seus dados. Tente novamente ou contate sua agência.')
      console.error(err)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%', background: 'white', borderRadius: 16, padding: '40px 32px', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>Cadastro Recebido!</h2>
          <p style={{ color: '#4B5563', fontSize: 16, lineHeight: 1.6 }}>Seus dados foram enviados com sucesso para a nossa plataforma. A equipe já foi notificada e dará andamento na configuração do seu perfil.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', background: 'white', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', padding: '40px 32px', color: 'white', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Informações do Perfil</h1>
          <p style={{ fontSize: 16, opacity: 0.9 }}>Precisamos de alguns detalhes sobre o seu negócio para configurarmos corretamente a sua estratégia na plataforma.</p>
        </div>

        <div style={{ padding: '32px' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-section-title" style={{ marginTop: 0 }}><span>🏢</span> Dados da Empresa</div>
            
            <div className="form-group">
              <label className="form-label">Nome da Unidade *</label>
              <input className="form-input" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Como sua empresa se chama..." required />
            </div>

            <div className="form-group">
              <label className="form-label">Qual a atividade principal da empresa? *</label>
              <input className="form-input" value={form.niche} onChange={e => set('niche', e.target.value)} placeholder="Ex: Odontologia, Restaurante..." required />
            </div>

            <div className="form-group">
              <label className="form-label">Descrição da empresa *</label>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
                História, diferenciais, produtos ou serviços principais...
              </div>
              <textarea className="form-textarea" rows={5} value={form.descriptionText} onChange={e => set('descriptionText', e.target.value)} required />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 9999-9999" />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp</label>
                <input className="form-input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="5511999999999" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Site (se tiver)</label>
              <input className="form-input" type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-section-title" style={{ marginTop: 32 }}><span>⏱️</span> Operação e Estrutura</div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Data de abertura (Ano/Mês)</label>
                <input className="form-input" value={form.openingDate} onChange={e => set('openingDate', e.target.value)} placeholder="Ex: Março de 2010" />
              </div>
              <div className="form-group">
                <label className="form-label">Horário de funcionamento</label>
                <input className="form-input" value={form.operatingHours} onChange={e => set('operatingHours', e.target.value)} placeholder="Ex: Seg a Sex, das 8h às 18h" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">A empresa entrega ou atende o cliente em casa?</label>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Se sim, liste as cidades ou bairros.</div>
              <input className="form-input" value={form.deliveryCities} onChange={e => set('deliveryCities', e.target.value)} placeholder="Ex: Sim. Atendemos São Paulo e ABC..." />
            </div>

            <div className="form-grid-3" style={{ marginTop: 24 }}>
              <div className="form-group">
                <label className="form-label">Tem banheiro pro cliente?</label>
                <select className="form-select" value={form.hasRestroom} onChange={e => set('hasRestroom', e.target.value)}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tem entrada com acessibilidade?</label>
                <select className="form-select" value={form.hasAccessibility} onChange={e => set('hasAccessibility', e.target.value)}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Banheiro para cadeira de rodas?</label>
                <select className="form-select" value={form.hasWheelchairRestroom} onChange={e => set('hasWheelchairRestroom', e.target.value)}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 40 }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16 }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Informações'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--gray-400)', marginTop: 16 }}>
                Seus dados serão gravados de forma segura na plataforma.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
