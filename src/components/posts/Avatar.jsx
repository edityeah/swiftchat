import React from 'react'

// Circular avatar with initials. The story ring is rendered by StoryAvatar.
export default function Avatar({ author, size = 40 }) {
  const initials = author?.initials || (author?.name || '?').slice(0, 2).toUpperCase()
  const color = author?.color || '#3B82F6'
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
