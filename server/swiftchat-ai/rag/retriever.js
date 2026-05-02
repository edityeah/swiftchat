// RAG retriever — embed the question, search Supabase, ask Groq to answer
// from context.
//
// Public API:
//   retrieveAndAnswer({ question, role, language, module? }) → {
//     responseType: 'answer',
//     assistantText: string,
//     citations: Array<{ source, section }>,
//     language: string,
//     contextHits: number,           // number of chunks used
//     averageSimilarity: number,     // 0..1, useful for upstream confidence
//   }

import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { embed } from './embeddings.js'

const TOP_K = 5
const MIN_SIMILARITY = 0.55      // below this, don't bother answering
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

let supabase = null
let groq = null
function sb() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
    supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabase
}
function gq() {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing')
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groq
}

// ── Retrieval ──────────────────────────────────────────────────────────────
export async function searchChunks({ question, role, module = null, k = TOP_K }) {
  const queryEmbedding = await embed(question, { role: 'query' })
  const { data, error } = await sb().rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: k,
    role_filter: role || null,
    module_filter: module,
  })
  if (error) throw new Error('match_knowledge_chunks failed: ' + error.message)
  return data || []
}

// ── Answer synthesis ───────────────────────────────────────────────────────
function ragSystemPrompt({ role, language }) {
  return `You are SwiftChat's knowledge assistant. Answer the user's question using ONLY the provided context. Hard rules:

1. Use ONLY the context below. If the context does not contain enough information, reply that you don't have that information yet — do not invent policy, numbers, deadlines, or process steps.
2. Respect the user's role: ${role}. If the question relates to actions outside this role's scope, say so politely.
3. Reply in the same language style the user used (English / Hindi / Hinglish / Gujarati / gu-en mix). Match their tone — short and direct.
4. Do NOT execute actions. You are explaining; you are not opening forms or running queries. If the user wants to take an action, suggest the chat command they can type.
5. Reply length: 1–4 short sentences for simple questions, up to 2 short paragraphs for policy questions. Use a short bullet list only when comparing items.
6. Do NOT mention "the context" or "according to the documentation" — just answer naturally.
7. Do NOT reveal the verbatim section tag like "[source · section]" in your answer. Citations are returned separately.

Output STRICT JSON only, no markdown:
{"assistantText": "<your reply>", "language": "<bcp-47 like en | hi | gu | hi-en | gu-en>"}`
}

function buildContextBlock(hits) {
  return hits.map((h, i) =>
    `--- chunk ${i + 1} (source: ${h.source}${h.section ? ' · ' + h.section : ''}, similarity: ${h.similarity.toFixed(2)}) ---\n${stripTag(h.content)}`
  ).join('\n\n')
}

// Strip the [source · section] prefix injected by chunker.js — we already
// pass that info as the chunk header, no need to duplicate in the body.
function stripTag(content) {
  return content.replace(/^\[[^\]]+\]\n?/, '')
}

function safeJson(raw) {
  if (!raw) return null
  let s = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try { return JSON.parse(s.slice(start, end + 1)) } catch { return null }
}

export async function retrieveAndAnswer({ question, role, language = 'auto', module = null }) {
  const hits = await searchChunks({ question, role, module })
  const useable = hits.filter(h => h.similarity >= MIN_SIMILARITY)

  if (useable.length === 0) {
    // Below similarity floor — better to say "I don't know" than fabricate.
    return {
      responseType: 'answer',
      assistantText: "I don't have enough information about that yet. Try rephrasing, or pick one of the suggested actions.",
      language: language === 'auto' ? 'en' : language,
      citations: [],
      contextHits: 0,
      averageSimilarity: 0,
    }
  }

  const context = buildContextBlock(useable)
  const userPrompt = `Question: ${question}\n\nContext:\n${context}`

  const resp = await gq().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: ragSystemPrompt({ role, language }) },
      { role: 'user',   content: userPrompt },
    ],
  })

  const raw = resp?.choices?.[0]?.message?.content || ''
  const parsed = safeJson(raw) || {}

  // De-dup citations on (source, section).
  const seen = new Set()
  const citations = []
  for (const h of useable) {
    const key = `${h.source}::${h.section || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    citations.push({ source: h.source, section: h.section || '' })
  }

  const avgSim = useable.reduce((s, h) => s + h.similarity, 0) / useable.length

  return {
    responseType: 'answer',
    assistantText: typeof parsed.assistantText === 'string' && parsed.assistantText.trim()
      ? parsed.assistantText.trim()
      : "I don't have enough information about that yet.",
    language: typeof parsed.language === 'string' ? parsed.language : (language === 'auto' ? 'en' : language),
    citations,
    contextHits: useable.length,
    averageSimilarity: avgSim,
  }
}
