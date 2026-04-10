import { useState, useRef, useEffect } from 'react'
import { generateAIImage } from '../lib/imageGen.js'

// Simple SVG Icons
const IconBrush = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3 3h-6zM3 21v-4l13-13 4 4-13 13h-4z" /></svg>
const IconSpark = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.5-6.5l-2.8 2.8M6.3 17.7l-2.8 2.8m14-14l-2.8 2.8M6.3 6.3L3.5 3.5" /></svg>
const IconTrash = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
const IconCheck = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>

export default function AIStudio({ post, client, imageProvider, onSave }) {
  const [tab, setTab] = useState('generate') // generate, editor
  
  // Prompt State
  useEffect(() => {
    if (!document.getElementById('ai-studio-fonts')) {
      const link = document.createElement('link')
      link.id = 'ai-studio-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Open+Sans:wght@400;700&family=Oswald:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700;900&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  const defaultPrompt = `Fotografia hiper realista e profissional para a empresa "${client.company_name}". Assunto da imagem: ${post.theme}. Iluminação de estúdio limpa, grande profundidade de campo, cores vibrantes com alto contraste. Deixe um espaço superior bem vazio e liso para a inserção de textos de marketing.`
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Gallery State
  const galleryKey = `post_${post.id}_gallery`
  const [gallery, setGallery] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(galleryKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setGallery(parsed)
      } catch(e){}
    }
  }, [galleryKey])

  const saveGallery = (newGallery) => {
    setGallery(newGallery)
    localStorage.setItem(galleryKey, JSON.stringify(newGallery))
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setErrorMsg('')
    try {
      const b64 = await generateAIImage(prompt, {
        provider: imageProvider,
        rawPrompt: true,
        aspect_ratio: '4:3'
      })
      const newGallery = [b64, ...gallery]
      saveGallery(newGallery)
    } catch (error) {
      console.error(error)
      setErrorMsg(error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = (index) => {
    const fresh = [...gallery]
    fresh.splice(index, 1)
    saveGallery(fresh)
    if (selectedImage === gallery[index]) setSelectedImage(null)
  }

  // --- EDITOR STATE ---
  const canvasRef = useRef(null)
  const [title, setTitle] = useState(post.theme.toUpperCase())
  const [titleColor, setTitleColor] = useState('#FFFFFF')
  const [titleBg, setTitleBg] = useState('#000000')
  const [useBg, setUseBg] = useState(true)
  const [useOpacity, setUseOpacity] = useState(false)
  const [titleY, setTitleY] = useState(250)
  
  const [titleFont, setTitleFont] = useState('Montserrat')
  const [titleSize, setTitleSize] = useState(64)
  const [titleBold, setTitleBold] = useState(true)

  const [logoEnabled, setLogoEnabled] = useState(true)
  const [logoUrl, setLogoUrl] = useState(client.logo_url || '')
  const [logoPos, setLogoPos] = useState('bottomCenter') // bottomLeft, bottomRight, topCenter, bottomCenter

  useEffect(() => {
    if (tab === 'editor' && selectedImage) {
      // Debounce slightly to allow fonts to maybe load, though Arial is safe
      const t = setTimeout(() => drawCanvas(), 50)
      return () => clearTimeout(t)
    }
  }, [tab, selectedImage, title, titleColor, titleBg, useBg, useOpacity, titleY, titleFont, titleSize, titleBold, logoEnabled, logoUrl, logoPos])

  const drawCanvas = async () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    const WIDTH = 1024
    const HEIGHT = 768 // 4:3 aspect ratio
    cvs.width = WIDTH
    cvs.height = HEIGHT

    // 1. Draw Background (Object Cover)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => {
      img.src = selectedImage
      img.onload = res
      img.onerror = rej
    }).catch(()=>{})
    
    // Scale to cover 1024x768 without stretching
    const scale = Math.max(WIDTH / img.width, HEIGHT / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    const dx = (WIDTH - dw) / 2
    const dy = (HEIGHT - dh) / 2
    ctx.drawImage(img, dx, dy, dw, dh)

    // 2. Draw Title with Word Wrap
    if (title.trim()) {
      // Small wait to ensure document.fonts.load finishes if a new font was just selected
      await document.fonts?.ready; 

      const padding = titleSize / 2
      const fontWeight = titleBold ? '900' : '400'
      ctx.font = `${fontWeight} ${titleSize}px "${titleFont}", sans-serif`
      
      const maxWidth = WIDTH - 120
      const words = title.split(' ')
      const lines = []
      let currentLine = words[0] || ''
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i]
        const width = ctx.measureText(currentLine + " " + word).width
        if (width < maxWidth) {
          currentLine += " " + word
        } else {
          lines.push(currentLine)
          currentLine = word
        }
      }
      lines.push(currentLine)

      const lineH = titleSize * 1.3
      const totalTextH = lines.length * lineH

      // Calculate Box Dimensions
      const maxTextWidthFound = Math.max(...lines.map(l => ctx.measureText(l).width))
      
      const bgX = (WIDTH - maxTextWidthFound) / 2 - padding
      const bgW = maxTextWidthFound + padding * 2
      const bgH = totalTextH + padding
      const bgY = titleY - lineH / 2 - padding / 2

      if (useBg) {
        ctx.fillStyle = useOpacity ? titleBg + 'B3' : titleBg // B3 = ~70% opacity
        ctx.beginPath()
        ctx.roundRect(bgX, bgY, bgW, bgH, 16)
        ctx.fill()
      }

      ctx.fillStyle = titleColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      lines.forEach((line, index) => {
        ctx.fillText(line, WIDTH / 2, titleY + (index * lineH))
      })
    }

    // 3. Draw Logo
    if (logoEnabled && logoUrl) {
      const logoImg = new window.Image()
      logoImg.crossOrigin = 'anonymous'
      await new Promise((res, rej) => {
        logoImg.src = logoUrl
        logoImg.onload = res
        logoImg.onerror = rej
      }).catch(()=>{})
      
      const logoSize = 250 // Max width or height
      const aspect = logoImg.width / logoImg.height
      let lw = logoSize
      let lh = logoSize / aspect
      
      // Scale down if height is too big
      if (lh > 200) {
        lh = 200
        lw = lh * aspect
      }
      
      let lx, ly
      const margin = 60
      if (logoPos === 'bottomRight') {
        lx = WIDTH - lw - margin
        ly = HEIGHT - lh - margin
      } else if (logoPos === 'bottomLeft') {
        lx = margin
        ly = HEIGHT - lh - margin
      } else if (logoPos === 'bottomCenter') {
        lx = (WIDTH - lw) / 2
        ly = HEIGHT - lh - margin
      } else {
        lx = (WIDTH - lw) / 2
        ly = margin
      }
      ctx.drawImage(logoImg, lx, ly, lw, lh)
    }
  }

  const finalizeImage = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const b64 = cvs.toDataURL('image/jpeg', 0.9)
    onSave(b64)
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
      {/* Header Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', background: '#fff' }}>
        <button 
          onClick={() => setTab('generate')}
          style={{ flex: 1, padding: '16px', background: 'none', border: 'none', borderBottom: tab === 'generate' ? '2px solid var(--primary)' : 'none', fontWeight: tab === 'generate' ? 600 : 400, color: tab === 'generate' ? 'var(--primary)' : 'var(--gray-500)', cursor: 'pointer' }}
        >
          <IconSpark /> 1. Prompt & Galeria
        </button>
        <button 
          onClick={() => { if(selectedImage) setTab('editor') }}
          style={{ flex: 1, padding: '16px', background: 'none', border: 'none', borderBottom: tab === 'editor' ? '2px solid var(--primary)' : 'none', fontWeight: tab === 'editor' ? 600 : 400, color: tab === 'editor' ? 'var(--primary)' : 'var(--gray-500)', cursor: selectedImage ? 'pointer' : 'not-allowed', opacity: selectedImage ? 1 : 0.5 }}
          disabled={!selectedImage}
        >
          <IconBrush /> 2. Editor de Imagem {selectedImage ? '' : '(Selecione uma arte)'}
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {tab === 'generate' && (
          <div style={{ display: 'flex', gap: 24, flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
            {/* Left: Prompt */}
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: 8 }}>Prompt (Instrução para IA)</label>
              <textarea 
                className="form-input" 
                rows={8} 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 16, display: 'flex', justifyContent: 'center' }}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? <span className="spinner" style={{width: 16, height: 16, marginRight: 8}} /> : <IconSpark />} 
                {generating ? 'Gerando Magia...' : 'Gerar Arte com IA'}
              </button>
              {errorMsg && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{errorMsg}</div>}
              <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 12 }}>
                Dica: Especifique cores, ângulos, e se deseja espaço vazio onde o texto ficará.
              </p>
            </div>

            {/* Right: Gallery */}
            <div style={{ flex: '2 1 400px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 16 }}>Suas Artes Geradas ({gallery.length})</h4>
              {gallery.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#e2e8f0', borderRadius: 8, color: 'var(--gray-500)', fontSize: 13 }}>
                  Nenhuma arte gerada ainda. Ajuste o prompt e clique em Gerar Arte.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 16, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
                  {gallery.map((imgB64, i) => (
                    <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: selectedImage === imgB64 ? '4px solid var(--primary)' : '1px solid var(--gray-200)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <img src={imgB64} alt={`Arte ${i}`} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} onClick={() => setSelectedImage(imgB64)} />
                      
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '24px 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedImage(imgB64); setTab('editor'); }}
                          style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(i); }}
                          style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px', cursor: 'pointer', display: 'flex' }}
                          title="Excluir arte"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'editor' && selectedImage && (
          <div style={{ display: 'flex', gap: 24, flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
            {/* Viewer */}
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <canvas 
                ref={canvasRef} 
                style={{ width: '100%', maxWidth: 500, aspectRatio: '4/3', background: '#e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} 
              />
              <button className="btn btn-primary" style={{ marginTop: 24, width: '100%', maxWidth: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }} onClick={finalizeImage}>
                <IconCheck /> Salvar e Usar no Cronograma
              </button>
            </div>

            {/* Controls */}
            <div style={{ flex: '1 1 300px', background: '#fff', padding: 24, borderRadius: 8, border: '1px solid var(--gray-200)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--gray-800)' }}>Ferramentas do Editor</h4>
              
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Texto / Título</label>
                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: MATRÍCULAS ABERTAS" />
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Fonte</label>
                  <select className="form-input" value={titleFont} onChange={e => setTitleFont(e.target.value)}>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Oswald">Oswald</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Playfair Display">Playfair Display</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Tamanho</label>
                  <input type="number" className="form-input" value={titleSize} onChange={e => setTitleSize(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', margin: 0 }}>
                    <input type="checkbox" checked={titleBold} onChange={e => setTitleBold(e.target.checked)} style={{ marginRight: 6 }} />
                    Texto em Negrito
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Cor do Texto</label>
                  <input type="color" style={{ width: '100%', height: 40, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', overflow: 'hidden' }} value={titleColor} onChange={e => setTitleColor(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    <input type="checkbox" checked={useBg} onChange={e => setUseBg(e.target.checked)} style={{ marginRight: 6 }} />
                    Fundo
                  </label>
                  <input type="color" disabled={!useBg} style={{ width: '100%', height: 40, padding: 0, border: 'none', borderRadius: 6, cursor: useBg ? 'pointer' : 'not-allowed', opacity: useBg ? 1 : 0.5 }} value={titleBg} onChange={e => setTitleBg(e.target.value)} />
                </div>
              </div>

              {useBg && (
                 <label className="form-label" style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                   <input type="checkbox" checked={useOpacity} onChange={e => setUseOpacity(e.target.checked)} style={{ marginRight: 6 }} />
                   Fundo Translúcido (70%)
                 </label>
              )}

              <div style={{ marginBottom: 32 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>Posição Vertical do Texto</span>
                </label>
                <input type="range" min="100" max="668" value={titleY} onChange={e => setTitleY(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '24px 0' }} />

              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" checked={logoEnabled} onChange={e => setLogoEnabled(e.target.checked)} style={{ marginRight: 6 }} />
                  Exibir Logo do Cliente
                </label>
                {logoEnabled && (
                  <input type="text" className="form-input" style={{ marginTop: 8 }} placeholder="URL do logo (png/jpg)" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                )}
              </div>

              {logoEnabled && (
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Posição do Logo</label>
                  <select className="form-input" value={logoPos} onChange={e => setLogoPos(e.target.value)}>
                    <option value="bottomCenter">Rodapé Centralizado</option>
                    <option value="bottomRight">Canto Inferior Direito</option>
                    <option value="bottomLeft">Canto Inferior Esquerdo</option>
                    <option value="topCenter">Topo Centralizado</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
