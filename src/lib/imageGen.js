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
      // Tentativa de usar o proxy sem duplicar a interrogação e com tratamento de erro mais claro
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
      
      console.log('--- Iniciando Geração Freepik ---')
      console.log('Prompt:', fullPrompt)
      
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-freepik-api-key': key.trim()
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
        let errorDetail = ''
        try {
          const errData = await res.json()
          errorDetail = errData?.error || errData?.message || JSON.stringify(errData)
        } catch (e) {
          errorDetail = `Status ${res.status}: ${res.statusText}`
        }
        console.error('Erro Resposta Freepik:', errorDetail)
        throw new Error(errorDetail)
      }

      const data = await res.json()
      if (!data?.data?.[0]?.base64) {
        throw new Error('Resposta da Freepik não contém dados da imagem.')
      }
      return `data:image/png;base64,${data.data[0].base64}`
    } catch(error) {
      console.error('Erro Catastrófico Freepik:', error)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        throw new Error('Falha de conexão com a Freepik (CORS). Isso geralmente ocorre porque o navegador bloqueia a requisição direta. Tente usar a OpenAI ou verifique se sua chave está correta.')
      }
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
      if (error.message === 'Failed to fetch') {
        throw new Error('Falha de conexão com o Google Imagen. O Google restringe a geração de imagens em algumas regiões (incluindo Brasil via API). Tente usar a OpenAI.')
      }
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
      if (error.message === 'Failed to fetch') {
        throw new Error('Falha de conexão com a OpenAI (DALL-E). Verifique sua conexão ou saldo na plataforma.')
      }
      console.error('Image Gen Error DALL-E:', error)
      throw error
    }
  }
}
