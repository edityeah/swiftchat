// /api/realtime/session — mint an ephemeral OpenAI Realtime session.
//
// Browser cannot hold OPENAI_API_KEY (a leaked key = blank cheque on the
// project). OpenAI's Realtime API issues short-lived ephemeral tokens for
// exactly this case: the server uses its real key to ask for a session,
// the browser uses the ephemeral `client_secret` to open a direct WebRTC
// connection to OpenAI for ~1 minute.
//
// Docs: https://platform.openai.com/docs/api-reference/realtime-sessions
//
// Mirrors the architecture used in the KSK reference project.

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

const ROLE_GUIDANCE = {
  teacher: 'Focus on classroom-level concerns: today\'s attendance, at-risk students, lesson prep, parent calls.',
  principal: 'Focus on school-level metrics: class-wise attendance, teacher attendance, school dashboards, scholarship reviews.',
  crc: 'Focus on cluster-level review: pending DigiVritti approvals, schools in their cluster, CRC visits.',
  beo: 'Focus on block-level operations: schools below benchmark, teacher attendance across the block, BEO inspections.',
  deo: 'Focus on district rollups: war-room alerts, block-vs-block performance, escalations, district KPIs.',
  state_secretary: 'Focus on state-wide policy view: district rankings, scheme analytics, statewide trends, escalations to ministry.',
  parent: 'Focus on the parent\'s own child: attendance, results, scholarship status, homework. Never discuss other students.',
  pfms: 'Focus on payment operations: pending DigiVritti disbursals, failed payments, Aadhaar-bank issues.',
}

function buildRolePrompt({ role, profile }) {
  const name = profile?.name || 'the user'
  const firstName = String(name).split(' ')[0] || name
  const roleLabel = ROLE_LABEL[role] || 'a SwiftChat user'
  const guidance = ROLE_GUIDANCE[role] || 'Focus on whatever the user is asking about.'
  const school = profile?.school ? ` at ${profile.school}` : ''
  const district = profile?.district ? ` in ${profile.district} district` : ''

  return `You are Saathi, the SwiftChat voice assistant for VSK Gujarat (Vidya Samiksha Kendra).

You are talking to ${firstName}, who is ${roleLabel}${school}${district}.

How to behave:
- Keep replies short and conversational — one or two sentences. Long monologues are painful to listen to.
- Match the user's language. They may switch between English, Hindi, and Gujarati mid-sentence (Hinglish is normal). Reply in the same blend.
- Use ${firstName} occasionally so it feels personal, not robotic.
- ${guidance}
- When the user asks about specific numbers, respond with plausible round figures (e.g. "around 85% today", "about 4,800 students"). You don't have live data; the user knows. Avoid making up precise statistics that sound fake.
- If you're not sure what the user wants, ask one clarifying question rather than guessing.
- You may be sent screen descriptions (system messages like "User is looking at the State Secretary report card"). Use these to be more helpful — refer to what they're seeing if it matters.
- Do NOT discuss politics, religion, or anything outside the SwiftChat / education context. Politely redirect.
- Never claim to be a human. If asked, you are an AI assistant inside the SwiftChat product.

Start by greeting ${firstName} briefly and offering help.`
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

  const { role, profile } = req.body || {}
  const instructions = buildRolePrompt({ role, profile })

  // OpenAI Realtime GA — model name `gpt-realtime`. Override via env if a
  // newer dated snapshot becomes available.
  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
  // `verse` and `ballad` are the warmest OpenAI voices for Indian-English.
  const voice = process.env.OPENAI_REALTIME_VOICE || 'verse'

  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions,
        modalities: ['audio', 'text'],
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500 },
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(r.status).json({ error: 'openai_session_failed', detail })
    }

    const session = await r.json()
    return res.status(200).json({
      client_secret: session.client_secret?.value,
      expires_at:    session.client_secret?.expires_at,
      model:         session.model || model,
      voice:         session.voice || voice,
    })
  } catch (err) {
    return res.status(500).json({ error: 'session_request_failed', detail: String(err?.message || err) })
  }
}
