import React, { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import Avatar from './Avatar'
import { addComment, formatRelativeTime, loadAllPosts } from '../../posts/postStore'

// Bottom sheet that lists comments and lets the current user add one.
// Re-reads the post from the store on every render so newly-added comments
// show up immediately.
export default function CommentsSheet({ postId, currentUser, onClose }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)
  const post = loadAllPosts().find(p => p.id === postId)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [])

  if (!post) return null

  const send = () => {
    const text = draft.trim()
    if (!text) return
    addComment(post.id, {
      userId: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      text,
    })
    setDraft('')
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white rounded-t-2xl shadow-xl flex flex-col"
        style={{ height: '70%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-bdr-light">
          <h3 className="font-semibold">Comments</h3>
          <button onClick={onClose} className="text-txt-secondary p-1">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {(post.comments || []).length === 0 && (
            <div className="text-center text-sm text-txt-tertiary py-10">
              No comments yet. Be the first to share your thoughts.
            </div>
          )}
          {(post.comments || []).map(c => (
            <div key={c.id} className="flex gap-3 py-3 border-b border-bdr-light last:border-0">
              <Avatar author={{ name: c.name, initials: (c.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase(), color: '#64748B' }} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-txt-tertiary bg-gray-100 px-1.5 py-0.5 rounded">
                    {c.role}
                  </span>
                  <span className="text-xs text-txt-tertiary ml-auto">{formatRelativeTime(c.createdAt)}</span>
                </div>
                <div className="text-sm text-txt-primary mt-0.5 whitespace-pre-wrap">{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-bdr-light px-3 py-2 flex items-center gap-2">
          <Avatar author={currentUser} size={32} />
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Add a comment…"
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
