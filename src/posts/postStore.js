// Posts store — localStorage-backed feed for the prototype's creators section.
// Mirrors the pattern used by notificationStore: a single key holds the full
// list, mutations broadcast a window event so React subscribers re-derive.

const KEY = 'swiftchat.posts.v1'
const EVT = 'swiftchat:posts:change'

function emit() {
  try { window.dispatchEvent(new CustomEvent(EVT)) } catch { /* noop */ }
}

export function subscribe(fn) {
  window.addEventListener(EVT, fn)
  return () => window.removeEventListener(EVT, fn)
}

export function loadAllPosts() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function save(posts) {
  try { localStorage.setItem(KEY, JSON.stringify(posts)) } catch { /* noop */ }
  emit()
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Sort newest first.
export function sortPosts(posts) {
  return [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export function addPost(partial) {
  const now = Date.now()
  const post = {
    id: uid(),
    createdAt: now,
    author: partial.author,           // { id, name, role, badge, initials, color, school }
    media: partial.media || null,     // { type: 'image'|'video'|'text', src, poster? }
    caption: partial.caption || '',
    ctaUrl: partial.ctaUrl || '',
    showAsStory: !!partial.showAsStory,
    reactions: {},                    // { userId: 'like'|'love'|'clap'|... }
    comments: [],                     // [{ id, userId, name, role, text, createdAt }]
    views: 0,
  }
  const all = loadAllPosts()
  all.unshift(post)
  save(all)
  return post
}

export function deletePost(postId) {
  const all = loadAllPosts().filter(p => p.id !== postId)
  save(all)
}

export function toggleReaction(postId, userId, kind = 'like') {
  const all = loadAllPosts()
  const p = all.find(x => x.id === postId)
  if (!p) return null
  if (!p.reactions) p.reactions = {}
  if (p.reactions[userId] === kind) {
    delete p.reactions[userId]
  } else {
    p.reactions[userId] = kind
  }
  save(all)
  return p
}

export function addComment(postId, comment) {
  const all = loadAllPosts()
  const p = all.find(x => x.id === postId)
  if (!p) return null
  if (!Array.isArray(p.comments)) p.comments = []
  p.comments.push({
    id: 'c_' + Math.random().toString(36).slice(2, 10),
    createdAt: Date.now(),
    ...comment,
  })
  save(all)
  return p
}

export function incrementViews(postId) {
  const all = loadAllPosts()
  const p = all.find(x => x.id === postId)
  if (!p) return
  p.views = (p.views || 0) + 1
  save(all)
}

// ── Stories layer ─────────────────────────────────────────────────────────────
const STORY_WINDOW_MS = 24 * 60 * 60 * 1000

export function isActiveStory(post, nowMs = Date.now()) {
  return !!post.showAsStory && (nowMs - (post.createdAt || 0)) < STORY_WINDOW_MS
}

// Group active stories by author.id → { author, stories: [posts...] }
export function getActiveStoryGroups(nowMs = Date.now()) {
  const all = loadAllPosts()
  const groups = new Map()
  for (const p of all) {
    if (!isActiveStory(p, nowMs)) continue
    const key = p.author?.id || p.author?.name
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { author: p.author, stories: [] })
    groups.get(key).stories.push(p)
  }
  // Newest story first within a group; groups sorted by most-recent story.
  for (const g of groups.values()) {
    g.stories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }
  return [...groups.values()].sort(
    (a, b) => (b.stories[0]?.createdAt || 0) - (a.stories[0]?.createdAt || 0),
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function reactionCount(post) {
  return Object.keys(post.reactions || {}).length
}

export function userReaction(post, userId) {
  return post.reactions?.[userId] || null
}

export function commentCount(post) {
  return (post.comments || []).length
}

// Friendly relative time — keeps the feed glanceable without a date lib.
export function formatRelativeTime(ms) {
  const diff = Date.now() - ms
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d`
  return new Date(ms).toLocaleDateString()
}
