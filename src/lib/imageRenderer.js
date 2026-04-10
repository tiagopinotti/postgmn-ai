// Template layouts
export const LAYOUTS = {
  default: { // Topo
    canvas: { w: 960, h: 720 },
    textBox: { x: 40, y: 40, w: 880, h: 220 },
    imageArea: { x: 60, y: 280, w: 840, h: 400 },
    logo: { x: 380, y: 690, maxW: 200, maxH: 100 },
  },
  left: { // Esquerda
    canvas: { w: 960, h: 720 },
    textBox: { x: 60, y: 220, w: 440, h: 200 },
    logo: { x: 120, y: 550, maxW: 240, maxH: 80 },
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
  layout: 'default',
  font_size: 42,
  text_padding: 30
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

  // Calculate max width of lines to define the dynamic box size
  ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`
  let maxLineWidth = 0
  lines.forEach(line => {
    const w = ctx.measureText(line).width
    if (w > maxLineWidth) maxLineWidth = w
  })

  return { lines, fontSize, maxLineWidth }
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

  // Choose layout
  const layoutType = tpl.layout || 'default'
  const L = LAYOUTS[layoutType] || LAYOUTS.default

  const ctx = canvas.getContext('2d')
  const W = L.canvas.w, H = L.canvas.h
  canvas.width = W
  canvas.height = H

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

  // 3. Dynamic Text Box & Text
  if (text && text.trim()) {
    const padding = tpl.text_padding || 30
    const startFontSize = tpl.font_size || 42
    
    // First, find the best fit for text
    const { lines, fontSize, maxLineWidth } = fitText(ctx, text, L.textBox.w - padding * 2, startFontSize)
    
    const lineH = fontSize * 1.3
    const totalContentH = lines.length * lineH
    
    // Dynamic Box Dimensions
    const dynamicBoxW = maxLineWidth + padding * 2
    const dynamicBoxH = totalContentH + padding * 2
    
    // Anchor Point (Position)
    const boxX = (tpl.text_box_x !== undefined && tpl.text_box_x !== null) 
      ? tpl.text_box_x - (dynamicBoxW / 2) // Center horizontally on the chosen X
      : L.textBox.x + (L.textBox.w - dynamicBoxW) / 2
      
    const boxY = (tpl.text_box_y !== undefined && tpl.text_box_y !== null)
      ? tpl.text_box_y - (dynamicBoxH / 2) // Center vertically on the chosen Y
      : L.textBox.y + (L.textBox.h - dynamicBoxH) / 2

    // Draw the Adaptive Background
    ctx.fillStyle = tpl.text_bg_color || '#FFFFFF'
    roundRect(ctx, boxX, boxY, dynamicBoxW, dynamicBoxH, 16)
    ctx.fill()

    // Draw the Text
    const startTextY = boxY + padding + lineH / 2
    ctx.fillStyle = tpl.text_color || '#1a1a1a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`

    lines.forEach((line, i) => {
      ctx.fillText(line, boxX + dynamicBoxW / 2, startTextY + i * lineH)
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
  const L = LAYOUTS[tpl.layout || 'default'] || LAYOUTS.default

  const ctx = canvas.getContext('2d')
  const W = 400
  const H = Math.round(W * (L.canvas.h / L.canvas.w))
  canvas.width = W
  canvas.height = H

  // Calculate scale and centering to fit L.canvas into thumbnail
  const scale = W / L.canvas.w
  const dx = 0
  const dy = 0

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

  // Lorem Ipsum Dynamic Box & Text Preview
  const padding = (tpl.text_padding || 30) * scale
  const fontSize = (tpl.font_size || 42) * scale
  ctx.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`
  
  const previewLines = ["Título do Post", "Exemplo de Texto"]
  let maxW = 0
  previewLines.forEach(l => {
    const w = ctx.measureText(l).width
    if (w > maxW) maxW = w
  })

  const dynamicBoxW = maxW + padding * 2
  const lineH = fontSize * 1.2
  const dynamicBoxH = (previewLines.length * lineH) + padding * 2

  // Position (Relative to thumbnail)
  const boxX = (tpl.text_box_x !== undefined && tpl.text_box_x !== null) 
    ? dx + (tpl.text_box_x * scale) - (dynamicBoxW / 2)
    : dx + (L.textBox.x * scale) + (L.textBox.w * scale - dynamicBoxW) / 2

  const boxY = (tpl.text_box_y !== undefined && tpl.text_box_y !== null)
    ? dy + (tpl.text_box_y * scale) - (dynamicBoxH / 2)
    : dy + (L.textBox.y * scale) + (L.textBox.h * scale - dynamicBoxH) / 2

  // Draw background
  ctx.fillStyle = tpl.text_bg_color || '#FFFFFF'
  roundRect(ctx, boxX, boxY, dynamicBoxW, dynamicBoxH, 4)
  ctx.fill()

  // Draw text
  ctx.fillStyle = tpl.text_color || '#1a1a1a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const startY = boxY + padding + lineH / 2
  
  previewLines.forEach((line, i) => {
    ctx.fillText(line, boxX + dynamicBoxW / 2, startY + i * lineH)
  })

  // Image area
  const ia = L.imageArea
  if (ia) {
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, dx + (ia.x - 10) * scale, dy + (ia.y - 10) * scale, (ia.w + 20) * scale, (ia.h + 20) * scale, 4)
    ctx.fill()
    ctx.fillStyle = '#E5E7EB'
    roundRect(ctx, dx + ia.x * scale, dy + ia.y * scale, ia.w * scale, ia.h * scale, 3)
    ctx.fill()
    ctx.fillStyle = '#9CA3AF'
    ctx.font = `${8}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📷', dx + (ia.x + ia.w / 2) * scale, dy + (ia.y + ia.h / 2) * scale)
  }

  // Logo placeholder
  if (tpl.logo_url) {
    try {
      const logo = await loadImage(tpl.logo_url)
      const lg = L.logo
      const logoScale = Math.min((lg.maxW * scale) / logo.width, (lg.maxH * scale) / logo.height, 1)
      const lw2 = logo.width * logoScale, lh2 = logo.height * logoScale
      ctx.drawImage(logo, dx + (lg.x * scale) + ((lg.maxW * scale) - lw2) / 2, dy + (lg.y * scale) + ((lg.maxH * scale) - lh2) / 2, lw2, lh2)
    } catch {}
  }
}
