// Top-level NLP router for SwiftChat.
//
// The router is the single funnel that owns:
//   - module / action detection (delegated to aiClient.interpret)
//   - role permission enforcement
//   - missing-entity clarification
//   - state-changing confirmation
//   - directive emission
//
// It is intentionally pure — it does not touch React state. The caller (the
// useSwiftChatNlp hook + handleSend) is responsible for executing the
// directive (firing the existing trigger string, opening a canvas, or
// rendering an inline reply).
//
// routeIntent({ text, role }) → Promise<Directive>
//
// Directive kinds:
//   { kind: 'unknown' }
//       — router has nothing useful; caller should fall back to its own logic.
//   { kind: 'denied', reason }
//       — role can't run this; caller should show `reason` to the user.
//   { kind: 'clarify', prompt, chips, pendingAction, entities }
//       — required entity is missing; render `prompt` + `chips`. When the user
//         taps a chip, the caller should call `routeIntent` again with the
//         chip text plus pendingAction so the entity is resolved.
//   { kind: 'confirm', prompt, action, entities }
//       — confirmation step for state-changing actions.
//   { kind: 'execute', action, entities, directive }
//       — go-ahead. `directive` is the action's run() result:
//         { trigger?, canvas?, reply? }. Caller dispatches it.
//   { kind: 'module-fallback', module }
//       — only the module was identified; show the module's fallback prompt.
//

import { interpret } from './aiClient.js'
import { matchLocalIntent, extractEntities } from './localPatterns.js'
import { getAction } from './actionRegistry.js'
import { canRoleUseAction } from './permissionGuard.js'
import { MODULE_BY_ID, findModuleByAlias } from './moduleRegistry.js'

function findEntityChip(prompt, chip, requiredEntity) {
  // The clarification chips (e.g. "Class 6") may need to be parsed back into
  // the entity slot. We piggy-back on the same regex extractors so a chip
  // labelled "Class 6" lands in entities.class.
  const ent = extractEntities(chip)
  if (ent[requiredEntity]) return ent[requiredEntity]
  return chip
}

export async function routeIntent({ text, role, pendingAction = null, accumulatedEntities = {} } = {}) {
  if (!text || !role) return { kind: 'unknown' }

  // ── If we're resuming after a clarification or confirmation, fast-path. ─
  if (pendingAction) {
    const action = getAction(pendingAction.actionId)
    if (action) {
      // Confirmation flow: chip text is "Yes" / "No"
      if (pendingAction.stage === 'confirm') {
        if (/^(yes|confirm|ok|sure|haan|ji|bilkul|✅)/i.test(text.trim())) {
          const directive = action.run({ entities: pendingAction.entities, role })
          return { kind: 'execute', action, entities: pendingAction.entities, directive }
        }
        return { kind: 'denied', reason: 'Cancelled — no action taken.' }
      }
      // Clarification flow: chip resolves a single missing entity
      if (pendingAction.stage === 'clarify') {
        const missing = pendingAction.missingEntity
        const value = findEntityChip(pendingAction.prompt, text, missing)
        const entities = { ...pendingAction.entities, [missing]: value }
        return finalizeAction(action, entities, role)
      }
    }
  }

  // ── Fresh interpretation path. ─────────────────────────────────────────
  const r = await interpret({ text, role })

  // RAG answer short-circuit. No actionId; just hand the answer card to the
  // chat layer.
  if (r.answer && r.answer.text) {
    return {
      kind: 'answer',
      text: r.answer.text,
      citations: r.answer.citations || [],
      language: r.answer.language || 'en',
      source: r.source || 'rag',
    }
  }

  if (r.actionId) {
    const action = getAction(r.actionId)
    if (!action) return { kind: 'unknown' }

    const guard = canRoleUseAction(role, r.actionId)
    if (!guard.allowed) return { kind: 'denied', reason: guard.reason }

    const entities = { ...accumulatedEntities, ...r.entities }
    const out = finalizeAction(action, entities, role)
    // Forward LLM preamble text + chips when present. handleSend uses these
    // to render the friendly assistant bubble before firing the directive.
    if (r.meta) out.meta = r.meta
    return out
  }

  if (r.fallbackModule) {
    const mod = MODULE_BY_ID[r.fallbackModule]
    if (mod && mod.allowedRoles.includes(role)) {
      return { kind: 'module-fallback', module: mod }
    }
  }

  return { kind: 'unknown' }
}

// Convert (action, entities) into the next directive: clarify → confirm → execute.
function finalizeAction(action, entities, role) {
  // Missing entity?
  for (const required of action.requiredEntities || []) {
    if (!entities[required]) {
      const fb = action.fallbackClarification || {
        prompt: `Could you tell me the ${required}?`,
        chips: [],
      }
      return {
        kind: 'clarify',
        prompt: fb.prompt,
        chips: fb.chips || [],
        pendingAction: {
          actionId: action.id,
          stage: 'clarify',
          entities,
          missingEntity: required,
          prompt: fb.prompt,
        },
      }
    }
  }

  // Confirmation gate?
  if (action.requiresConfirmation) {
    const summary = describeAction(action, entities)
    return {
      kind: 'confirm',
      prompt: summary.prompt,
      chips: ['✅ Yes, proceed', '❌ Cancel'],
      action,
      entities,
      pendingAction: {
        actionId: action.id,
        stage: 'confirm',
        entities,
      },
    }
  }

  // Ready to fire.
  const directive = action.run({ entities, role })
  return { kind: 'execute', action, entities, directive }
}

// Synchronous variant — uses only local pattern matching (no LLM call).
// Same Directive shape as routeIntent. Suitable for callers (e.g. the
// existing sync handleSend in SuperHomePage) that need an immediate answer.
export function routeIntentSync({ text, role, pendingAction = null, accumulatedEntities = {} } = {}) {
  if (!text || !role) return { kind: 'unknown' }

  if (pendingAction) {
    const action = getAction(pendingAction.actionId)
    if (action) {
      if (pendingAction.stage === 'confirm') {
        if (/^(yes|confirm|ok|sure|haan|ji|bilkul|✅)/i.test(text.trim())) {
          const directive = action.run({ entities: pendingAction.entities, role })
          return { kind: 'execute', action, entities: pendingAction.entities, directive }
        }
        return { kind: 'denied', reason: 'Cancelled — no action taken.' }
      }
      if (pendingAction.stage === 'clarify') {
        const missing = pendingAction.missingEntity
        const value = findEntityChip(pendingAction.prompt, text, missing)
        const entities = { ...pendingAction.entities, [missing]: value }
        return finalizeAction(action, entities, role)
      }
    }
  }

  const local = matchLocalIntent(text)
  const entities = { ...accumulatedEntities, ...extractEntities(text) }

  if (local) {
    const action = getAction(local.actionId)
    if (!action) return { kind: 'unknown' }
    const guard = canRoleUseAction(role, action.id)
    if (!guard.allowed) return { kind: 'denied', reason: guard.reason }
    return finalizeAction(action, entities, role)
  }

  const mod = findModuleByAlias(text)
  if (mod && mod.allowedRoles.includes(role)) {
    return { kind: 'module-fallback', module: mod }
  }

  return { kind: 'unknown' }
}

function describeAction(action, entities) {
  const parts = Object.entries(entities)
    .filter(([k]) => k !== 'question')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
  return {
    prompt: parts
      ? `Please confirm: **${action.label}** — ${parts}.`
      : `Please confirm: **${action.label}**.`,
  }
}
