// DigiVritti AI — chat-bubble HTML renderers.
//
// Bot messages in SuperHomePage are rendered via dangerouslySetInnerHTML on
// `msg.html`. Every helper here returns a string of HTML built with the
// SwiftChat semantic tokens. No raw chrome (no headers, no sidebars) — the
// chat bubble is the surface.

const FONT = 'Montserrat, sans-serif'
const C = {
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', surfaceTint: '#ECECEC', brandSubtle: '#EEF2FF',
  brand: '#386AF6', brandSubdued: '#345CCC',
  success: '#00BA34', successText: '#007B22', successBg: '#CCEFBF', successBanner: '#D4F5DC',
  warning: '#F8B200', warningText: '#9A6500', warningBg: '#FDE1AC', warningBanner: '#FFF3CC',
  error: '#EB5757', errorText: '#C0392B', errorBg: '#FDEAEA',
  info: '#84A2F4', infoText: '#345CCC', infoBg: '#C3D2FC',
  // Premium AI surface — subtle indigo-tinted gradient.
  aiCardBg: '#F7F8FF',
  aiCardBorder: '#D5DDF5',
  aiCodeBg: '#0E0E0E',
  aiCodeText: '#A5C8FF',
}

// HTML-escape utility.
function esc(v) {
  if (v == null) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Heuristics for highlighting "important" cells (numbers, percentages, ₹, dates).
function isImportant(value) {
  if (typeof value === 'number') return true
  const s = String(value)
  return /%|₹|\bCr\b|\bL\b|^\d{1,3}(,\d{2,3})+/.test(s)
}

// Format a header — `monsoon_total` → `MONSOON TOTAL`.
function headerLabel(key) {
  return String(key).replace(/_/g, ' ').toUpperCase()
}

// ─── Pipeline label (Natural Language → AI Engine → Results) ─────────────────
export function aiPipelineLabel({ persona } = {}) {
  return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-family:${FONT};font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textSecondary};text-transform:uppercase;margin-bottom:8px;min-width:0;max-width:100%;box-sizing:border-box">
    <span>💬 Natural Language</span>
    <span style="color:${C.textTertiary}">›</span>
    <span style="color:${C.brand}">⚡ AI Analytics Engine</span>
    <span style="color:${C.textTertiary}">›</span>
    <span>📊 Results + 💡 Insight</span>
    ${persona ? `<span style="margin-left:auto;background:${C.brandSubtle};color:${C.brand};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:0.3px;white-space:nowrap">${esc(persona)}</span>` : ''}
  </div>`
}

// ─── SQL block (business / technical) ────────────────────────────────────────
// mode = 'business' → friendly placeholder
// mode = 'technical' → render the actual SQL in a code block
export function aiSqlBlock({ sql, mode = 'business' }) {
  if (mode === 'technical' && sql) {
    return `<div style="margin-top:8px;background:${C.aiCodeBg};border-radius:10px;overflow:hidden;font-family:'SFMono-Regular',Menlo,Consolas,monospace;max-width:100%;min-width:0;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid #1F2233;font-family:${FONT}">
        <span style="font-size:10px;font-weight:700;letter-spacing:0.3px;color:${C.aiCodeText};text-transform:uppercase">🔄 NL → SQL Engine</span>
      </div>
      <pre style="margin:0;padding:12px 14px;color:#E2EAFF;font-size:11px;line-height:18px;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;max-width:100%">${esc(sql)}</pre>
    </div>`
  }
  return `<div style="margin-top:8px;background:${C.brandSubtle};border:1px solid ${C.aiCardBorder};border-radius:10px;padding:10px 12px;font-family:${FONT};max-width:100%;min-width:0;box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
      <span style="font-size:10px;font-weight:700;letter-spacing:0.3px;color:${C.brand};text-transform:uppercase">⚡ AI Analytics Engine</span>
    </div>
    <div style="font-size:11px;color:${C.brandSubdued};line-height:16px">Query auto-generated from natural language using DigiVritti AI engine.</div>
  </div>`
}

// ─── Results table ───────────────────────────────────────────────────────────
export function aiResultsTable({ rows, label = '📊 Results' }) {
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

  // Scroll wrapper: only THIS container scrolls horizontally — never the page.
  // -webkit-overflow-scrolling:touch keeps momentum scrolling on iOS.
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

// ─── AI Insight card ─────────────────────────────────────────────────────────
export function aiInsightCard(text) {
  if (!text) return ''
  return `<div style="margin-top:8px;background:${C.successBanner};border:1px solid ${C.success};border-radius:10px;padding:12px 14px;font-family:${FONT};display:flex;gap:10px;align-items:flex-start;max-width:100%;min-width:0;box-sizing:border-box">
    <span style="font-size:18px;line-height:18px;flex-shrink:0">💡</span>
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.3px;color:${C.successText};text-transform:uppercase;margin-bottom:2px">AI Insight</div>
      <div style="font-size:13px;line-height:1.5;color:${C.successText};font-weight:500;overflow-wrap:anywhere;word-break:break-word">${esc(text)}</div>
    </div>
  </div>`
}

// ─── Deep-dive turn meta-strip ───────────────────────────────────────────────
export function aiDeepDiveProgress({ turnIndex, totalTurns, title }) {
  const n = totalTurns || 3
  const dots = Array.from({ length: n }).map((_, i) =>
    `<span style="width:6px;height:6px;border-radius:999px;background:${i <= turnIndex ? C.brand : C.borderDefault};display:inline-block"></span>`
  ).join('<span style="width:8px;display:inline-block"></span>')
  return `<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:${FONT};font-size:11px;color:${C.textSecondary};letter-spacing:0.2px;max-width:100%;min-width:0">
    <span style="font-weight:700;color:${C.brand};text-transform:uppercase;font-size:10px;white-space:nowrap">Deep Dive</span>
    <span style="color:${C.textTertiary}">›</span>
    <span style="font-weight:600;color:${C.textPrimary};min-width:0;overflow-wrap:anywhere;word-break:break-word">${esc(title)}</span>
    <span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;flex-shrink:0">${dots}<span style="font-weight:600;color:${C.textPrimary};margin-left:4px">Q${turnIndex + 1}/${n}</span></span>
  </div>`
}

// ─── Full AI result card (insight + table + sql in business mode) ────────────
export function aiResultCardHtml({
  question,
  sql,
  result,
  insight,
  category,
  showSql = false,
  persona,
  fallbackNotice = null,
  preview = false,           // when true, only show first 3 rows + "+N more"
  deepDive = null,           // { turnIndex, totalTurns, title } if rendering a deep-dive turn
}) {
  let rows = result || []
  let truncated = false
  if (preview && rows.length > 3) {
    rows = rows.slice(0, 3)
    truncated = true
  }
  const moreNote = truncated
    ? `<div style="padding:8px 14px;font-size:11px;color:${C.textTertiary};font-family:${FONT};text-align:center;border-top:1px solid ${C.borderSubtle};background:${C.surfaceTint}">+ ${result.length - 3} more rows · open the full table</div>`
    : ''
  const tableBlock = aiResultsTable({ rows }).replace(
    '</table></div>',
    `</table></div>${moreNote}`
  )

  return `<div style="font-family:${FONT};color:${C.textPrimary};max-width:100%;min-width:0;box-sizing:border-box;width:100%">
    ${deepDive ? aiDeepDiveProgress(deepDive) : aiPipelineLabel({ persona })}
    ${category ? `<div style="display:inline-block;background:${C.brandSubtle};color:${C.brand};font-size:10px;font-weight:700;letter-spacing:0.3px;padding:3px 9px;border-radius:999px;text-transform:uppercase;margin-bottom:6px">${esc(category)}</div>` : ''}
    <div style="font-size:14px;font-weight:600;line-height:1.4;letter-spacing:-0.1px;color:${C.textPrimary};margin-bottom:4px;overflow-wrap:anywhere;word-break:break-word">${esc(question)}</div>
    ${fallbackNotice ? `<div style="font-size:11px;color:${C.warningText};background:${C.warningBanner};border:1px solid ${C.warning};border-radius:8px;padding:8px 10px;margin-top:6px;margin-bottom:6px;overflow-wrap:anywhere;word-break:break-word">${esc(fallbackNotice)}</div>` : ''}
    ${aiSqlBlock({ sql, mode: showSql ? 'technical' : 'business' })}
    ${tableBlock}
    ${aiInsightCard(insight)}
  </div>`
}

// ─── Question chips list (for AI menu bubble) ────────────────────────────────
export function aiQuestionChipsHtml(queries) {
  if (!queries || queries.length === 0) return ''
  // Group by category for visual clarity.
  const groups = queries.reduce((acc, q) => {
    const cat = q.category || 'General'
    ;(acc[cat] = acc[cat] || []).push(q)
    return acc
  }, {})
  const blocks = Object.entries(groups).map(([cat, list]) => `
    <div style="margin-top:8px;font-family:${FONT}">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.3px;color:${C.textTertiary};text-transform:uppercase;margin-bottom:4px">${esc(cat)}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${list.map(q => `<div style="font-size:13px;color:${C.textPrimary};line-height:18px">• ${esc(q.q)}</div>`).join('')}
      </div>
    </div>
  `).join('')
  return `<div style="font-family:${FONT}">${blocks}</div>`
}

// ─── Deep-dive scenario menu (chat preview list) ─────────────────────────────
export function aiDeepDiveMenuHtml(scenarios) {
  if (!scenarios || scenarios.length === 0) return ''
  return `<div style="font-family:${FONT};display:flex;flex-direction:column;gap:8px;margin-top:10px;max-width:100%;min-width:0">
    ${scenarios.map(s => `
      <div style="border:1px solid ${C.aiCardBorder};border-radius:10px;background:${C.aiCardBg};padding:12px 14px;max-width:100%;min-width:0;box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:10px;font-weight:700;letter-spacing:0.3px;color:${C.brand};text-transform:uppercase">🧠 Deep Dive · ${esc(s.persona)}</span>
          <span style="margin-left:auto;background:${C.surface};color:${C.textSecondary};font-size:10px;font-weight:600;letter-spacing:0.3px;padding:2px 8px;border-radius:999px;border:1px solid ${C.borderSubtle};white-space:nowrap;flex-shrink:0">${(s.turns || []).length || 3} turns</span>
        </div>
        <div style="font-size:13px;font-weight:600;color:${C.textPrimary};margin-bottom:2px;line-height:1.4">${esc(s.entryLabel || s.title)}</div>
        <div style="font-size:11px;color:${C.textSecondary};line-height:1.5">${esc(s.description)}</div>
      </div>
    `).join('')}
  </div>`
}
