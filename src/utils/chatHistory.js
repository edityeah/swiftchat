// Chat history — localStorage persistence layer.
//
// Storage shape:
//   swiftchat.chats.v1      → { [chatId]: ChatSession }
//   swiftchat.activeChat.v1 → { [userId]: chatId }
//
// We deliberately don't import React here — these are pure helpers callable
// from anywhere (context, hooks, dispatcher). All mutations write through
// updateChats() which fires storage events that the context can subscribe to.

const CHATS_KEY  = 'swiftchat.chats.v1'
const ACTIVE_KEY = 'swiftchat.activeChat.v1'

// ─── localStorage primitives ───────────────────────────────────────────────
function ls() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch { return null }
}
function readJson(key, fallback) {
  const s = ls(); if (!s) return fallback
  try {
    const raw = s.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch { return fallback }
}
function writeJson(key, value) {
  const s = ls(); if (!s) return
  try { s.setItem(key, JSON.stringify(value)) } catch { /* quota / disabled */ }
}

// ─── Identity ──────────────────────────────────────────────────────────────
// Stable key for "who owns this chat". We prefer profile.stateId (e.g.
// TCH1001) and fall back to role so the demo's anonymous flows still work.
export function userIdFor(profile, role) {
  if (profile?.stateId) return String(profile.stateId)
  if (profile?.employeeId) return String(profile.employeeId)
  if (role) return `role:${role}`
  return 'anon'
}

// ─── Public API ────────────────────────────────────────────────────────────
export function loadChats() { return readJson(CHATS_KEY, {}) }
export function loadActive() { return readJson(ACTIVE_KEY, {}) }

export function saveChats(chats)   { writeJson(CHATS_KEY, chats || {}) }
export function saveActive(active) { writeJson(ACTIVE_KEY, active || {}) }

// Returns ChatSession[] for a user, sorted newest-updated first.
export function getChatsForUser(userId) {
  if (!userId) return []
  const all = loadChats()
  return Object.values(all)
    .filter(c => c && c.userId === userId)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export function getActiveChatId(userId) {
  if (!userId) return null
  const m = loadActive()
  return m[userId] || null
}

export function setActiveChatId(userId, chatId) {
  if (!userId) return
  const m = loadActive()
  if (chatId) m[userId] = chatId
  else delete m[userId]
  saveActive(m)
}

export function getChatById(chatId) {
  if (!chatId) return null
  return loadChats()[chatId] || null
}

// ─── Mutations ─────────────────────────────────────────────────────────────
function uid() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function createChat({ userId, role, title, tool, initialMessages }) {
  if (!userId) throw new Error('createChat requires userId')
  const now = new Date().toISOString()
  const chat = {
    id: uid(),
    userId, role: role || null,
    title: title || 'New chat',
    tool: tool || null,                  // e.g. "digivritti", "attendance"
    createdAt: now, updatedAt: now,
    messages: initialMessages || [],
    canvas: null,
    toolState: {},
  }
  const all = loadChats()
  all[chat.id] = chat
  saveChats(all)
  setActiveChatId(userId, chat.id)
  return chat
}

export function updateChat(chatId, patch) {
  const all = loadChats()
  const cur = all[chatId]
  if (!cur) return null
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() }
  all[chatId] = next
  saveChats(all)
  return next
}

export function appendMessage(chatId, message) {
  const all = loadChats()
  const cur = all[chatId]
  if (!cur) return null
  const stamped = {
    id: message.id || uid(),
    timestamp: message.timestamp || new Date().toISOString(),
    ...message,
  }
  cur.messages = [...(cur.messages || []), stamped]
  cur.updatedAt = stamped.timestamp
  // First user message auto-titles the chat (unless tool already named it).
  if (!cur.tool && cur.title === 'New chat' && stamped.role === 'user' && stamped.text) {
    cur.title = stamped.text.slice(0, 40)
  }
  all[chatId] = cur
  saveChats(all)
  return cur
}

// Replace the entire message array — used by SuperHomePage when it syncs its
// local state at the end of a turn (handles complex tool reply payloads).
export function setMessages(chatId, messages) {
  const all = loadChats()
  const cur = all[chatId]
  if (!cur) return null
  cur.messages = messages || []
  cur.updatedAt = new Date().toISOString()
  all[chatId] = cur
  saveChats(all)
  return cur
}

export function updateCanvas(chatId, canvasState) {
  return updateChat(chatId, { canvas: canvasState || null })
}
export function updateToolState(chatId, toolState) {
  const cur = getChatById(chatId)
  if (!cur) return null
  return updateChat(chatId, { toolState: { ...(cur.toolState || {}), ...(toolState || {}) } })
}

export function renameChat(chatId, title) {
  return updateChat(chatId, { title: (title || 'Untitled chat').slice(0, 80) })
}

export function deleteChat(chatId) {
  const all = loadChats()
  const cur = all[chatId]
  if (!cur) return false
  delete all[chatId]
  saveChats(all)
  // Clear active pointer if this was the active chat.
  const activeMap = loadActive()
  for (const [u, id] of Object.entries(activeMap)) {
    if (id === chatId) delete activeMap[u]
  }
  saveActive(activeMap)
  return true
}

// Wipe ALL chats for a single user (used by an explicit "reset demo data"
// action — never on logout).
export function clearChatsForUser(userId) {
  if (!userId) return
  const all = loadChats()
  for (const [id, chat] of Object.entries(all)) {
    if (chat?.userId === userId) delete all[id]
  }
  saveChats(all)
  setActiveChatId(userId, null)
}

// ─── Date grouping for the sidebar ─────────────────────────────────────────
function startOfDay(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime()
}
export function groupByRecency(chats, now = new Date()) {
  const today = startOfDay(now)
  const yesterday = today - 24 * 3600 * 1000
  const sevenAgo  = today - 7 * 24 * 3600 * 1000

  const groups = { TODAY: [], YESTERDAY: [], 'PREVIOUS 7 DAYS': [], OLDER: [] }
  for (const c of chats) {
    const ts = new Date(c.updatedAt || c.createdAt || 0).getTime()
    if (!isFinite(ts) || ts === 0) { groups.OLDER.push(c); continue }
    const day = startOfDay(ts)
    if (day === today) groups.TODAY.push(c)
    else if (day === yesterday) groups.YESTERDAY.push(c)
    else if (day >= sevenAgo) groups['PREVIOUS 7 DAYS'].push(c)
    else groups.OLDER.push(c)
  }
  return groups
}

// ─── Default tool-launch titles ────────────────────────────────────────────
export const TOOL_TITLES = {
  digivritti: 'DigiVritti Scholarships',
  attendance: 'Mark Attendance',
  dashboard:  'Class Dashboard',
  xamta:      'XAMTA Scan',
  namo_laxmi: 'Namo Laxmi',
  scholarship: 'Scholarship coverage',
}

// Best-effort tool detection from a chat trigger string. Used by the chat
// page to upgrade a "New chat" title when the user kicks off a tool.
export function detectTool(triggerText) {
  if (!triggerText) return null
  const t = triggerText.toLowerCase()
  if (t.includes('digivritti') || t.startsWith('dv:')) return 'digivritti'
  if (t.includes('xamta')) return 'xamta'
  if (t.includes('attendance')) return 'attendance'
  if (t.includes('dashboard') || t.includes('district_dashboard') || t.includes('state_dashboard')) return 'dashboard'
  if (t.includes('namo_laxmi') || t.includes('namo laxmi')) return 'namo_laxmi'
  if (t.includes('scholarship')) return 'scholarship'
  return null
}
