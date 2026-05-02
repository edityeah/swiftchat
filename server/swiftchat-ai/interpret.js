// Groq-backed intent interpreter.
//
// The frontend's local pattern matcher tries first. Only messages that come
// up "unknown" / low-confidence get forwarded to this endpoint. We ground the
// LLM in the real action catalog and force JSON-only output so the response
// can be safely fed back into the frontend's actionRegistry.

import Groq from 'groq-sdk'
import { actionsForRole, ACTIONS } from './catalog.js'

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

let groq = null
function client() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// ── System prompt ───────────────────────────────────────────────────────────
function systemPrompt(role) {
  const allowed = actionsForRole(role)
  const actionLines = allowed.map(a =>
    `- ${a.id} (module: ${a.module}) — ${a.description}` +
    (a.requiredEntities.length ? ` Required entities: ${a.requiredEntities.join(', ')}.` : '') +
    (a.requiresConfirmation ? ' Requires confirmation.' : '')
  ).join('\n')

  return `You are SwiftChat's NLP intent classifier. Given a short, possibly multilingual / Hinglish user message, you must return STRICT JSON with this exact shape and no extra prose:

{
  "intent": "<one of the action IDs below, or null if no good match>",
  "module": "<one of: attendance | xamta | class_dashboard | digivritti | reports | parent_alerts | null>",
  "entities": { "class"?: "<digit>", "scheme"?: "nl"|"ns", "paymentFilter"?: "pending"|"failed"|"success"|"all", "question"?: "<original text>", "studentName"?: "<name>", "appId"?: "<NL2025... or NS2025...>" },
  "confidence": <number 0..1>,
  "assistantText": "<one short reply telling the user what you're about to do, in the same language as the input>",
  "requiresConfirmation": <true|false>,
  "chips": [<optional follow-up chip labels>],
  "language": "<bcp-47 like en | hi | gu | hi-en (Hinglish) | gu-en>"
}

User role: ${role}

Allowed actions for this role:
${actionLines}

Hard rules:
1. ONLY pick an intent from the allowed list above. If nothing fits, set intent to null and module to null.
2. Output JSON only — no markdown, no commentary, no leading/trailing text.
3. assistantText must be a SHORT, single-line confirmation (≤ 18 words) in the user's language.
4. If you set intent to a confirmation-required action, set requiresConfirmation=true and provide chips ["✅ Yes, proceed", "❌ Cancel"].
5. If a required entity is missing, return the intent + empty entity for it; the frontend will ask the user. Do NOT invent entities.
6. Always copy the user's full message into entities.question. This lets DigiVritti AI keyword-route free-form analytics questions.
7. confidence reflects how sure you are. Use 0.85+ only when the mapping is unambiguous. Use 0.5-0.7 for fuzzy matches. Use < 0.4 only when intent is null.

Examples (input → output):

Input: "Mere rejected students dikhao"
{"intent":"OPEN_REJECTED_APPLICATIONS","module":"digivritti","entities":{"question":"Mere rejected students dikhao"},"confidence":0.92,"assistantText":"Aapke rejected applications dikhata hoon.","requiresConfirmation":false,"chips":[],"language":"hi-en"}

Input: "Class 7 ni hajri mark karvi chhe"
{"intent":"OPEN_MARK_ATTENDANCE","module":"attendance","entities":{"class":"7","question":"Class 7 ni hajri mark karvi chhe"},"confidence":0.94,"assistantText":"Class 7 ni attendance kholu chhu.","requiresConfirmation":false,"chips":[],"language":"gu-en"}

Input: "Kavya ka form fix karna hai"
{"intent":"OPEN_REJECTED_APPLICATIONS","module":"digivritti","entities":{"studentName":"Kavya","question":"Kavya ka form fix karna hai"},"confidence":0.78,"assistantText":"Rejected applications kholta hoon — Kavya ka form fix kar sakte hain.","requiresConfirmation":false,"chips":[],"language":"hi-en"}

Input: "PFMS failed payments batao"
{"intent":"OPEN_PAYMENT_QUEUE","module":"digivritti","entities":{"paymentFilter":"failed","question":"PFMS failed payments batao"},"confidence":0.93,"assistantText":"Failed payments queue kholta hoon.","requiresConfirmation":false,"chips":[],"language":"hi-en"}

Input: "Monsoon impact analysis dikhao"
{"intent":"RUN_DIGIVRITTI_QUERY","module":"digivritti","entities":{"question":"Monsoon impact analysis dikhao"},"confidence":0.9,"assistantText":"Monsoon impact deep-dive shuru karta hoon.","requiresConfirmation":false,"chips":[],"language":"hi-en"}
`
}

// ── Strict-JSON post-processor ──────────────────────────────────────────────
function safeJson(raw) {
  if (!raw) return null
  // Strip markdown fences if the model slipped them in.
  let s = raw.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  // First {...} block.
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

function validate(out, role) {
  if (!out || typeof out !== 'object') return null
  const intent = out.intent || null
  if (intent && !ACTIONS[intent]) return { ...out, intent: null, module: null, confidence: Math.min(out.confidence ?? 0, 0.3) }
  if (intent && !ACTIONS[intent].roles.includes(role)) {
    return { ...out, intent: null, module: null, confidence: Math.min(out.confidence ?? 0, 0.3), assistantText: out.assistantText || 'Not available for your role.' }
  }
  return {
    intent,
    module: out.module || (intent ? ACTIONS[intent].module : null),
    entities: out.entities && typeof out.entities === 'object' ? out.entities : {},
    confidence: typeof out.confidence === 'number' ? Math.max(0, Math.min(1, out.confidence)) : 0,
    assistantText: typeof out.assistantText === 'string' ? out.assistantText.slice(0, 280) : '',
    requiresConfirmation: !!out.requiresConfirmation,
    chips: Array.isArray(out.chips) ? out.chips.slice(0, 6).map(String) : [],
    language: typeof out.language === 'string' ? out.language : 'en',
  }
}

// ── Public entry ────────────────────────────────────────────────────────────
export async function interpretViaGroq({ text, role }) {
  if (!text) return null
  const c = client()

  const resp = await c.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 400,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt(role) },
      { role: 'user',   content: text },
    ],
  })

  const raw = resp?.choices?.[0]?.message?.content || ''
  const parsed = safeJson(raw)
  return validate(parsed, role)
}
