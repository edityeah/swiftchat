// Ask AI prompt matcher — deterministic, no LLM.
//
// match(text, role) → { promptId, score, source } | null
//
// Scoring stack (highest first):
//   1. Exact text match (lowercased + collapsed whitespace).        score 1.0
//   2. Token-set match against prompt.tokens / aliases.             0.8 – 0.95
//   3. Word-overlap Jaccard against the canonical prompt text.      0.3 – 0.7
// Below the threshold (0.45) we return null so the caller can render its
// "I can help with…" fallback.

import { ASK_AI_PROMPTS, getPromptsForRole } from '../../data/askAi/askAiPrompts.js'

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','to','of','in','on','for','my',
  'me','i','we','you','your','our','it','this','that','these','those','and',
  'or','if','do','does','did','will','can','should','about','at','by','with',
  'from','please','tell','show','need','want','help','some','any','what','who',
  'which','how','many','have','has','had','been','being','as','so','then',
  // Hinglish/Gujarati noise that shouldn't drive matches by themselves.
  'kya','hai','kis','kaun','kitne','aaj','kal','mere','mera','meri','ko','ka',
  'ke','ki','batao','dikhao','please','jra','bhai','kar','karna','karo','karun',
  'su','che','jaroor','che','no','na','nu','ne','jo','to',
])

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s) {
  return normalise(s).split(' ').filter(Boolean).filter(w => !STOPWORDS.has(w))
}

function jaccard(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0
  const a = new Set(aTokens)
  const b = new Set(bTokens)
  let intersect = 0
  for (const v of a) if (b.has(v)) intersect++
  const union = a.size + b.size - intersect
  return union === 0 ? 0 : intersect / union
}

// Phrase-overlap helper — bumps the score when one of the prompt's intent
// tokens (often a multi-word phrase) appears as a substring of the user
// query. This lets entries like "mother name mismatch fix karu to kya hoga"
// resolve cleanly even when stop-words don't align.
function bestPhraseHitScore(query, prompt) {
  const norm = normalise(query)
  let bestLen = 0
  const candidates = [prompt.text || '', ...(prompt.tokens || [])]
  for (const phrase of candidates) {
    const np = normalise(phrase)
    if (!np) continue
    if (norm.includes(np) && np.length > bestLen) bestLen = np.length
  }
  if (bestLen === 0) return 0
  // Map phrase length to a similarity score: a 12-char phrase = 0.55, a
  // 30-char phrase = 0.95, capped at 0.95.
  const s = 0.4 + (bestLen / 50) * 0.55
  return Math.min(0.95, s)
}

export function matchAskAi(text, { role = null, prompts = null } = {}) {
  if (!text) return null
  const norm = normalise(text)
  if (!norm) return null

  const pool = prompts || (role ? getPromptsForRole(role) : ASK_AI_PROMPTS)
  if (!pool.length) return null

  // 1. Exact (lower, collapsed) text match.
  for (const p of pool) {
    if (normalise(p.text) === norm) {
      return { promptId: p.id, score: 1.0, source: 'exact', prompt: p }
    }
    // Also exact-match on any token alias.
    for (const tk of p.tokens || []) {
      if (normalise(tk) === norm) {
        return { promptId: p.id, score: 0.98, source: 'exact-token', prompt: p }
      }
    }
  }

  // 2. Phrase containment (multi-word substring hit).
  let phraseBest = null
  for (const p of pool) {
    const s = bestPhraseHitScore(norm, p)
    if (s > 0 && (!phraseBest || s > phraseBest.score)) {
      phraseBest = { promptId: p.id, score: s, source: 'phrase', prompt: p }
    }
  }

  // 3. Word-overlap Jaccard against (prompt.text + tokens).
  const queryTokens = tokenize(norm)
  let overlapBest = null
  for (const p of pool) {
    const corpus = tokenize([p.text, ...(p.tokens || [])].join(' '))
    const j = jaccard(queryTokens, corpus)
    // Down-weight tiny matches against very long corpora so we don't get
    // false positives from a single keyword.
    const adjusted = queryTokens.length <= 2 ? j * 0.7 : j
    if (adjusted > 0 && (!overlapBest || adjusted > overlapBest.score)) {
      overlapBest = { promptId: p.id, score: adjusted, source: 'jaccard', prompt: p }
    }
  }

  // Pick the best of the two heuristic strategies.
  let best = phraseBest
  if (overlapBest && (!best || overlapBest.score > best.score)) best = overlapBest

  if (!best) return null
  if (best.score < 0.55) return null
  // Tiny queries (1-2 content words) are too noisy for a dispatch decision —
  // the existing keyword-based flows (`Task: at_risk`, `parent alert`, etc.)
  // already cover those. Require a longer phrase OR a strong phrase hit.
  if (queryTokens.length < 3 && best.source !== 'phrase') return null
  return best
}

export function suggestSimilarPrompts(text, { role = null, max = 3 } = {}) {
  if (!text) return []
  const pool = role ? getPromptsForRole(role) : ASK_AI_PROMPTS
  const norm = normalise(text)
  const queryTokens = tokenize(norm)
  return pool
    .map(p => {
      const corpus = tokenize([p.text, ...(p.tokens || [])].join(' '))
      const j = jaccard(queryTokens, corpus)
      const phrase = bestPhraseHitScore(norm, p)
      return { prompt: p, score: Math.max(j, phrase) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(x => x.prompt)
}
