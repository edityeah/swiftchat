// localStorage-backed notification store.
//
// Single canonical list keyed by `swiftchat.notifications.v1`. All readers go
// through `loadAll()` so the on-disk shape is normalised in one place. Mutators
// load → mutate → save and emit a `swiftchat:notifications:changed` window
// event so listeners (AppContext) can re-read.

import { newNotificationId } from './notificationTypes.js'
import { matchesNotificationTarget, userIdFor } from './notificationTargeting.js'

const STORAGE_KEY = 'swiftchat.notifications.v1'
const PREFS_KEY   = 'swiftchat.notificationPrefs.v1'
const SEED_KEY    = 'swiftchat.notifications.seeded.v1'
const CHANGE_EVENT = 'swiftchat:notifications:changed'

// ── localStorage helpers ────────────────────────────────────────────────────
function ls() {
  try { return typeof window !== 'undefined' ? window.localStorage : null }
  catch { return null }
}

function readJson(key, fallback) {
  const s = ls(); if (!s) return fallback
  try {
    const raw = s.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed == null ? fallback : parsed
  } catch { return fallback }
}

function writeJson(key, value) {
  const s = ls(); if (!s) return
  try { s.setItem(key, JSON.stringify(value)) } catch { /* quota etc. */ }
}

function emitChange() {
  if (typeof window === 'undefined') return
  try { window.dispatchEvent(new Event(CHANGE_EVENT)) } catch { /* noop */ }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function onNotificationsChange(handler) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

export function loadAll() {
  const list = readJson(STORAGE_KEY, [])
  if (!Array.isArray(list)) return []
  // Strip out anything that's missing a stable id — defensive.
  return list.filter(n => n && typeof n === 'object' && n.id)
}

export function saveAll(list) {
  writeJson(STORAGE_KEY, Array.isArray(list) ? list : [])
  emitChange()
}

export function getPrefs() {
  return readJson(PREFS_KEY, { soundEnabled: true })
}

export function setPrefs(patch) {
  const cur = getPrefs()
  writeJson(PREFS_KEY, { ...cur, ...(patch || {}) })
  emitChange()
}

// ── Mutators ────────────────────────────────────────────────────────────────

function nowIso() { return new Date().toISOString() }

function normalizeIncoming(input, defaults = {}) {
  const now = nowIso()
  const id = input.id || newNotificationId()
  return {
    id,
    type:           input.type || defaults.type || 'system',
    title:          input.title || '',
    message:        input.message || '',
    category:       input.category || defaults.category || 'general',
    priority:       input.priority || 'normal',
    module:         input.module || defaults.module || null,
    createdBy:      input.createdBy || defaults.createdBy || 'system',
    createdByRole:  input.createdByRole || defaults.createdByRole || 'system',
    targetRoles:    Array.isArray(input.targetRoles) ? [...input.targetRoles] : [],
    targetUserIds:  Array.isArray(input.targetUserIds) ? [...input.targetUserIds] : [],
    scheduledAt:    input.scheduledAt || null,
    deliveredAt:    input.deliveredAt || null,
    expiresAt:      input.expiresAt || null,
    action:         input.action || null,
    readBy:         Array.isArray(input.readBy) ? [...input.readBy] : [],
    dismissedBy:    Array.isArray(input.dismissedBy) ? [...input.dismissedBy] : [],
    createdAt:      input.createdAt || now,
    updatedAt:      input.updatedAt || now,
    meta:           input.meta || null,
  }
}

export function addNotification(input, defaults) {
  const list = loadAll()
  const next = normalizeIncoming(input, defaults)
  list.push(next)
  saveAll(list)
  return next
}

export function addManyNotifications(inputs, defaults) {
  const list = loadAll()
  const created = (inputs || []).map(i => normalizeIncoming(i, defaults))
  saveAll([...list, ...created])
  return created
}

export function updateNotification(id, patch) {
  const list = loadAll()
  let updated = null
  const next = list.map(n => {
    if (n.id !== id) return n
    updated = { ...n, ...(patch || {}), updatedAt: nowIso() }
    return updated
  })
  saveAll(next)
  return updated
}

export function deleteNotification(id) {
  const list = loadAll()
  saveAll(list.filter(n => n.id !== id))
}

export function markRead(id, userId) {
  if (!userId) return null
  const list = loadAll()
  let updated = null
  const next = list.map(n => {
    if (n.id !== id) return n
    const readBy = n.readBy && n.readBy.includes(userId) ? n.readBy : [...(n.readBy || []), userId]
    updated = { ...n, readBy, updatedAt: nowIso() }
    return updated
  })
  saveAll(next)
  return updated
}

export function markAllRead(userId, predicate) {
  if (!userId) return
  const list = loadAll()
  const filter = typeof predicate === 'function' ? predicate : () => true
  const next = list.map(n => {
    if (!filter(n)) return n
    if ((n.readBy || []).includes(userId)) return n
    return { ...n, readBy: [...(n.readBy || []), userId], updatedAt: nowIso() }
  })
  saveAll(next)
}

export function dismissNotification(id, userId) {
  if (!userId) return null
  const list = loadAll()
  let updated = null
  const next = list.map(n => {
    if (n.id !== id) return n
    const dismissedBy = (n.dismissedBy || []).includes(userId)
      ? n.dismissedBy
      : [...(n.dismissedBy || []), userId]
    // Reminders are personal — physically remove them on dismiss.
    if (n.type === 'reminder' && (n.targetUserIds || []).includes(userId)) {
      updated = null
      return null
    }
    updated = { ...n, dismissedBy, updatedAt: nowIso() }
    return updated
  }).filter(Boolean)
  saveAll(next)
  return updated
}

export function markDelivered(id, deliveredAt) {
  return updateNotification(id, { deliveredAt: deliveredAt || nowIso() })
}

// ── Queries ─────────────────────────────────────────────────────────────────

// Returns notifications visible to the given user — includes only those that
// are due (no scheduledAt OR scheduledAt <= now), targeted to this user, and
// not dismissed by them. Sorted newest-first.
export function getNotificationsForUser(user, { now = Date.now() } = {}) {
  if (!user) return []
  const uid = userIdFor(user)
  return loadAll()
    .filter(n => matchesNotificationTarget(n, user))
    .filter(n => !uid || !(n.dismissedBy || []).includes(uid))
    .filter(n => {
      const sch = n.scheduledAt ? Date.parse(n.scheduledAt) : null
      if (Number.isFinite(sch) && sch > now) return false
      return true
    })
    .sort((a, b) => {
      const ta = Date.parse(a.scheduledAt || a.createdAt) || 0
      const tb = Date.parse(b.scheduledAt || b.createdAt) || 0
      return tb - ta
    })
}

export function unreadCountFor(user) {
  if (!user) return 0
  const uid = userIdFor(user)
  return getNotificationsForUser(user).filter(n => !(n.readBy || []).includes(uid)).length
}

// ── Seeding ─────────────────────────────────────────────────────────────────

export function isSeeded() {
  return readJson(SEED_KEY, false) === true
}

export function markSeeded() {
  writeJson(SEED_KEY, true)
}

// Storage keys exported for documentation / debugging.
export const STORAGE_KEYS = {
  notifications: STORAGE_KEY,
  prefs:         PREFS_KEY,
  seeded:        SEED_KEY,
}
