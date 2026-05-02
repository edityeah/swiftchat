import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  NOTIFICATION_PRIORITIES, NOTIFICATION_MODULES,
} from '../../notifications/notificationTypes'

function todayLocalDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowLocalTime() {
  const d = new Date(Date.now() + 5 * 60 * 1000)  // default to "5 min from now"
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function CreateReminderForm({ onClose, prefill = {} }) {
  const { createReminder, showToast } = useApp()
  const [title, setTitle]     = useState(prefill.title     || '')
  const [message, setMessage] = useState(prefill.message   || '')
  const [date, setDate]       = useState(prefill.date      || todayLocalDate())
  const [time, setTime]       = useState(prefill.time      || nowLocalTime())
  const [priority, setPriority] = useState(prefill.priority || 'normal')
  const [module, setModule]     = useState(prefill.module   || 'general')
  const [error, setError]     = useState('')

  const minDate = useMemo(() => todayLocalDate(), [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Please enter a reminder title.'); return }
    if (!date || !time) { setError('Please pick a date and time.'); return }
    const scheduled = new Date(`${date}T${time}`)
    if (Number.isNaN(scheduled.getTime())) { setError('Invalid date/time.'); return }

    const result = createReminder({
      title: title.trim(),
      message: message.trim(),
      scheduledAt: scheduled.toISOString(),
      priority,
      module: module === 'general' ? null : module,
      category: 'reminder',
    })

    const isFuture = scheduled.getTime() > Date.now() + 1000
    showToast?.(isFuture ? 'Reminder scheduled' : 'Reminder added', 'ok')
    onClose?.(result)
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
      <Field label="Reminder title">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Review pending approvals"
          className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white"
        />
      </Field>
      <Field label="Topic / message (optional)">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Anything you want the reminder note to say"
          rows={2}
          className="w-full px-3 py-2.5 border border-bdr rounded-xl text-[13px] focus:outline-none focus:border-primary bg-white resize-none"
        />
      </Field>
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
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {error && <div className="text-[12px] text-danger">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => onClose?.(null)}
          className="flex-1 py-2.5 rounded-full bg-surface-secondary text-txt-primary text-[13px] font-semibold"
        >Cancel</button>
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-full bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark"
        >Save reminder</button>
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
