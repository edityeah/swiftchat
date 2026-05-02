import React, { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { primeAudioOnUserGesture } from '../../notifications/notificationSound'
import NotificationBadge from './NotificationBadge'

// Top-bar bell. Owns its own buzz animation + audio-prime on click.
//
// Animation modes:
//   • normal     — single 1.2s shake on a fresh due-event.
//   • urgent     — 3 × 1.2s shakes for high/urgent priority.
//   • ringing    — infinite shake while a reminder is pending acknowledgement.
//                  Cleared by clicking the bell or dismissing the toast.
export default function NotificationBell({ className = '' }) {
  const {
    unreadNotifications,
    openNotificationsCanvas,
    notificationsBuzzKey,
    notificationsBuzzUrgent,
    notificationsRinging,
  } = useApp()

  const [animClass, setAnimClass] = useState('')
  const lastKey = useRef(null)

  useEffect(() => {
    if (!notificationsBuzzKey) return
    if (lastKey.current === notificationsBuzzKey) return
    lastKey.current = notificationsBuzzKey
    setAnimClass(notificationsBuzzUrgent ? 'notification-bell--buzz-urgent' : 'notification-bell--buzz')
    const dur = notificationsBuzzUrgent ? 3700 : 1300
    const t = setTimeout(() => setAnimClass(''), dur)
    return () => clearTimeout(t)
  }, [notificationsBuzzKey, notificationsBuzzUrgent])

  // While a reminder is unacknowledged, override the one-shot animation with
  // an infinite shake so the icon really does keep moving right and left.
  const effectiveAnim = notificationsRinging ? 'notification-bell--ringing' : animClass

  return (
    <button
      onClick={() => {
        primeAudioOnUserGesture()
        openNotificationsCanvas()
      }}
      aria-label={notificationsRinging ? 'Reminder ringing — open notifications' : 'Notifications'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
        notificationsRinging
          ? 'bg-warn-light hover:bg-[#FFE082]'
          : 'hover:bg-[#ECECEC] active:bg-[#DDD]'
      } ${className}`}
      style={{ color: notificationsRinging ? '#9A6500' : '#7383A5' }}
    >
      <Bell size={18} className={effectiveAnim} />
      <NotificationBadge count={unreadNotifications} />
    </button>
  )
}
