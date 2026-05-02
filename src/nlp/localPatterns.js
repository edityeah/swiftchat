// Pattern table — drives the deterministic intent matcher.
//
// Each row maps a regex (or list of keywords) to an action id. Order matters:
// the first matching row wins, so put the more-specific patterns first.
//
// Multilingual coverage:
//  - English keywords
//  - Hindi/Hinglish romanizations ("kholo", "dikhao", "kaha hai")
//  - A few native-script hits for hi/gu Devanagari & Gujarati
//
// We also extract entities here (currently `class`, `scheme`, `paymentFilter`,
// `question`). Add more extractors in `extractEntities()` as new modules need.

const kw = (...words) => new RegExp(`\\b(${words.join('|')})\\b`, 'i')

// Each rule: { match: RegExp | (text)=>boolean, action: string }
//
// Order matters — patterns that should win must appear first. State-changing
// actions (e.g. parent alerts) are placed above the more generic intents
// (e.g. SHOW_ABSENT_STUDENTS) so a phrase like "send parent alert to absent
// students" routes to the parent-alert action.
export const PATTERNS = [
  // ── Ask AI (explicit invocations only — free-form prompt matching is
  //    handled by the deterministic askAiMatcher inside handleSend). ────────
  { match: /\b(more prompts|show (all )?(ask\s*ai\s*)?prompts?)\b/i,                      action: 'ASK_AI_MORE_PROMPTS' },
  { match: /\b(open|launch|kholo|start)\s+ask\s*ai\b|\bask\s*ai\b\s*$|^ask\s*ai\b|\bsmart\s+assistant\b|\bask\s+swiftchat\b/i, action: 'OPEN_ASK_AI' },

  // ── Notifications / reminders (must precede the broader announcement /
  //    broadcast keywords used by other modules). ───────────────────────────
  { match: /\bmark\s+(?:all\s+)?(?:notification|notif)s?\s+(?:as\s+)?read\b/i, action: 'MARK_ALL_NOTIFICATIONS_READ' },
  { match: /\b(?:create|send|broadcast|publish)\s+(?:a\s+)?(?:notification|broadcast|announcement)\b|\bnotification\s+bhejo\b|\bbroadcast\s+bhejo\b|\bannouncement\s+bhejo\b/i, action: 'CREATE_BROADCAST_NOTIFICATION' },
  // Reminder phrasing: "add reminder", "set reminder", "kal 10 baje reminder lagao", "remind me…"
  { match: /\b(?:add|set|create|new)\s+(?:a\s+)?reminder\b|\bremind\s+me\b|\breminder\s+(?:lagao|add karo|set karo|laga do)\b/i, action: 'CREATE_REMINDER' },
  // Open notifications inbox.
  { match: /\b(?:show|open|view|kholo)\b.*\b(?:notification|notif|alert|inbox|bell)s?\b|\bnotification(?:s)?\s+kholo\b|\b(?:my|mere)\s+(?:notification|alert|reminder)s?\b/i, action: 'OPEN_NOTIFICATIONS' },

  // ── Parent alerts (must precede `absent` so combined phrasings route here) ─
  { match: /parent\s*alert|notify\s*parent|whatsapp\s*alert|sms\s*alert|parent\s*ko\s*bhejo/i, action: 'SEND_PARENT_ALERT' },

  // ── DigiVritti — most specific intents first ─────────────────────────────
  { match: /reject(ed)?|fix\s+rejected|correct\s+rejected/i,                 action: 'OPEN_REJECTED_APPLICATIONS' },
  // Payment queue — handle plural ("payments queue") + filter words.
  { match: /payments?\s*queue|failed\s*payments?|pending\s*payments?|success\s*payments?|payments?\s*retry|utr/i, action: 'OPEN_PAYMENT_QUEUE' },
  { match: /(application|app)\s*list|track(\s+applications?)?/i,             action: 'OPEN_APPLICATION_LIST' },
  { match: /\b(namo\s*saraswati|namo_saraswati|saraswati)\b/i,               action: 'OPEN_NAMO_SARASWATI' },
  { match: /\b(namo\s*lakshmi|namo\s*laxmi|namo_lakshmi|namo_laxmi|nly|namo)\b/i, action: 'OPEN_NAMO_LAKSHMI' },
  { match: /\b(ask|run|query)\b.*\b(digivritti|scholarship|state|district|payment|review|school)\b.*\b(ai|sql|insight|analytics|query)\b/i, action: 'OPEN_DIGIVRITTI_AI' },
  { match: /\b(digivritti|digi\s*vritti|scholarship)\b/i,                    action: 'OPEN_DIGIVRITTI_HOME' },

  // ── XAMTA ─────────────────────────────────────────────────────────────────
  { match: /\bxamta\b|answer\s*sheet|omr|worksheet\s*scan|learning\s*scan/i, action: 'OPEN_XAMTA_SCAN' },
  { match: /\b(learning\s*outcomes?|lo\s*report|outcomes?)\b/i,              action: 'OPEN_XAMTA_RESULTS' },

  // ── Attendance ───────────────────────────────────────────────────────────
  { match: /\b(absent|absentee|missing\s+student)/i,                         action: 'SHOW_ABSENT_STUDENTS' },
  { match: /\b(attendance|haajri|hajri|hazri|hajiri|roll\s*call|present)\b|હાજરી|अटेंडेंस|उपस्थिति/i, action: 'OPEN_MARK_ATTENDANCE' },

  // ── Dashboards / reports / performance ───────────────────────────────────
  { match: /\b(state\s*dashboard|state\s*kpi|state\s*command|state\s*intelligence)\b/i, action: 'OPEN_STATE_DASHBOARD' },
  { match: /\b(district\s*dashboard|district\s*drilldown|block\s*analysis)\b/i,        action: 'OPEN_DISTRICT_DASHBOARD' },
  { match: /\b(report\s*card|generate\s*report|student\s*report\s*card)\b/i, action: 'OPEN_REPORT_CARD' },
  // Class N + any of (report|performance|dashboard|progress|summary) → class dashboard.
  // This row catches "Class 8 ka performance report dikhao" before the
  // generic "performance report" rule below. The .* is bounded by the report
  // keywords so it won't gobble unrelated text.
  { match: /\bclass\s*\d.{0,30}?\b(report|performance|dashboard|progress|summary)\b/i, action: 'OPEN_CLASS_DASHBOARD' },
  // Plain student-level reports — only when no class number was given.
  { match: /\b(student\s*report|performance\s*report|student\s*performance\s*report)\b/i, action: 'OPEN_STUDENT_REPORT' },
  // Class N or "class dashboard / class progress" without report-words.
  { match: /\b(class\s*\d|class\s*(report|performance|dashboard|progress|summary))\b|student\s*performance/i, action: 'OPEN_CLASS_DASHBOARD' },
  { match: /\b(school\s*dashboard|school\s*kpi|attendance\s*summary|school\s*overview)\b/i, action: 'OPEN_SCHOOL_DASHBOARD' },
  { match: /\breport\b/i,                                                    action: 'OPEN_STUDENT_REPORT' },
  { match: /\bdashboard\b|दिखाओ\s*dashboard/i,                               action: 'OPEN_SCHOOL_DASHBOARD' },
]

// ─── Entity extraction ───────────────────────────────────────────────────────
const CLASS_RE = /\bclass\s*(\d{1,2})\b|\bgrade\s*(\d{1,2})\b|\bstd\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:th|st|nd|rd)?\s*(?:class|grade|std)\b/i
const PAYMENT_FILTER_RE = /\b(failed|success|pending|all)\s*payment/i
const SCHEME_RE = /\b(namo\s*saraswati|saraswati|ns)\b|\b(namo\s*lakshmi|namo\s*laxmi|lakshmi|nl)\b/i

// Broadcast-target detection. Maps phrases → notification target tokens.
const BROADCAST_TARGET_HINTS = [
  { rx: /\b(all\s+users?|sab\s*ko|sabhi\s*ko|everyone|sabko)\b/i, token: 'all' },
  { rx: /\bteachers?\b|शिक्षकों|শিক্ষকদের/i,                       token: 'teacher' },
  { rx: /\bprincipals?\b|प्रधानाचार्य|মুখ্যশিক্ষক/i,                token: 'principal' },
  { rx: /\bdeos?\b|district\s+education/i,                         token: 'deo' },
  { rx: /\bstate(?:\s+secretary)?\b/i,                             token: 'state' },
  { rx: /\bpfms\b|payment\s+officer/i,                             token: 'pfms' },
  { rx: /\bcrcs?\b|cluster\s+approver/i,                           token: 'crc' },
  { rx: /\bbrcs?\b|block\s+resource/i,                             token: 'brc' },
  { rx: /\bnot\s+state|non-state/i,                                token: 'not_state' },
]

const BROADCAST_CATEGORY_HINTS = [
  { rx: /\bnamo\s*(?:lakshmi|laxmi|saraswati)\b|\bdeadline\b/i, id: 'namo_deadline' },
  { rx: /\bxamta\b/i,                                            id: 'xamta_data_entry' },
  { rx: /\bholiday\b|chhutti|छुट्टी/i,                           id: 'holiday' },
  { rx: /\bpayment(?:s)?\b|pfms/i,                                id: 'payment' },
  { rx: /\battendance\b|haajri/i,                                 id: 'attendance' },
  { rx: /\bannouncement\b|important\b/i,                          id: 'announcement' },
]

// Very rough natural-language time hint: "kal 10 baje", "tomorrow at 5pm",
// "tonight 8pm". We only return a hint string here; the form uses a date+time
// picker so the user confirms. Empty when nothing extractable.
const TIME_HINTS = [
  /\b(?:tomorrow|kal)\b[^.,]*?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/i,
  /\b(?:today|aaj)\b[^.,]*?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)?/i,
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)\b/i,
]

export function extractEntities(text) {
  const entities = {}
  if (!text) return entities

  // class / grade
  const cm = text.match(CLASS_RE)
  if (cm) {
    entities.class = String(cm[1] || cm[2] || cm[3] || cm[4] || '').replace(/^0+/, '') || undefined
  }

  // scheme
  const sm = text.match(SCHEME_RE)
  if (sm) {
    entities.scheme = sm[1] ? 'ns' : 'nl'
  }

  // payment filter
  const pm = text.match(PAYMENT_FILTER_RE)
  if (pm) {
    entities.paymentFilter = pm[1].toLowerCase()
  }

  // Broadcast targets — preserve order, dedupe.
  const targets = []
  for (const hint of BROADCAST_TARGET_HINTS) {
    if (hint.rx.test(text) && !targets.includes(hint.token)) targets.push(hint.token)
  }
  if (targets.length) entities.broadcastTargets = targets

  // Broadcast category hint.
  for (const hint of BROADCAST_CATEGORY_HINTS) {
    if (hint.rx.test(text)) { entities.broadcastCategory = hint.id; break }
  }

  // Reminder when-hint — not parsed into a date, only kept as a string the
  // form will surface to the user.
  for (const rx of TIME_HINTS) {
    const m = text.match(rx)
    if (m) { entities.reminderWhen = m[0]; break }
  }

  // Reminder title — anything after "remind me to/of" or before "kal/aaj …"
  const rmt = text.match(/\bremind\s+me\s+(?:to|of|that)?\s+([^.?!]+)/i)
  if (rmt && rmt[1]) entities.reminderTitle = rmt[1].trim()

  // free-form question (used by DigiVritti AI ask) — store the original text
  // so the engine can keyword-match further.
  entities.question = text.trim()

  return entities
}

// Returns { actionId, score } for the best local match, or null.
export function matchLocalIntent(text) {
  if (!text) return null
  for (const rule of PATTERNS) {
    if (typeof rule.match === 'function' ? rule.match(text) : rule.match.test(text)) {
      return { actionId: rule.action, source: 'local-pattern' }
    }
  }
  return null
}
