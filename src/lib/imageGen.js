// Utilitário para geração de imagens via IA (Freepik / OpenAI / Gemini)
// Chave no .env: VITE_GOOGLE_AI_KEY ou VITE_FAL_KEY

export async function generateAIImage(prompt, options = {}) {
  const { 
    aspect_ratio = '1:1', 
    bizName = '',
    theme = '',
    provider = 'openai',
    rawPrompt = false
  } = options

  const fullPrompt = rawPrompt ? prompt : `Fotografia hiper realista e comercial para a empresa "${bizName}". Assunto da imagem: ${theme}. Iluminação de estúdio limpa, grande profundidade de campo, cores vibrantes com alto contraste. Deixe um espaço superior bem vazio e liso para a inserção de textos de marketing posteriormente.`

  if (provider === 'freepik') {
    const key = localStorage.getItem('API_KEY_FREEPIK') || import.meta.env.VITE_FREEPIK_KEY
    if (!key) throw new Error('Chave da Freepik não configurada. Configure na engrenagem ⚙️')

    try {
      const targetUrl = 'https://api.freepik.com/v1/ai/text-to-image'
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-freepik-api-key': key
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          guidance_scale: 2,
          seed: Math.floor(Math.random() * 99999),
          num_images: 1,
          image: {
            size: aspect_ratio === '1:1' ? 'square_1_1' : 'landscape_4_3'
          }
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Erro Freepik: ${res.status}`)
      }

      const data = await res.json()
      return `data:image/png;base64,${data.data[0].base64}`
    } catch(error) {
      console.error('Image Gen Error Freepik:', error)
      throw error
    }
  } else if (provider === 'gemini') {
    const key = localStorage.getItem('API_KEY_GEMINI') || import.meta.env.VITE_GOOGLE_AI_KEY
    if (!key) throw new Error('Chave do Google não configurada na área de Configurações de API.')

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: { sampleCount: 1, aspectRatio: aspect_ratio === '1:1' ? '1:1' : '4:3' }
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || ''
        if (msg.includes('is not found') || msg.includes('not supported for predict')) {
           throw new Error('O Google bloqueia a geração de imagens (Imagen 3) para contas no Brasil via AI Studio (Mesmo pagas). Por favor, use a chave da OpenAI (DALL-E 3) para gerar as artes.')
        }
        throw new Error(msg || `Erro Imagen (Gemini): ${res.status}`)
      }

      const data = await res.json()
      return `data:image/png;base64,${data.predictions[0].bytesBase64}`
    } catch (error) {
      console.error('Image Gen Error Gemini:', error)
      throw error
    }
  } else {
    // DALL-E 3 fallback (OpenAI)
    const key = localStorage.getItem('API_KEY_OPENAI') || import.meta.env.VITE_OPENAI_KEY
    if (!key) throw new Error('Para gerar imagens é necessário configurar a chave da OpenAI (DALL-E 3) na engrenagem ⚙️ (mesmo se estiver usando Claude/Gemini pro texto).')

    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: fullPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro DALL-E: ${res.status}`)
      }

      const data = await res.json()
      return `data:image/png;base64,${data.data[0].b64_json}`
    } catch(error) {
      console.error('Image Gen Error DALL-E:', error)
      throw error
    }
  }
}
