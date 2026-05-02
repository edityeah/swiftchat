import React from 'react'
import { Trash2, ArrowRight } from 'lucide-react'
import { categoryLabel, priorityTone } from '../../notifications/notificationTypes'

function relativeTime(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const d = Math.round(hr / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationItem({
  notification,
  unread,
  onMarkRead,
  onDismiss,
  onAction,
}) {
  const tone = priorityTone(notification.priority)
  const ts = notification.scheduledAt || notification.deliveredAt || notification.createdAt
  return (
    <div
      className={`relative px-4 py-3 border-b border-bdr-light transition-colors ${
        unread ? 'bg-primary-light/40' : 'bg-white'
      }`}
    >
      {unread && (
        <span
          className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}

      <div className="flex items-start gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-txt-primary leading-snug pr-2">
            {notification.title}
          </div>
        </div>
        <span
          className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {tone.label}
        </span>
      </div>

      {notification.message && (
        <div className="text-[12px] text-txt-secondary leading-relaxed mb-2 whitespace-pre-wrap break-words">
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {notification.category && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-txt-secondary">
            {categoryLabel(notification.category)}
          </span>
        )}
        {notification.module && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-txt-secondary">
            {String(notification.module).toUpperCase()}
          </span>
        )}
        <span className="text-[10px] text-txt-tertiary ml-auto">{relativeTime(ts)}</span>
      </div>

      <div className="flex items-center gap-2">
        {notification.action?.type && (
          <button
            onClick={() => onAction?.(notification)}
            className="flex items-center gap-1 text-[11.5px] font-semibold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-full transition-colors"
          >
            {notification.action.label || 'Open'}
            <ArrowRight size={12} />
          </button>
        )}
        {unread && (
          <button
            onClick={() => onMarkRead?.(notification)}
            className="text-[11.5px] font-semibold text-primary hover:underline px-1"
          >
            Mark read
          </button>
        )}
        <button
          onClick={() => onDismiss?.(notification)}
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-txt-tertiary hover:bg-surface-secondary hover:text-danger transition-colors"
          aria-label="Dismiss notification"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
