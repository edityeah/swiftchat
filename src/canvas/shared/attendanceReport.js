// Print-to-PDF attendance reports — modeled on the official VSK Power BI
// "Student Attendance Report" / "Teacher Attendance Report" layouts.
//
// Why a print window, not a real PDF library?
//   No dep, no server work. The browser's built-in `Print → Save as PDF`
//   produces a clean, paginated, ready-to-share PDF from the same HTML.
//   For CSV the user already gets a downloadable file from /api/export
//   (kept simple — a Blob URL).

import { VSK_LOGO_SVG } from './vskLogo'
const VSK_LOGO = VSK_LOGO_SVG

function fmtDate(d) {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Tone classes for the % cells — green ≥ 85, amber 60–84, red < 60.
function tone(pct) {
  if (pct == null) return 'cell-na'
  if (pct >= 85) return 'cell-green'
  if (pct >= 60) return 'cell-amber'
  return 'cell-red'
}

const CSS = `
@media print { @page { size: A4 landscape; margin: 12mm; } }
* { box-sizing: border-box; }
body { font-family: 'Montserrat', system-ui, sans-serif; color: #0E0E0E; margin: 0; padding: 24px; background: #FFFFFF; }
.header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #386AF6; padding-bottom: 10px; margin-bottom: 14px; }
.header .crest { width: 64px; height: auto; line-height: 0; flex-shrink: 0; }
.header .crest svg { width: 64px; height: auto; display: block; }
.header h1 { margin: 0; font-size: 22px; color: #F59E0B; font-weight: 800; text-align: center; }
.header .sub { font-size: 11px; color: #828996; text-align: right; letter-spacing: 0.04em; }
.filters { display: flex; gap: 24px; margin-bottom: 12px; font-size: 12px; color: #0E0E0E; }
.filters b { color: #386AF6; font-weight: 700; margin-right: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
thead tr { background: #386AF6; color: #FFFFFF; }
thead th { padding: 8px 6px; text-align: center; font-weight: 700; }
tbody td { padding: 6px 5px; border-bottom: 1px solid #E5E7EB; text-align: center; }
tbody td.left { text-align: left; font-weight: 600; padding-left: 10px; }
tfoot tr { background: #1E3A8A; color: #FFFFFF; font-weight: 700; }
tfoot td { padding: 8px 6px; text-align: center; }
.cell-green { background: #86EFAC; color: #065F46; font-weight: 700; }
.cell-amber { background: #FBBF24; color: #92400E; font-weight: 700; }
.cell-red   { background: #FCA5A5; color: #B91C1C; font-weight: 700; }
.cell-na    { background: #F1F5F9; color: #94A3B8; }
.footer { margin-top: 16px; font-size: 9.5px; color: #828996; display: flex; justify-content: space-between; }
.tag { display: inline-block; padding: 2px 6px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }
.tag.high { background: #FEE2E2; color: #B91C1C; }
.tag.medium { background: #FEF3C7; color: #92400E; }
.tag.low { background: #D1FAE5; color: #065F46; }
.tag.ews { background: #FEF2F2; color: #B91C1C; margin-left: 4px; }
.note { font-size: 11px; color: #7383A5; margin-top: 6px; }
`

// Open a print window with a Student Attendance Report. `rows` is an array
// of { name, ssmid, present, absent, working, pct, risk, ews }.
export function openStudentAttendanceReport({
  title = 'Student Attendance Report',
  scopeLabel = '',
  schoolName = '',
  dateFrom, dateTo,
  rows = [],
  totals,
}) {
  const t = totals || rows.reduce((acc, r) => ({
    present: acc.present + r.present,
    absent:  acc.absent  + r.absent,
    working: acc.working + r.working,
    students: acc.students + 1,
  }), { present: 0, absent: 0, working: 0, students: 0 })

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${CSS}</style></head><body>
  <div class="header">
    <div><div class="crest">${VSK_LOGO}</div></div>
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">VSK Gujarat<br/>${fmtDate(dateTo)}</div>
  </div>
  <div class="filters">
    <div><b>Scope:</b> ${escapeHtml(scopeLabel || '—')}</div>
    ${schoolName ? `<div><b>School:</b> ${escapeHtml(schoolName)}</div>` : ''}
    <div><b>Window:</b> ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;padding-left:10px">Name</th>
      <th>Student ID</th>
      <th>Working days</th>
      <th>Present</th>
      <th>Absent</th>
      <th>Attendance %</th>
      <th>Risk</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => `<tr>
        <td class="left">${escapeHtml(r.name)}${r.ews ? '<span class="tag ews">EWS</span>' : ''}</td>
        <td style="font-family:ui-monospace,monospace">${escapeHtml(r.ssmid)}</td>
        <td>${r.working}</td>
        <td>${r.present}</td>
        <td>${r.absent}</td>
        <td class="${tone(r.pct)}">${r.pct == null ? '—' : r.pct.toFixed(1) + '%'}</td>
        <td><span class="tag ${r.risk || 'low'}">${(r.risk || 'low').toUpperCase()}</span></td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="2" style="text-align:left;padding-left:10px">TOTAL · ${t.students} students</td>
      <td>${t.working}</td>
      <td>${t.present}</td>
      <td>${t.absent}</td>
      <td>${t.working ? ((t.present / t.working) * 100).toFixed(1) : '—'}%</td>
      <td>—</td>
    </tr></tfoot>
  </table>
  <div class="note">Risk = composite of attendance + EWS flag. Student ID is the 18-digit Gujarat student tracking number. All data synthesised for prototype.</div>
  <div class="footer">
    <span>Vidya Samiksha Kendra · Gujarat Council of School Education</span>
    <span>Generated ${new Date().toLocaleString('en-IN')}</span>
  </div>
  <script>setTimeout(() => window.print(), 250);</script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) {
    // Pop-up blocked — fall back to data URL download.
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.html`
    a.click()
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

// District-level Teacher Attendance Report (matches the second screenshot).
export function openTeacherAttendanceReport({
  title = 'Teacher Attendance Report',
  schoolCategory = 'All',
  management = 'All',
  asOfDate = new Date(),
  rows = [], // [{ district, total, submitted, pending, present, absent }]
}) {
  const total = rows.reduce((acc, r) => ({
    total: acc.total + r.total, submitted: acc.submitted + r.submitted,
    pending: acc.pending + r.pending, present: acc.present + (r.present || 0),
  }), { total: 0, submitted: 0, pending: 0, present: 0 })

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${CSS}</style></head><body>
  <div class="header">
    <div><div class="crest">${VSK_LOGO}</div></div>
    <h1 style="color:#386AF6">${escapeHtml(title)}</h1>
    <div class="sub">VSK Gujarat<br/>${fmtDate(asOfDate)}</div>
  </div>
  <div class="filters">
    <div><b>School category:</b> ${escapeHtml(schoolCategory)}</div>
    <div><b>School management:</b> ${escapeHtml(management)}</div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;padding-left:10px">District</th>
      <th>Total teachers</th>
      <th>Submitted</th>
      <th>% Submitted</th>
      <th>Pending</th>
      <th>% Pending</th>
      <th>Present</th>
      <th>% Present</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => {
        const subPct = r.total ? +((r.submitted / r.total) * 100).toFixed(2) : 0
        const penPct = r.total ? +((r.pending / r.total) * 100).toFixed(2)   : 0
        const presPct = r.submitted ? +(((r.present || 0) / r.submitted) * 100).toFixed(2) : null
        return `<tr>
          <td class="left">${escapeHtml(r.district)}</td>
          <td>${r.total}</td>
          <td>${r.submitted}</td>
          <td class="${subPct < 5 ? 'cell-red' : subPct < 30 ? 'cell-amber' : 'cell-green'}">${subPct.toFixed(2)}%</td>
          <td>${r.pending}</td>
          <td class="${penPct > 80 ? 'cell-red' : penPct > 50 ? 'cell-amber' : 'cell-green'}">${penPct.toFixed(2)}%</td>
          <td>${r.present ?? '—'}</td>
          <td class="${presPct == null ? 'cell-na' : tone(presPct)}">${presPct == null ? '—' : presPct.toFixed(2) + '%'}</td>
        </tr>`
      }).join('')}
    </tbody>
    <tfoot><tr>
      <td class="left">TOTAL</td>
      <td>${total.total}</td>
      <td>${total.submitted}</td>
      <td>${total.total ? ((total.submitted / total.total) * 100).toFixed(2) : '0.00'}%</td>
      <td>${total.pending}</td>
      <td>${total.total ? ((total.pending / total.total) * 100).toFixed(2) : '0.00'}%</td>
      <td>${total.present}</td>
      <td>${total.submitted ? ((total.present / total.submitted) * 100).toFixed(2) : '—'}%</td>
    </tr></tfoot>
  </table>
  <div class="footer">
    <span>Vidya Samiksha Kendra · Gujarat Council of School Education</span>
    <span>Generated ${new Date().toLocaleString('en-IN')}</span>
  </div>
  <script>setTimeout(() => window.print(), 250);</script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open(); w.document.write(html); w.document.close()
}

// Print-friendly School / District-list Attendance Report. Used at cluster,
// block, district and state scopes where each row is a school or district
// rather than a single student. Columns mirror the official VSK Power BI
// "Overall School Level Attendance" view.
//
// `rows` is an array of either:
//   { entity, code, totalStudents, present, absent, pct, submitted, total }
// — `entity` is the school or district name. `code` is the UDISE / district
//   code (or '—'). `submitted` + `total` populate the submission column when
//   we have it (otherwise we leave it blank).
export function openScopeAttendanceReport({
  title = 'Attendance Report',
  scopeLabel = '',
  scopeFilter = '',
  dateFrom, dateTo,
  entityNoun = 'School',
  rows = [],
}) {
  const t = rows.reduce((acc, r) => ({
    totalStudents: acc.totalStudents + (r.totalStudents || 0),
    present:       acc.present       + (r.present       || 0),
    absent:        acc.absent        + (r.absent        || 0),
    submitted:     acc.submitted     + (r.submitted     || 0),
    total:         acc.total         + (r.total         || 0),
  }), { totalStudents: 0, present: 0, absent: 0, submitted: 0, total: 0 })
  const hasSubmission = rows.some(r => r.submitted != null)
  const aggregatePct  = t.totalStudents ? +((t.present / (t.present + t.absent)) * 100).toFixed(2) : null

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${CSS}</style></head><body>
  <div class="header">
    <div><div class="crest">${VSK_LOGO}</div></div>
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">VSK Gujarat<br/>${fmtDate(dateTo)}</div>
  </div>
  <div class="filters">
    <div><b>Scope:</b> ${escapeHtml(scopeLabel || '—')}</div>
    ${scopeFilter ? `<div><b>Filter:</b> ${escapeHtml(scopeFilter)}</div>` : ''}
    <div><b>Window:</b> ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}</div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;padding-left:10px">${escapeHtml(entityNoun)}</th>
      <th>${escapeHtml(entityNoun)} code</th>
      <th>Total students</th>
      ${hasSubmission ? '<th>Submitted</th><th>% Submitted</th>' : ''}
      <th>Present</th>
      <th>Absent</th>
      <th>Attendance %</th>
    </tr></thead>
    <tbody>
      ${rows.map(r => {
        const subPct = r.total ? +(((r.submitted || 0) / r.total) * 100).toFixed(2) : null
        return `<tr>
          <td class="left">${escapeHtml(r.entity)}</td>
          <td style="font-family:ui-monospace,monospace">${escapeHtml(r.code || '—')}</td>
          <td>${(r.totalStudents ?? '—').toLocaleString?.() ?? r.totalStudents ?? '—'}</td>
          ${hasSubmission ? `<td>${r.submitted ?? '—'}</td><td class="${subPct == null ? 'cell-na' : subPct >= 95 ? 'cell-green' : subPct >= 70 ? 'cell-amber' : 'cell-red'}">${subPct == null ? '—' : subPct + '%'}</td>` : ''}
          <td>${(r.present ?? '—').toLocaleString?.() ?? r.present ?? '—'}</td>
          <td>${(r.absent  ?? '—').toLocaleString?.() ?? r.absent  ?? '—'}</td>
          <td class="${tone(r.pct)}">${r.pct == null ? '—' : r.pct.toFixed(1) + '%'}</td>
        </tr>`
      }).join('')}
    </tbody>
    <tfoot><tr>
      <td colspan="2" style="text-align:left;padding-left:10px">TOTAL · ${rows.length} ${entityNoun.toLowerCase()}${rows.length === 1 ? '' : 's'}</td>
      <td>${t.totalStudents.toLocaleString()}</td>
      ${hasSubmission ? `<td>${t.submitted.toLocaleString()}</td><td>${t.total ? ((t.submitted / t.total) * 100).toFixed(2) : '—'}%</td>` : ''}
      <td>${t.present.toLocaleString()}</td>
      <td>${t.absent.toLocaleString()}</td>
      <td>${aggregatePct == null ? '—' : aggregatePct.toFixed(2) + '%'}</td>
    </tr></tfoot>
  </table>
  <div class="note">Aggregate ${entityNoun.toLowerCase()}-level rollup from Smart Attendance System (OAS). All numbers synthesised for prototype unless connected to the live pipeline.</div>
  <div class="footer">
    <span>Vidya Samiksha Kendra · Gujarat Council of School Education</span>
    <span>Generated ${new Date().toLocaleString('en-IN')}</span>
  </div>
  <script>setTimeout(() => window.print(), 250);</script>
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
  w.document.open()
  w.document.write(html)
  w.document.close()
}

// CSV download — same row schema as the student report.
export function downloadStudentAttendanceCsv({ rows, scopeLabel = 'class', dateFrom, dateTo }) {
  const header = ['Name', 'Student ID', 'Working days', 'Present', 'Absent', 'Attendance %', 'Risk']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      `"${(r.name || '').replace(/"/g, '""')}"`,
      r.ssmid || '',
      r.working, r.present, r.absent,
      r.pct == null ? '' : r.pct.toFixed(1),
      r.risk || '',
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `student_attendance_${scopeLabel}_${fmtDate(dateFrom).replace(/\s/g, '-')}_to_${fmtDate(dateTo).replace(/\s/g, '-')}.csv`
  a.click()
}
