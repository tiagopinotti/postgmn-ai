import { useRef, useEffect, useState } from 'react'
import { drawPostImage } from '../lib/imageRenderer.js'

export default function PostImageRender({ template, text, style, templateKey, imageUrl, settings }) {
  const canvasRef = useRef(null)
  const [renderedSrc, setRenderedSrc] = useState('')

  useEffect(() => {
    let active = true
    async function render() {
      if (!canvasRef.current || !text) return
      const canvas = canvasRef.current
      const success = await drawPostImage(canvas, template || templateKey || 'ingles', text, imageUrl, settings)
      if (success && active) {
        setRenderedSrc(canvas.toDataURL('image/png', 0.85))
      }
    }
    render()
    return () => { active = false }
  }, [templateKey, text, imageUrl, JSON.stringify(settings || {}), template?.id])

  if (!text) return null

  return (
    <div style={{ ...style, position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {renderedSrc ? (
        <img src={renderedSrc} alt="Post criativo" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }} />
      ) : (
        <div style={{ width: '100%', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8, color: '#9ca3af', fontSize: 12 }}>
          Renderizando imagem...
        </div>
      )}
    </div>
  )
}
