// Frontend wrapper around the SwiftChat AI backend.
//
// Plugs into aiClient.registerRemoteInterpreter(). Strictly translates the
// backend's JSON shape to the shape that aiClient.interpret() expects:
//   { actionId, entities, confidence, source: 'llm' }
//
// Hard rules:
//  - The LLM never executes anything. We only use its `intent` field. The
//    rest of the NLP pipeline (permissionGuard + actionRegistry.run) decides
//    what actually happens.
//  - On any error (no env var, network failure, non-200, malformed JSON,
//    timeout), we resolve to null so the caller falls back to local-only
//    behavior. We never throw.
//  - Responses below MIN_CONFIDENCE are dropped — the smart-fallback in
//    handleSend will land instead, which is friendlier than a 30% guess.

const MIN_CONFIDENCE = 0.5
const TIMEOUT_MS = 6000

function getApiUrl() {
  // Vite exposes import.meta.env at build/dev time only.
  const fromVite = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SWIFTCHAT_AI_API_URL
  return (fromVite || '').trim() || null
}

export function isRemoteEnabled() {
  return !!getApiUrl()
}

// Returns the strict backend payload (or null on any failure).
// path: 'message' (default — orchestrator: action OR answer)
//     | 'interpret' (action only)
//     | 'rag/query' (RAG only)
export async function callRemote({ text, role, signal, path = 'message' }) {
  const base = getApiUrl()
  if (!base) return null
  const url = base.replace(/\/$/, '') + '/' + path

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  signal?.addEventListener?.('abort', () => controller.abort(), { once: true })

  // /rag/query expects `question`, the other endpoints expect `text`.
  const body = path === 'rag/query' ? { question: text, role } : { text, role }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!resp.ok) return null
    const json = await resp.json()
    if (!json || typeof json !== 'object') return null
    return json
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// aiClient interpreter contract — see registerRemoteInterpreter.
//
// Supports two backend response shapes via `responseType`:
//   - 'action' → action classification (intent / entities / confidence)
//   - 'answer' → RAG-grounded answer (assistantText + citations)
//
// For 'answer' shape, returns { actionId: null, answer: {...} }. The router
// converts that into a `kind: 'answer'` directive.
export async function groqInterpreter({ text, role }) {
  const remote = await callRemote({ text, role, path: 'message' })
  if (!remote) return null

  // ── Answer (RAG) path ──
  if (remote.responseType === 'answer') {
    if (!remote.assistantText) return null
    return {
      actionId: null,
      entities: {},
      confidence: 0.85,
      answer: {
        text: remote.assistantText,
        citations: Array.isArray(remote.citations) ? remote.citations : [],
        language: remote.language || 'en',
      },
    }
  }

  // ── Action (intent) path ── (responseType 'action' OR legacy /interpret)
  if (!remote.intent) return null
  if (typeof remote.confidence === 'number' && remote.confidence < MIN_CONFIDENCE) return null
  return {
    actionId: remote.intent,
    entities: remote.entities && typeof remote.entities === 'object' ? remote.entities : {},
    confidence: typeof remote.confidence === 'number' ? remote.confidence : 0.7,
    meta: {
      assistantText: remote.assistantText || '',
      chips: Array.isArray(remote.chips) ? remote.chips : [],
      requiresConfirmation: !!remote.requiresConfirmation,
      language: remote.language || 'en',
    },
  }
}
