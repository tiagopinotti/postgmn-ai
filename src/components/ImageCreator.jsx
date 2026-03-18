import { useState, useRef, useEffect } from 'react'
import { callClaude, extractJSON } from '../lib/ai.js'

// Posições das caixas de texto detectadas nas templates (x, y, w, h em px para 960x720)
const TEMPLATES = {
  ingles: {
    label: 'Curso de Inglês',
    file: '/templates/template-ingles.png',
    box: { x: 90, y: 300, w: 450, h: 133 },
    textColor: '#7B1D1D',
    bgColor: 'rgba(255,255,255,0.97)',
  },
  matematica: {
    label: 'Curso de Matemática',
    file: '/templates/template-matematica.png',
    box: { x: 90, y: 363, w: 449, h: 133 },
    textColor: '#003380',
    bgColor: 'rgba(255,255,255,0.97)',
  },
  portugues: {
    label: 'Curso de Português',
    file: '/templates/template-portugues.png',
    box: { x: 85, y: 295, w: 455, h: 102 },
    textColor: '#1a4a2e',
    bgColor: 'rgba(255,255,255,0.97)',
  },
}

const IconDownload = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconSpark = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>
const IconRefresh = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.toUpperCase().split(' ')
  let line = ''
  const lines = []
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const totalHeight = lines.length * lineHeight
  const startY = y + (lineHeight * 0.6)
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight)
  })
  return lines.length
}

export default function ImageCreator({ post, client }) {
  const canvasRef = useRef(null)
  const previewRef = useRef(null)
  const [selectedTemplate, setSelectedTemplate] = useState('ingles')
  const [imageText, setImageText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [rendering, setRendering] = useState(false)

  const tpl = TEMPLATES[selectedTemplate]

  // Renderiza o canvas sempre que template ou texto mudar
  useEffect(() => {
    if (imageText && canvasRef.current) {
      renderCanvas()
    }
  }, [selectedTemplate, imageText])

  async function generateImageText() {
    setGenerating(true)
    try {
      const result = await callClaude(`Você é um especialista em marketing de conteúdo para Google Meu Negócio.

Crie um texto CURTO e IMPACTANTE para uma imagem de post do ${tpl.label}.
O texto vai aparecer em uma caixa branca na imagem criativa.

Dados:
- Empresa: ${client?.company_name || ''}
- Tema do post: ${post?.theme || ''}
- Categoria: ${post?.category || ''}

Regras:
- MÁXIMO 12 palavras no total
- Deve ser direto e impactante
- Pode usar quebra de linha (use \\n) para dividir em até 2 linhas
- Letra maiúscula
- Sem pontuação excessiva
- Foco em benefício ou chamada emocional

Retorne SOMENTE o JSON: {"image_text": "TEXTO AQUI\\nCOMPLEMENTO AQUI"}`)
      const data = extractJSON(result)
      if (data?.image_text) {
        setImageText(data.image_text.replace(/\\n/g, '\n'))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  async function renderCanvas() {
    if (!canvasRef.current || !imageText.trim()) return
    setRendering(true)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 960
    canvas.height = 720

    // Carregar imagem do template
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = tpl.file + '?v=' + Date.now()

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      setTimeout(reject, 5000)
    }).catch(() => {})

    // Desenhar template
    ctx.drawImage(img, 0, 0, 960, 720)

    // Desenhar caixa de texto branca (rounded)
    const { x, y, w, h } = tpl.box
    const radius = 12
    ctx.fillStyle = tpl.bgColor
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.fill()

    // Dividir texto em linhas manuais (usuário pode usar \n)
    const lines = imageText.toUpperCase().split('\n').filter(l => l.trim())
    const padding = 22
    const innerW = w - padding * 2
    const fontSize = lines.length <= 1 ? 28 : lines.length === 2 ? 25 : 21
    const lineH = fontSize * 1.3

    ctx.fillStyle = tpl.textColor
    ctx.font = `bold ${fontSize}px "Arial", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    // Calcular altura total para centralizar verticalmente
    const totalTextH = lines.length * lineH
    const startY = y + (h - totalTextH) / 2 + lineH / 2

    lines.forEach((line, i) => {
      // Quebra automática se a linha for muito longa
      const words = line.split(' ')
      let subLine = ''
      const subLines = []
      for (const word of words) {
        const test = subLine + (subLine ? ' ' : '') + word
        if (ctx.measureText(test).width > innerW && subLine) {
          subLines.push(subLine)
          subLine = word
        } else {
          subLine = test
        }
      }
      if (subLine) subLines.push(subLine)
      subLines.forEach((sl, si) => {
        ctx.fillText(sl, x + padding, startY + (i + si) * lineH)
      })
    })

    setRendered(true)
    setRendering(false)

    // Atualizar preview
    if (previewRef.current) {
      previewRef.current.src = canvas.toDataURL('image/png')
    }
  }

  function downloadImage() {
    if (!canvasRef.current || !rendered) return
    const canvas = canvasRef.current
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      // SEO filename: "NomeCliente Cidade Curso de X Tema.jpg"
      const city = client?.city || ''
      const bizName = client?.company_name || ''
      const templateLabel = tpl.label
      const theme = (post?.theme || '').substring(0, 40)
      const filename = `${bizName} ${city} ${templateLabel} ${theme}`
        .replace(/[<>:"/\\|?*\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() + '.jpg'
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.92)
  }

  const hasText = imageText.trim().length > 0

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <h3>🖼️ Criativo para Post</h3>
        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Gera imagem com texto para download</span>
      </div>
      <div className="card-body">
        {/* Seleção de template */}
        <div className="form-group">
          <label className="form-label">Template</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button key={key}
                onClick={() => { setSelectedTemplate(key); setRendered(false) }}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid',
                  borderColor: selectedTemplate === key ? 'var(--primary)' : 'var(--gray-200)',
                  background: selectedTemplate === key ? 'var(--primary-light)' : 'white',
                  color: selectedTemplate === key ? 'var(--primary)' : 'var(--gray-600)',
                  transition: 'all 0.15s'
                }}>
                {key === 'ingles' ? '🔴' : key === 'matematica' ? '🔵' : '🟡'} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Texto da imagem */}
        <div className="form-group">
          <label className="form-label">
            Texto da imagem
            <span style={{ color: 'var(--gray-400)', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>máx. 12 palavras · use Enter para quebrar linha</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              className="form-textarea"
              rows={2}
              value={imageText}
              onChange={e => { setImageText(e.target.value); setRendered(false) }}
              placeholder={'INGLÊS QUE FUNCIONA,\nNO RITMO DO SEU FILHO!'}
              style={{ flex: 1, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={generateImageText} disabled={generating}
              style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
              {generating ? <><span className="spinner" style={{ width: 12, height: 12 }} />Gerando...</> : <><IconSpark />IA</>}
            </button>
          </div>
        </div>

        {/* Botão gerar preview */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={renderCanvas}
            disabled={!hasText || rendering}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {rendering ? <><span className="spinner" style={{ width: 12, height: 12 }} />Renderizando...</> : <><IconRefresh />Gerar preview</>}
          </button>
          {rendered && (
            <button className="btn btn-primary btn-sm" onClick={downloadImage}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconDownload /> Baixar imagem (.jpg)
            </button>
          )}
        </div>

        {/* Preview */}
        {hasText && (
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden', background: 'var(--gray-50)' }}>
            <img ref={previewRef} alt="Preview do criativo"
              style={{ width: '100%', display: 'block' }}
              src={tpl.file}
            />
            {!rendered && (
              <div style={{ padding: '8px 12px', background: 'var(--primary-light)', fontSize: 12, color: 'var(--primary)', textAlign: 'center' }}>
                Clique em "Gerar preview" para visualizar o criativo com o texto
              </div>
            )}
          </div>
        )}

        {/* Canvas oculto para renderização */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Dica de nome do arquivo */}
        {rendered && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, fontSize: 11, color: 'var(--gray-500)' }}>
            📁 Nome do arquivo: <strong style={{ color: 'var(--gray-700)' }}>
              {`${client?.company_name || ''} ${client?.city || ''} ${tpl.label} ${(post?.theme || '').substring(0,35)}.jpg`}
            </strong>
          </div>
        )}
      </div>
    </div>
  )
}
