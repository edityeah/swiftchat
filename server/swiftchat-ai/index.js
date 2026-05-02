// SwiftChat AI backend — Express server.
// POST /interpret   { text, role }                 → strict JSON intent
// POST /rag/query   { question, role, language }   → RAG-grounded answer
// POST /message     { text, role, language }       → orchestrator: action OR answer
// GET  /healthz     → { ok, model }

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { interpretViaGroq } from './interpret.js'
import { retrieveAndAnswer } from './rag/retriever.js'

const app = express()
const PORT = Number(process.env.PORT || 8787)

const origins = (process.env.CORS_ORIGIN || '*')
  .split(',').map(s => s.trim()).filter(Boolean)

app.use(cors({
  origin: origins.length === 1 && origins[0] === '*' ? true : origins,
  methods: ['POST', 'GET', 'OPTIONS'],
}))
app.use(express.json({ limit: '32kb' }))

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' })
})

app.post('/interpret', async (req, res) => {
  const { text, role } = req.body || {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }
  if (typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'role is required' })
  }
  try {
    const out = await interpretViaGroq({ text: text.trim(), role: role.trim() })
    if (!out) return res.status(502).json({ error: 'interpreter returned no parseable JSON' })
    res.json({ responseType: 'action', ...out })
  } catch (err) {
    console.error('[/interpret]', err?.message || err)
    res.status(500).json({ error: err?.message || 'interpret failed' })
  }
})

// ── /rag/query — direct RAG, no action classification ─────────────────────
app.post('/rag/query', async (req, res) => {
  const { question, role, language = 'auto', module = null } = req.body || {}
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' })
  }
  if (typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'role is required' })
  }
  try {
    const out = await retrieveAndAnswer({
      question: question.trim(),
      role: role.trim(),
      language,
      module,
    })
    res.json(out)
  } catch (err) {
    console.error('[/rag/query]', err?.message || err)
    res.status(500).json({ error: err?.message || 'rag failed' })
  }
})

// ── /message — orchestrator: action intent first, then RAG, then fallback ─
// Decision rules:
//  1. Question-style phrasing (kya/why/how/explain/?) → try RAG first.
//  2. Otherwise interpret first; if intent is non-null AND confidence ≥ 0.6 → action.
//  3. Else fall through to RAG.
//  4. If RAG has no useable hits, return a fallback action shape (intent:null).
app.post('/message', async (req, res) => {
  const { text, role, language = 'auto' } = req.body || {}
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }
  if (typeof role !== 'string' || !role.trim()) {
    return res.status(400).json({ error: 'role is required' })
  }
  const t = text.trim()
  const r = role.trim()

  const looksLikeQuestion = /\?\s*$/.test(t) ||
    /\b(kya|kyun|kaise|kahaan|why|how|what|when|where|explain|samjhao|batao|describe|tell me|kya hai|kya hota)\b/i.test(t)

  try {
    if (!looksLikeQuestion) {
      // Try action intent first.
      const action = await interpretViaGroq({ text: t, role: r })
      if (action && action.intent && (action.confidence ?? 0) >= 0.6) {
        return res.json({ responseType: 'action', ...action })
      }
      // Else fall through to RAG.
    }

    const answer = await retrieveAndAnswer({ question: t, role: r, language })
    if (answer.contextHits > 0) {
      return res.json(answer)
    }

    // No good intent, no useable RAG hits — final fallback. Try the action
    // classifier once if we haven't yet so the frontend at least gets chips.
    if (looksLikeQuestion) {
      const action = await interpretViaGroq({ text: t, role: r })
      if (action) return res.json({ responseType: 'action', ...action })
    }
    return res.json({
      responseType: 'action',
      intent: null,
      module: null,
      entities: { question: t },
      confidence: 0,
      assistantText: "I'm not sure I can help with that yet.",
      requiresConfirmation: false,
      chips: [],
      language,
    })
  } catch (err) {
    console.error('[/message]', err?.message || err)
    res.status(500).json({ error: err?.message || 'message failed' })
  }
})

app.listen(PORT, () => {
  console.log(`SwiftChat AI listening on :${PORT}`)
})
