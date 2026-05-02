import React from 'react'

// Small red unread-count badge. Hidden when count is 0. Capped at 99+.
export default function NotificationBadge({ count = 0, className = '' }) {
  if (!count) return null
  const text = count > 99 ? '99+' : String(count)
  return (
    <span
      className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] leading-none font-bold flex items-center justify-center shadow ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {text}
    </span>
  )
}
