// /api/vision/analyze — describe the user's current screen in one line.
//
// Called by the VoiceCallProvider every ~3s when continuous frame streaming
// is on, or on-demand when the user asks something visual. Returns a short
// description that the client pushes into the Realtime session as a system
// message so the voice agent has visual context.
//
// Uses gpt-4o-mini with low-detail vision to keep cost in check
// (~$0.003 per frame). One sentence cap on the response — voice replies
// can't carry long descriptions anyway.

const ROLE_LABEL = {
  teacher:         'a Teacher',
  principal:       'a School Principal',
  crc:             'a Cluster Resource Centre Coordinator',
  beo:             'a Block Education Officer',
  deo:             'a District Education Officer',
  state_secretary: 'the State Secretary',
  parent:          'a Parent',
  pfms:            'a PFMS Officer',
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

  const { image, role } = req.body || {}
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image_required', detail: 'Pass `image` as a data URL (e.g. data:image/jpeg;base64,...)' })
  }

  const roleLabel = ROLE_LABEL[role] || 'a user'
  const prompt = `You are looking at the SwiftChat web app screen of ${roleLabel} in VSK Gujarat. In ONE short sentence (max 20 words), describe what they are looking at right now and what action they might be considering. Be specific about UI elements you can see (canvas open? which tab? KPI tile? data table?). If you can't tell, say "Cannot determine screen content".`

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 80,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: [
            { type: 'text',      text: prompt },
            { type: 'image_url', image_url: { url: image, detail: 'low' } },
          ],
        }],
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      return res.status(r.status).json({ error: 'openai_vision_failed', detail })
    }

    const data = await r.json()
    const description = data.choices?.[0]?.message?.content?.trim() || ''
    return res.status(200).json({ description })
  } catch (err) {
    return res.status(500).json({ error: 'vision_request_failed', detail: String(err?.message || err) })
  }
}
