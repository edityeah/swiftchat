import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const TEMPLATES = {
  home: {
    title: 'Daily Attendance Report',
    fields: [
      { key: 'date',    label: 'Date',            type: 'date'   },
      { key: 'class',   label: 'Class',           type: 'select', opts: ['6-A','6-B','7-A','7-B','8-A','8-B','9-A','9-B'] },
      { key: 'present', label: 'Students Present', type: 'number' },
      { key: 'total',   label: 'Total Students',  type: 'number' },
      { key: 'notes',   label: 'Notes',           type: 'textarea' },
    ],
  },
  swift: {
    title: 'Student Issue Report',
    fields: [
      { key: 'student', label: 'Student Name', type: 'text'     },
      { key: 'class',   label: 'Class',        type: 'text'     },
      { key: 'issue',   label: 'Issue Type',   type: 'select', opts: ['Attendance','Scholarship','Behaviour','Academic','Health'] },
      { key: 'desc',    label: 'Description',  type: 'textarea' },
      { key: 'action',  label: 'Action Taken', type: 'textarea' },
    ],
  },
  namo_laxmi: {
    title: 'Namo Laxmi Application',
    fields: [
      { key: 'name',   label: 'Student Name',     type: 'text' },
      { key: 'class',  label: 'Class & Section',  type: 'text' },
      { key: 'school', label: 'School',           type: 'text' },
      { key: 'udise',  label: 'UDISE Code',       type: 'text' },
      { key: 'phone',  label: 'Mobile Number',    type: 'tel'  },
      { key: 'bank',   label: 'Bank Account No.', type: 'text' },
    ],
  },
}

export default function DataForm({ context }) {
  const { showToast } = useApp()
  const chatId = context?.chatId || 'home'
  const tpl = TEMPLATES[chatId] || TEMPLATES.home
  const [vals, setVals] = useState({})
  const [done, setDone] = useState(false)

  const set = (k, v) => setVals(p => ({ ...p, [k]: v }))

  const submit = () => { setDone(true); showToast('Form saved ✓', 'ok') }
  const clear  = () => { setVals({}); setDone(false) }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-bdr text-[13px] text-txt-primary bg-white outline-none focus:border-primary transition-colors'

  return (
    <div className="p-3 space-y-3">
      <h3 className="font-bold text-[14px] text-txt-primary border-b border-bdr pb-2">{tpl.title}</h3>
      {tpl.fields.map(f => (
        <div key={f.key}>
          <label className="text-[11px] font-bold text-txt-secondary uppercase tracking-[0.4px] mb-1 block">{f.label}</label>
          {f.type === 'select' ? (
            <select value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)}
              rows={3} placeholder={`Enter ${f.label.toLowerCase()}…`}
              className={`${inputCls} resize-none`}
            />
          ) : (
            <input
              type={f.type} value={vals[f.key] || ''} onChange={e => set(f.key, e.target.value)}
              placeholder={`Enter ${f.label.toLowerCase()}…`} className={inputCls}
            />
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-[12px] font-bold active:opacity-80">
          {done ? '✅ Saved' : '💾 Save Form'}
        </button>
        <button onClick={clear} className="px-3 py-2.5 rounded-xl text-[12px] font-bold border border-bdr text-txt-secondary active:bg-surface-secondary">
          🗑
        </button>
      </div>
    </div>
  )
}
