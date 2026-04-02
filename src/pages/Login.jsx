import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password)
        if (error) { setError(error.message); return }
        navigate('/dashboard')
      } else if (tab === 'forgot') {
        const { error } = await resetPassword(email)
        if (error) { setError(error.message); return }
        setSuccess('Enviamos um link de recuperação para o seu e-mail!')
      } else {
        if (!name.trim()) { setError('Informe seu nome.'); return }
        const { error } = await signUp(email, password, name)
        if (error) { setError(error.message); return }
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>PostGMN AI</h1>
          <p>Gestão inteligente do Google Meu Negócio</p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Entrar</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Criar conta</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Nome <span>*</span></label>
              <input className="form-input" type="text" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">E-mail <span>*</span></label>
            <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          
          {tab !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Senha <span>*</span></label>
              <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar' : tab === 'forgot' ? 'Enviar recuperação' : 'Criar conta'}
          </button>

          {tab === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setTab('forgot')}
                style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          {tab === 'forgot' && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer', fontSize: '0.9rem' }} 
                onClick={() => setTab('login')}
              >
                Voltar ao login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
