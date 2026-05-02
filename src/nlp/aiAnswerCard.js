// HTML renderer for RAG-grounded answer bubbles.
//
// Used by SuperHomePage when the NLP router emits `kind: 'answer'`. The chat
// bubble already provides the outer card chrome (white background, border,
// padding); this helper renders the inner header + body + citations strip.
// Mobile-safe by construction — every container constrains width and uses
// overflow-wrap:anywhere so long policy text never blows out the bubble.

const FONT = 'Montserrat, sans-serif'
const C = {
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderSubtle: '#ECECEC', borderDefault: '#D5D8DF',
  surfaceTint: '#ECECEC', brandSubtle: '#EEF2FF',
  brand: '#386AF6', brandSubdued: '#345CCC',
  successText: '#007B22',
}

function esc(v) {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Pretty source filename: "namo_saraswati_policy.md" → "Namo Saraswati Policy".
function prettySource(src) {
  return String(src || '')
    .replace(/\.md$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// Render the answer card. Returns an HTML string suitable for
// dangerouslySetInnerHTML in the chat bubble.
export function aiAnswerCardHtml({ text, citations = [], language }) {
  const body = esc(text || '').replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>')
  const chips = (citations || []).slice(0, 6).map(c =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:${C.brandSubtle};color:${C.brand};font-size:11px;font-weight:600;letter-spacing:0.2px;font-family:${FONT};max-width:100%;white-space:normal;line-height:1.4;overflow-wrap:anywhere;word-break:break-word">📄 ${esc(prettySource(c.source))}${c.section ? ` · ${esc(c.section)}` : ''}</span>`
  ).join('')

  return `<div style="font-family:${FONT};color:${C.textPrimary};max-width:100%;min-width:0;box-sizing:border-box">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textSecondary};text-transform:uppercase;margin-bottom:8px">
      <span style="color:${C.brand}">📚 SwiftChat Knowledge</span>
      <span style="color:${C.textTertiary}">›</span>
      <span>RAG · grounded answer</span>
      ${language ? `<span style="margin-left:auto;background:${C.brandSubtle};color:${C.brand};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:0.3px;white-space:nowrap">${esc(language)}</span>` : ''}
    </div>
    <div style="font-size:14px;line-height:1.55;color:${C.textPrimary};font-weight:500;overflow-wrap:anywhere;word-break:break-word">
      <p style="margin:0">${body || '—'}</p>
    </div>
    ${chips ? `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid ${C.borderSubtle}">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.3px;color:${C.textTertiary};text-transform:uppercase;margin-bottom:6px">Sources</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;max-width:100%">${chips}</div>
    </div>` : ''}
  </div>`
}
