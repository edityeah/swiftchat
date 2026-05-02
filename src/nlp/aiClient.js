// AI client abstraction.
//
// In the prototype this is a deterministic local matcher that wraps
// `matchLocalIntent` from localPatterns.js. The interface is shaped so a real
// LLM call can be dropped in later without changing the rest of the NLP
// layer — see the `interpret()` contract below.
//
//   interpret({ text, role }) → Promise<{
//     actionId: string | null,    // best-guess action, or null if unknown
//     entities: Record<string,string>,
//     confidence: number,         // 0..1 — local matches return 0.9 / 0.0
//     source: 'local-pattern' | 'llm' | 'none',
//     fallbackModule?: string,    // module id when only the module matched
//   }>
//
// Keeping it Promise-shaped lets callers `await` it whether the backend is
// local or remote.

import { matchLocalIntent, extractEntities } from './localPatterns.js'
import { findModuleByAlias } from './moduleRegistry.js'

let remoteInterpreter = null

// Optional: a host can register a real LLM-backed interpreter at boot.
// The interpreter receives the same payload and must resolve to the same
// shape as the local return value (see contract above).
export function registerRemoteInterpreter(fn) {
  remoteInterpreter = typeof fn === 'function' ? fn : null
}

export async function interpret({ text, role }) {
  // Layer 1 — deterministic local patterns (fast, offline).
  const local = matchLocalIntent(text)
  const entities = extractEntities(text)

  if (local) {
    return {
      actionId: local.actionId,
      entities,
      confidence: 0.9,
      source: 'local-pattern',
    }
  }

  // Layer 2 — if a remote LLM interpreter is registered, ask it.
  if (remoteInterpreter) {
    try {
      const remote = await remoteInterpreter({ text, role, entities })
      if (remote) {
        // RAG-grounded answer — short-circuit straight to caller. No action
        // resolution needed.
        if (remote.answer && remote.answer.text) {
          return {
            actionId: null,
            entities,
            confidence: typeof remote.confidence === 'number' ? remote.confidence : 0.85,
            source: 'rag',
            answer: remote.answer,
          }
        }
        if (remote.actionId) {
          return {
            actionId: remote.actionId,
            entities: { ...entities, ...(remote.entities || {}) },
            confidence: typeof remote.confidence === 'number' ? remote.confidence : 0.7,
            source: 'llm',
            // Friendly prelude text + chips the LLM offered. Optional — the
            // router uses these for the bot bubble that precedes the directive.
            meta: remote.meta || null,
          }
        }
      }
    } catch {
      // Fall through to module-only fallback on remote failure.
    }
  }

  // Layer 3 — module hint only (no concrete action). Lets the router show a
  // clarification prompt scoped to the matched module.
  const mod = findModuleByAlias(text)
  if (mod) {
    return {
      actionId: null,
      entities,
      confidence: 0.4,
      source: 'none',
      fallbackModule: mod.id,
    }
  }

  return {
    actionId: null,
    entities,
    confidence: 0.0,
    source: 'none',
  }
}
