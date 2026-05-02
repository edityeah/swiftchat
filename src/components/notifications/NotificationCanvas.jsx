import React, { useMemo, useState, useEffect } from 'react'
import { ArrowLeft, Plus, Megaphone, CheckCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import NotificationFilters, { NOTIFICATION_TABS } from './NotificationFilters'
import NotificationList from './NotificationList'
import CreateReminderForm from './CreateReminderForm'
import CreateBroadcastForm from './CreateBroadcastForm'

function filterFor(tab, notifications, isUnreadFn) {
  switch (tab) {
    case 'unread':     return notifications.filter(n => isUnreadFn(n))
    case 'broadcasts': return notifications.filter(n => n.type === 'broadcast')
    case 'reminders':  return notifications.filter(n => n.type === 'reminder')
    case 'system':     return notifications.filter(n => n.type === 'system')
    case 'all':
    default:           return notifications
  }
}

export default function NotificationCanvas({ initialView = 'list', initialBroadcastPrefill = null, initialReminderPrefill = null, onClose }) {
  const {
    notifications, isUnreadFor, markNotificationRead, markAllNotificationsRead,
    dismissNotification, triggerNotificationAction,
    canCreateBroadcast, role,
  } = useApp()

  // 'list' | 'reminder' | 'broadcast'
  const [view, setView] = useState(initialView)
  const [broadcastPrefill, setBroadcastPrefill] = useState(initialBroadcastPrefill)
  const [reminderPrefill, setReminderPrefill]   = useState(initialReminderPrefill)
  const [tab, setTab]   = useState('all')

  useEffect(() => { setView(initialView) }, [initialView])
  useEffect(() => { if (initialBroadcastPrefill) setBroadcastPrefill(initialBroadcastPrefill) }, [initialBroadcastPrefill])
  useEffect(() => { if (initialReminderPrefill) setReminderPrefill(initialReminderPrefill) }, [initialReminderPrefill])

  const counts = useMemo(() => ({
    all:        notifications.length,
    unread:     notifications.filter(n => isUnreadFor(n)).length,
    broadcasts: notifications.filter(n => n.type === 'broadcast').length,
    reminders:  notifications.filter(n => n.type === 'reminder').length,
    system:     notifications.filter(n => n.type === 'system').length,
  }), [notifications, isUnreadFor])

  const visible = useMemo(() => filterFor(tab, notifications, isUnreadFor),
    [tab, notifications, isUnreadFor])

  const showState = canCreateBroadcast

  // ── Header bar shared across views ─────────────────────────────────────────
  const headerTitle =
    view === 'reminder' ? 'Add Reminder'
    : view === 'broadcast' ? 'Create Broadcast'
    : 'Notifications'

  const onBack = () => {
    if (view !== 'list') setView('list')
    else onClose?.()
  }

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      <div className="h-14 flex items-center gap-2 px-3 border-b border-bdr-light flex-shrink-0 bg-white">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full text-txt-secondary active:bg-surface-secondary transition-colors flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-txt-primary truncate">{headerTitle}</div>
          <div className="text-[11px] text-txt-secondary truncate">
            {role ? `${role.replace(/_/g, ' ')} · SwiftChat` : 'SwiftChat'}
          </div>
        </div>
        {view === 'list' && counts.unread > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="text-[11.5px] font-semibold text-primary hover:underline flex items-center gap-1 px-2"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {view === 'list' && (
        <>
          <NotificationFilters
            active={tab}
            counts={counts}
            onChange={setTab}
          />

          <div className="flex-1 overflow-y-auto min-h-0">
            <NotificationList
              notifications={visible}
              isUnread={isUnreadFor}
              onMarkRead={(n) => markNotificationRead(n.id)}
              onDismiss={(n) => dismissNotification(n.id)}
              onAction={(n) => {
                // triggerNotificationAction returns true when the action
                // handled itself (opened a canvas or queued a chat trigger).
                // In that case the panel will swap to the destination canvas
                // on its own — calling onClose() right after would tear the
                // freshly-opened canvas back down. Only fall back to closing
                // when nothing was handled (e.g. an action with no type).
                const handled = triggerNotificationAction(n)
                if (!handled) onClose?.()
              }}
              emptyTitle={
                tab === 'unread' ? 'You’re all caught up'
                : tab === 'broadcasts' ? 'No broadcasts yet'
                : tab === 'reminders' ? 'No reminders yet'
                : tab === 'system' ? 'No system updates'
                : 'No notifications'
              }
              emptySubtitle={
                tab === 'reminders'
                  ? 'Tap “Add Reminder” to set a personal nudge.'
                  : 'You’ll see new items here as they arrive.'
              }
            />
          </div>

          <div className="flex-shrink-0 p-3 border-t border-bdr-light bg-white flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setView('reminder')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark"
            >
              <Plus size={14} /> Add Reminder
            </button>
            {showState && (
              <button
                onClick={() => { setBroadcastPrefill(null); setView('broadcast') }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-primary text-primary text-[13px] font-semibold hover:bg-primary-light"
              >
                <Megaphone size={14} /> Create Broadcast
              </button>
            )}
          </div>
        </>
      )}

      {view === 'reminder' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <CreateReminderForm
            prefill={reminderPrefill || {}}
            onClose={() => { setReminderPrefill(null); setView('list') }}
          />
        </div>
      )}

      {view === 'broadcast' && showState && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <CreateBroadcastForm
            prefill={broadcastPrefill || {}}
            onClose={() => { setBroadcastPrefill(null); setView('list') }}
          />
        </div>
      )}

      {view === 'broadcast' && !showState && (
        <div className="px-6 py-12 text-center text-txt-secondary text-[13px]">
          Only the State user can create broadcast notifications.
        </div>
      )}
    </div>
  )
}

export const NOTIFICATION_TABS_REF = NOTIFICATION_TABS
