import React from 'react'

// Tab strip for the notification canvas. Counts are passed in so the active
// user can see at-a-glance how many items live in each bucket.
export const NOTIFICATION_TABS = [
  { id: 'all',        label: 'All' },
  { id: 'unread',     label: 'Unread' },
  { id: 'broadcasts', label: 'Broadcasts' },
  { id: 'reminders',  label: 'Reminders' },
  { id: 'system',     label: 'System' },
]

export default function NotificationFilters({ active, counts = {}, onChange }) {
  return (
    <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-bdr-light bg-white flex-shrink-0">
      {NOTIFICATION_TABS.map(t => {
        const isActive = active === t.id
        const count = counts[t.id]
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors flex items-center gap-1.5 ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-surface-secondary text-txt-secondary hover:text-txt-primary'
            }`}
          >
            <span>{t.label}</span>
            {Number.isFinite(count) && count > 0 && (
              <span
                className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isActive ? 'bg-white text-primary' : 'bg-bdr text-txt-secondary'
                }`}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
