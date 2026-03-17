import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'

const IconUser = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconLock = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const IconCheck = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>

export default function Settings() {
  const { user } = useAuth()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState({ name: '', agency_name: '', phone: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('name, agency_name, phone').eq('id', user.id).single()
      if (data) setProfile({ name: data.name || '', agency_name: data.agency_name || '', phone: data.phone || '' })
    }
    load()
  }, [user])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('users').update({
      name: profile.name,
      agency_name: profile.agency_name,
      phone: profile.phone,
      updated_at: new Date().toISOString()
    }).eq('id', user.id)
    setSaving(false)
    if (err) setError('Erro ao salvar: ' + err.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwError('')
    if (passwords.new !== passwords.confirm) { setPwError('As senhas não coincidem.'); return }
    if (passwords.new.length < 6) { setPwError('A nova senha deve ter pelo menos 6 caracteres.'); return }
    setPwSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password: passwords.new })
    setPwSaving(false)
    if (err) setPwError('Erro: ' + err.message)
    else { setPwSaved(true); setPasswords({ current: '', new: '', confirm: '' }); setTimeout(() => setPwSaved(false), 3000) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie seu perfil e preferências da conta</p>
        </div>
      </div>
      <div className="page-body" style={{ maxWidth: 680 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--gray-200)', paddingBottom: 0 }}>
          {[
            { id: 'profile', label: 'Perfil', icon: <IconUser /> },
            { id: 'security', label: 'Segurança', icon: <IconLock /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, color: tab === t.id ? 'var(--primary)' : 'var(--gray-500)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 14, transition: 'all 0.15s'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Perfil */}
        {tab === 'profile' && (
          <div className="card">
            <div className="card-header">
              <h3>Informações do Perfil</h3>
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{user?.email}</span>
            </div>
            <div className="card-body">
              <form onSubmit={saveProfile}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nome completo</label>
                    <input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone / WhatsApp</label>
                    <input className="form-input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+55 11 99999-9999" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nome da Agência</label>
                  <input className="form-input" value={profile.agency_name} onChange={e => setProfile(p => ({ ...p, agency_name: e.target.value }))} placeholder="Ex: Agência Digital X" />
                </div>

                {/* Email (read-only) */}
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--gray-50)', color: 'var(--gray-400)', cursor: 'not-allowed' }} />
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>O e-mail não pode ser alterado por aqui.</div>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  {saved && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22C55E', fontSize: 13, fontWeight: 500 }}>
                      <IconCheck /> Salvo com sucesso!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Segurança */}
        {tab === 'security' && (
          <div className="card">
            <div className="card-header">
              <h3>Alterar Senha</h3>
            </div>
            <div className="card-body">
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label className="form-label">Nova senha <span>*</span></label>
                  <input type="password" className="form-input" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Mínimo 6 caracteres" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar nova senha <span>*</span></label>
                  <input type="password" className="form-input" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repita a nova senha" required />
                </div>

                {/* Strength indicator */}
                {passwords.new && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Força da senha:</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4].map(i => {
                        const strength = passwords.new.length >= 12 && /[A-Z]/.test(passwords.new) && /[0-9]/.test(passwords.new) && /[^A-Za-z0-9]/.test(passwords.new) ? 4
                          : passwords.new.length >= 8 && /[A-Z]/.test(passwords.new) && /[0-9]/.test(passwords.new) ? 3
                          : passwords.new.length >= 6 ? 2 : 1
                        const color = strength >= 3 ? '#22C55E' : strength === 2 ? '#F59E0B' : '#EF4444'
                        return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? color : 'var(--gray-200)', transition: 'background 0.2s' }} />
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                      {passwords.new.length < 6 ? 'Muito curta' : passwords.new.length < 8 ? 'Fraca' : passwords.new.length >= 12 && /[A-Z]/.test(passwords.new) ? 'Forte' : 'Média'}
                    </div>
                  </div>
                )}

                {pwError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{pwError}</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                    {pwSaving ? 'Alterando...' : 'Alterar senha'}
                  </button>
                  {pwSaved && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#22C55E', fontSize: 13, fontWeight: 500 }}>
                      <IconCheck /> Senha alterada!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Info da conta */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Informações da Conta</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Plano', value: 'Profissional' },
                { label: 'Status', value: 'Ativo', color: '#22C55E' },
                { label: 'Membro desde', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—' },
                { label: 'Último acesso', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: item.color || 'var(--gray-900)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
