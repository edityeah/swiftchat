// Resolve Ask AI action descriptors → chat trigger / canvas / reminder.
//
// resolveActionForChat(action) → { label, trigger, variant, askAi: {...} }
//   Translates a response action into the SwiftChat chat-action shape consumed
//   by MessageBubble. Where the action opens a canvas (e.g. EDIT_APPLICATION),
//   the trigger is given a synthetic `ask_ai:open-canvas:<token>` form so
//   handleSend can call openCanvas with the matching context.
//
// runAskAiAction(action, services) → boolean
//   Direct invocation path used when the action was tapped from a non-chat
//   surface (e.g. AskAiPromptPanel). Services: { openCanvas, runChatTrigger,
//   openNotificationsCanvas }.

let actionRegistry = new Map()

// Encode/decode helpers for the synthetic chat trigger so we don't lose the
// original action descriptor when it round-trips through the chat layer.
function encode(action) {
  const id = action._encodedId || action.id || `act_${Math.random().toString(36).slice(2, 8)}`
  actionRegistry.set(id, action)
  return id
}

export function getEncodedAskAiAction(token) {
  return actionRegistry.get(token) || null
}

// Trigger prefix the chat dispatcher will recognise.
const PREFIX = 'ask_ai:action:'

export function resolveActionForChat(action) {
  if (!action) return null
  // For simple TRIGGER actions we hand back the raw chat trigger so existing
  // dispatch paths just work. Reminder + canvas types route through the
  // synthetic ask_ai action prefix.
  if (action.type === 'TRIGGER') {
    return {
      label: action.label,
      trigger: action.trigger,
      variant: action.variant || 'primary',
    }
  }
  const token = encode({ ...action, _encodedId: action.id })
  return {
    label: action.label,
    trigger: `${PREFIX}${token}`,
    variant: action.variant || 'primary',
  }
}

export function isAskAiActionTrigger(text) {
  return typeof text === 'string' && text.startsWith(PREFIX)
}

export function decodeAskAiActionTrigger(text) {
  if (!isAskAiActionTrigger(text)) return null
  const token = text.slice(PREFIX.length)
  return actionRegistry.get(token) || null
}

// Execute a non-trigger action. Returns true when handled.
export function runAskAiAction(action, services = {}) {
  if (!action) return false
  const { openCanvas, runChatTrigger, openNotificationsCanvas } = services
  if (action.type === 'TRIGGER') {
    if (typeof runChatTrigger === 'function') {
      runChatTrigger(action.trigger)
      return true
    }
    return false
  }
  if (action.type === 'CANVAS') {
    if (typeof openCanvas === 'function') {
      openCanvas(action.canvas || null)
      return true
    }
    return false
  }
  if (action.type === 'REMINDER') {
    if (typeof openNotificationsCanvas === 'function') {
      openNotificationsCanvas({
        view: 'reminder',
        broadcastPrefill: null,
        reminderPrefill: action.reminder || null,
      })
      return true
    }
    return false
  }
  if (action.type === 'ASK_AI' && typeof runChatTrigger === 'function') {
    runChatTrigger(`ask_ai:run:${action.promptId}`)
    return true
  }
  return false
}

// For unit-testing convenience — clear the encode registry between test runs.
export function _clearAskAiActionRegistry() {
  actionRegistry = new Map()
}
