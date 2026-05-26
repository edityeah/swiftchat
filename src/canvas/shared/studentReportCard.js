// Print-to-PDF Student Report Card. Modeled on the official GCERT /
// Samagra Shiksha "STUDENT REPORT CARD" (SEMESTER II EXAM 2024-25) — see
// the reference PDF the user shared.
//
// One report card per subject (the official PDF does one subject per page).
// We render an all-subjects multi-page document so a single click downloads
// the full term card.

import { subjectsForGrade, getStudentAssessment } from '../../data/assessmentData'
import { VSK_LOGO_SVG } from './vskLogo'

const CSS = `
@media print { @page { size: A4 portrait; margin: 10mm; } }
* { box-sizing: border-box; }
body { font-family: 'Montserrat', system-ui, sans-serif; color: #0E0E0E; margin: 0; padding: 12px; background: #FFFFFF; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }

/* Header band — tan with two logos and a centred title pill */
.banner {
  background: #FFF5E0; border: 1px solid #F2D7A4;
  padding: 8px 14px; border-radius: 8px;
  display: flex; align-items: center; gap: 14px;
}
.banner .logo {
  width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; flex-shrink: 0; line-height: 0;
}
.banner .logo svg { width: 56px; height: auto; display: block; }
.banner .title {
  flex: 1; text-align: center;
}
.banner .title .pill {
  display: inline-block; padding: 6px 24px;
  background: #1F4E79; color: #FFFFFF;
  border-radius: 999px; font-weight: 700; font-size: 14px;
  letter-spacing: 0.08em;
}
.banner .title .sem {
  margin-top: 6px; font-size: 12px; color: #333;
  display: flex; justify-content: center; gap: 18px;
}
.banner .title .sem span { padding: 3px 14px; border: 1px solid #DDD; border-radius: 999px; background: #FFFFFF; }

/* Identity panel — red on white labels (GCERT style) */
.identity {
  background: #B91C1C; color: #FFFFFF;
  padding: 12px; border-radius: 8px; margin-top: 8px;
}
.identity .grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 8px; }
.identity .row { display: flex; align-items: center; gap: 6px; font-size: 11.5px; }
.identity .row .key {
  background: #F59E0B; color: #FFFFFF;
  padding: 3px 10px; border-radius: 999px; font-weight: 700; font-size: 10.5px;
  min-width: 95px; text-align: center;
}
.identity .row .val { font-weight: 600; }

/* Section banner */
.section { background: #1F4E79; color: #FFFFFF; text-align: center; padding: 7px; border-radius: 6px; margin-top: 10px; font-weight: 700; font-size: 13px; }

/* LO table */
table.lo { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 4px; }
table.lo thead tr { background: #386AF6; color: #FFFFFF; }
table.lo th { padding: 6px 5px; font-weight: 700; }
table.lo td { padding: 6px 5px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
table.lo td.q { text-align: center; font-weight: 700; width: 44px; background: #FAFBFC; }
table.lo td.link { text-align: center; }
table.lo td.link a { color: #386AF6; font-weight: 700; text-decoration: underline; }
table.lo td.mark, table.lo td.total { text-align: center; width: 60px; font-weight: 700; }

/* Remarks block */
.remarks { background: #FFFFFF; border: 1px solid #E5E7EB; padding: 10px; border-radius: 6px; font-size: 11px; margin-top: 6px; line-height: 16px; }
.remarks b { color: #0E0E0E; }
.remarks .strong { color: #065F46; font-weight: 700; }
.remarks .weak   { color: #B91C1C; font-weight: 700; }

/* Sign block */
.signs { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 11px; }
.signs .row { display: flex; justify-content: flex-end; gap: 22px; }
.signs .row span { border-bottom: 1px solid #888; padding: 2px 80px 2px 0; }
`

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function age(dob) {
  if (!dob) return ''
  const d = new Date(dob)
  if (isNaN(+d)) return ''
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000))
}

function pageHtml({ student, school, subject, assessment }) {
  // Split into achievements (mark/total >= 50%) and remedial (< 50%).
  const all = assessment.los
  const achievements = all.filter(l => l.mark / l.total >= 0.5)
  const remedial     = all.filter(l => l.mark / l.total < 0.5)
  // Stronger / weaker pick for the remarks paragraph
  const strongest = [...all].sort((a, b) => (b.mark / b.total) - (a.mark / a.total))[0]
  const weakest   = [...all].sort((a, b) => (a.mark / a.total) - (b.mark / b.total))[0]

  return `<div class="page">
  <div class="banner">
    <div class="logo">${VSK_LOGO_SVG}</div>
    <div class="title">
      <div class="pill">STUDENT REPORT CARD</div>
      <div class="sem">
        <span>SEMESTER II EXAM 2024-25</span>
      </div>
      <div class="sem">
        <span>STD: ${esc(student.grade)}</span>
        <span>Subject: ${esc(subject)}</span>
      </div>
    </div>
    <div class="logo">📚</div>
  </div>

  <div class="identity">
    <div class="grid">
      <div class="row"><span class="key">STUDENT</span><span class="val">${esc(student.name)}</span></div>
      <div class="row"><span class="key">SCHOOL</span><span class="val">${esc(school.name)}</span></div>
      <div class="row"><span class="key">CHILD UID</span><span class="val">${esc(student.ssmid)}</span></div>
      <div class="row"><span class="key">UDISE CODE</span><span class="val">${esc(school.udise || '—')}</span></div>
      <div class="row"><span class="key">DISTRICT</span><span class="val">${esc(school.district || '—')}</span></div>
      <div class="row"><span class="key">BLOCK NAME</span><span class="val">${esc(school.block || '—')}</span></div>
      <div class="row"><span class="key">CLUSTER</span><span class="val">${esc(school.cluster || '—')}</span></div>
      <div class="row"><span class="key">SUB.TEACHER</span><span class="val">${esc(school.subjectTeacher || '—')}</span></div>
      <div class="row"><span class="key">Age</span><span class="val">${esc(age(student.dob) || '—')}</span></div>
      <div class="row"><span class="key">Gender</span><span class="val">${esc(student.gender === 'F' ? 'Female' : 'Male')}</span></div>
    </div>
  </div>

  <div class="section">Achievements (Siddhio)</div>
  <table class="lo">
    <thead><tr>
      <th>Q. No.</th><th style="text-align:left">Learning outcome</th><th>G-Shala link</th><th>Marks</th><th>Total</th>
    </tr></thead>
    <tbody>
      ${achievements.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:#7383A5;padding:14px">No achievements recorded for this subject.</td></tr>`
        : achievements.map((lo, i) => `<tr>
            <td class="q">Q.${i + 1}</td>
            <td>${esc(lo.outcome)}</td>
            <td class="link"><a href="#">Click Here</a></td>
            <td class="mark">${lo.mark}</td>
            <td class="total">${lo.total}</td>
          </tr>`).join('')}
    </tbody>
  </table>

  <div class="section">Remedial actions needed (Aavashyak Upcharatmak Karya)</div>
  <table class="lo">
    <thead><tr>
      <th>Q. No.</th><th style="text-align:left">Learning outcome</th><th>G-Shala link</th><th>Marks</th><th>Total</th>
    </tr></thead>
    <tbody>
      ${remedial.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:#065F46;padding:14px">No remedial work needed. Strong performance across all LOs.</td></tr>`
        : remedial.map((lo, i) => `<tr>
            <td class="q">Q.${i + 1}</td>
            <td>${esc(lo.outcome)}</td>
            <td class="link"><a href="#">Click Here</a></td>
            <td class="mark">${lo.mark}</td>
            <td class="total">${lo.total}</td>
          </tr>`).join('')}
    </tbody>
  </table>

  <div class="section">Remarks (Rimarks)</div>
  <div class="remarks">
    <b>${esc((student.name || '').toUpperCase())}</b> has
    ${strongest ? `<span class="strong">mastered "${esc(strongest.outcome)}"</span>` : 'shown effort across the syllabus'}
    ${remedial.length > 0 ? `but
      <span class="weak">needs support on "${esc(weakest.outcome)}"</span>.
      ${remedial.length} learning outcome${remedial.length === 1 ? '' : 's'} require remedial work — please use the G-SHALA app
      to access supplementary material for each LO via the links above.`
      : '. Excellent performance overall — keep up the momentum!'}
  </div>

  <div class="signs">
    <div class="row"><span></span></div>
    <div class="row">
      <span>Class Teacher signature</span>
    </div>
    <div class="row">
      <span>Headmaster / Principal signature</span>
    </div>
    <div class="row">
      <span>Parent signature</span>
    </div>
  </div>
</div>`
}

// Generate the full multi-subject report card for one student.
// `student` should already include grade, dob, gender, name, ssmid.
// `school` should include name, udise, district, block, cluster.
export function openStudentReportCard({ student, school, subjects }) {
  const subjList = subjects && subjects.length
    ? subjects
    : subjectsForGrade(student.grade)

  const pages = subjList.map(subject => {
    const assessment = getStudentAssessment(student, subject)
    return assessment.participated
      ? pageHtml({ student, school, subject, assessment })
      : `<div class="page">
          <div class="banner"><div class="logo">${VSK_LOGO_SVG}</div><div class="title">
            <div class="pill">STUDENT REPORT CARD</div>
            <div class="sem"><span>STD: ${esc(student.grade)}</span><span>Subject: ${esc(subject)}</span></div>
          </div><div class="logo">📚</div></div>
          <div class="identity">
            <div class="grid">
              <div class="row"><span class="key">STUDENT</span><span class="val">${esc(student.name)}</span></div>
              <div class="row"><span class="key">SCHOOL</span><span class="val">${esc(school.name)}</span></div>
            </div>
          </div>
          <div class="section">Absent / Not appeared</div>
          <div class="remarks">No assessment recorded for ${esc(subject)} in this semester.</div>
        </div>`
  })

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(student.name)} — Student Report Card</title><style>${CSS}</style></head>
<body>${pages.join('')}
<script>setTimeout(() => window.print(), 300);</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    const blob = new Blob([html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(student.name || 'student').replace(/\s+/g, '_')}_report_card.html`
    a.click()
    return
  }
  w.document.open(); w.document.write(html); w.document.close()
}

// Bulk: produce a multi-student print PDF (one page per student per subject).
// Used by "Download all report cards" on the Assessment Result canvas.
export function openBulkStudentReportCards({ students, school, subjectsFilter, perStudentSubjects }) {
  const pages = []
  for (const stu of students) {
    const subjList = subjectsFilter && subjectsFilter.length
      ? subjectsFilter
      : (perStudentSubjects ? perStudentSubjects(stu) : subjectsForGrade(stu.grade))
    for (const subject of subjList) {
      const a = getStudentAssessment(stu, subject)
      if (!a.participated) continue
      pages.push(pageHtml({ student: stu, school, subject, assessment: a }))
    }
  }
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(school?.name || 'School')} — Report cards</title><style>${CSS}</style></head>
<body>${pages.join('')}
<script>setTimeout(() => window.print(), 300);</script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open(); w.document.write(html); w.document.close()
}
