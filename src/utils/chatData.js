export function getBotList(role) {
  switch (role) {
    case 'teacher': return [
      { id: 'swift',      icon: '🐦', bg: '#EEF2FF', name: 'SwiftChat',       msg: 'Ravi 74% — at risk for Namo Laxmi · 6 absences',       time: 'Now',       unread: 2 },
      { id: 'xamta',      icon: '📝', bg: '#E8F5E9', name: 'XAMTA',           msg: 'Scan & grade Class 6-B — 38 papers pending',             time: '10:30',     unread: 1 },
      { id: 'att',        icon: '📅', bg: '#FFF8E1', name: 'Attendance',      msg: 'Today: 34/38 present · 4 absent',                        time: '9:00',      unread: 0 },
      { id: 'namo_laxmi', icon: '🏅', bg: '#F3E5F5', name: 'Namo Laxmi',     msg: '3 students need documentation',                          time: '8:00',      unread: 3 },
      { id: 'ews',        icon: '⚠️', bg: '#FFEBEE', name: 'EWS Alert',       msg: '3 students flagged in Class 6-B',                        time: 'Yesterday', unread: 0 },
      { id: 'tmsg',       icon: '💬', bg: '#E3F2FD', name: 'Parent Messages', msg: "Ravi's parent responded · 2 unread",                     time: '5:00 PM',   unread: 2 },
    ]
    case 'principal': return [
      { id: 'swift',     icon: '🐦', bg: '#EEF2FF', name: 'SwiftChat',        msg: 'School 88% today · 34 parent alerts sent',               time: 'Now',   unread: 2 },
      { id: 'att',       icon: '📅', bg: '#E8F5E9', name: 'School Attendance',msg: '88% today · Class 6-B lowest at 74%',                    time: '9:15',  unread: 1 },
      { id: 'parentbot', icon: '📨', bg: '#F3E5F5', name: 'Parent Outreach',  msg: '34 sent · 12 acknowledged · 3 callback requests',        time: '5 PM',  unread: 0 },
    ]
    case 'deo': return [
      { id: 'swift',   icon: '🐦', bg: '#EEF2FF', name: 'VSK Intelligence',   msg: '🔴 Daskroi 72.1% — War Room active · 1128 DBT blocked', time: 'Now',  unread: 3 },
      { id: 'datt',    icon: '📊', bg: '#E8F5E9', name: 'District Attendance',msg: '87.3% avg · Daskroi critical ↓↓',                       time: '9:15', unread: 1 },
      { id: 'dbt',     icon: '💰', bg: '#FFF8E1', name: 'DBT Report',         msg: 'Namo Laxmi: 97% disbursed · 1,128 blocked',             time: '8:00', unread: 0 },
      { id: 'warroom', icon: '🎯', bg: '#FFEBEE', name: 'War Room',           msg: 'Daskroi Day 1/14 · On track',                           time: '8:00', unread: 0 },
    ]
    case 'parent': return [
      { id: 'swift',      icon: '🐦', bg: '#EEF2FF', name: 'SwiftChat',        msg: 'Ravi: 74% attendance · Namo Laxmi at risk',     time: 'Now',       unread: 1 },
      { id: 'namo_laxmi', icon: '🏅', bg: '#F3E5F5', name: 'Namo Laxmi',      msg: 'Application pending · Upload documents',        time: '2:00 PM',   unread: 1 },
      { id: 'catt',       icon: '📅', bg: '#E8F5E9', name: 'Attendance Cal.',  msg: 'March: 74% · 6 absences this month',            time: 'Today',     unread: 0 },
      { id: 'tmsg',       icon: '✉️', bg: '#FFF8E1', name: 'Teacher Messages', msg: 'Ms. Priya: "Please ensure Ravi attends…"',      time: 'Yesterday', unread: 1 },
    ]
    default: return []
  }
}

export function getChatConfig(id, role) {
  const cfgs = {
    swift: {
      teacher:   { name: 'SwiftChat',          sub: 'Class 6-B · GPS Mehsana', icon: '🐦', bg: '#EEF2FF', chips: ['📊 Attendance today','📝 XAMTA scan','🏅 Namo Laxmi','⚠️ At-risk students'] },
      principal: { name: 'SwiftChat',          sub: 'GPS Mehsana',              icon: '🐦', bg: '#EEF2FF', chips: ['📊 School attendance','📨 Parent alerts','📋 Class reports'] },
      deo:       { name: 'VSK Intelligence',   sub: 'Ahmedabad District',       icon: '🐦', bg: '#EEF2FF', chips: ['📊 District attendance','💰 DBT status','🔴 Critical blocks'] },
      parent:    { name: 'SwiftChat',          sub: "Ravi Patel's updates",     icon: '🐦', bg: '#EEF2FF', chips: ["📅 Ravi's attendance",'🏅 Scholarship status','✉️ Message teacher'] },
    },
    xamta:     { name: 'XAMTA',           sub: 'Class 6-B',       icon: '📝', bg: '#E8F5E9', chips: ['📷 Scan papers','📊 Class scores','📋 Generate report'] },
    att:       { name: 'Attendance',      sub: 'Class 6-B',       icon: '📅', bg: '#FFF8E1', chips: ['✅ Mark today','📊 Monthly report','⚠️ Chronic absences'] },
    namo_laxmi:{ name: 'Namo Laxmi',     sub: 'Scholarship Bot', icon: '🏅', bg: '#F3E5F5', chips: ['📋 Apply now','⏳ Pending','❌ Rejected'] },
    ews:       { name: 'EWS Alert',      sub: 'Class 6-B',       icon: '⚠️', bg: '#FFEBEE', chips: ['🔴 At-risk students','🏠 Schedule visit','📨 Notify parents'] },
    tmsg:      { name: 'Parent Messages',sub: 'Ms. Priya Mehta', icon: '💬', bg: '#E3F2FD', chips: ['📨 Send alert','📞 Request callback'] },
    catt:      { name: 'Attendance Cal.',sub: 'Ravi Patel',      icon: '📅', bg: '#E8F5E9', chips: ['📅 This month','📊 Yearly view'] },
    cschol:    { name: 'Scholarship',    sub: 'Ravi Patel',      icon: '🏅', bg: '#F3E5F5', chips: ['💰 Amount','📋 Eligibility'] },
    dbt:       { name: 'DBT Report',     sub: 'Ahmedabad',       icon: '💰', bg: '#FFF8E1', chips: ['📊 Disbursement','🔴 Blocked','📋 Full report'] },
    datt:      { name: 'District Att.',  sub: 'Ahmedabad',       icon: '📊', bg: '#E8F5E9', chips: ['🗺️ Block breakdown','🔴 Critical blocks'] },
    warroom:   { name: 'War Room',       sub: 'Daskroi Block',   icon: '🎯', bg: '#FFEBEE', chips: ['📊 Status','📋 Action plan'] },
    parentbot: { name: 'Parent Outreach',sub: 'GPS Mehsana',     icon: '📨', bg: '#F3E5F5', chips: ['📨 Sent today','✅ Acknowledged','📞 Callbacks'] },
  }
  if (id === 'swift') {
    const cfg = cfgs.swift[role] || cfgs.swift.teacher
    return { ...cfg, type: 'swift' }
  }
  return { ...(cfgs[id] || { name: id, sub: '', icon: '💬', bg: '#EEF2FF', chips: [] }), type: id }
}

function has(q, ...terms) {
  const l = q.toLowerCase()
  return terms.some(t => l.includes(t.toLowerCase()))
}

export function getInitialMessage(chatId, role) {
  if (chatId === 'swift') {
    if (role === 'teacher') return { html: `🔒 <strong>Identity verified</strong> · role=teacher · GPS Mehsana<br><br>🐦 <strong>SwiftChat AI</strong> — Quick actions:<br>📊 Attendance · 📝 XAMTA scan · 🏅 Namo Laxmi<br>⚠️ At-risk students · 📨 Parent alerts<br><br>Just ask naturally — I'll route to the right tool.`, actions: [] }
    if (role === 'principal') return { html: `🔒 <strong>Identity verified</strong> · role=principal<br><br>🐦 School attendance today: <strong>88%</strong><br>Lowest: Class 6-B at 74% · 34 parent alerts sent`, actions: [] }
    if (role === 'deo') return { html: `🔒 <strong>Identity verified</strong> · DEO · Ahmedabad<br><br>🐦 <strong>VSK Intelligence</strong><br>District: <strong>87.3%</strong> · Daskroi: 72.1% 🔴<br>DBT: 94% · War Room Day 1/14`, actions: [] }
    if (role === 'parent') return { html: `🐦 <strong>SwiftChat</strong> — Ravi Patel's updates<br><br>📅 March attendance: <strong>74%</strong><br>⚠️ <strong>Namo Laxmi at risk</strong> — needs 80%<br><br>Ask about attendance, scholarship, or teacher.`, actions: [] }
  }
  if (chatId === 'xamta')    return { html: `📝 <strong>XAMTA — Exam Assessment Tool</strong><br><br>Class 6-B · 38 answer sheets pending<br>Last scan: March 15 — Avg: 67%<br><br>Select a subject to begin scanning:`, actions: [] }
  if (chatId === 'att')      return { html: `📅 <strong>Attendance — Today</strong><br><br>Class 6-B: <strong>34/38 present</strong> (89.5%)<br>Absent: Ravi, Komal, Isha, Mehul`, actions: [] }
  if (chatId === 'ews')      return { html: `⚠️ <strong>EWS — Early Warning System</strong><br><br><strong>3 students flagged in Class 6-B:</strong><br>🔴 Ravi — 72% dropout risk<br>🟡 Komal — 45%<br>🟡 Isha — 28%`, actions: [{ label: '🏠 Schedule Ravi visit', action: 'schedule_visit' }, { label: '📨 Notify all parents', action: 'notify_all' }] }
  if (chatId === 'dbt')      return { html: `💰 <strong>Namo Laxmi DBT</strong><br><br>✅ 34,572 disbursed · 🔴 1,128 blocked<br>Blocked: Attendance <80% (743) · Invalid bank (215) · Docs (170)`, actions: [] }
  if (chatId === 'datt')     return { html: `📊 <strong>Ahmedabad District Attendance</strong><br><br>Avg: <strong>87.3%</strong><br>🟢 Bavla: 91.8% · 🟡 Sanand: 84.2% · 🔴 Daskroi: 72.1%<br>142 schools below 70%`, actions: [] }
  if (chatId === 'warroom')  return { html: `🎯 <strong>War Room — Daskroi Block</strong><br><br>Day <strong>1/14</strong> · Target: 80% · Current: 72.1%<br>14 CRCs deployed · BRC daily review · Parent flash calls`, actions: [] }
  if (chatId === 'catt')     return { html: `📅 <strong>Ravi's Attendance — March 2025</strong><br><br>Total: <strong>74%</strong> (17/23 days) · 6 absences<br>⚠️ Needs 80% for Namo Laxmi scholarship`, actions: [] }
  if (chatId === 'cschol')   return { html: `🏅 <strong>Namo Laxmi — Ravi Patel</strong><br><br>Status: <strong style="color:#E53935">AT RISK</strong><br>74% < 80% threshold · Need all 4 remaining days<br><br>💡 Attendance waiver available for medical reasons`, actions: [] }
  if (chatId === 'tmsg')     return { html: `💬 <strong>Teacher — Ms. Priya Mehta</strong><br><br>"Please ensure Ravi attends all remaining days in March. His scholarship is at risk."`, actions: [] }
  if (chatId === 'parentbot') return { html: `📨 <strong>Parent Outreach</strong><br><br>Today: <strong>34 alerts sent</strong><br>✅ 12 acknowledged · 📞 3 callback requests · ⏳ 19 pending`, actions: [] }
  return { html: `👋 How can I help you today?`, actions: [] }
}

export function getReply(chatId, role, input) {
  const q = input.toLowerCase()

  // ── SwiftChat Teacher ──
  if (chatId === 'swift' && role === 'teacher') {
    if (has(q, 'mark attendance', 'take attendance', 'open attendance'))
      return { html: `📅 <strong>Opening Attendance Canvas…</strong><br>Class 6-B · Today — tap below to begin marking`, actions: [{ label: '📅 Mark Attendance', canvas: { type: 'attendance', classId: '6-B', role } }] }
    if (has(q, 'attendance', 'absent', 'present'))
      return { html: `📅 <strong>Class 6-B — Today</strong><br><strong>34/38 present</strong> (89.5%)<br>Absent: Ravi (🔴 6th), Komal, Isha, Mehul<br>⚠️ Ravi: 74% monthly — Namo Laxmi at risk`, actions: [{ label: '📅 Mark Attendance', canvas: { type: 'attendance', classId: '6-B', role } }, { label: '📨 Notify parent', action: 'notify_ravi' }] }
    if (has(q, 'dashboard', 'summary', 'performance', 'overview'))
      return { html: `📊 <strong>Class 6-B Dashboard</strong><br>Attendance: 89.5% · 3 at-risk · XAMTA avg: 67%`, actions: [{ label: '📊 Open Dashboard', canvas: { type: 'dashboard', scope: 'class', role } }] }
    if (has(q, 'generate report', 'report card', 'create report'))
      return { html: `📋 <strong>Generate Report</strong><br>Choose type: Attendance, Academic, Class Performance, or Scholarship Status`, actions: [{ label: '📋 Open Reports', canvas: { type: 'report', classId: '6-B', role } }] }
    if (has(q, 'generate pdf', 'pdf', 'download', 'certificate'))
      return { html: `📄 <strong>PDF Generator</strong><br>Report Card · Attendance Certificate · Scholarship Letter`, actions: [{ label: '📄 Generate PDF', canvas: { type: 'pdf', role } }] }
    if (has(q, 'student data', 'enter data', 'add student', 'data entry', 'form'))
      return { html: `👤 <strong>Student Data Entry</strong><br>Add new student or update existing records`, actions: [{ label: '👤 Open Data Entry', canvas: { type: 'data-entry', role } }] }
    if (has(q, 'xamta', 'scan', 'grade', 'paper', 'exam'))
      return { html: `📝 <strong>XAMTA ready</strong><br>Class 6-B · 38 sheets pending<br>Last avg: 67% — tap to launch scanner:`, actions: [{ label: '📷 Open XAMTA', chatId: 'xamta' }] }
    if (has(q, 'namo', 'scholarship', 'laxmi'))
      return { html: `🏅 <strong>Namo Laxmi — Class 6-B</strong><br>🔴 Ravi — 74% · 🔴 Komal — 71% · 🟡 Isha — 79%`, actions: [{ label: '📋 Scholarship Report', canvas: { type: 'report', reportType: 'scholarship', role } }, { label: '📨 Notify Ravi', action: 'notify_ravi' }] }
    if (has(q, 'at-risk', 'dropout', 'ews', 'risk'))
      return { html: `⚠️ <strong>3 students flagged:</strong><br>🔴 Ravi — 72% dropout · Komal — 45% · Isha — 28%`, actions: [{ label: '📊 EWS Report', canvas: { type: 'report', reportType: 'ews', role } }, { label: '📨 Notify all', action: 'notify_all' }] }
    if (has(q, 'notify', 'parent', 'alert'))
      return { html: `📨 <strong>Alert sent</strong><br>✅ Ravi's parent (Suresh Patel) notified via SwiftChat`, actions: [] }
    return { html: `🐦 I can help with:<br>📊 Attendance · 📝 XAMTA · 🏅 Namo Laxmi<br>⚠️ At-risk · 📨 Parent alerts · 📄 PDF<br><br><em>Try: "mark attendance", "show dashboard", "generate PDF"</em>`, actions: [] }
  }

  // ── SwiftChat DEO ──
  if (chatId === 'swift' && role === 'deo') {
    if (has(q, 'dashboard', 'overview', 'district summary'))
      return { html: `📊 <strong>District Dashboard</strong><br>Ahmedabad: 87.3% · Daskroi War Room active`, actions: [{ label: '📊 Open Dashboard', canvas: { type: 'dashboard', scope: 'district', role } }] }
    if (has(q, 'report', 'generate', 'pdf'))
      return { html: `📋 <strong>District Reports</strong><br>Attendance · DBT · Block Analysis · EWS`, actions: [{ label: '📋 Generate Report', canvas: { type: 'report', scope: 'district', role } }] }
    if (has(q, 'dbt', 'scholarship', 'namo'))
      return { html: `💰 <strong>Namo Laxmi: 97% disbursed</strong><br>1,128 blocked · 3,468 parent alerts sent`, actions: [{ label: '📊 Full DBT report', chatId: 'dbt' }, { label: '📊 Dashboard', canvas: { type: 'dashboard', scope: 'district', role } }] }
    if (has(q, 'attendance', 'daskroi', 'district'))
      return { html: `📊 <strong>Ahmedabad: 87.3%</strong><br>Bavla 91.8% ↑↑ · Daskroi 72.1% ↓↓ · 142 schools <70%`, actions: [{ label: '📊 District Dashboard', canvas: { type: 'dashboard', scope: 'district', role } }, { label: '🗺️ Block view', chatId: 'datt' }] }
    return { html: `District: 87.3% | Daskroi: 72.1% (War Room Day 1) | DBT: 94%`, actions: [{ label: '📊 Dashboard', canvas: { type: 'dashboard', scope: 'district', role } }, { label: '💰 DBT', chatId: 'dbt' }, { label: '🎯 War Room', chatId: 'warroom' }] }
  }

  // ── SwiftChat Parent ──
  if (chatId === 'swift' && role === 'parent') {
    if (has(q, 'download', 'report', 'pdf', 'certificate'))
      return { html: `📥 <strong>Download Ravi's Documents</strong><br>Report Card · Attendance Certificate · Scholarship Letter`, actions: [{ label: '📄 Download PDF', canvas: { type: 'pdf', docType: 'report-card', role } }] }
    if (has(q, 'attendance', 'absent'))
      return { html: `📅 <strong>Ravi March: 74%</strong><br>6 absences · 4 days left · needs ≥80% for Namo Laxmi`, actions: [{ label: '📅 Full calendar', chatId: 'catt' }, { label: '💬 Message teacher', chatId: 'tmsg' }] }
    if (has(q, 'scholarship', 'namo'))
      return { html: `🏅 <strong style="color:#E53935">AT RISK for April</strong><br>74% < 80% — need all 4 remaining days`, actions: [{ label: '📊 Details', chatId: 'cschol' }, { label: '💬 Teacher', chatId: 'tmsg' }] }
    return { html: `Ravi's March: 74% ⚠️ Ask about attendance, scholarship, or teacher contact.<br><em>Try: "download report card", "scholarship status"</em>`, actions: [] }
  }

  // ── XAMTA ──
  if (chatId === 'xamta') {
    if (has(q, 'scan', 'grade', 'paper', 'math', 'science', 'english', 'gujarati')) {
      const subj = has(q, 'math') ? 'Mathematics' : has(q, 'science') ? 'Science' : has(q, 'english') ? 'English' : has(q, 'gujarati') ? 'Gujarati' : 'Mathematics'
      return { html: `📷 <strong>Ready to scan: ${subj}</strong><br>Class 6-B · 38 papers<br>Tap the camera button to begin.`, actions: [{ label: `📷 Launch scanner`, action: 'scan_papers' }] }
    }
    if (has(q, 'score', 'result', 'average', 'report'))
      return { html: `📊 <strong>Class 6-B — Last Results</strong><br>Maths: 67% avg · Science: 72% avg<br>8 students below 40% → remediation triggered`, actions: [{ label: '📋 Generate report', action: 'gen_report' }] }
    return { html: `📝 XAMTA — select a subject or say "scan papers"`, actions: [] }
  }

  // ── EWS ──
  if (chatId === 'ews') {
    if (has(q, 'visit', 'schedule'))
      return { html: `✅ <strong>BRC visit confirmed</strong><br>Ravi Patel · 8 April · CRC Mehsana · Jayeshbhai Patel`, actions: [] }
    return { html: `3 flagged: Ravi (72%), Komal (45%), Isha (28%)`, actions: [{ label: '🏠 Schedule visit', action: 'schedule_visit' }, { label: '📨 Notify parents', action: 'notify_all' }] }
  }

  // ── Attendance ──
  if (chatId === 'att') {
    if (has(q, 'mark', 'take', 'open'))
      return { html: `📅 <strong>Opening Attendance Canvas…</strong><br>Class 6-B · ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`, actions: [{ label: '📅 Mark Attendance', canvas: { type: 'attendance', classId: '6-B', role } }] }
    if (has(q, 'submit', 'done'))
      return { html: `✅ <strong>Attendance submitted</strong><br>34 present · 4 absent · Parent alerts queued for 5 PM`, actions: [] }
    if (has(q, 'report', 'summary', 'monthly'))
      return { html: `📊 <strong>Monthly Summary</strong><br>Class 6-B March: avg 87.4% · 3 chronic absentees`, actions: [{ label: '📋 View Report', canvas: { type: 'report', reportType: 'attendance', role } }] }
    return { html: `Today: 34/38 present. Say "mark attendance" to open the full canvas.`, actions: [{ label: '📅 Mark Attendance', canvas: { type: 'attendance', classId: '6-B', role } }] }
  }

  return { html: `Got it — let me look into that for you.`, actions: [] }
}
