// Global module registry for SwiftChat NLP routing.
//
// Each module describes:
//  - id              : stable identifier
//  - label           : user-facing label
//  - aliases         : multilingual / Hinglish keywords for module detection
//  - allowedRoles    : roles that can invoke this module at all
//  - actions         : action ids (defined in actionRegistry) this module owns
//  - canvasView      : default canvas dispatch the router can fire
//  - fallbackPrompt  : asked when intent is module-only with no action
//
// The aliases here are deliberately broad — narrow disambiguation happens in
// localPatterns via action-specific regex / required entities.

export const MODULES = [
  {
    id: 'attendance',
    label: 'Mark Attendance',
    aliases: [
      'attendance', 'mark attendance', 'attendance mark', 'haajri', 'hajri',
      'hazri', 'hajiri', 'hazri', 'present', 'absent', 'absentee',
      'attendance lena', 'attendance karna', 'attendance lo', 'roll call',
      'હાજરી', 'अटेंडेंस', 'उपस्थिति',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo'],
    actions: [
      'OPEN_MARK_ATTENDANCE', 'OPEN_ATTENDANCE_HISTORY', 'SHOW_ABSENT_STUDENTS',
    ],
    canvasView: { type: 'attendance' },
    fallbackPrompt: 'Which class would you like to mark attendance for?',
  },
  {
    id: 'xamta',
    label: 'XAMTA Scan',
    aliases: [
      'xamta', 'scan', 'omr', 'answer sheet', 'worksheet scan',
      'learning scan', 'xamta scan', 'assessment scan', 'sheet scan',
      'xamta kholo', 'xamta open',
    ],
    allowedRoles: ['teacher', 'principal'],
    actions: ['OPEN_XAMTA_SCAN', 'OPEN_XAMTA_RESULTS'],
    canvasView: null, // XAMTA opens via existing chat handler, not canvas
    fallbackPrompt: 'Open XAMTA scanner or view past XAMTA results?',
  },
  {
    id: 'class_dashboard',
    label: 'Class Dashboard',
    aliases: [
      'dashboard', 'class dashboard', 'class report', 'student performance',
      'class progress', 'class summary', 'school dashboard', 'kpi',
      'class ka dashboard', 'class ki report', 'performance dikhao',
      'दिखाओ dashboard',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'],
    actions: [
      'OPEN_CLASS_DASHBOARD', 'OPEN_SCHOOL_DASHBOARD',
      'OPEN_DISTRICT_DASHBOARD', 'OPEN_STATE_DASHBOARD',
      'OPEN_STUDENT_REPORT',
    ],
    canvasView: null,
    fallbackPrompt: 'Which dashboard would you like to open?',
  },
  {
    id: 'digivritti',
    label: 'DigiVritti',
    aliases: [
      'digivritti', 'digi vritti', 'scholarship', 'scholarships',
      'namo lakshmi', 'namo laxmi', 'namo saraswati', 'nly', 'ns',
      'pfms', 'payment queue', 'application list', 'rejected',
      'rejected applications', 'rejected students', 'rejected scholarship',
      'pending applications', 'approved applications',
      'scholarship status', 'scholarship dikhao',
      'wazifa', 'छात्रवृत्ति', 'શિષ્યવૃત્તિ',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    actions: [
      'OPEN_DIGIVRITTI_HOME', 'OPEN_NAMO_LAKSHMI', 'OPEN_NAMO_SARASWATI',
      'OPEN_APPLICATION_LIST', 'OPEN_REJECTED_APPLICATIONS',
      'OPEN_PAYMENT_QUEUE', 'OPEN_DIGIVRITTI_AI', 'RUN_DIGIVRITTI_QUERY',
    ],
    canvasView: null,
    fallbackPrompt: 'Which DigiVritti view should I open?',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    aliases: [
      'report', 'reports', 'analytics', 'stats', 'statistics',
      'student report', 'performance report', 'generate report',
      'report card', 'rapport', 'रिपोर्ट', 'રિપોર્ટ',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'],
    actions: [
      'OPEN_STUDENT_REPORT', 'OPEN_REPORT_CARD',
      'RUN_GLOBAL_ANALYTICS_QUERY',
    ],
    canvasView: null,
    fallbackPrompt: 'Which report would you like — student, class, or scheme?',
  },
  {
    id: 'ask_ai',
    label: 'Ask AI',
    aliases: [
      'ask ai', 'askai', 'ai', 'smart assistant', 'ask swiftchat',
      'help me decide', 'kya karna chahiye', 'su karu', 'batao kya karu',
      'ask ai kholo', 'ai assistant', 'smart actions', 'next best action',
      'ai suggestions', 'पूछो ai', 'पूछो एआई', 'ai से पूछो',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    actions: [
      'OPEN_ASK_AI', 'ASK_AI_MORE_PROMPTS', 'ASK_AI_RUN_PROMPT',
      'ASK_AI_OPEN_RECOMMENDED_ACTION',
    ],
    canvasView: null,
    fallbackPrompt: 'Open Ask AI, see all prompts, or run a specific Ask AI prompt?',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    aliases: [
      'notification', 'notifications', 'notif', 'inbox', 'reminder',
      'reminders', 'alerts', 'broadcast', 'broadcasts', 'announce',
      'announcement', 'announcements', 'bell',
      'notification kholo', 'notif kholo', 'reminder lagao', 'reminder set karo',
      'reminder add karo', 'notification bhejo', 'broadcast bhejo',
      'सूचना', 'नोटिफिकेशन', 'સૂચના', 'યાદ',
    ],
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms', 'parent', 'brc'],
    actions: [
      'OPEN_NOTIFICATIONS', 'CREATE_REMINDER',
      'CREATE_BROADCAST_NOTIFICATION', 'MARK_ALL_NOTIFICATIONS_READ',
    ],
    canvasView: null,
    fallbackPrompt: 'Open notifications, add a reminder, or create a broadcast?',
  },
  {
    id: 'parent_alerts',
    label: 'Parent Alerts',
    aliases: [
      'parent alert', 'parent connect', 'notify parent', 'send alert',
      'whatsapp alert', 'parent message', 'sms alert',
      'अभिभावक को सूचित', 'parent ko bhejo',
    ],
    allowedRoles: ['teacher', 'principal'],
    actions: ['SEND_PARENT_ALERT'],
    canvasView: null,
    fallbackPrompt: 'Which class or students should receive the alert?',
  },
]

export const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]))

// Escape regex metacharacters so a literal alias matches as-is.
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export function findModuleByAlias(text) {
  const q = (text || '').toLowerCase()
  // Match aliases as whole tokens (word-boundary on both sides) so short
  // aliases like "ns" / "nly" don't accidentally fire inside words like
  // "moNSoon" or "aNLYsis". Score by length-of-match so longer aliases
  // ("namo saraswati") win over shorter ones ("namo").
  let best = null
  let bestScore = 0
  for (const mod of MODULES) {
    for (const a of mod.aliases) {
      const al = a.toLowerCase()
      // \b only works on ASCII word chars, but our short aliases are all
      // ASCII; for native-script aliases (long, distinctive) we fall back to
      // raw includes since \b doesn't apply to those Unicode ranges.
      const hit = /^[\w\s.-]+$/.test(al)
        ? new RegExp(`\\b${escapeRe(al)}\\b`, 'i').test(q)
        : q.includes(al)
      if (hit && al.length > bestScore) {
        best = mod
        bestScore = al.length
      }
    }
  }
  return best
}
