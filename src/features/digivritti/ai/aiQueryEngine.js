// DigiVritti AI — query engine.
//
// Pure functions that look up role-scoped queries / deep-dive scenarios from
// AI_QUERIES_BY_ROLE and AI_DEEP_DIVE_SCENARIOS. No live LLM call — results are
// deterministic mock fixtures that mirror demo.jsx output.

import {
  AI_QUERIES_BY_ROLE,
  AI_DEEP_DIVE_SCENARIOS,
  AI_KEYWORDS,
  AI_DEEP_DIVE_KEYWORDS,
  AI_ROLE_META,
} from '../../../data/digivritti/aiQueries'

// Role aliases used elsewhere in the app — keep the engine lenient.
const ROLE_ALIAS = {
  teacher: 'teacher',
  parent: 'teacher', // parent does not have AI; fallback to teacher chips would never run since UI gates by role
  crc: 'crc',
  deo: 'deo',
  state_secretary: 'state_secretary',
  state: 'state_secretary',
  pfms: 'pfms',
  principal: 'principal',
}

export function normalizeRole(role) {
  return ROLE_ALIAS[role] || 'teacher'
}

export function getAIRoleMeta(role) {
  return AI_ROLE_META[normalizeRole(role)] || AI_ROLE_META.teacher
}

export function getAIQueriesForRole(role) {
  return AI_QUERIES_BY_ROLE[normalizeRole(role)] || []
}

export function getAIQueryById(role, id) {
  const list = getAIQueriesForRole(role)
  return list.find(q => q.id === id) || null
}

// Build the full AI answer payload for a chip click.
export function runAIQuery(role, queryId) {
  const q = getAIQueryById(role, queryId)
  if (!q) return null
  return {
    question: q.q,
    sql: q.sql,
    result: q.result,
    insight: q.insight,
    category: q.category,
    followups: (q.followups || [])
      .map(fid => getAIQueryById(role, fid))
      .filter(Boolean),
    queryId: q.id,
  }
}

// Custom typed question — keyword fallback, then first query if nothing matches.
export function runCustomAIQuery(role, question) {
  const r = normalizeRole(role)
  const text = (question || '').trim()
  if (!text) return null

  // Deep-dive scenario keywords.
  for (const k of AI_DEEP_DIVE_KEYWORDS) {
    if (k.match.test(text)) {
      const scenario = getDeepDiveScenario(k.scenarioId)
      if (scenario && scenario.roles.includes(r)) {
        return { kind: 'scenario', scenarioId: k.scenarioId }
      }
    }
  }

  // Single-query keywords.
  for (const k of AI_KEYWORDS) {
    if (k.match.test(text)) {
      const id = k.queries[r]
      if (id) {
        const out = runAIQuery(r, id)
        if (out) return { kind: 'query', ...out }
      }
    }
  }

  // No match — answer with first query for the role + a polite preface.
  const first = getAIQueriesForRole(r)[0]
  if (!first) return null
  return {
    kind: 'query',
    ...runAIQuery(r, first.id),
    fallbackNotice: `I couldn't match your question exactly, so here's the closest answer I have.`,
  }
}

// ─── Deep-dive scenarios ─────────────────────────────────────────────────────
export function getDeepDivesForRole(role) {
  const r = normalizeRole(role)
  return AI_DEEP_DIVE_SCENARIOS.filter(s => s.roles.includes(r))
}

export function getDeepDiveScenario(scenarioId) {
  return AI_DEEP_DIVE_SCENARIOS.find(s => s.id === scenarioId) || null
}

export function runDeepDiveTurn(scenarioId, turnIndex) {
  const scenario = getDeepDiveScenario(scenarioId)
  if (!scenario) return null
  const turn = scenario.turns[turnIndex]
  if (!turn) return null
  return {
    scenarioId,
    title: scenario.title,
    persona: scenario.persona,
    turnIndex,
    totalTurns: scenario.turns.length,
    question: turn.q,
    sql: turn.sql,
    result: turn.result,
    insight: turn.insight,
    followup: turn.followup, // suggested next-question string (turn N+1's question)
    isLastTurn: turnIndex === scenario.turns.length - 1,
    completion: scenario.completion,
  }
}
