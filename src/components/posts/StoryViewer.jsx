import React, { useEffect, useRef, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import Avatar from './Avatar'
import { incrementViews, formatRelativeTime } from '../../posts/postStore'

const STORY_DURATION_MS = 10000

// Full-screen story viewer.
// `groups` is the active story groups list; `startIndex` is the group to open.
// Stories within a group auto-advance every 10s; when a group's last story
// finishes the viewer rolls into the next group's first story.
export default function StoryViewer({ groups, startIndex = 0, onClose }) {
  const [groupIdx, setGroupIdx] = useState(startIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const startRef = useRef(Date.now())
  const rafRef = useRef(null)
  const pausedRef = useRef(false)
  const viewedRef = useRef(new Set())

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]

  // Track view once per (group, story).
  useEffect(() => {
    if (!story) return
    const key = story.id
    if (!viewedRef.current.has(key)) {
      viewedRef.current.add(key)
      incrementViews(story.id)
    }
  }, [story?.id])

  const next = () => {
    if (!group) return
    if (storyIdx + 1 < group.stories.length) {
      setStoryIdx(i => i + 1)
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx(g => g + 1)
      setStoryIdx(0)
    } else {
      onClose()
      return
    }
    startRef.current = Date.now()
    setProgress(0)
  }

  const prev = () => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1)
    } else if (groupIdx > 0) {
      const newIdx = groupIdx - 1
      setGroupIdx(newIdx)
      setStoryIdx(groups[newIdx].stories.length - 1)
    }
    startRef.current = Date.now()
    setProgress(0)
  }

  // Auto-advance loop.
  useEffect(() => {
    startRef.current = Date.now()
    setProgress(0)
    const tick = () => {
      if (pausedRef.current) {
        startRef.current = Date.now() - progress * STORY_DURATION_MS
      } else {
        const elapsed = Date.now() - startRef.current
        const p = Math.min(1, elapsed / STORY_DURATION_MS)
        setProgress(p)
        if (p >= 1) { next(); return }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx])

  if (!group || !story) return null

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 px-2 pt-2">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-[100ms]"
              style={{
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <Avatar author={group.author} size={36} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{group.author.name}</div>
          <div className="text-xs text-white/70">{formatRelativeTime(story.createdAt)}</div>
        </div>
        <button onClick={onClose} className="text-white p-1"><X size={22} /></button>
      </div>

      {/* Body — taps left/right to nav, hold to pause */}
      <div
        className="flex-1 relative flex items-center justify-center select-none"
        onPointerDown={() => { pausedRef.current = true }}
        onPointerUp={() => { pausedRef.current = false }}
        onPointerCancel={() => { pausedRef.current = false }}
      >
        <div className="absolute inset-y-0 left-0 w-1/3 z-10" onClick={prev} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10" onClick={next} />

        {story.media?.type === 'image' && (
          <img src={story.media.src} alt="" className="max-h-full max-w-full object-contain" />
        )}
        {story.media?.type === 'video' && (
          <video
            src={story.media.src}
            poster={story.media.poster}
            autoPlay
            muted
            playsInline
            className="max-h-full max-w-full"
          />
        )}
        {story.media?.type === 'text' && (
          <div className="px-8 text-white text-xl text-center leading-relaxed">
            {story.caption}
          </div>
        )}

        {/* Caption overlay for media stories */}
        {story.caption && story.media?.type !== 'text' && (
          <div className="absolute bottom-20 left-4 right-4 text-white text-sm bg-black/40 backdrop-blur px-3 py-2 rounded-lg">
            {story.caption}
          </div>
        )}
      </div>

      {/* CTA */}
      {story.ctaUrl && (
        <a
          href={story.ctaUrl} target="_blank" rel="noreferrer"
          className="m-4 flex items-center justify-center gap-2 py-3 rounded-full bg-white text-black font-medium z-20"
        >
          <ExternalLink size={16} />
          Visit link
        </a>
      )}
    </div>
  )
}
