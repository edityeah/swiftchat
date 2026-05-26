// /api/chat/canvas — OpenAI-backed chat for the KPI / Attendance / Ask AI
// canvases. The browser sends the current canvas context + the user's
// message; we build a grounded system prompt (with the actual numbers and
// lists already on the user's screen) and ask gpt-4o-mini for a tight reply.
//
// Why a server route, not a direct browser call?
//   Same reason as /api/realtime/session — the OpenAI key must never ship in
//   the frontend bundle. The server holds OPENAI_API_KEY; the browser only
//   talks to /api/*.
//
// Why gpt-4o-mini, not gpt-4o?
//   This is a chat-assist use case. mini is ~10× cheaper, ~2× faster, and
//   plenty good for "explain these numbers" / "list the absentees" tasks.
//   Bump to gpt-4o via OPENAI_CHAT_MODEL env override if needed.

const ROLE_LABEL = {
  teacher:         'a Teacher',
  principal:       'a School Principal',
  crc:             'a CRC (Cluster Resource Centre) Coordinator',
  beo:             'a BEO (Block Education Officer)',
  deo:             'a DEO (District Education Officer)',
  state_secretary: 'the State Secretary of Education',
  parent:          'a Parent',
  pfms:            'a PFMS Payments Officer',
}

function buildSystemPrompt({ role, profile, canvas, data }) {
  const name = profile?.name || 'the user'
  const firstName = String(name).split(' ')[0] || name
  const roleLabel = ROLE_LABEL[role] || 'a SwiftChat user'
  const school = profile?.school   ? ` at ${profile.school}`        : ''
  const district = profile?.district ? ` in ${profile.district} district` : ''

  // Stringify the canvas data so the model can quote actual values + names.
  // We cap the size to ~6 KB to keep token cost down; lists already arrive
  // pre-trimmed (top 6 students, top/bottom 5 schools, etc.).
  const dataBlock = data ? JSON.stringify(data, null, 2).slice(0, 6000) : '(none)'

  return `You are Saathi, the SwiftChat AI assistant for VSK Gujarat (Vidya Samiksha Kendra).

You are talking to ${firstName} (${roleLabel}${school}${district}). They have a canvas open in front of them showing data; you can SEE the same data via the JSON below.

CANVAS CONTEXT: ${canvas?.title || 'KPI dashboard'}
${canvas?.subtitle ? `Subtitle: ${canvas.subtitle}\n` : ''}
DATA ON SCREEN (the user is looking at this right now):
\`\`\`json
${dataBlock}
\`\`\`

You MUST respond as valid JSON in this exact shape (no other top-level keys):
{
  "reply":  "Markdown paragraph or two — 1-3 sentences max",
  "cards":  [ ...optional UI cards, see schemas below... ]
}

CARD SCHEMAS (emit cards INSTEAD of long markdown lists — they render as
rich visual cards inside the chat bubble):

1) student_attendance — use when the user asks "who is absent / list students":
   {
     "kind": "student_attendance",
     "name": "Harsh Vaghela",
     "ssmid": "240107110...",            // 18-digit, copy from data block
     "attendancePct": 55,                  // term-to-date %
     "daysAbsent": 5,                      // out of the recent window (or null)
     "risk": "high" | "medium" | "low",
     "ewsFlag": true,                      // is the student on the EWS list?
     "pattern": "AAPAPAA"~AAPAPPAPAA",     // last 14 days as P/A characters (length 7-14). REQUIRED.
     "recommendation": "Schedule a home visit this week"  // one short next step
   }

2) metric_callout — use for an emphasised single number:
   {
     "kind": "metric_callout",
     "label": "Today's class attendance",
     "value": "86%",
     "tone":  "red" | "amber" | "green" | "info",
     "subtitle": "of 44 students present"
   }

3) compare_bars — use for "compare X" / "top / bottom" / "which is highest":
   {
     "kind": "compare_bars",
     "title": "Top 3 classes by attendance",
     "items": [ { "label": "Class 7-A", "value": 91 }, ... ],
     "unit":  "%"
   }

4) mini_trend — use when asked about a trend on a specific metric:
   {
     "kind": "mini_trend",
     "title": "7-day attendance trend",
     "values": [82, 84, 85, 79, 86, 88, 86],
     "labels": ["Tue","Wed","Thu","Fri","Sat","Sun","Mon"],
     "unit":   "%",
     "tone":   "red" | "amber" | "green"
   }

RULES:
- "reply" is a short conversational intro. The CARDS carry the detail. If you
  emit student_attendance cards, do NOT also list the same names in "reply".
- USE ONLY DATA FROM THE BLOCK ABOVE. Never invent names, Student IDs, percentages,
  or risk flags. If the data lacks a field, leave it out of the card.
- When the user asks "who is absent today?" → emit one student_attendance card
  per absent student from data.absentList. Compute "pattern" from the
  student's attendance % (lower attendance = more A's; bias to Mon/Fri).
  "daysAbsent" can be estimated from attendance % over the last 14 school days.
- When user asks "why" / "what should I do" — keep "cards" empty and use "reply"
  for the analysis + recommendation. One actionable next step.
- Match the user's language (English / Hindi / Gujarati / Hinglish). Reply in
  whatever blend they used.
- No politics, religion, or off-topic. Politely redirect.
- Output JSON ONLY. Do not wrap it in markdown code fences.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'openai_key_missing',
      detail: 'Set OPENAI_API_KEY in Vercel env vars (or .env.local for local dev).',
    })
  }

  const { role, profile, canvas, data, messages = [] } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'no_messages' })
  }

  const systemPrompt = buildSystemPrompt({ role, profile, canvas, data })
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-8), // last 8 turns is plenty of context
        ],
        temperature: 0.3,
        max_tokens: 800,                                   // raised for card payloads
        response_format: { type: 'json_object' },          // forces strict JSON output
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(r.status).json({ error: 'openai_chat_failed', detail })
    }

    const j = await r.json()
    const raw = j?.choices?.[0]?.message?.content || ''
    // Parse the JSON payload. If the model returns malformed JSON (rare with
    // response_format=json_object) we fall back to treating the whole string
    // as the reply text so the user always gets something.
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { reply: raw, cards: [] }
    }
    return res.status(200).json({
      text:  String(parsed.reply || ''),
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      model,
    })
  } catch (err) {
    return res.status(500).json({ error: 'chat_request_failed', detail: String(err?.message || err) })
  }
}
