// Frontend scheduler — wakes precisely when the next reminder/notification is
// due (via setTimeout), and also runs a slow safety-net poll every 15 seconds
// so that newly-added items, edited reminders, and clock skew never leave a
// notification stranded.
//
// On every tick:
//   1. Walk the persisted store.
//   2. For each undelivered notification with `scheduledAt <= now`, mark it
//      delivered and emit a `swiftchat:notifications:due` event when it
//      targets the active user.
//   3. Recompute the soonest pending `scheduledAt` and arm a one-shot
//      setTimeout for that exact moment.
//
// Listening UIs (AppContext) hook the due event to play the chime, shake the
// bell, and surface the toast. Because we drive the next wake-up by the
// notification itself, a reminder set for 1:20 PM fires at 1:20 PM (±50 ms).

import { loadAll, markDelivered, onNotificationsChange } from './notificationStore.js'
import { matchesNotificationTarget } from './notificationTargeting.js'

const SAFETY_TICK_MS = 15 * 1000
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000   // setTimeout caps; rearm hourly worst-case
const DUE_EVENT = 'swiftchat:notifications:due'

let safetyIntervalId = null
let nextDueTimeoutId = null
let storeChangeUnsub = null
let currentUserRef = null

function emitDue(notification) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(DUE_EVENT, { detail: notification }))
  } catch { /* noop */ }
}

export function onNotificationsDue(handler) {
  if (typeof window === 'undefined') return () => {}
  const wrapped = (e) => handler(e.detail)
  window.addEventListener(DUE_EVENT, wrapped)
  return () => window.removeEventListener(DUE_EVENT, wrapped)
}

// Fire delivery for any currently-due notifications and emit due events when
// the active user is the target. Returns the next future scheduledAt timestamp
// (ms epoch) so the caller can arm a precise wake-up.
export function runSchedulerTick(user, { now = Date.now() } = {}) {
  const list = loadAll()
  let nextDueMs = null

  for (const n of list) {
    if (n.deliveredAt) continue

    if (!n.scheduledAt) {
      // Immediate-delivery notification — mark it delivered the first time we
      // see it. Still emit a due event if it targets the current user.
      const updated = markDelivered(n.id, new Date(now).toISOString())
      if (user && matchesNotificationTarget(updated || n, user)) emitDue(updated || n)
      continue
    }

    const sch = Date.parse(n.scheduledAt)
    if (!Number.isFinite(sch)) continue

    if (sch <= now) {
      const updated = markDelivered(n.id, new Date(now).toISOString())
      if (user && matchesNotificationTarget(updated || n, user)) emitDue(updated || n)
    } else if (nextDueMs == null || sch < nextDueMs) {
      nextDueMs = sch
    }
  }

  return nextDueMs
}

// Schedule a one-shot setTimeout for the next future `scheduledAt`.
function armNextDueTimer(nextDueMs) {
  if (nextDueTimeoutId) {
    clearTimeout(nextDueTimeoutId)
    nextDueTimeoutId = null
  }
  if (!Number.isFinite(nextDueMs)) return
  const delay = Math.max(50, Math.min(nextDueMs - Date.now(), MAX_TIMEOUT_MS))
  nextDueTimeoutId = setTimeout(() => {
    nextDueTimeoutId = null
    const next = runSchedulerTick(currentUserRef)
    armNextDueTimer(next)
  }, delay)
}

// Re-evaluate the schedule now (used by the safety tick + store-change events).
function refreshSchedule() {
  const next = runSchedulerTick(currentUserRef)
  armNextDueTimer(next)
}

export function startScheduler(user) {
  stopScheduler()
  currentUserRef = user || null
  // Fire any backlog immediately and arm the next-due timer.
  refreshSchedule()
  // Safety net: a slow poll catches edits, clock drift, and the rare case
  // where the precise timer was cleared without rearming.
  safetyIntervalId = setInterval(() => {
    refreshSchedule()
  }, SAFETY_TICK_MS)
  // React to store mutations (new reminder, edited time, etc.) — re-arm.
  storeChangeUnsub = onNotificationsChange(() => refreshSchedule())
  return stopScheduler
}

export function updateSchedulerUser(user) {
  currentUserRef = user || null
  refreshSchedule()
}

export function stopScheduler() {
  if (safetyIntervalId) {
    clearInterval(safetyIntervalId)
    safetyIntervalId = null
  }
  if (nextDueTimeoutId) {
    clearTimeout(nextDueTimeoutId)
    nextDueTimeoutId = null
  }
  if (typeof storeChangeUnsub === 'function') {
    storeChangeUnsub()
    storeChangeUnsub = null
  }
}

// Manual-fire helper — used by the broadcast/reminder forms when the user
// chooses "send immediately" (no future scheduledAt). The event is emitted
// only if the notification targets the current user; otherwise nothing
// happens (the notification still lands silently in their list when
// targeted, picked up on next visibility query).
export function fireImmediateDelivery(notification, user) {
  if (!notification) return
  if (notification.deliveredAt) {
    if (user && matchesNotificationTarget(notification, user)) emitDue(notification)
    return
  }
  const updated = markDelivered(notification.id, new Date().toISOString())
  if (user && matchesNotificationTarget(updated || notification, user)) {
    emitDue(updated || notification)
  }
}

export const SCHEDULER_TICK_MS = SAFETY_TICK_MS
