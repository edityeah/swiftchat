// Ask AI engine — turns prompt clicks / typed queries into chat directives.
//
// Bubble-chip UI (no layer headings). The chat layer maintains a Set of
// already-shown prompt ids so each "More Prompts" tap reveals the next batch.
//
// Public API:
//   buildAskAiGreeting(role, profile)               → directive (greeting + initial chips)
//   buildAskAiNextChips(role, alreadyShownIds)      → directive (next chip batch)
//   runAskAiPrompt(promptId, ctx)                   → directive (result card)
//   processAskAiQuery(text, ctx)                    → routing intent
//   buildAskAiFallback(text, role)                  → "didn't match" suggestions
//
// Directive shape consumed by SuperHomePage.handleSend → addBot:
//   {
//     userBubble?: string,    // user-side bubble pushed BEFORE the bot reply
//     text: string,           // primary bot text shown above any html/opts
//     html?: string,          // HTML card (askAiCardHtml output)
//     actions?: [{ label, trigger, variant }],
//     progress?: string[],    // optional streaming "Analyzing..." text
//     opts?: string[],        // chip options
//     promptIds?: string[],   // ids of prompts emitted as chips, used by the
//                             // chat layer to advance the shown-set tracker
//     hasMore?: boolean,      // whether more prompts remain to reveal
//   }

import {
  ASK_AI_PROMPTS, getPromptById, getPromptsForRole,
  getInitialChipsForRole, getNextChipsForRole, getRolePromptCount,
} from '../../data/askAi/askAiPrompts.js'
import { getResponse } from '../../data/askAi/askAiResponses.js'
import { matchAskAi, suggestSimilarPrompts } from './askAiMatcher.js'
import { resolveActionForChat } from './askAiActions.js'
import { askAiCardHtml, askAiGreetingHtml } from './askAiCardHtml.js'

const ANALYZING_PROGRESS = [
  'Analyzing SwiftChat data...',
  'Cross-checking attendance, XAMTA, and scholarship signals...',
  'Composing recommended action...',
]

const MORE_LABEL  = 'More Prompts'
const FEWER_LABEL = 'Show fewer prompts'
const INITIAL_CHIP_COUNT = 6
const REVEAL_CHIP_COUNT  = 6

function withMoreChip(chipTexts, hasMore) {
  // Append the More Prompts chip when there's anything left to reveal.
  // Otherwise we surface a quiet "Show fewer prompts" affordance the chat
  // layer treats as "collapse back to the initial set".
  if (hasMore) return [...chipTexts, MORE_LABEL]
  return chipTexts
}

// ── Entry: open the Ask AI session (greeting + initial bubble chips). ─────
export function buildAskAiGreeting(role, profile) {
  const userFirstName = profile?.name?.split(' ')[0] || ''
  const initial = getInitialChipsForRole(role, INITIAL_CHIP_COUNT)
  const total   = getRolePromptCount(role)
  const hasMore = total > initial.length
  const chipTexts = initial.map(p => p.text)
  return {
    userBubble: 'Ask AI',
    text: '',
    html: askAiGreetingHtml({ userFirstName }),
    actions: null,
    opts: withMoreChip(chipTexts, hasMore),
    promptIds: initial.map(p => p.id),
    hasMore,
  }
}

// ── Reveal next batch of chips. Returns a single bot bubble (no headings). ─
export function buildAskAiNextChips(role, alreadyShownIds) {
  const next = getNextChipsForRole(role, alreadyShownIds, REVEAL_CHIP_COUNT)
  if (!next.length) {
    return {
      text: 'You\'ve seen all available prompts. Type any question — I\'ll match the closest one.',
      html: null,
      actions: null,
      opts: [],
      promptIds: [],
      hasMore: false,
    }
  }
  // Compute whether more remain after this batch.
  const seenAfter = new Set(alreadyShownIds)
  next.forEach(p => seenAfter.add(p.id))
  const total = getRolePromptCount(role)
  const hasMore = seenAfter.size < total
  return {
    text: '',
    html: null,
    actions: null,
    opts: withMoreChip(next.map(p => p.text), hasMore),
    promptIds: next.map(p => p.id),
    hasMore,
  }
}

// ── Run a prompt by id (the canonical path). ───────────────────────────────
export function runAskAiPrompt(promptId, { role, alreadyEchoedUser = false } = {}) {
  const prompt = getPromptById(promptId)
  if (!prompt) return null
  // Role gating — surface a friendly refusal when not allowed.
  if (role && prompt.roles && !prompt.roles.includes(role)) {
    return {
      userBubble: alreadyEchoedUser ? null : prompt.text,
      text: 'This Ask AI prompt is not available for your role.',
      html: null,
      actions: null,
      opts: null,
    }
  }
  const response = getResponse(promptId)
  if (!response) {
    return {
      userBubble: alreadyEchoedUser ? null : prompt.text,
      text: 'I have this prompt in the catalogue but no response wired up yet.',
      html: null,
      actions: null,
    }
  }
  const html = askAiCardHtml({
    question: prompt.text,
    answer: response.answer,
    table: response.table,
    insight: response.insight,
    category: prompt.category,
    persona: 'SwiftChat AI',
  })
  const actions = (response.actions || []).map(resolveActionForChat).filter(Boolean)
  return {
    userBubble: alreadyEchoedUser ? null : prompt.text,
    text: '',
    html,
    actions,
    progress: ANALYZING_PROGRESS,
  }
}

// ── Match a free-form query and run the closest prompt. ────────────────────
export function processAskAiQuery(text, { role } = {}) {
  if (!text || !text.trim()) return null
  const lower = text.trim().toLowerCase()

  if (lower === 'ask ai' || lower === 'task: ask_ai' || lower === 'task:ask_ai') {
    return { kind: 'greeting' }
  }
  if (lower === MORE_LABEL.toLowerCase() || lower === 'show all prompts') {
    return { kind: 'more-prompts' }
  }
  if (lower === FEWER_LABEL.toLowerCase()) {
    return { kind: 'fewer-prompts' }
  }
  if (lower === 'ask custom question') {
    return {
      kind: 'inline',
      directive: {
        text: 'Sure — type any question about attendance, XAMTA, scholarships, or parent alerts. I\'ll match it to the closest Ask AI prompt.',
        opts: getInitialChipsForRole(role).slice(0, 3).map(p => p.text),
      },
    }
  }

  const match = matchAskAi(text, { role })
  if (!match) return null
  return {
    kind: 'prompt',
    promptId: match.promptId,
    score: match.score,
    source: match.source,
  }
}

export function buildAskAiFallback(text, role) {
  const suggestions = suggestSimilarPrompts(text, { role, max: 3 })
  return {
    text: 'I can help with attendance, XAMTA, scholarships, parent alerts, and interventions. Try one of these:',
    html: null,
    actions: null,
    opts: suggestions.map(p => p.text),
  }
}

export const ASK_AI_TRIGGERS = {
  start:       'Task: ask_ai',
  startAlt:    'ask_ai:start',
  morePrompts: 'ask_ai:more',
}

export function isAskAiOpenTrigger(text) {
  if (!text) return false
  const norm = text.trim().toLowerCase()
  return norm === ASK_AI_TRIGGERS.start.toLowerCase()
    || norm === ASK_AI_TRIGGERS.startAlt
    || norm === 'ask ai'
    || norm === 'open ask ai'
}

export function isAskAiMorePromptsTrigger(text) {
  if (!text) return false
  const norm = text.trim().toLowerCase()
  return norm === ASK_AI_TRIGGERS.morePrompts
    || norm === MORE_LABEL.toLowerCase()
    || norm === 'show all prompts'
}

export function isAskAiFewerPromptsTrigger(text) {
  if (!text) return false
  return text.trim().toLowerCase() === FEWER_LABEL.toLowerCase()
}

// ask_ai:run:<promptId>
export function isAskAiRunTrigger(text) {
  return typeof text === 'string' && text.toLowerCase().startsWith('ask_ai:run:')
}

export function decodeAskAiRunTrigger(text) {
  if (!isAskAiRunTrigger(text)) return null
  return text.slice('ask_ai:run:'.length).trim()
}

export const ASK_AI_LABELS = { MORE: MORE_LABEL, FEWER: FEWER_LABEL }

// Re-exports for callers that want raw access to the catalogue.
export { ASK_AI_PROMPTS, getPromptsForRole }
