// Template layouts
const LAYOUTS = {
  default: {
    canvas: { w: 1080, h: 1080 },
    textBox: { x: 60, y: 60, w: 960, h: 200 },
    imageArea: { x: 90, y: 290, w: 900, h: 560 },
    logo: { x: 440, y: 900, maxW: 200, maxH: 120 },
  },
  left: {
    canvas: { w: 1080, h: 1080 },
    textBox: { x: 100, y: 505, w: 555, h: 210 },
    logo: { x: 235, y: 745, maxW: 280, maxH: 85 },
    imageArea: null // Background is the image
  }
}

// Legacy hardcoded templates (removed to ensure clean start for new clients)
export const TEMPLATES = {}
export const BASE_TEMPLATE = {
  id: 'default',
  name: 'Padrão',
  bg_color: '#4F46E5',
  text_color: '#1a1a1a',
  text_bg_color: '#FFFFFFEE',
  visual_style: 'clean'
}


// Helper: load image as promise
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject('no src')
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    
    if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) {
      img.src = src
    } else {
      img.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now()
    }
    setTimeout(() => reject('timeout'), 8000)
  })
}

// Helper: draw rounded rect
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Helper: auto-size text into a box
function fitText(ctx, text, maxWidth, startSize) {
  let fontSize = startSize
  let lines = []

  const tryFit = (size) => {
    ctx.font = `bold ${size}px "Inter", "Arial", sans-serif`
    const paragraphs = text.toUpperCase().split('\n').map(p => p.trim()).filter(Boolean)
    const result = []
    paragraphs.forEach(p => {
      const words = p.split(' ')
      let current = words[0] || ''
      for (let i = 1; i < words.length; i++) {
        const test = current + ' ' + words[i]
        if (ctx.measureText(test).width > maxWidth && current) {
          result.push(current)
          current = words[i]
        } else {
          current = test
        }
      }
      if (current) result.push(current)
    })
    return result
  }

  lines = tryFit(fontSize)
  while (lines.length > 2 && fontSize > 16) {
    fontSize -= 3
    lines = tryFit(fontSize)
  }

  return { lines, fontSize }
}

/**
 * Draw a post image on canvas using a dynamic template from DB
 * @param {HTMLCanvasElement} canvas
 * @param {object} tpl - template object (from DB or legacy)
 * @param {string} text - text to render
 * @param {string} [userImageSrc] - optional user-uploaded photo for the image area
 * @param {object} [imageSettings] - optional {x, y, zoom} offsets
 */
export async function drawPostImage(canvas, tpl, text, userImageSrc, imageSettings = { x: 0, y: 0, zoom: 1 }) {
  if (!canvas) return false
  
  // Use BASE_TEMPLATE if none provided
  if (!tpl) tpl = BASE_TEMPLATE

  // Legacy support: if tpl is a string key, look up hardcoded
  if (typeof tpl === 'string') tpl = TEMPLATES[tpl] || BASE_TEMPLATE

  // If legacy template with .file field, use old rendering
  if (tpl.file && !tpl.bg_color) {
    return drawLegacyTemplate(canvas, tpl, text || '')
  }

  const ctx = canvas.getContext('2d')
  const W = 1080, H = 1080
  canvas.width = W
  canvas.height = H

  // Choose layout
  const layoutType = tpl.layout || 'default'
  const L = LAYOUTS[layoutType] || LAYOUTS.default

  // 1. Background
  if (tpl.bg_image_url) {
    try {
      const bgImg = await loadImage(tpl.bg_image_url)
      // Cover the canvas
      const scale = Math.max(W / bgImg.width, H / bgImg.height)
      const sw = bgImg.width * scale, sh = bgImg.height * scale
      ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh)
    } catch {
      ctx.fillStyle = tpl.bg_color || '#4F46E5'
      ctx.fillRect(0, 0, W, H)
    }
  } else {
    ctx.fillStyle = tpl.bg_color || '#4F46E5'
    ctx.fillRect(0, 0, W, H)
  }

  // 2. Text box
  const tb = L.textBox
  const tbColor = tpl.text_bg_color || '#FFFFFFEE'
  ctx.fillStyle = tbColor
  roundRect(ctx, tb.x, tb.y, tb.w, tb.h, 16)
  ctx.fill()

  // 3. Text
  if (text && text.trim()) {
    const padding = 30
    const { lines, fontSize } = fitText(ctx, text, tb.w - padding * 2, 42)
    const lineH = fontSize * 1.3
    const totalH = lines.length * lineH
    const startY = tb.y + (tb.h - totalH) / 2 + lineH / 2

    ctx.fillStyle = tpl.text_color || '#1a1a1a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`

    lines.forEach((line, i) => {
      ctx.fillText(line, tb.x + tb.w / 2, startY + i * lineH)
    })
  }

  // 4. Image area
  const ia = L.imageArea
  if (ia) {
    const borderW = 10
    // White border
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, ia.x - borderW, ia.y - borderW, ia.w + borderW * 2, ia.h + borderW * 2, 16)
    ctx.fill()

    // Image placeholder or user image
    if (userImageSrc) {
      try {
        const img = await loadImage(userImageSrc)
        ctx.save()
        roundRect(ctx, ia.x, ia.y, ia.w, ia.h, 10)
        ctx.clip()
        // Cover crop with adjustable offsets and zoom
        const baseScale = Math.max(ia.w / img.width, ia.h / img.height)
        const zoom = imageSettings?.zoom || 1
        const imgScale = baseScale * zoom
        
        const sw = img.width * imgScale
        const sh = img.height * imgScale
        
        // Calculate position: center + user offsets
        const offsetX = imageSettings?.x || 0
        const offsetY = imageSettings?.y || 0
        
        const dx = ia.x + (ia.w - sw) / 2 + offsetX
        const dy = ia.y + (ia.h - sh) / 2 + offsetY
        
        ctx.drawImage(img, dx, dy, sw, sh)
        ctx.restore()
      } catch {
        drawImagePlaceholder(ctx, ia)
      }
    } else {
      drawImagePlaceholder(ctx, ia)
    }
  }

  // 5. Logo
  if (tpl.logo_url) {
    try {
      const logo = await loadImage(tpl.logo_url)
      const lg = L.logo
      const logoScale = Math.min(lg.maxW / logo.width, lg.maxH / logo.height, 1)
      const lw = logo.width * logoScale, lh = logo.height * logoScale
      ctx.drawImage(logo, lg.x + (lg.maxW - lw) / 2, lg.y + (lg.maxH - lh) / 2, lw, lh)
    } catch {}
  }

  return true
}

function drawImagePlaceholder(ctx, ia) {
  ctx.fillStyle = '#F3F4F6'
  roundRect(ctx, ia.x, ia.y, ia.w, ia.h, 10)
  ctx.fill()
  ctx.fillStyle = '#9CA3AF'
  ctx.font = '24px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('📷 Área da imagem', ia.x + ia.w / 2, ia.y + ia.h / 2)
}

// Legacy template rendering (old PNG-based templates)
async function drawLegacyTemplate(canvas, tpl, text) {
  const ctx = canvas.getContext('2d')
  canvas.width = 960
  canvas.height = 720

  try {
    const img = await loadImage(tpl.file)
    ctx.drawImage(img, 0, 0, 960, 720)
  } catch {}

  const { x, y, w, h } = tpl.box
  ctx.fillStyle = tpl.bgColor || '#FFFFFF'
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()

  const padding = 22
  const { lines, fontSize } = fitText(ctx, text, w - padding * 2, 28)
  const lineH = fontSize * 1.3
  const totalH = lines.length * lineH
  const startY = y + (h - totalH) / 2 + lineH / 2

  ctx.fillStyle = tpl.textColor || '#1a1a1a'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, startY + i * lineH)
  })

  return true
}

/**
 * Generate a small thumbnail preview of a template (without text)
 */
export async function drawTemplateThumbnail(canvas, tpl) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const W = 270, H = 270
  canvas.width = W
  canvas.height = H
  const scale = W / 1080

  const L = LAYOUTS[tpl.layout || 'default'] || LAYOUTS.default

  // Background
  if (tpl.bg_image_url) {
    try {
      const bgImg = await loadImage(tpl.bg_image_url)
      const s = Math.max(W / bgImg.width, H / bgImg.height)
      ctx.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s)
    } catch {
      ctx.fillStyle = tpl.bg_color || '#4F46E5'
      ctx.fillRect(0, 0, W, H)
    }
  } else {
    ctx.fillStyle = tpl.bg_color || '#4F46E5'
    ctx.fillRect(0, 0, W, H)
  }

  // Text box placeholder
  const tb = L.textBox
  ctx.fillStyle = tpl.text_bg_color || '#FFFFFFEE'
  roundRect(ctx, tb.x * scale, tb.y * scale, tb.w * scale, tb.h * scale, 4)
  ctx.fill()

  // Text placeholder lines
  ctx.fillStyle = tpl.text_color || '#1a1a1a'
  const lx = (tb.x + 40) * scale, lw = (tb.w - 80) * scale
  ctx.fillRect(lx, (tb.y + tb.h / 2 - 10) * scale, lw * 0.8, 6 * scale)
  ctx.fillRect(lx, (tb.y + tb.h / 2 + 10) * scale, lw * 0.5, 6 * scale)

  // Image area
  const ia = L.imageArea
  if (ia) {
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, (ia.x - 10) * scale, (ia.y - 10) * scale, (ia.w + 20) * scale, (ia.h + 20) * scale, 4)
    ctx.fill()
    ctx.fillStyle = '#E5E7EB'
    roundRect(ctx, ia.x * scale, ia.y * scale, ia.w * scale, ia.h * scale, 3)
    ctx.fill()
    ctx.fillStyle = '#9CA3AF'
    ctx.font = `${8}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📷', (ia.x + ia.w / 2) * scale, (ia.y + ia.h / 2) * scale)
  }

  // Logo placeholder
  if (tpl.logo_url) {
    try {
      const logo = await loadImage(tpl.logo_url)
      const lg = L.logo
      const logoScale = Math.min((lg.maxW * scale) / logo.width, (lg.maxH * scale) / logo.height, 1)
      const lw2 = logo.width * logoScale, lh2 = logo.height * logoScale
      ctx.drawImage(logo, (lg.x * scale) + ((lg.maxW * scale) - lw2) / 2, (lg.y * scale) + ((lg.maxH * scale) - lh2) / 2, lw2, lh2)
    } catch {}
  }
}
