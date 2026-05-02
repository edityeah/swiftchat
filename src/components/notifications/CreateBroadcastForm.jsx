import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  NOTIFICATION_PRIORITIES, NOTIFICATION_MODULES,
  NOTIFICATION_CATEGORIES, BROADCAST_TARGET_ROLES,
} from '../../notifications/notificationTypes'
import { NOTIFICATION_ACTION_TYPES } from '../../notifications/notificationActions'

function todayLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nowLocalTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CreateBroadcastForm({ onClose, prefill = {} }) {
  const { createBroadcastNotification, showToast } = useApp()

  const [title, setTitle]       = useState(prefill.title || '')
  const [message, setMessage]   = useState(prefill.message || '')
  const [category, setCategory] = useState(prefill.category || 'announcement')
  const [priority, setPriority] = useState(prefill.priority || 'normal')
  const [module, setModule]     = useState(prefill.module || 'general')
  const [date, setDate]         = useState(prefill.date || todayLocalDate())
  const [time, setTime]         = useState(prefill.time || nowLocalTime())
  const [actionType, setActionType] = useState(prefill.action?.type || '')
  const [actionLabel, setActionLabel] = useState(prefill.action?.label || '')
  const [targets, setTargets]   = useState(() => {
    const raw = prefill.targetRoles && prefill.targetRoles.length ? prefill.targetRoles : ['all']
    return new Set(raw)
  })
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const minDate = useMemo(() => todayLocalDate(), [])

  const toggleTarget = (id) => {
    const next = new Set(targets)
    if (id === 'all') {
      // 'all' is exclusive — selecting it clears the rest.
      if (next.has('all')) next.delete('all')
      else { next.clear(); next.add('all') }
    } else {
      next.delete('all')
      if (next.has(id)) next.delete(id); else next.add(id)
    }
    if (next.size === 0) next.add('all')
    setTargets(next)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Please enter a notification title.'); return }
    if (!message.trim()) { setError('Please enter a message.'); return }
    if (targets.size === 0) { setError('Pick at least one target audience.'); return }

    let scheduledAt = null
    if (date && time) {
      const scheduled = new Date(`${date}T${time}`)
      if (Number.isNaN(scheduled.getTime())) { setError('Invalid date/time.'); return }
      scheduledAt = scheduled.toISOString()
    }
    const isFuture = scheduledAt ? Date.parse(scheduledAt) > Date.now() + 1000 : false

    const action = actionType
      ? { type: actionType, label: actionLabel?.trim() || 'Open' }
      : null

    setSubmitting(true)
    try {
      createBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        module: module === 'general' ? null : module,
        scheduledAt: scheduledAt && isFuture ? scheduledAt : null,
        targetRoles: [...targets],
        action,
      })
      showToast?.(
        isFuture ? 'Notification scheduled successfully.' : 'Notification sent successfully.',
        'ok',
      )
      onClose?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
      <Field label="Title">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Namo Lakshmi deadline reminder"
          className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
        />
      </Field>
      <Field label="Message">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What should users know?"
          rows={3}
          className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white resize-none"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
          >
            {NOTIFICATION_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
          >
            {NOTIFICATION_PRIORITIES.map(p => (
              <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
          />
        </Field>
      </div>
      <Field label="Module (optional)">
        <select
          value={module}
          onChange={e => setModule(e.target.value)}
          className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
        >
          {NOTIFICATION_MODULES.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Action link (optional)">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value)}
            className="px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
          >
            <option value="">No action</option>
            {NOTIFICATION_ACTION_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/^OPEN_/, '').replace(/_/g, ' ').toLowerCase()}</option>
            ))}
          </select>
          <input
            value={actionLabel}
            onChange={e => setActionLabel(e.target.value)}
            placeholder="Button label (e.g. Open DigiVritti)"
            className="px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
            disabled={!actionType}
          />
        </div>
      </Field>
      <Field label="Target audience">
        <div className="flex flex-wrap gap-2">
          {BROADCAST_TARGET_ROLES.map(r => {
            const selected = targets.has(r.id)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleTarget(r.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                  selected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-bdr text-txt-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </Field>

      {error && <div className="text-[12px] text-danger">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => onClose?.(null)}
          className="flex-1 py-2.5 rounded-full bg-surface-secondary text-txt-primary text-[13px] font-semibold"
        >Cancel</button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-full bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60"
        >Send / Schedule</button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-txt-secondary mb-1.5">{label}</div>
      {children}
    </label>
  )
}
