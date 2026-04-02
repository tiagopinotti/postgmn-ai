import { useState } from 'react'
import PostImageRender from './PostImageRender'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CATEGORY_COLORS = {
  'Institucional': '#10B981',
  'Educativo': '#3B82F6',
  'Serviço/Produto': '#F59E0B',
  'Promocional': '#F97316',
  'Prova Social': '#8B5CF6',
  'Bastidores': '#EC4899',
  'Inspiracional': '#06B6D4',
  'Entretenimento': '#8B5CF6',
  'default': '#6366F1'
}

export default function ApprovalCalendar({ year, month, posts, onPostClick }) {
  const [hoverDate, setHoverDate] = useState(null)
  
  if (!year || !month) return null

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const blanks = Array.from({ length: firstDay })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const postsByDate = {}
  posts.forEach(p => {
    if (p.scheduled_date) {
      const d = parseInt(p.scheduled_date.split('-')[2], 10)
      if (!postsByDate[d]) postsByDate[d] = []
      postsByDate[d].push(p)
    }
  })

  return (
    <div className="card" style={{ marginBottom: 24, overflow: 'visible' }}>
      <div className="card-header"><h3 style={{ fontSize: 16 }}>🗓️ Calendário Mensal</h3></div>
      <div className="card-body" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', paddingBottom: 8 }}>{w}</div>
          ))}
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(d => {
            const dayPosts = postsByDate[d] || []
            const isHover = hoverDate === d
            return (
              <div 
                key={d} 
                onClick={() => {
                   if (dayPosts.length > 0 && onPostClick) onPostClick(dayPosts[0].id)
                }}
                onMouseEnter={() => dayPosts.length && setHoverDate(d)}
                onMouseLeave={() => setHoverDate(null)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  background: dayPosts.length ? 'var(--primary-light)' : '#f9fafb',
                  borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: dayPosts.length ? 700 : 500,
                  color: dayPosts.length ? 'var(--primary)' : 'var(--gray-400)',
                  cursor: dayPosts.length ? 'pointer' : 'default',
                  border: dayPosts.length ? '2px solid #C7D2FE' : '1px solid transparent',
                  transition: 'all 0.15s'
                }}>
                {d}
                {dayPosts.length > 0 && (
                  <div style={{ position: 'absolute', bottom: 4, display: 'flex', gap: 3 }}>
                    {dayPosts.map((p, idx) => (
                      <div key={`dot-${p.id}-${idx}`} style={{ width: 4, height: 4, borderRadius: 2, background: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.default }} />
                    ))}
                  </div>
                )}

                {/* Tooltip Hover */}
                {isHover && (
                  <div style={{
                     position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                     width: 300, background: 'white', borderRadius: 12, padding: 14,
                     boxShadow: '0 10px 30px -5px rgba(0,0,0,0.25)', zIndex: 100,
                     border: '1px solid var(--gray-200)', cursor: 'default'
                  }}>
                    {dayPosts.map(p => (
                      <div key={p.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--gray-100)', ':last-child': { marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }, cursor: 'pointer' }} onClick={() => onPostClick && onPostClick(p.id)}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: CATEGORY_COLORS[p.category] || CATEGORY_COLORS.default, display: 'inline-block' }} />
                          {p.theme}
                        </div>
                        {p.image_url ? (
                          <div style={{ marginBottom: 10 }}>
                             <img src={p.image_url} alt="Post preview" style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                          </div>
                        ) : p.image_text ? (
                          <div style={{ marginBottom: 10 }}>
                             <PostImageRender templateKey={p.image_template} text={p.image_text} />
                          </div>
                        ) : null}
                        <div style={{ fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {p.post_text ? (p.post_text.length > 120 ? p.post_text.substring(0, 120) + '...' : p.post_text) : 'Sem texto gerado ainda.'}
                        </div>
                      </div>
                    ))}
                    {/* Seta do tooltip */}
                    <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 12, height: 12, background: 'white', borderRight: '1px solid var(--gray-200)', borderBottom: '1px solid var(--gray-200)' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
