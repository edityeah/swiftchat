import React from 'react'
import { BellOff } from 'lucide-react'
import NotificationItem from './NotificationItem'

export default function NotificationList({
  notifications = [],
  isUnread,
  onMarkRead,
  onDismiss,
  onAction,
  emptyTitle = 'No notifications',
  emptySubtitle = 'You’re all caught up.',
}) {
  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3 text-txt-tertiary">
          <BellOff size={20} />
        </div>
        <div className="text-[14px] font-semibold text-txt-primary">{emptyTitle}</div>
        <div className="text-[12px] text-txt-secondary mt-1 max-w-xs">{emptySubtitle}</div>
      </div>
    )
  }

  return (
    <div>
      {notifications.map(n => (
        <NotificationItem
          key={n.id}
          notification={n}
          unread={!!isUnread?.(n)}
          onMarkRead={onMarkRead}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
