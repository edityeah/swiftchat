// Print-to-PDF "XAMTA Participation Report" — multi-page, single document.
//
// One PDF, one page per subject. Each page mirrors the on-screen
// ParticipationView: donut chart + 4 stat tiles (Enrolled / Appeared /
// Did not appear / Submission %) + the per-student table.
//
// Used by:
//   - Teacher download (all subjects of the teacher's class)
//   - Principal download (all subjects of the selected grade)
//
// The participation data comes from participationForScope() — same source
// as the canvas, so the PDF numbers always match what the user just saw.

import { participationForScope } from '../../data/assessmentData'
import { VSK_LOGO_SVG } from './vskLogo'

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function donutSvg({ pct, tone = 'green' }) {
  // Same dial as the canvas DonutBig component, but inline SVG.
  const stroke = tone === 'red' ? '#B91C1C' : tone === 'amber' ? '#92400E' : '#065F46'
  const r = 48
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return `<svg width="120" height="120" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="14" />
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${stroke}" stroke-width="14"
      stroke-dasharray="${dash} ${c}" stroke-linecap="round" transform="rotate(-90 60 60)" />
    <text x="60" y="60" text-anchor="middle" dominant-baseline="middle"
      style="font:700 22px Montserrat, sans-serif; fill:#0E0E0E">${pct}%</text>
    <text x="60" y="80" text-anchor="middle"
      style="font:500 10px Montserrat, sans-serif; fill:#7383A5">participated</text>
  </svg>`
}

const CSS = `
@media print { @page { size: A4 portrait; margin: 10mm; } }
* { box-sizing: border-box; }
body { font-family: 'Montserrat', system-ui, sans-serif; color: #0E0E0E; margin: 0; padding: 12px; background: #FFFFFF; }
.page { page-break-after: always; padding-bottom: 10px; }
.page:last-child { page-break-after: auto; }

/* Header banner — VSK orange/blue stripe */
.banner {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 3px solid #386AF6;
  padding: 10px 12px; margin-bottom: 10px;
}
.banner .left { display: flex; gap: 12px; align-items: center; }
.banner .crest { width: 60px; line-height: 0; flex-shrink: 0; }
.banner .crest svg { width: 56px; height: auto; display: block; }
.banner h1 { margin: 0; font-size: 18px; color: #F59E0B; font-weight: 800; letter-spacing: 0.04em; }
.banner h2 { margin: 2px 0 0; font-size: 13px; color: #386AF6; font-weight: 700; }
.banner .right { font-size: 11px; color: #828996; text-align: right; line-height: 16px; }

/* Headline row: donut + stat tiles */
.headline { display: flex; align-items: stretch; gap: 12px; margin-bottom: 12px; }
.headline .donut {
  flex: 0 0 140px;
  border: 1px solid #D5D8DF; border-radius: 12px; padding: 10px;
  display: flex; align-items: center; justify-content: center;
  background: #FAFBFC;
}
.headline .tiles { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tile {
  border: 1px solid #E5E7EB; border-radius: 10px; padding: 8px 10px;
  background: #FAFBFC;
}
.tile.green { background: #D1FAE5; border-color: #A7F3D0; color: #065F46; }
.tile.red   { background: #FEE2E2; border-color: #FECACA; color: #B91C1C; }
.tile.amber { background: #FEF3C7; border-color: #FDE68A; color: #92400E; }
.tile.blue  { background: #DBEAFE; border-color: #BFDBFE; color: #1E3A8A; }
.tile .label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.tile .value { font-size: 20px; font-weight: 800; line-height: 22px; margin-top: 2px; }
.tile .sub   { font-size: 9.5px; opacity: 0.85; margin-top: 2px; }

/* Student table */
table.students { width: 100%; border-collapse: collapse; font-size: 10.5px; }
table.students thead tr { background: #386AF6; color: #FFFFFF; }
table.students th { padding: 5px 6px; font-weight: 700; text-align: left; }
table.students th.r { text-align: right; }
table.students th.c { text-align: center; }
table.students td { padding: 4px 6px; border-bottom: 1px solid #E5E7EB; }
table.students td.r { text-align: right; }
table.students td.c { text-align: center; }
table.students td.mono { font-family: ui-monospace, monospace; color: #7383A5; font-size: 9.5px; }
table.students tfoot tr { background: #1E3A8A; color: #FFFFFF; font-weight: 700; }
table.students tfoot td { padding: 5px 6px; }
.tone-pill {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700;
}
.tone-green { background: #D1FAE5; color: #065F46; }
.tone-amber { background: #FEF3C7; color: #92400E; }
.tone-red   { background: #FEE2E2; color: #B91C1C; }
.tone-grey  { background: #F1F5F9; color: #7383A5; }
.ews-tag { display: inline-block; margin-left: 4px; padding: 0 4px; border-radius: 999px; background: #FEF2F2; color: #B91C1C; font-size: 8.5px; font-weight: 700; }

.footer { margin-top: 12px; font-size: 9.5px; color: #828996; display: flex; justify-content: space-between; }
`

function statTone(pct, target = 95) {
  if (pct >= target) return 'green'
  if (pct >= target - 10) return 'amber'
  return 'red'
}

function studentRowsHtml(rows) {
  return rows.map(s => {
    const cls = !s.participated ? 'tone-grey'
              : s.score >= 75   ? 'tone-green'
              : s.score >= 50   ? 'tone-amber'
              :                   'tone-red'
    return `<tr>
      <td>${esc(s.name)}${s.ewsFlag ? '<span class="ews-tag">EWS</span>' : ''}</td>
      <td class="mono">${esc(s.ssmid ?? s.id ?? '')}</td>
      <td class="c">${s.participated ? '✓' : '—'}</td>
      <td class="r"><span class="tone-pill ${cls}">${s.participated ? s.score + '%' : 'N/A'}</span></td>
      <td class="r">${s.delta != null ? (s.delta > 0 ? '+' : '') + s.delta : '—'}</td>
    </tr>`
  }).join('')
}

function pageHtml({ subject, grade, scopeLabel, school, rows }) {
  const participated = rows.filter(r => r.participated).length
  const total = rows.length
  const absent = total - participated
  const pct = total ? +((participated / total) * 100).toFixed(1) : 0
  const tone = statTone(pct, 95)

  return `<div class="page">
  <div class="banner">
    <div class="left">
      <div class="crest">${VSK_LOGO_SVG}</div>
      <div>
        <h1>XAMTA PARTICIPATION REPORT</h1>
        <h2>${esc(subject)} · Class ${esc(grade)}</h2>
      </div>
    </div>
    <div class="right">
      <div><b>${esc(school?.name || '')}</b></div>
      <div>${esc(scopeLabel)}</div>
      <div>Semester II Exam 2024-25</div>
    </div>
  </div>

  <div class="headline">
    <div class="donut">${donutSvg({ pct, tone })}</div>
    <div class="tiles">
      <div class="tile blue"><div class="label">Enrolled</div><div class="value">${total}</div><div class="sub">total students</div></div>
      <div class="tile green"><div class="label">Appeared</div><div class="value">${participated}</div><div class="sub">submitted</div></div>
      <div class="tile red"><div class="label">Did not appear</div><div class="value">${absent}</div><div class="sub">absent / no submission</div></div>
      <div class="tile ${tone}"><div class="label">Submission ✓</div><div class="value">${pct}%</div><div class="sub">target 95%</div></div>
    </div>
  </div>

  <table class="students">
    <thead><tr>
      <th>Student name</th>
      <th>SSMID</th>
      <th class="c">Appeared</th>
      <th class="r">Score</th>
      <th class="r">Δ vs prev</th>
    </tr></thead>
    <tbody>${studentRowsHtml(rows)}</tbody>
    <tfoot><tr>
      <td>TOTAL · ${total} students</td>
      <td></td>
      <td class="c">${participated}</td>
      <td class="r">${pct}%</td>
      <td></td>
    </tr></tfoot>
  </table>
</div>`
}

// `subjects` is the ordered list of subjects to include (one page each).
// `getRowsForSubject(subject)` returns the student rows for that subject —
// caller passes a closure that uses participationForScope so the canvas
// state determines what shows up.
export function openParticipationPdf({
  title = 'XAMTA Participation Report',
  grade, subjects, school, scopeLabel,
  // Pre-built per-subject row sets. If absent, we compute via the closure.
  getRowsForSubject,
}) {
  const pages = subjects.map(subject => {
    const rows = getRowsForSubject(subject)
    return pageHtml({ subject, grade, scopeLabel, school, rows })
  }).join('')

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body>
${pages}
<div class="footer">
  <span>Vidya Samiksha Kendra · Gujarat Council of School Education</span>
  <span>Generated ${new Date().toLocaleString('en-IN')}</span>
</div>
<script>setTimeout(() => window.print(), 350);</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.html`
    a.click()
    return
  }
  w.document.open(); w.document.write(html); w.document.close()
}

// Convenience wrapper for Teacher/Principal — pulls rows via
// participationForScope for each subject in turn.
export function openParticipationPdfForScope({ scope, role, profile, grade, subjects, school }) {
  return openParticipationPdf({
    title: `XAMTA Participation Report · Class ${grade}`,
    grade,
    subjects,
    school,
    scopeLabel: scope === 'class' ? `Class ${grade}` : `${school?.name || profile?.school || 'School'} · Class ${grade}`,
    getRowsForSubject: (subject) => {
      const data = participationForScope({ scope, role, profile, subject, grade })
      return data.rows
    },
  })
}
