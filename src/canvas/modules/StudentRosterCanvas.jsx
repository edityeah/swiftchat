import React, { useMemo, useState } from 'react'
import { Users, Search, Filter, Phone, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { STUDENTS } from '../../data/mockData'

// Student Roster canvas — opens when the teacher taps the "30 STUDENTS" home
// stat tile. Lists every student in the active class with attendance, average
// score, level, and Namo Laxmi status. Each row expands into a detail panel
// with parent info + per-subject breakdown.

const SUBJECT_KEYS = [
  { key: 'math', label: 'Math' },
  { key: 'sci',  label: 'Science' },
  { key: 'guj',  label: 'Gujarati' },
]

function avg(student) {
  return Math.round(((student.math || 0) + (student.sci || 0) + (student.guj || 0)) / 3)
}

function riskTone(risk) {
  switch (risk) {
    case 'high':   return { bg: '#FFEBEE', fg: '#C62828', label: 'High' }
    case 'medium': return { bg: '#FFF3CC', fg: '#9A6500', label: 'Medium' }
    default:       return { bg: '#E8F5E9', fg: '#2E7D32', label: 'Low' }
  }
}

function levelTone(level) {
  switch (level) {
    case 'Advanced':   return { bg: '#E0E7FF', fg: '#345CCC' }
    case 'Proficient': return { bg: '#E8F5E9', fg: '#2E7D32' }
    default:           return { bg: '#FFF3CC', fg: '#9A6500' }
  }
}

function nlTone(status) {
  switch (status) {
    case 'approved': return { bg: '#E8F5E9', fg: '#2E7D32', label: 'Approved' }
    case 'pending':  return { bg: '#FFF3CC', fg: '#9A6500', label: 'Pending' }
    case 'rejected': return { bg: '#FFEBEE', fg: '#C62828', label: 'Rejected' }
    default:         return { bg: '#ECECEC', fg: '#828996', label: '—' }
  }
}

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'risk',   label: 'At Risk' },
  { id: 'top',    label: 'Top Performers' },
  { id: 'nl',     label: 'Namo Laxmi' },
]

export default function StudentRosterCanvas({ context }) {
  const { closeCanvas, openCanvas, openNotificationsCanvas, showToast } = useApp()
  const grade = context?.grade || context?.classId || 8
  const klassLabel = context?.classLabel || `Class ${grade}`
  const all = useMemo(() => STUDENTS[grade] || STUDENTS[8] || [], [grade])

  const [tab, setTab]   = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)

  const filtered = useMemo(() => {
    let list = all
    if (tab === 'risk')  list = list.filter(s => s.risk !== 'low')
    if (tab === 'top')   list = list.filter(s => s.level === 'Advanced')
    if (tab === 'nl')    list = list.filter(s => s.namoLaxmi)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    }
    return list
  }, [all, tab, query])

  const totals = useMemo(() => {
    const att = all.length ? Math.round(all.reduce((a, s) => a + (s.attendance || 0), 0) / all.length) : 0
    const avgScore = all.length ? Math.round(all.reduce((a, s) => a + avg(s), 0) / all.length) : 0
    const atRisk = all.filter(s => s.risk !== 'low').length
    const advanced = all.filter(s => s.level === 'Advanced').length
    return { att, avgScore, atRisk, advanced }
  }, [all])

  const handleOpenAttendance = () => {
    openCanvas({ type: 'attendance', classId: `${grade}-A` })
  }
  const handleOpenDashboard = () => {
    openCanvas({ type: 'dashboard', scope: 'class', grade })
  }
  const handleParentAlert = (s) => {
    showToast?.(`Parent alert prepared for ${s.name}.`, 'ok')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bdr-light bg-white flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
            <Users size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-txt-primary">{klassLabel} · Student Roster</div>
            <div className="text-[12px] text-txt-secondary">{all.length} students · Sardar Patel Prathmik Shala</div>
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <SummaryChip value={`${all.length}`}      label="Total"     color="#386AF6" />
          <SummaryChip value={`${totals.att}%`}     label="Avg Att."  color="#16A34A" />
          <SummaryChip value={`${totals.avgScore}%`} label="Avg Score" color="#7C3AED" />
          <SummaryChip value={`${totals.atRisk}`}   label="At Risk"   color="#DC2626" />
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-bdr-light bg-white flex-shrink-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold ${
              tab === t.id ? 'bg-primary text-white' : 'bg-surface-secondary text-txt-secondary'
            }`}
          >{t.label}</button>
        ))}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-bdr bg-white">
          <Search size={13} className="text-txt-tertiary" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name or ID"
            className="bg-transparent text-[12px] focus:outline-none w-32"
          />
        </div>
      </div>

      {/* Roster list */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[12px] text-txt-tertiary">No students match the filter.</div>
        ) : (
          <div className="divide-y divide-bdr-light">
            {filtered.map(s => {
              const isOpen = openId === s.id
              const r = riskTone(s.risk)
              const lv = levelTone(s.level)
              const nl = nlTone(s.namoLaxmi)
              const a  = avg(s)
              return (
                <div key={s.id} className="bg-white">
                  <button
                    onClick={() => setOpenId(prev => prev === s.id ? null : s.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-surface-secondary"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                      {s.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-txt-primary truncate">{s.name}</div>
                      <div className="text-[11px] text-txt-secondary">#{s.id} · {s.gender === 'F' ? 'Female' : 'Male'} · Avg {a}%</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: r.bg, color: r.fg }}>{s.attendance}%</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: lv.bg, color: lv.fg }}>{s.level}</span>
                    <ChevronRight size={14} className={`text-txt-tertiary transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 bg-surface-secondary">
                      <div className="grid grid-cols-2 gap-2">
                        <DetailCard label="Guardian" value={s.guardian} icon={Users} />
                        <DetailCard label="Phone" value={s.phone} icon={Phone} />
                        <DetailCard label="Attendance" value={`${s.attendance}%`} accent={r.fg} />
                        <DetailCard label="Risk" value={r.label} accent={r.fg} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {SUBJECT_KEYS.map(k => (
                          <div key={k.key} className="bg-white border border-bdr rounded-xl p-2 text-center">
                            <div className="text-[10px] text-txt-tertiary uppercase tracking-[0.4px]">{k.label}</div>
                            <div className="text-[16px] font-bold text-txt-primary">{s[k.key]}%</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-txt-tertiary">Namo Laxmi</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: nl.bg, color: nl.fg }}>{nl.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionChip onClick={() => handleParentAlert(s)} variant="warn">📨 Parent alert</ActionChip>
                        <ActionChip onClick={handleOpenAttendance}>📅 Open attendance</ActionChip>
                        <ActionChip onClick={handleOpenDashboard}>📊 Class dashboard</ActionChip>
                        <ActionChip onClick={() => openNotificationsCanvas?.({ view: 'reminder', reminderPrefill: { title: `Follow up on ${s.name}`, message: `${s.name} · #${s.id}`, priority: 'normal' } })}>🔔 Reminder</ActionChip>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-bdr-light bg-white flex gap-2 flex-shrink-0">
        <button
          onClick={handleOpenAttendance}
          className="flex-1 h-10 rounded-2xl border-[1.5px] border-primary text-primary text-[12.5px] font-bold"
        >📅 Mark attendance</button>
        <button
          onClick={handleOpenDashboard}
          className="flex-1 h-10 rounded-2xl bg-primary text-white text-[12.5px] font-bold"
        >📊 Class dashboard</button>
      </div>
    </div>
  )
}

function SummaryChip({ value, label, color }) {
  return (
    <div className="bg-surface-secondary rounded-xl px-2 py-1.5 text-center">
      <div className="text-[15px] font-bold leading-tight" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-[0.3px] text-txt-tertiary">{label}</div>
    </div>
  )
}

function DetailCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-bdr rounded-xl px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.3px] text-txt-tertiary mb-0.5 flex items-center gap-1">
        {Icon && <Icon size={11} className="text-txt-tertiary" />}
        {label}
      </div>
      <div className="text-[12.5px] font-bold" style={{ color: accent || '#0E0E0E' }}>{value}</div>
    </div>
  )
}

function ActionChip({ onClick, children, variant = 'primary' }) {
  const tone = variant === 'warn'
    ? 'border-warn text-[#9A6500] hover:bg-warn-light'
    : 'border-primary text-primary hover:bg-primary-light'
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border-[1.5px] bg-white text-[11.5px] font-bold ${tone}`}
    >{children}</button>
  )
}
