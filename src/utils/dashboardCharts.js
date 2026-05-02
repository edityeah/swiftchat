// SwiftChat dashboard chart helpers.
//
// Inline-SVG generators (no chart libraries) that return HTML strings safe to
// drop into the existing dangerouslySetInnerHTML cards. All charts honour the
// SwiftChat token palette and degrade cleanly on narrow screens.
//
// Every helper accepts a small props object and returns a string. The CSS
// is inline so there's no global stylesheet pollution; hover tooltips use
// native `<title>` SVG elements.

const C = {
  brand: '#386AF6', brandHover: '#345CCC', brandSubtle: '#EEF2FF',
  brandSubtleStrong: '#C3D2FC', brandSubdued: '#84A2F4',
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', surfaceTint: '#F7F8FF', surfaceRaised: '#FFFFFF',
  success: '#00BA34', successText: '#007B22', successSubtle: '#CCEFBF',
  warning: '#F8B200', warningText: '#9A6500', warningSubtle: '#FDE1AC',
  error:   '#EB5757', errorText:   '#C0392B', errorSubtle:   '#FDEAEA',
  purple: '#7C3AED', purpleSubtle: '#EDE4FE',
  teal: '#0D9488',   tealSubtle: '#D0F0EB',
  pink: '#EC4899',   pinkSubtle: '#FCE7F3',
}

// ─── Layout primitives ─────────────────────────────────────────────────────
const FONT = "'Montserrat', sans-serif"
const card = (body, { padding = 16, mb = 12 } = {}) => `
  <div style="border:1px solid ${C.borderDefault};border-radius:12px;padding:${padding}px;margin-bottom:${mb}px;background:${C.surfaceRaised};box-shadow:0 1px 2px rgba(14,14,14,0.04)">
    ${body}
  </div>`

const cardHeader = (title, sub) => `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
    <div style="min-width:0;flex:1">
      <h4 style="font-size:14px;font-weight:600;letter-spacing:-0.2px;margin:0;color:${C.textPrimary};font-family:${FONT}">${title}</h4>
      ${sub ? `<div style="font-size:11px;color:${C.textTertiary};margin-top:2px;font-family:${FONT}">${sub}</div>` : ''}
    </div>
  </div>`

// Module-level export so dashboards can compose with consistent styling.
export const ui = {
  card, cardHeader,
  panelStart: (style = '') => `<div style="border:1px solid ${C.borderDefault};border-radius:12px;padding:16px;margin-bottom:12px;background:${C.surfaceRaised};box-shadow:0 1px 2px rgba(14,14,14,0.04);${style}">`,
  panelEnd: () => '</div>',
}

// ─── KPI tiles row (responsive grid) ──────────────────────────────────────
// kpis = [{ label, value, sub?, tone?, trend?, icon? }]
//   tone: 'brand' | 'success' | 'warning' | 'error' | 'purple' | 'teal' | 'pink'
//   trend: { delta:'+3.2%', up: bool }
export function kpiGrid(kpis, { columns = 'auto-fit' } = {}) {
  const colCss = columns === 'auto-fit'
    ? 'repeat(auto-fit, minmax(140px, 1fr))'
    : `repeat(${columns}, 1fr)`
  return `<div style="display:grid;grid-template-columns:${colCss};gap:10px;margin-bottom:14px;font-family:${FONT}">${
    kpis.map(k => kpiTile(k)).join('')
  }</div>`
}

function kpiTile(k) {
  const palette = {
    brand:   { fg: C.brand,        bg: C.brandSubtle,    accent: C.brand },
    success: { fg: C.successText,  bg: C.successSubtle,  accent: C.success },
    warning: { fg: C.warningText,  bg: C.warningSubtle,  accent: C.warning },
    error:   { fg: C.errorText,    bg: C.errorSubtle,    accent: C.error },
    purple:  { fg: C.purple,       bg: C.purpleSubtle,   accent: C.purple },
    teal:    { fg: C.teal,         bg: C.tealSubtle,     accent: C.teal },
    pink:    { fg: C.pink,         bg: C.pinkSubtle,     accent: C.pink },
  }[k.tone || 'brand']
  const trendColor = k.trend?.up ? C.successText : C.errorText
  const trendArrow = k.trend?.up ? '▲' : '▼'
  return `<div style="position:relative;border:1px solid ${C.borderDefault};border-radius:12px;padding:14px;background:${C.surfaceRaised};overflow:hidden;min-width:0">
    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${palette.accent}"></div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      ${k.icon ? `<span style="font-size:14px">${k.icon}</span>` : ''}
      <div style="font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textTertiary};text-transform:uppercase">${k.label}</div>
    </div>
    <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
      <div style="font-size:22px;font-weight:700;line-height:26px;color:${palette.fg};font-family:${FONT}">${k.value}</div>
      ${k.trend ? `<span style="font-size:11px;font-weight:600;color:${trendColor};white-space:nowrap">${trendArrow} ${k.trend.delta}</span>` : ''}
    </div>
    ${k.sub ? `<div style="font-size:11px;color:${C.textTertiary};margin-top:2px">${k.sub}</div>` : ''}
  </div>`
}

// ─── Multi-series line chart with gradient fill ────────────────────────────
// series = [{ name, color, values:[number] }]
// labels = string[]   (x-axis)
export function lineChart({ series, labels, height = 180, title, sub, yMax }) {
  const W = 600, H = height, padL = 36, padR = 12, padT = 12, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const allVals = series.flatMap(s => s.values)
  const max = yMax ?? Math.max(...allVals, 1)
  const min = Math.min(0, ...allVals)
  const range = max - min || 1
  const x = (i) => padL + (innerW * i) / Math.max(1, labels.length - 1)
  const y = (v) => padT + innerH - ((v - min) / range) * innerH

  // Gridlines (4 horizontal)
  const grid = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const yy = padT + innerH * (1 - t)
    const v = Math.round(min + range * t)
    return `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${C.borderSubtle}" stroke-width="1"/>
      <text x="${padL - 6}" y="${yy + 3}" font-family="${FONT}" font-size="9" fill="${C.textTertiary}" text-anchor="end">${v}</text>`
  }).join('')

  // X labels — every other if many
  const step = Math.ceil(labels.length / 8)
  const xLabels = labels.map((l, i) => i % step === 0
    ? `<text x="${x(i)}" y="${H - 8}" font-family="${FONT}" font-size="9" fill="${C.textTertiary}" text-anchor="middle">${escape(l)}</text>`
    : '').join('')

  // Each series: gradient area + line + dots with hover tooltip
  let defs = ''
  let layers = ''
  series.forEach((s, idx) => {
    const gid = `lg-${Math.random().toString(36).slice(2, 7)}-${idx}`
    defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${s.color}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>
    </linearGradient>`
    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
    const areaPts = [`${padL},${padT + innerH}`, ...s.values.map((v, i) => `${x(i)},${y(v)}`), `${W - padR},${padT + innerH}`].join(' ')
    layers += `<polygon points="${areaPts}" fill="url(#${gid})"/>
      <polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
      s.values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${s.color}" stroke="${C.surface}" stroke-width="1.5">
        <title>${escape(s.name)} · ${escape(labels[i] || '')}: ${v}</title>
      </circle>`).join('')
  })

  const legend = series.length > 1 ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-family:${FONT}">
    ${series.map(s => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:${C.textSecondary}">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block"></span>${escape(s.name)}
    </span>`).join('')}
  </div>` : ''

  return card(`${title ? cardHeader(title, sub) : ''}
    <div style="width:100%;overflow:hidden">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
        <defs>${defs}</defs>
        ${grid}
        ${layers}
        ${xLabels}
      </svg>
    </div>
    ${legend}`)
}

// ─── Vertical bar chart ───────────────────────────────────────────────────
// items = [{ label, value, color?, sub? }]
export function barChart({ items, height = 160, title, sub, yMax, suffix = '%' }) {
  const W = 600, H = height, padL = 30, padR = 10, padT = 12, padB = 36
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const max = yMax ?? Math.max(...items.map(i => i.value), 1)
  const bw = innerW / items.length * 0.65
  const gap = innerW / items.length * 0.35

  const grid = [0, 0.5, 1].map(t => {
    const yy = padT + innerH * (1 - t)
    return `<line x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}" stroke="${C.borderSubtle}" stroke-width="1"/>`
  }).join('')

  const bars = items.map((it, i) => {
    const h = (it.value / max) * innerH
    const xx = padL + i * (bw + gap) + gap / 2
    const yy = padT + innerH - h
    const fill = it.color || C.brand
    const gid = `bg-${i}-${Math.random().toString(36).slice(2, 6)}`
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${fill}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${fill}" stop-opacity="0.7"/>
      </linearGradient></defs>
      <rect x="${xx}" y="${yy}" width="${bw}" height="${h}" rx="4" fill="url(#${gid})">
        <title>${escape(it.label)}: ${it.value}${suffix}</title>
      </rect>
      <text x="${xx + bw / 2}" y="${yy - 4}" font-family="${FONT}" font-size="10" font-weight="600" fill="${C.textPrimary}" text-anchor="middle">${it.value}${suffix}</text>
      <text x="${xx + bw / 2}" y="${H - 18}" font-family="${FONT}" font-size="10" fill="${C.textSecondary}" text-anchor="middle">${truncate(escape(it.label), 12)}</text>
      ${it.sub ? `<text x="${xx + bw / 2}" y="${H - 6}" font-family="${FONT}" font-size="9" fill="${C.textTertiary}" text-anchor="middle">${escape(it.sub)}</text>` : ''}`
  }).join('')

  return card(`${title ? cardHeader(title, sub) : ''}
    <div style="width:100%;overflow:hidden">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
        ${grid}
        ${bars}
      </svg>
    </div>`)
}

// ─── Horizontal bar chart (good for ranked lists) ─────────────────────────
// items = [{ label, value, color?, sub?, max? }]
export function hBarList({ items, title, sub, suffix = '%', maxValue }) {
  const max = maxValue ?? Math.max(...items.map(i => i.value), 1)
  const rows = items.map(it => {
    const pct = Math.max(2, (it.value / max) * 100)
    const fill = it.color || C.brand
    return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;font-family:${FONT}">
      <div style="flex:0 0 auto;width:120px;font-size:12px;color:${C.textPrimary};font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escape(it.label)}</div>
      <div style="flex:1;height:14px;background:${C.borderSubtle};border-radius:7px;overflow:hidden;position:relative">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, ${fill}, ${fill}dd);border-radius:7px"></div>
      </div>
      <div style="flex:0 0 auto;font-size:12px;font-weight:600;color:${C.textPrimary};min-width:48px;text-align:right">${it.value}${suffix}</div>
    </div>`
  }).join('')
  return card(`${title ? cardHeader(title, sub) : ''}${rows}`)
}

// ─── Donut chart ──────────────────────────────────────────────────────────
// segments = [{ label, value, color? }]
export function donut({ segments, title, sub, centerValue, centerLabel, size = 160 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const radius = size / 2 - 14
  const cx = size / 2, cy = size / 2
  const stroke = 22
  let acc = 0
  const arcs = segments.map((s, i) => {
    const start = acc / total
    const end = (acc + s.value) / total
    acc += s.value
    const a0 = start * 2 * Math.PI - Math.PI / 2
    const a1 = end * 2 * Math.PI - Math.PI / 2
    const large = end - start > 0.5 ? 1 : 0
    const x0 = cx + radius * Math.cos(a0)
    const y0 = cy + radius * Math.sin(a0)
    const x1 = cx + radius * Math.cos(a1)
    const y1 = cy + radius * Math.sin(a1)
    const color = s.color || [C.brand, C.purple, C.success, C.warning, C.teal, C.pink][i % 6]
    return `<path d="M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="butt">
      <title>${escape(s.label)}: ${s.value}</title>
    </path>`
  }).join('')
  const legend = segments.map((s, i) => {
    const color = s.color || [C.brand, C.purple, C.success, C.warning, C.teal, C.pink][i % 6]
    const pct = Math.round(s.value / total * 100)
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-family:${FONT}">
      <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></span>
      <span style="flex:1;font-size:12px;color:${C.textPrimary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escape(s.label)}</span>
      <span style="font-size:12px;font-weight:600;color:${C.textPrimary}">${s.value}</span>
      <span style="font-size:11px;color:${C.textTertiary}">${pct}%</span>
    </div>`
  }).join('')
  const center = `<g>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="700" fill="${C.textPrimary}">${escape(centerValue ?? total)}</text>
    ${centerLabel ? `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${C.textTertiary}">${escape(centerLabel)}</text>` : ''}
  </g>`
  return card(`${title ? cardHeader(title, sub) : ''}
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0">
        ${arcs}${center}
      </svg>
      <div style="flex:1;min-width:140px">${legend}</div>
    </div>`)
}

// ─── Funnel chart (vertical, with conversion %) ───────────────────────────
// stages = [{ label, value, color? }]
export function funnel({ stages, title, sub, suffix = '' }) {
  const max = stages[0]?.value || 1
  const rows = stages.map((s, i) => {
    const pct = (s.value / max) * 100
    const conv = i === 0 ? 100 : Math.round((s.value / stages[0].value) * 100)
    const color = s.color || [C.brand, C.purple, C.teal, C.success, C.warning][i % 5]
    return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;font-family:${FONT}">
      <div style="flex:0 0 auto;width:140px;font-size:12px;color:${C.textPrimary};font-weight:500">${escape(s.label)}</div>
      <div style="flex:1;height:32px;background:${C.borderSubtle};border-radius:8px;overflow:hidden;position:relative">
        <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, ${color}, ${color}cc);border-radius:8px;display:flex;align-items:center;justify-content:flex-end;padding:0 10px;font-size:12px;font-weight:600;color:#fff">${formatNum(s.value)}${suffix}</div>
      </div>
      <div style="flex:0 0 auto;font-size:11px;color:${C.textSecondary};min-width:42px;text-align:right">${conv}%</div>
    </div>`
  }).join('')
  return card(`${title ? cardHeader(title, sub) : ''}${rows}`)
}

// ─── Sparkline (compact inline trend) ─────────────────────────────────────
export function sparkline({ values, color = C.brand, width = 80, height = 22 }) {
  if (!values?.length) return ''
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const x = (i) => (i / (values.length - 1)) * width
  const y = (v) => height - ((v - min) / range) * (height - 4) - 2
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  return `<svg viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:inline-block;vertical-align:middle">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`
}

// ─── Heatmap ──────────────────────────────────────────────────────────────
// rows = [{ label, values:[{label, value}] }]
export function heatmap({ rows, title, sub, scale = 'cool', suffix = '%' }) {
  const colorAt = (v) => {
    // v in 0..100. Returns rgb string.
    const t = Math.max(0, Math.min(1, v / 100))
    if (scale === 'risk') {
      // green → yellow → red
      if (t < 0.5) {
        const k = t * 2
        return `rgb(${Math.round(220 + (252 - 220) * k)}, ${Math.round(244 - (244 - 209) * (1 - k))}, ${Math.round(178 + (96 - 178) * k)})`
      } else {
        const k = (t - 0.5) * 2
        return `rgb(${252}, ${Math.round(209 - 209 * k * 0.5)}, ${Math.round(96 - 96 * k * 0.5)})`
      }
    }
    // cool: light → brand
    return `rgba(56,106,246,${0.08 + t * 0.92})`
  }
  if (!rows.length) return ''
  const colCount = rows[0].values.length
  const cols = rows[0].values.map(v => v.label)
  const head = `<tr>
    <th style="padding:6px 8px"></th>
    ${cols.map(c => `<th style="padding:6px 8px;font-family:${FONT};font-size:10px;color:${C.textTertiary};font-weight:600;letter-spacing:0.3px;text-transform:uppercase;text-align:center">${escape(c)}</th>`).join('')}
  </tr>`
  const body = rows.map(r => `<tr>
    <td style="padding:4px 8px;font-family:${FONT};font-size:12px;color:${C.textPrimary};font-weight:500;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis">${escape(r.label)}</td>
    ${r.values.map(v => `<td style="padding:3px;text-align:center">
      <div style="background:${colorAt(v.value)};color:${v.value > 60 ? '#fff' : C.textPrimary};border-radius:6px;padding:8px 6px;font-family:${FONT};font-size:11px;font-weight:600">${v.value}${suffix}</div>
    </td>`).join('')}
  </tr>`).join('')
  return card(`${title ? cardHeader(title, sub) : ''}
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <table style="width:100%;border-collapse:separate;border-spacing:0;min-width:${colCount * 70 + 140}px">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>`)
}

// ─── Gauge / radial progress ──────────────────────────────────────────────
export function gauge({ value, max = 100, label, sub, color = C.brand, size = 130 }) {
  const r = size / 2 - 12
  const cx = size / 2, cy = size / 2
  const t = Math.max(0, Math.min(1, value / max))
  const a0 = -Math.PI * 0.75
  const a1 = a0 + Math.PI * 1.5
  const aT = a0 + (a1 - a0) * t
  const arc = (start, end, stroke) => {
    const x0 = cx + r * Math.cos(start)
    const y0 = cy + r * Math.sin(start)
    const x1 = cx + r * Math.cos(end)
    const y1 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    return `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${stroke}" stroke-width="14" stroke-linecap="round"/>`
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;font-family:${FONT}">
    <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">
      ${arc(a0, a1, C.borderSubtle)}
      ${arc(a0, aT, color)}
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="${C.textPrimary}">${value}</text>
      <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="${C.textTertiary}">${escape(label || '')}</text>
    </svg>
    ${sub ? `<div style="font-size:11px;color:${C.textSecondary};margin-top:-4px">${escape(sub)}</div>` : ''}
  </div>`
}

// ─── Section header (with optional right-aligned chip) ─────────────────────
export function sectionHeader({ title, subtitle, badge, gradient = false }) {
  const bg = gradient
    ? `background:linear-gradient(135deg, ${C.brand} 0%, ${C.brandHover} 60%, ${C.purple} 100%);color:#fff`
    : `background:${C.surfaceTint};color:${C.textPrimary}`
  const subColor = gradient ? 'rgba(255,255,255,0.85)' : C.textSecondary
  return `<div style="border-radius:14px;padding:18px 20px;margin-bottom:14px;${bg};font-family:${FONT};display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <div style="flex:1;min-width:0">
      <h2 style="font-size:20px;font-weight:700;line-height:24px;margin:0;letter-spacing:-0.3px">${escape(title)}</h2>
      ${subtitle ? `<div style="font-size:12px;font-weight:400;letter-spacing:0.2px;margin-top:4px;color:${subColor}">${escape(subtitle)}</div>` : ''}
    </div>
    ${badge ? `<span style="background:${gradient ? 'rgba(255,255,255,0.2)' : C.brand};color:#fff;font-size:11px;font-weight:600;letter-spacing:0.3px;padding:4px 10px;border-radius:999px;white-space:nowrap">${escape(badge)}</span>` : ''}
  </div>`
}

// ─── Pill (status indicator) ──────────────────────────────────────────────
export function pillTone(value, suffix = '%') {
  let tone = 'success'
  if (value < 60) tone = 'error'
  else if (value < 75) tone = 'warning'
  const palette = {
    success: { bg: C.successSubtle, fg: C.successText },
    warning: { bg: C.warningSubtle, fg: C.warningText },
    error:   { bg: C.errorSubtle,   fg: C.errorText },
  }[tone]
  return `<span style="background:${palette.bg};color:${palette.fg};font-size:11px;font-weight:600;letter-spacing:0.2px;padding:3px 9px;border-radius:999px;font-family:${FONT}">${value}${suffix}</span>`
}

// ─── Mini stat row (icon + label + value) ─────────────────────────────────
export function miniStatRow(items) {
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;font-family:${FONT}">
    ${items.map(i => `<div style="flex:1;min-width:120px;display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:10px;background:${i.bg || C.brandSubtle};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${i.icon || '•'}</div>
      <div style="min-width:0">
        <div style="font-size:11px;color:${C.textTertiary};letter-spacing:0.3px;text-transform:uppercase;font-weight:600">${escape(i.label)}</div>
        <div style="font-size:14px;color:${C.textPrimary};font-weight:600">${escape(i.value)}</div>
      </div>
    </div>`).join('')}
  </div>`
}

// ─── helpers ──────────────────────────────────────────────────────────────
function escape(s) {
  if (s == null) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }
function formatNum(n) {
  if (typeof n !== 'number') return n
  if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr'
  if (n >= 100000) return (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString('en-IN')
}

export const tokens = C
export const fmt = formatNum
