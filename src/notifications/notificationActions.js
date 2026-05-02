// Notification action dispatch table.
//
// Notification cards may include `action: { label, type, payload? }`. When a
// user taps the action, the canvas invokes `runNotificationAction(action,
// services)` which translates the action.type into either an openCanvas
// directive or a chat trigger string. Services (`openCanvas`, `runChatTrigger`)
// are injected by AppContext so this module stays UI-free.
//
// Adding a new action type:
//   1. Append a case to the switch.
//   2. Optionally surface the action.type as a notification template in
//      systemNotifications.js.

export const NOTIFICATION_ACTION_TYPES = [
  'OPEN_DIGIVRITTI_HOME',
  'OPEN_NAMO_LAKSHMI',
  'OPEN_NAMO_SARASWATI',
  'OPEN_APPLICATION_LIST',
  'OPEN_REJECTED_APPLICATIONS',
  'OPEN_APPLICATION_EDIT',
  'OPEN_XAMTA_SCAN',
  'OPEN_XAMTA_RESULTS',
  'OPEN_MARK_ATTENDANCE',
  'OPEN_PAYMENT_QUEUE',
  'OPEN_CRC_PENDING_REVIEWS',
  'OPEN_CRC_RESUBMITTED_REVIEWS',
  'OPEN_STATE_DASHBOARD',
  'OPEN_DISTRICT_DASHBOARD',
  'OPEN_SCHOOL_DASHBOARD',
  'OPEN_DIGIVRITTI_AI',
]

function asTrigger(trigger, services) {
  if (services && typeof services.runChatTrigger === 'function') {
    services.runChatTrigger(trigger)
    return true
  }
  // Fall back to queuing the trigger so the home screen can pick it up on next
  // mount. This is the path used when the bell is invoked from a screen that
  // doesn't own the chat handler (e.g. a profile page).
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new CustomEvent('swiftchat:chat:trigger', { detail: trigger })) } catch { /* noop */ }
    return true
  }
  return false
}

function asCanvas(ctx, services) {
  if (services && typeof services.openCanvas === 'function') {
    services.openCanvas(ctx)
    return true
  }
  return false
}

export function runNotificationAction(action, services) {
  if (!action || !action.type) return false
  const payload = action.payload || {}
  switch (action.type) {
    case 'OPEN_DIGIVRITTI_HOME':
      return asTrigger('dv:start', services)
    case 'OPEN_NAMO_LAKSHMI':
      return asTrigger('dv:nl:home', services)
    case 'OPEN_NAMO_SARASWATI':
      return asTrigger('dv:ns:home', services)
    case 'OPEN_APPLICATION_LIST': {
      const f = payload.scheme === 'ns' ? 'ns' : payload.scheme === 'nl' ? 'nl' : null
      return asTrigger(f ? `dv:canvas:list:${f}` : 'dv:canvas:list', services)
    }
    case 'OPEN_REJECTED_APPLICATIONS':
      return asTrigger('dv:canvas:list:rejected', services)
    case 'OPEN_APPLICATION_EDIT': {
      const appId = payload.appId
      if (!appId) return false
      // Open the rejected-application edit canvas directly so the teacher can
      // start fixing documents without going through the chat thread.
      const opened = asCanvas({ type: 'digivritti', view: 'edit', appId }, services)
      if (opened) return true
      return asTrigger(`dv:canvas:edit:${appId}`, services)
    }
    case 'OPEN_XAMTA_SCAN':
      return asTrigger('XAMTA scan', services)
    case 'OPEN_XAMTA_RESULTS':
      return asTrigger('Task: learning_outcomes', services)
    case 'OPEN_MARK_ATTENDANCE': {
      // If the notification supplied a class, open the AttendanceCanvas
      // directly so the teacher lands on the marking grid — no class picker.
      const classId = payload.class || payload.classId || payload.grade
      if (classId) {
        const opened = asCanvas({ type: 'attendance', classId: String(classId) }, services)
        if (opened) return true
      }
      return asTrigger('Task: attendance', services)
    }
    case 'OPEN_PAYMENT_QUEUE': {
      const filter = payload.paymentFilter || 'pending'
      return asTrigger(`dv:canvas:payment-queue:${filter}`, services)
    }
    case 'OPEN_CRC_PENDING_REVIEWS':
      return asTrigger('dv:canvas:review', services)
    case 'OPEN_CRC_RESUBMITTED_REVIEWS':
      return asTrigger('dv:canvas:review:resub', services)
    case 'OPEN_STATE_DASHBOARD':
      return asTrigger('Task: state_dashboard', services)
    case 'OPEN_DISTRICT_DASHBOARD':
      return asTrigger('Task: district_dashboard', services)
    case 'OPEN_SCHOOL_DASHBOARD':
      return asTrigger('Task: dashboard', services)
    case 'OPEN_DIGIVRITTI_AI':
      return asTrigger('dv:ai:menu', services)
    default:
      return false
  }
}
