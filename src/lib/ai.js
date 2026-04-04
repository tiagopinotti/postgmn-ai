// Utilitário para chamadas a diferentes IAs
// Chaves no .env: VITE_ANTHROPIC_KEY, VITE_GOOGLE_AI_KEY, VITE_OPENAI_KEY

export async function callClaude(prompt, model = 'claude-3-5-sonnet-20250219') {
  const key = localStorage.getItem('API_KEY_CLAUDE') || import.meta.env.VITE_ANTHROPIC_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_KEY não configurada')
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Erro Anthropic: ${res.status}`)
    }

    const data = await res.json()
    return data.content[0].text
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Falha de conexão com a Anthropic (Claude). Verifique sua internet ou tente novamente em instantes.')
    }
    throw error
  }
}

export async function callGemini(prompt, model = 'gemini-2.0-flash') {
  const key = localStorage.getItem('API_KEY_GEMINI') || import.meta.env.VITE_GOOGLE_AI_KEY
  if (!key) throw new Error('VITE_GOOGLE_AI_KEY não configurada')

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Erro Gemini: ${res.status}`)
    }

    const data = await res.json()
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Falha de conexão com o Google Gemini. Verifique se sua chave de API é válida e se você tem acesso ao serviço.')
    }
    throw error
  }
}

export async function callOpenAI(prompt, model = 'gpt-4o-mini') {
  const key = localStorage.getItem('API_KEY_OPENAI') || import.meta.env.VITE_OPENAI_KEY
  if (!key) throw new Error('VITE_OPENAI_KEY não configurada')

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Erro OpenAI: ${res.status}`)
    }

    const data = await res.json()
    return data.choices[0].message.content
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Falha de conexão com a OpenAI. Verifique se seu saldo na plataforma está ativo ou se há bloqueios de rede.')
    }
    throw error
  }
}

export async function callAI(prompt, provider = 'claude', model) {
  if (provider === 'gemini') return callGemini(prompt, model)
  if (provider === 'openai') return callOpenAI(prompt, model)
  return callClaude(prompt, model)
}

export function buildWhatsAppLink(phone, message) {
  const cleaned = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

export function extractJSON(text) {
  try {
    const match = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
    if (match) return JSON.parse(match[1] || match[0])
    return JSON.parse(text)
  } catch {
    return null
  }
}
