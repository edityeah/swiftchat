import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { USER_PROFILES } from '../data/mockData'
import * as chatHistory from '../utils/chatHistory'
import {
  loadAll as loadAllNotifications,
  addNotification, markRead, markAllRead, dismissNotification as dismissStoredNotification,
  getNotificationsForUser, unreadCountFor, onNotificationsChange,
} from '../notifications/notificationStore'
import { describeUser, userIdFor as notificationUserIdFor } from '../notifications/notificationTargeting'
import {
  startScheduler, stopScheduler, updateSchedulerUser, onNotificationsDue, fireImmediateDelivery,
} from '../notifications/notificationScheduler'
import { runSeedIfNeeded } from '../notifications/notificationSeed'
import { playNotificationSound } from '../notifications/notificationSound'
import { runNotificationAction } from '../notifications/notificationActions'

const AppContext = createContext(null)

// localStorage key for persistent session.
// Bumping the version invalidates older shapes when the schema changes.
const SESSION_KEY = 'swiftchat.session.v1'

// ─── Persistence helpers ────────────────────────────────────────────────────
// Self-contained read/write so any caller can see the same shape.
function safeLocalStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

function loadSession() {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    // Reject sessions that don't carry a recognised role — defends against
    // stale/corrupt entries that would block the user on a half-state.
    if (!parsed.role) return null
    return parsed
  } catch {
    return null
  }
}

function saveSession(state) {
  const ls = safeLocalStorage()
  if (!ls) return
  try {
    ls.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    /* quota / disabled — silently degrade */
  }
}

function clearSession() {
  const ls = safeLocalStorage()
  if (!ls) return
  try { ls.removeItem(SESSION_KEY) } catch { /* noop */ }
}

// Lazy initialiser — ensures `loadSession()` is called exactly once during
// the first render of the provider, never again, and the result is captured
// inside React state so subsequent renders read from state, not storage.
const PERSISTED = loadSession()

export function AppProvider({ children }) {
  // Hydrate from localStorage on first render. If a valid persisted session
  // with a role exists, restore it (including the last screen). Otherwise
  // start at the splash/language screen so the user runs through the full
  // login flow (language → SSO/phone → home).
  const hasSession = !!(PERSISTED && PERSISTED.role)
  const [screen, setScreen]               = useState(() => hasSession ? (PERSISTED.screen || 'home') : 'splash')
  const [stack, setStack]                 = useState(() => hasSession ? (PERSISTED.stack || [PERSISTED.screen || 'home']) : ['splash'])
  const [role, setRoleRaw]                = useState(() => hasSession ? PERSISTED.role : null)
  const [userProfile, setUserProfile]     = useState(() => hasSession ? (PERSISTED.userProfile || null) : null)
  const [lang, setLang]                   = useState(() => PERSISTED?.lang || 'en')
  const [ssoState, setSsoState]           = useState(() => PERSISTED?.ssoState || 'Gujarat')
  const [toast, setToast]                 = useState({ message: '', type: '', visible: false })
  const [call, setCall]                   = useState(null)
  const [canvasOpen, setCanvasOpen]       = useState(false)
  const [canvasContext, setCanvasContext] = useState(null)
  const toastTimer = useRef(null)
  // Tracks whether the user has explicitly logged out — prevents the
  // persistence effect from re-saving stale state during the sign-out tear-down.
  const signingOut = useRef(false)

  // ── Chat history (per-user, localStorage-backed) ──────────────────────────
  // userId derived from the profile's stateId/employeeId, falling back to
  // role. Keys all chat sessions so different users never see each other's.
  const userId = chatHistory.userIdFor(userProfile, role)
  // `chatTick` is bumped to force consumers to re-read from localStorage
  // after any mutation routed through the helpers below.
  const [chatTick, setChatTick] = useState(0)
  const bumpChats = useCallback(() => setChatTick(t => t + 1), [])
  const [activeChatId, setActiveChatIdState] = useState(() =>
    role ? chatHistory.getActiveChatId(chatHistory.userIdFor(userProfile, role)) : null
  )

  const refreshActiveChat = useCallback(() => {
    if (!role) { setActiveChatIdState(null); return null }
    const uid = chatHistory.userIdFor(userProfile, role)
    const id  = chatHistory.getActiveChatId(uid)
    setActiveChatIdState(id)
    return id
  }, [role, userProfile])

  // Re-read the active chat pointer whenever the logged-in user changes.
  useEffect(() => { refreshActiveChat() }, [refreshActiveChat])

  const userChats = useMemo(() => {
    if (!role) return []
    return chatHistory.getChatsForUser(userId)
    // chatTick re-evaluates after mutations; userId switches the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role, chatTick])

  const activeChat = useMemo(() => {
    if (!activeChatId) return null
    return chatHistory.getChatById(activeChatId)
  }, [activeChatId, chatTick])

  const createChat = useCallback((opts = {}) => {
    if (!role) return null
    const uid = chatHistory.userIdFor(userProfile, role)
    const chat = chatHistory.createChat({
      userId: uid, role,
      title: opts.title,
      tool: opts.tool,
      initialMessages: opts.initialMessages,
    })
    setActiveChatIdState(chat.id)
    bumpChats()
    return chat
  }, [role, userProfile, bumpChats])

  const switchChat = useCallback((chatId) => {
    if (!role || !chatId) return
    const uid = chatHistory.userIdFor(userProfile, role)
    chatHistory.setActiveChatId(uid, chatId)
    setActiveChatIdState(chatId)
    bumpChats()
  }, [role, userProfile, bumpChats])

  const appendMessage = useCallback((chatId, message) => {
    if (!chatId) return null
    const result = chatHistory.appendMessage(chatId, message)
    bumpChats()
    return result
  }, [bumpChats])

  const setChatMessages = useCallback((chatId, messages) => {
    if (!chatId) return null
    const result = chatHistory.setMessages(chatId, messages)
    bumpChats()
    return result
  }, [bumpChats])

  const updateChatCanvas = useCallback((chatId, canvasState) => {
    if (!chatId) return null
    const result = chatHistory.updateCanvas(chatId, canvasState)
    bumpChats()
    return result
  }, [bumpChats])

  const updateChatToolState = useCallback((chatId, toolState) => {
    if (!chatId) return null
    const result = chatHistory.updateToolState(chatId, toolState)
    bumpChats()
    return result
  }, [bumpChats])

  const renameChat = useCallback((chatId, title) => {
    chatHistory.renameChat(chatId, title); bumpChats()
  }, [bumpChats])

  const deleteChat = useCallback((chatId) => {
    chatHistory.deleteChat(chatId); bumpChats()
    // If we deleted the active chat, refresh the pointer.
    if (chatId === activeChatId) {
      const uid = chatHistory.userIdFor(userProfile, role)
      const next = chatHistory.getActiveChatId(uid)
      setActiveChatIdState(next)
    }
  }, [activeChatId, role, userProfile, bumpChats])

  // Persist on every change to durable state. We DO NOT clear the session
  // here when role becomes null — that path is owned exclusively by
  // signOut(), so anonymous splash/login flows never wipe a fresh session.
  useEffect(() => {
    if (signingOut.current) return            // sign-out path clears explicitly
    if (!role) return                          // pre-login: nothing to persist yet
    saveSession({ screen, stack, role, userProfile, lang, ssoState })
  }, [screen, stack, role, userProfile, lang, ssoState])

  // Unified role setter — also loads matching profile from mock data.
  // In no-login mode this doubles as the user-switcher.
  const setRole = useCallback((r) => {
    setRoleRaw(r)
    setUserProfile(r ? (USER_PROFILES[r] ?? null) : null)
  }, [])

  // Switch the active user from the bottom-left avatar. Resets the screen
  // back to home so the new role lands on its own dashboard, and clears any
  // open call/canvas state from the previous user.
  const switchRole = useCallback((r) => {
    if (!r || !USER_PROFILES[r]) return
    setRoleRaw(r)
    setUserProfile(USER_PROFILES[r])
    setStack(['home'])
    setScreen('home')
    setCanvasOpen(false)
    setCanvasContext(null)
    setCall(null)
  }, [])

  const navigate = useCallback((id, replace = false) => {
    setStack(s => replace ? [...s.slice(0, -1), id] : [...s, id])
    setScreen(id)
  }, [])

  const goBack = useCallback(() => {
    setStack(s => {
      if (s.length <= 1) return s
      const next = s.slice(0, -1)
      setScreen(next[next.length - 1])
      return next
    })
  }, [])

  const showToast = useCallback((message, type = '') => {
    setToast({ message, type, visible: true })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }))
    }, 2600)
  }, [])

  // Explicit sign-out — the ONLY path that clears the persisted session.
  // Returns the user to the language/splash screen so they can log in again.
  const signOut = useCallback(() => {
    signingOut.current = true
    clearSession()
    setRoleRaw(null)
    setUserProfile(null)
    setStack(['splash'])
    setScreen('splash')
    setCanvasOpen(false)
    setCanvasContext(null)
    setCall(null)
    // Allow the persistence effect to resume for the next session.
    setTimeout(() => { signingOut.current = false }, 0)
  }, [])

  const openCall    = useCallback((chatId, botName) => setCall({ chatId, botName, active: true }), [])
  const endCall     = useCallback(() => setCall(null), [])
  const openCanvas  = useCallback((ctx = null) => { setCanvasContext(ctx); setCanvasOpen(true) }, [])
  const closeCanvas = useCallback(() => setCanvasOpen(false), [])
  const updateCanvas = useCallback((patch) => setCanvasContext(c => ({ ...(c || {}), ...patch })), [])

  // ── Notifications ──────────────────────────────────────────────────────────
  // Seed-once on first ever boot.
  useEffect(() => { runSeedIfNeeded() }, [])

  // Effective user descriptor for targeting/scheduler. Recomputed when the
  // active role/profile changes.
  const notificationUser = useMemo(() => describeUser(role, userProfile), [role, userProfile])
  const notificationUserId = useMemo(() => notificationUserIdFor(notificationUser), [notificationUser])

  const [notifications, setNotifications] = useState(() =>
    notificationUser ? getNotificationsForUser(notificationUser) : [],
  )
  const [unreadNotifications, setUnreadNotifications] = useState(() =>
    notificationUser ? unreadCountFor(notificationUser) : 0,
  )
  const [recentNotificationToast, setRecentNotificationToast] = useState(null)
  const [notificationsBuzzKey, setNotificationsBuzzKey]       = useState(0)
  const [notificationsBuzzUrgent, setNotificationsBuzzUrgent] = useState(false)
  // True while a reminder is unacknowledged — the bell shakes continuously
  // until the user opens the toast/bell. Cleared when:
  //   • toast is clicked or dismissed
  //   • bell is clicked (notifications canvas opens)
  //   • the reminder is marked read or dismissed from the list
  const [notificationsRinging, setNotificationsRinging] = useState(false)
  // `notificationView` controls which view the canvas opens in: 'list' |
  // 'reminder' | 'broadcast'.
  const [notificationView, setNotificationView]       = useState('list')
  const [broadcastPrefill, setBroadcastPrefill]       = useState(null)
  // Bumped when a notification action wants the chat layer to fire a trigger.
  // SuperHomePage subscribes via the queue ref below.
  const chatTriggerQueue = useRef([])
  const [chatTriggerTick, setChatTriggerTick] = useState(0)

  const refreshNotifications = useCallback(() => {
    if (!notificationUser) {
      setNotifications([])
      setUnreadNotifications(0)
      return
    }
    setNotifications(getNotificationsForUser(notificationUser))
    setUnreadNotifications(unreadCountFor(notificationUser))
  }, [notificationUser])

  // Re-read the list whenever the store mutates or the user switches.
  useEffect(() => {
    refreshNotifications()
    return onNotificationsChange(refreshNotifications)
  }, [refreshNotifications])

  // Run the scheduler tied to the current user.
  useEffect(() => {
    if (!notificationUser) return undefined
    const stop = startScheduler(notificationUser)
    return () => { stop?.(); stopScheduler() }
  }, [notificationUser])

  useEffect(() => { updateSchedulerUser(notificationUser) }, [notificationUser])

  // React to "due" events — toast, sound, animate bell. Reminders always
  // ring with the urgent variant so a 1:20 PM nudge feels alarm-like even
  // when the priority is "normal".
  useEffect(() => {
    const off = onNotificationsDue((notification) => {
      if (!notification) return
      // Refresh local list immediately so the badge updates without waiting
      // for the next storage event.
      refreshNotifications()
      const isReminder = notification.type === 'reminder'
      const urgent = isReminder || notification.priority === 'urgent' || notification.priority === 'high'
      setRecentNotificationToast(notification)
      setNotificationsBuzzKey(k => k + 1)
      setNotificationsBuzzUrgent(urgent)
      // Reminders ring until the user clicks the bell / toast — they
      // shouldn't quietly disappear. Other priorities buzz once.
      if (isReminder) setNotificationsRinging(true)
      playNotificationSound({ urgent })
    })
    return off
  }, [refreshNotifications])

  const dismissNotificationToast = useCallback(() => {
    setRecentNotificationToast(null)
    setNotificationsRinging(false)
  }, [])

  const acknowledgeReminder = useCallback(() => {
    setNotificationsRinging(false)
  }, [])

  const isUnreadFor = useCallback((notification) => {
    if (!notification || !notificationUserId) return false
    return !(notification.readBy || []).includes(notificationUserId)
  }, [notificationUserId])

  const markNotificationRead = useCallback((id) => {
    if (!notificationUserId) return
    markRead(id, notificationUserId)
    refreshNotifications()
  }, [notificationUserId, refreshNotifications])

  const markAllNotificationsRead = useCallback(() => {
    if (!notificationUser) return
    markAllRead(notificationUserId)
    refreshNotifications()
  }, [notificationUser, notificationUserId, refreshNotifications])

  const dismissNotificationCb = useCallback((id) => {
    if (!notificationUserId) return
    dismissStoredNotification(id, notificationUserId)
    refreshNotifications()
  }, [notificationUserId, refreshNotifications])

  // openNotificationsCanvas — opens the right-side notifications canvas.
  // optional `view` overrides the default list view; optional
  // `broadcastPrefill` / `reminderPrefill` seed the matching form.
  const openNotificationsCanvas = useCallback((opts = {}) => {
    if (opts.broadcastPrefill) setBroadcastPrefill(opts.broadcastPrefill)
    setNotificationView(opts.view || 'list')
    setCanvasContext({
      type: 'notifications',
      view: opts.view || 'list',
      broadcastPrefill: opts.broadcastPrefill || null,
      reminderPrefill: opts.reminderPrefill || null,
    })
    setCanvasOpen(true)
    // Opening the bell counts as acknowledging any ringing reminder.
    setNotificationsRinging(false)
  }, [])

  // ── Trigger plumbing for notification actions that need chat triggers ─────
  // SuperHomePage drains the queue via `useNotificationChatTriggers()` below.
  const queueChatTrigger = useCallback((trigger) => {
    if (!trigger) return
    chatTriggerQueue.current.push(trigger)
    setChatTriggerTick(t => t + 1)
  }, [])

  const consumeChatTrigger = useCallback(() => {
    const q = chatTriggerQueue.current
    if (!q.length) return null
    const next = q.shift()
    return next
  }, [])

  // Window-level bridge so notificationActions.js (which doesn't import
  // AppContext) can also queue triggers.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handler = (e) => queueChatTrigger(e.detail)
    window.addEventListener('swiftchat:chat:trigger', handler)
    return () => window.removeEventListener('swiftchat:chat:trigger', handler)
  }, [queueChatTrigger])

  const triggerNotificationAction = useCallback((notification) => {
    if (!notification) return false
    if (notificationUserId && !(notification.readBy || []).includes(notificationUserId)) {
      markRead(notification.id, notificationUserId)
      refreshNotifications()
    }
    setRecentNotificationToast(null)
    return runNotificationAction(notification.action, {
      openCanvas: (ctx) => { setCanvasContext(ctx); setCanvasOpen(true) },
      runChatTrigger: queueChatTrigger,
    })
  }, [notificationUserId, refreshNotifications, queueChatTrigger])

  // ── Permissions helpers (mirrored on roleConfig) ──────────────────────────
  const canCreateBroadcast = role === 'state_secretary' || role === 'state'
  const canCreateReminder  = !!role
  const canViewNotifications = !!role

  // ── Authoring helpers ─────────────────────────────────────────────────────
  const createReminder = useCallback((input) => {
    if (!notificationUser) return null
    const created = addNotification({
      ...input,
      type: 'reminder',
      category: input.category || 'reminder',
      priority: input.priority || 'normal',
      createdBy: notificationUser.id,
      createdByRole: notificationUser.role,
      targetRoles: [],
      targetUserIds: [notificationUser.id],
    }, { type: 'reminder' })
    refreshNotifications()
    // If due immediately, fire the toast/buzz cycle once.
    if (!created.scheduledAt || Date.parse(created.scheduledAt) <= Date.now()) {
      fireImmediateDelivery(created, notificationUser)
    }
    return created
  }, [notificationUser, refreshNotifications])

  const createBroadcastNotification = useCallback((input) => {
    if (!canCreateBroadcast || !notificationUser) return null
    const created = addNotification({
      ...input,
      type: 'broadcast',
      createdBy: notificationUser.id,
      createdByRole: notificationUser.role,
      targetRoles: input.targetRoles && input.targetRoles.length ? input.targetRoles : ['all'],
    }, { type: 'broadcast' })
    refreshNotifications()
    if (!created.scheduledAt || Date.parse(created.scheduledAt) <= Date.now()) {
      fireImmediateDelivery(created, notificationUser)
    }
    return created
  }, [canCreateBroadcast, notificationUser, refreshNotifications])

  const addNotificationCb = useCallback((input) => {
    const created = addNotification(input)
    refreshNotifications()
    fireImmediateDelivery(created, notificationUser)
    return created
  }, [notificationUser, refreshNotifications])

  return (
    <AppContext.Provider value={{
      screen, navigate, goBack,
      stack, role, setRole, switchRole,
      userProfile, setUserProfile,
      lang, setLang,
      toast, showToast,
      call, openCall, endCall,
      canvasOpen, canvasContext, openCanvas, closeCanvas, updateCanvas,
      ssoState, setSsoState,
      signOut,
      isAuthenticated: !!role,
      // Chat history — per-user, localStorage-backed.
      userId,
      chats: userChats, activeChatId, activeChat,
      createChat, switchChat, appendMessage, setChatMessages,
      updateChatCanvas, updateChatToolState, renameChat, deleteChat,
      // Notifications
      notifications, unreadNotifications,
      isUnreadFor,
      markNotificationRead, markAllNotificationsRead,
      dismissNotification: dismissNotificationCb,
      addNotification: addNotificationCb,
      createReminder, createBroadcastNotification,
      triggerNotificationAction,
      openNotificationsCanvas,
      dismissNotificationToast,
      recentNotificationToast,
      notificationsBuzzKey, notificationsBuzzUrgent,
      notificationsRinging, acknowledgeReminder,
      notificationView, broadcastPrefill,
      canCreateBroadcast, canCreateReminder, canViewNotifications,
      // Chat-trigger plumbing (used by notification actions)
      consumeChatTrigger,
      chatTriggerTick,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
