import { useState, useRef, useEffect } from 'react'
import { callAI, extractJSON } from '../lib/ai.js'
import { generateAIImage } from '../lib/imageGen.js'
import { supabase } from '../lib/supabase'
import { TEMPLATES, drawPostImage, BASE_TEMPLATE } from '../lib/imageRenderer.js'

const IconDownload = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconSpark = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>
const IconRefresh = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
const IconCloud = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>

export default function ImageCreator({ post, client, services = [], aiProvider, aiModel, dbTemplates = [] }) {
  const canvasRef = useRef(null)
  const previewRef = useRef(null)

  // Use DB templates if available
  const dynamicTemplates = dbTemplates.length > 0
    ? dbTemplates.map(t => ({ id: t.id, ...t, label: t.name }))
    : [] // Every client starts empty, created from Visual Guide

  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [imageText, setImageText] = useState('')
  const [imageSettings, setImageSettings] = useState({ x: 0, y: 0, zoom: 1 })
  const [localImage, setLocalImage] = useState(null)
  const [photoPrompt, setPhotoPrompt] = useState('')
  const [generatingPhoto, setGeneratingPhoto] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [savingDB, setSavingDB] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [aiError, setAiError] = useState('')

  const tpl = dynamicTemplates.find(t => t.id === selectedTemplate) || dynamicTemplates[0] || BASE_TEMPLATE

  useEffect(() => {
    const defaultTpl = post?.image_template || dynamicTemplates[0]?.id || ''
    setSelectedTemplate(defaultTpl)
    setImageText(post?.image_text || '')
    setLocalImage(post?.image_url || null)
    setImageSettings(post?.image_settings || { x: 0, y: 0, zoom: 1 })
  }, [post?.id, dbTemplates.length])


  // Render canvas when template, text or image change
  useEffect(() => {
    if (canvasRef.current) {
      renderCanvas()
      if (post?.image_template !== selectedTemplate || post?.image_text !== imageText || post?.image_url !== localImage && post?.image_url) {
        setSavedSuccess(false)
      }
    }
  }, [selectedTemplate, imageText, localImage, imageSettings])

  async function saveToDB() {
    if (!post?.id) return
    setSavingDB(true)
    const { error } = await supabase.from('posts').update({
      image_template: selectedTemplate,
      image_text: imageText,
      image_settings: imageSettings
    }).eq('id', post.id)
    
    if (!error) {
       post.image_template = selectedTemplate
       post.image_text = imageText
       post.image_settings = imageSettings
       setSavedSuccess(true)
       setTimeout(() => setSavedSuccess(false), 3000)
    }
    setSavingDB(false)
  }

  async function generateImageText() {
    setGenerating(true)
    try {
      const result = await callAI(`Você é um especialista em marketing de conteúdo para Google Meu Negócio.

Crie um texto CURTO e IMPACTANTE para uma imagem de post do ${tpl.label || tpl.name}.
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

Retorne SOMENTE o JSON: {"image_text": "TEXTO AQUI\\nCOMPLEMENTO AQUI"}`, aiProvider, aiModel)
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

  async function generatePhotoWithAI() {
    if (!photoPrompt.trim()) return
    setGeneratingPhoto(true)
    try {
      const imgProvider = localStorage.getItem('API_KEY_FREEPIK') ? 'freepik' : (aiProvider === 'gemini' ? 'gemini' : 'openai')
      const resultUrl = await generateAIImage(photoPrompt, {
        bizName: client?.company_name || '',
        theme: post?.theme || 'Foto genérica',
        provider: imgProvider
      })

      // Fetch the generated URL/b64, convert to Blob, upload to Supabase
      const req = await fetch(resultUrl)
      if (!req.ok) throw new Error('Falha ao baixar imagem greada pela IA')
      const blob = await req.blob()
      
      const ext = blob.type.split('/')[1] || 'jpg'
      const filename = `post_${post.id}_ai_${Date.now()}.${ext}`

      const { error } = await supabase.storage.from('templates').upload(filename, blob)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('templates').getPublicUrl(filename)
        await supabase.from('posts').update({ 
          image_url: publicUrl, 
          image_prompt: photoPrompt,
          image_text: imageText,
          image_template: selectedTemplate,
          image_settings: imageSettings
        }).eq('id', post.id)
        if (post) {
          post.image_url = publicUrl
          post.image_text = imageText
          post.image_template = selectedTemplate
          post.image_settings = imageSettings
        }
        setLocalImage(publicUrl)
        setRendered(false)
        setPhotoPrompt('')
        setSavedSuccess(true)
      } else {
        throw new Error('Erro ao salvar no Supabase')
      }
    } catch(e) {
      console.error(e)
      setAiError(e.message)
    } finally {
      setGeneratingPhoto(false)
    }
  }

  async function renderCanvas() {
    if (!canvasRef.current) return
    setRendering(true)
    const canvas = canvasRef.current
    
    const success = await drawPostImage(canvas, tpl, imageText, localImage, imageSettings)
    if (success) {
      setRendered(true)
      if (previewRef.current) {
        previewRef.current.src = canvas.toDataURL('image/png')
      }
    }
    setRendering(false)
  }

  // Effect to re-render when settings/text changes
  useEffect(() => {
    if (localImage) renderCanvas()
  }, [imageSettings, imageText, selectedTemplate, localImage])

  function downloadImage() {
    if (!canvasRef.current || !rendered) return
    const canvas = canvasRef.current
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const bizName = client?.company_name || 'Post'
      const templateLabel = tpl.label || tpl.name || 'Template'
      const theme = (post?.theme || 'Sem Tema').substring(0, 50)
      
      let filename = `[${bizName}] ${templateLabel} - ${theme}`
        .replace(/[<>\:"/\\|?*\n]/g, '')
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
      {aiError && (
        <div className="alert alert-error" style={{ margin: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>❌ {aiError}</span>
          <button onClick={() => setAiError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}
      <div className="card-header">
        <h3>🖼️ Criativo para Post</h3>
        <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Gera imagem com texto para aprovação/download</span>
      </div>
      <div className="card-body">
        {/* Template selection */}
        <div className="form-group">
          <label className="form-label">Template</label>
          {dynamicTemplates.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dynamicTemplates.map((t) => {
                const key = t.id;
                return (
                <button key={key}
                  onClick={() => { setSelectedTemplate(key); setRendered(false) }}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid',
                    borderColor: selectedTemplate === key ? 'var(--primary)' : 'var(--gray-200)',
                    background: selectedTemplate === key ? 'var(--primary-light)' : 'white',
                    color: selectedTemplate === key ? 'var(--primary)' : 'var(--gray-600)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                  {t.bg_color && <span style={{ width: 12, height: 12, borderRadius: 3, background: t.bg_color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />}
                  {t.label || t.name}
                </button>
              )})}
            </div>
          ) : (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px dashed #EF4444', borderRadius: 8, color: '#991B1B', fontSize: 12 }}>
              ⚠️ Nenhuma template artística encontrada. 
              <br />
              <a href={`/clientes/${client?.id}`} style={{ fontWeight: 700, color: '#EF4444', textDecoration: 'underline' }}>
                Clique aqui para criar templates no Guia Visual do Cliente
              </a>
            </div>
          )}

        </div>

        {/* Text input */}
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
              placeholder={'Digite aqui o texto que será inserido na arte...'}
              style={{ flex: 1, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}
            />
            <button className="btn btn-secondary btn-sm" onClick={generateImageText} disabled={generating}
              style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4 }}>
              {generating ? <><span className="spinner" style={{ width: 12, height: 12 }} />Gerando...</> : <><IconSpark />IA</>}
            </button>
          </div>
        </div>

        {/* Photo input */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Foto da Imagem (Meio do Template)</span>
            {localImage && localImage !== 'uploading' && (
              <button onClick={async () => { 
                setLocalImage(null)
                setRendered(false)
                await supabase.from('posts').update({ image_url: null }).eq('id', post.id)
                if(post) post.image_url = null
              }} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remover foto</button>
            )}
          </label>

          <div style={{ display: 'flex', gap: 8, flexDirection: 'column', background: 'var(--gray-50)', padding: 12, borderRadius: 8, border: '1px solid var(--gray-200)' }}>
            {/* Upload manual */}
            <div style={{ display: 'flex' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (file) {
                    setLocalImage('uploading')
                    const ext = file.name.split('.').pop()
                    const filename = `post_${post.id}_local_${Date.now()}.${ext}`
                    const { error } = await supabase.storage.from('templates').upload(filename, file)
                    
                    if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from('templates').getPublicUrl(filename)
                      await supabase.from('posts').update({ image_url: publicUrl }).eq('id', post.id)
                      if(post) post.image_url = publicUrl
                      setLocalImage(publicUrl)
                      setRendered(false)
                    } else {
                      console.error(error)
                      alert('Erro ao enviar imagem: ' + error.message)
                      setLocalImage(null)
                    }
                  }
                }}
                style={{ display: 'none' }}
                id={`upload-photo-${post.id}`}
              />
              <label htmlFor={`upload-photo-${post.id}`} className="btn btn-secondary btn-sm" style={{ cursor: localImage === 'uploading' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', margin: 0 }}>
                📁 {localImage === 'uploading' ? 'Enviando do computador...' : 'Fazer upload de foto local'}
              </label>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>OU GERAR COM IA</div>

            {/* Gerador IA */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Crianças aprendendo matemática felizes em uma sala de aula iluminada..." 
                value={photoPrompt}
                onChange={e => setPhotoPrompt(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') generatePhotoWithAI() }}
                style={{ flex: 1, fontSize: 12 }}
              />
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                onClick={generatePhotoWithAI}
                disabled={generatingPhoto || !photoPrompt.trim()}
              >
                {generatingPhoto ? <><span className="spinner" style={{ width: 12, height: 12 }} />Gerando...</> : <><IconSpark /> Gerar Foto</>}
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={renderCanvas}
            disabled={!hasText || rendering}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {rendering ? <><span className="spinner" style={{ width: 12, height: 12 }} />Renderizando...</> : <><IconRefresh />Atualizar preview</>}
          </button>

          {rendered && (
            <button className={savedSuccess ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"} onClick={saveToDB}
              disabled={savingDB || savedSuccess}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {savingDB ? <span className="spinner" style={{ width: 12, height: 12 }} /> 
               : savedSuccess ? <><IconCloud /> Salvo!</> : <><IconCloud /> Salvar no Sistema</>}
            </button>
          )}

          {rendered && (
            <button className="btn btn-secondary btn-sm" onClick={downloadImage}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconDownload /> Download JPG
            </button>
          )}
        </div>

        {/* Preview & Controls */}
        {hasText && (
          <div style={{ marginTop: 24 }}>
            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden', background: 'var(--gray-50)', padding: 12 }}>
              <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#DDD', marginBottom: 12 }}>
                {rendering && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.5)', zIndex: 1, fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Renderizando...</div>}
                <img ref={previewRef} alt="Preview do criativo" style={{ width: '100%', display: 'block' }} />
              </div>

              {localImage && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, background: 'white', padding: 12, borderRadius: 8, border: '1px solid var(--gray-100)' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Ajuste Vertical</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{imageSettings.y}px</span>
                    </label>
                    <input 
                      type="range" min="-500" max="500" step="5"
                      style={{ width: '100%', height: 6, borderRadius: 3, cursor: 'pointer' }}
                      value={imageSettings.y || 0}
                      onChange={(e) => setImageSettings(s => ({ ...s, y: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Zoom</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{Math.round(imageSettings.zoom * 100)}%</span>
                    </label>
                    <input 
                      type="range" min="1" max="4" step="0.05"
                      style={{ width: '100%', height: 6, borderRadius: 3, cursor: 'pointer' }}
                      value={imageSettings.zoom || 1}
                      onChange={(e) => setImageSettings(s => ({ ...s, zoom: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              {!rendered && !localImage && (
                <div style={{ padding: '8px 12px', background: 'var(--primary-light)', fontSize: 12, color: 'var(--primary)', textAlign: 'center', marginTop: 8, borderRadius: 6 }}>
                  Clique em "Atualizar preview" para visualizar
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Filename hint */}
        {rendered && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, fontSize: 11, color: 'var(--gray-500)' }}>
            📁 Nome do arquivo: <strong style={{ color: 'var(--gray-700)' }}>
              {`${client?.company_name || ''} - ${(post?.theme || '').substring(0,70)} - ${tpl.label || tpl.name}.jpg`.replace(/[<>\\:"/\\\\|?*\\n]/g, '')}
            </strong>
          </div>
        )}
      </div>
    </div>
  )
}
