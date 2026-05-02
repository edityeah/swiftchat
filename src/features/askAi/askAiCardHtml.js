// Ask AI chat-bubble HTML renderer.
//
// Renders the same visual style as the DigiVritti AI card (pipeline label →
// category chip → question → results table → AI insight) so the two surfaces
// feel like one product. Output is a pure HTML string consumed via
// dangerouslySetInnerHTML inside the chat bubble.

const FONT = 'Montserrat, sans-serif'
const C = {
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', surfaceTint: '#ECECEC',
  brand: '#386AF6', brandSubtle: '#EEF2FF', brandSubdued: '#345CCC',
  success: '#00BA34', successText: '#007B22', successBanner: '#D4F5DC',
  warning: '#F8B200', warningText: '#9A6500', warningBanner: '#FFF3CC',
  ai: '#7C3AED', aiSubtle: '#F4EEFF', aiBorder: '#D8C9F8',
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

function isImportant(value) {
  if (typeof value === 'number') return true
  const s = String(value)
  return /%|₹|\bCr\b|\bL\b|^\d+\s*(pp|min)?$/.test(s) || /^[+-]\d/.test(s)
}

function headerLabel(key) {
  return String(key).replace(/_/g, ' ').toUpperCase()
}

// ─── Pipeline strip — Natural Language → SwiftChat Data → Recommended Action
function askAiPipelineLabel({ persona } = {}) {
  return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-family:${FONT};font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textSecondary};text-transform:uppercase;margin-bottom:8px;min-width:0;max-width:100%;box-sizing:border-box">
    <span>💬 Natural Language</span>
    <span style="color:${C.textTertiary}">›</span>
    <span style="color:${C.brand}">📚 SwiftChat Data</span>
    <span style="color:${C.textTertiary}">›</span>
    <span style="color:${C.ai}">✨ Recommended Action</span>
    ${persona ? `<span style="margin-left:auto;background:${C.aiSubtle};color:${C.ai};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:0.3px;white-space:nowrap;border:1px solid ${C.aiBorder}">${esc(persona)}</span>` : ''}
  </div>`
}

function askAiCategoryChip(category) {
  if (!category) return ''
  return `<div style="display:inline-block;background:${C.aiSubtle};color:${C.ai};font-size:10px;font-weight:700;letter-spacing:0.3px;padding:3px 9px;border-radius:999px;text-transform:uppercase;margin-bottom:6px;border:1px solid ${C.aiBorder}">${esc(category)}</div>`
}

function askAiHeader() {
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-family:${FONT}">
    <span style="font-size:14px;line-height:14px">✨</span>
    <span style="font-size:12px;font-weight:700;letter-spacing:0.4px;color:${C.ai};text-transform:uppercase">Ask AI</span>
  </div>`
}

function askAiResultsTable({ rows, label = '📊 Results' }) {
  if (!rows || rows.length === 0) {
    return `<div style="margin-top:8px;padding:16px;border:1px solid ${C.borderDefault};border-radius:10px;background:${C.surface};color:${C.textTertiary};font-family:${FONT};font-size:13px;text-align:center;max-width:100%;box-sizing:border-box">No data.</div>`
  }
  const keys = Object.keys(rows[0])
  const head = keys.map(k => `<th style="text-align:left;padding:8px 12px;font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textSecondary};text-transform:uppercase;border-bottom:1px solid ${C.borderSubtle};font-family:${FONT};white-space:nowrap">${esc(headerLabel(k))}</th>`).join('')
  const body = rows.map(r => `<tr>${keys.map(k => {
    const v = r[k]
    const important = isImportant(v)
    return `<td style="padding:10px 12px;font-size:13px;color:${important ? C.textPrimary : C.textSecondary};font-weight:${important ? 600 : 500};border-bottom:1px solid ${C.borderSubtle};font-family:${FONT};white-space:nowrap">${esc(v)}</td>`
  }).join('')}</tr>`).join('')

  return `<div style="margin-top:8px;background:${C.surface};border:1px solid ${C.borderDefault};border-radius:10px;overflow:hidden;font-family:${FONT};max-width:100%;min-width:0;box-sizing:border-box">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${C.surface};border-bottom:1px solid ${C.borderSubtle};gap:8px;min-width:0">
      <span style="font-size:12px;font-weight:600;letter-spacing:0.2px;color:${C.textPrimary};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
      <span style="font-size:10px;color:${C.textTertiary};letter-spacing:0.3px;white-space:nowrap;flex-shrink:0">${rows.length} ${rows.length === 1 ? 'row' : 'rows'}${keys.length > 3 ? ' · swipe →' : ''}</span>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%"><table style="border-collapse:collapse;min-width:max-content;width:100%">
      <thead style="background:${C.surfaceTint}"><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table></div>
  </div>`
}

function askAiInsightCard(text) {
  if (!text) return ''
  return `<div style="margin-top:8px;background:${C.successBanner};border:1px solid ${C.success};border-radius:10px;padding:12px 14px;font-family:${FONT};display:flex;gap:10px;align-items:flex-start;max-width:100%;min-width:0;box-sizing:border-box">
    <span style="font-size:18px;line-height:18px;flex-shrink:0">💡</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.3px;color:${C.successText};text-transform:uppercase;margin-bottom:2px">AI Insight</div>
      <div style="font-size:13px;line-height:1.5;color:${C.successText};font-weight:500;overflow-wrap:anywhere;word-break:break-word">${esc(text)}</div>
    </div>
  </div>`
}

// ─── Full Ask AI result card ────────────────────────────────────────────────
export function askAiCardHtml({ question, answer, table, insight, category, persona }) {
  return `<div style="font-family:${FONT};color:${C.textPrimary};max-width:100%;min-width:0;box-sizing:border-box;width:100%">
    ${askAiHeader()}
    ${askAiPipelineLabel({ persona })}
    ${askAiCategoryChip(category)}
    <div style="font-size:14px;font-weight:600;line-height:1.4;letter-spacing:-0.1px;color:${C.textPrimary};margin-bottom:8px;overflow-wrap:anywhere;word-break:break-word">${esc(question)}</div>
    ${answer ? `<div style="font-size:13px;line-height:1.55;color:${C.textPrimary};margin-bottom:6px;overflow-wrap:anywhere;word-break:break-word"><span style="background:${C.brandSubtle};color:${C.brandSubdued};font-size:10px;font-weight:700;letter-spacing:0.3px;padding:2px 8px;border-radius:999px;text-transform:uppercase;margin-right:6px">Answer</span>${esc(answer)}</div>` : ''}
    ${askAiResultsTable({ rows: table })}
    ${askAiInsightCard(insight)}
  </div>`
}

// ─── Greeting bubble used when the user opens Ask AI ────────────────────────
export function askAiGreetingHtml({ userFirstName } = {}) {
  const name = userFirstName ? esc(userFirstName) : 'there'
  return `<div style="font-family:${FONT};color:${C.textPrimary};max-width:100%;min-width:0;box-sizing:border-box;width:100%">
    ${askAiHeader()}
    ${askAiPipelineLabel({ persona: 'SwiftChat AI' })}
    <div style="font-size:14px;font-weight:600;line-height:1.4;color:${C.textPrimary};margin-bottom:6px;overflow-wrap:anywhere;word-break:break-word">Hi ${name}, I'm Ask AI.</div>
    <div style="font-size:13px;line-height:1.55;color:${C.textSecondary};overflow-wrap:anywhere;word-break:break-word">I can help you find risks, spot patterns, and take the next best action across attendance, XAMTA, scholarships, and parent alerts. Choose a prompt or type your own.</div>
  </div>`
}

// (Layered prompt menu removed — Ask AI now reveals chips progressively
//  without layer headings.)
