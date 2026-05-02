import React, { useEffect, useState } from 'react'
import { X, ArrowRight, Bell } from 'lucide-react'
import { priorityTone } from '../../notifications/notificationTypes'
import { useApp } from '../../context/AppContext'

// In-app toast for newly-due notifications. Distinct from the global Toast
// component so the styling can be richer (action button, priority chip,
// reminder-specific styling).
//
// Behaviour:
//   • Reminders stay on screen until the user dismisses or clicks them — they
//     should feel like an alarm.
//   • Other toasts auto-dismiss after 6s.
//   • Clicking the toast body opens the notifications canvas (or the action,
//     if the notification provided one).
export default function NotificationToast() {
  const {
    recentNotificationToast, dismissNotificationToast,
    triggerNotificationAction, openNotificationsCanvas,
  } = useApp()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (recentNotificationToast) {
      setVisible(true)
      // Reminders ring until acknowledged. Everything else self-dismisses.
      if (recentNotificationToast.type === 'reminder') return
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(() => dismissNotificationToast?.(), 220)
      }, 6000)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [recentNotificationToast, dismissNotificationToast])

  if (!recentNotificationToast) return null

  const n = recentNotificationToast
  const tone = priorityTone(n.priority)
  const isReminder = n.type === 'reminder'

  const closeToast = () => {
    setVisible(false)
    setTimeout(() => dismissNotificationToast?.(), 200)
  }

  // Default click → open the bell, mark the reminder read, dismiss the toast.
  const handleBodyClick = () => {
    if (n.action?.type) {
      triggerNotificationAction?.(n)
    } else {
      openNotificationsCanvas?.({ view: 'list' })
    }
    closeToast()
  }

  return (
    <div
      role="status"
      aria-live={isReminder ? 'assertive' : 'polite'}
      className={`fixed z-[10000] left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 top-20 sm:top-6 transition-all duration-200 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
      style={{ maxWidth: 'min(420px, calc(100vw - 24px))' }}
    >
      <div
        className={`rounded-2xl shadow-modal overflow-hidden ${
          isReminder
            ? 'bg-warn-light border-2 border-warn'
            : 'bg-white border border-bdr-light'
        }`}
      >
        <div className="flex items-start gap-3 p-3.5">
          <button
            onClick={handleBodyClick}
            aria-label="Open notification"
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isReminder ? 'bg-warn text-white notification-bell--buzz-urgent' : 'bg-primary-light text-primary'
            }`}
            style={{ animationIterationCount: isReminder ? 'infinite' : undefined }}
          >
            <Bell size={isReminder ? 18 : 16} />
          </button>
          <button
            onClick={handleBodyClick}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              {isReminder && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#9A6500] border border-warn uppercase">
                  Reminder
                </span>
              )}
              <div className="text-[13px] font-bold text-txt-primary truncate">{n.title}</div>
              <span
                className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: tone.bg, color: tone.fg }}
              >{tone.label}</span>
            </div>
            {n.message && (
              <div className="text-[12px] text-txt-secondary line-clamp-2">
                {n.message}
              </div>
            )}
            <div
              className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary"
            >
              {n.action?.label || (isReminder ? 'Open reminder' : 'View notification')} <ArrowRight size={12} />
            </div>
          </button>
          <button
            onClick={closeToast}
            aria-label="Dismiss notification toast"
            className="w-7 h-7 flex items-center justify-center rounded-full text-txt-tertiary hover:bg-surface-secondary flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
