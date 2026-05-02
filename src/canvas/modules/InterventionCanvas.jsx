import React, { useMemo, useState } from 'react'
import { Users, BookOpen, FileText, MessageSquare, Save, Bell, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// Intervention Group canvas — opened by Ask AI's "Create intervention group"
// action. Reads pre-filled context from the Ask AI response so the canvas
// lands populated with student names, primary gaps, attendance + score, and
// suggested 5-day plan. Saving stores a small mock record in localStorage.

const STORAGE_KEY = 'swiftchat.askAi.interventionGroups.v1'

// Default 5-day plan used when the response doesn't override it. Mirrors the
// spec for "Fractions Readiness".
const DEFAULT_PLAN = [
  { day: 'Day 1', topic: 'Equivalent fractions recap' },
  { day: 'Day 2', topic: 'Division facts warm-up + fraction comparison' },
  { day: 'Day 3', topic: 'Word problem setup' },
  { day: 'Day 4', topic: 'Practice worksheet' },
  { day: 'Day 5', topic: 'Mini re-check' },
]

// Default rich student profile used when the response only ships student
// names. Lets the canvas always show "primary gap / parent alert needed"
// without forcing every Ask AI response to repeat the metadata.
const FALLBACK_STUDENT_META = {
  'Aarav Desai':   { primaryGap: 'Word Problems',          attendance: '72%',   score: '41%', alert: 'Yes' },
  'Nisha Parma':   { primaryGap: 'Equivalent Fractions',   attendance: '88%',   score: '38%', alert: 'No' },
  'Harsh Vaghela': { primaryGap: 'Division Facts',          attendance: '68%',   score: '55%', alert: 'Yes' },
  'Ishit Dabhi':   { primaryGap: 'Fraction Comparison',    attendance: '82%',   score: '57%', alert: 'No' },
  'Tanvi Panchal': { primaryGap: 'Word Problem Setup',     attendance: '80.1%', score: '61%', alert: 'Preventive' },
  'Jay Mehta':     { primaryGap: 'Word Problems',          attendance: '73%',   score: '64%', alert: 'No' },
  'Diya Shah':     { primaryGap: 'Equivalent Fractions',   attendance: '71%',   score: '62%', alert: 'Preventive' },
  'Om Trive':      { primaryGap: 'Equivalent Fractions',   attendance: '80.5%', score: '66%', alert: 'No' },
}

function normaliseStudent(s) {
  if (!s) return null
  if (typeof s === 'string') {
    return { name: s, ...(FALLBACK_STUDENT_META[s] || {}) }
  }
  return {
    name: s.name || 'Student',
    primaryGap: s.primaryGap || FALLBACK_STUDENT_META[s.name]?.primaryGap || '—',
    attendance: s.attendance || FALLBACK_STUDENT_META[s.name]?.attendance || '—',
    score: s.score || FALLBACK_STUDENT_META[s.name]?.score || '—',
    alert: s.alert || FALLBACK_STUDENT_META[s.name]?.alert || 'No',
  }
}

function persistGroup(group) {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    list.push({ ...group, savedAt: new Date().toISOString() })
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* quota / disabled — ignore */ }
}

export default function InterventionCanvas({ context }) {
  const { showToast, closeCanvas, openCanvas, openNotificationsCanvas } = useApp()

  const initialStudents = useMemo(() => {
    return (Array.isArray(context?.students) ? context.students : []).map(normaliseStudent).filter(Boolean)
  }, [context])

  const [groupName, setGroupName] = useState(context?.groupName || 'Intervention Group — Fractions Readiness')
  const [subject, setSubject]     = useState(context?.subject  || 'Mathematics')
  const [focus, setFocus]         = useState(context?.topic    || 'Fractions Readiness')
  const [duration, setDuration]   = useState(context?.duration || '1 week')
  const [session, setSession]     = useState(context?.session  || 'After school')
  const plan                      = Array.isArray(context?.plan) && context.plan.length ? context.plan : DEFAULT_PLAN
  const [saved, setSaved]         = useState(false)

  const handleSave = () => {
    persistGroup({
      name: groupName, subject, focus, duration, session,
      students: initialStudents.map(s => s.name),
      plan,
    })
    setSaved(true)
    showToast?.('Intervention group saved.', 'ok')
  }

  const handleGenerateLessonPlan = () => {
    openCanvas({
      type: 'lesson-plan',
      subject,
      topic: focus,
      classId: context?.classId || 'Class 6',
      students: initialStudents.map(s => s.name),
      sourceGroup: groupName,
    })
  }

  const handleGenerateWorksheet = () => {
    openCanvas({
      type: 'worksheet-template',
      subject,
      topic: focus,
      students: initialStudents.map(s => s.name),
      sourceGroup: groupName,
    })
  }

  const handleSendParentAlerts = () => {
    const targets = initialStudents.filter(s => s.alert && s.alert !== 'No').map(s => s.name)
    showToast?.(targets.length
      ? `Parent alerts queued for ${targets.length} guardians.`
      : 'No parent-alert candidates in this group.', 'ok')
  }

  const handleCreateReminder = () => {
    openNotificationsCanvas?.({
      view: 'reminder',
      reminderPrefill: {
        title: `Run intervention session — ${focus}`,
        message: `Subject: ${subject}. Students: ${initialStudents.map(s => s.name).join(', ')}.`,
        priority: 'normal',
      },
    })
  }

  return (
    <div className="px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
          <Users size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-txt-primary leading-snug">{groupName}</div>
          <div className="text-[12px] text-txt-secondary leading-snug mt-0.5">
            {initialStudents.length} students selected based on low XAMTA score, attendance risk, and topic gaps.
          </div>
        </div>
        {saved && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ok-light text-ok text-[10px] font-bold uppercase">
            <Check size={11} /> Saved
          </span>
        )}
      </div>

      {/* Group Summary */}
      <Section title="Group Summary">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Group name" full>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-bdr rounded-lg text-[13px] focus:outline-none focus:border-primary bg-white"
            />
          </Field>
          <Field label="Subject">
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-bdr rounded-lg text-[13px] focus:outline-none focus:border-primary bg-white" />
          </Field>
          <Field label="Focus topic">
            <input value={focus} onChange={e => setFocus(e.target.value)} className="w-full px-3 py-2 border border-bdr rounded-lg text-[13px] focus:outline-none focus:border-primary bg-white" />
          </Field>
          <Field label="Duration">
            <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-2 border border-bdr rounded-lg text-[13px] bg-white">
              <option>3 days</option>
              <option>1 week</option>
              <option>2 weeks</option>
            </select>
          </Field>
          <Field label="Recommended session">
            <select value={session} onChange={e => setSession(e.target.value)} className="w-full px-3 py-2 border border-bdr rounded-lg text-[13px] bg-white">
              <option>After school</option>
              <option>Free period</option>
              <option>Saturday session</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Student List */}
      <Section title={`Student List (${initialStudents.length})`}>
        <div className="border border-bdr rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-[12.5px] text-left">
              <thead className="bg-surface-secondary">
                <tr>
                  {['Student','Primary Gap','Attendance','Score','Parent Alert Needed'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-semibold tracking-[0.4px] uppercase text-txt-secondary border-b border-bdr-light whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialStudents.length === 0 ? (
                  <tr><td className="px-3 py-3 text-txt-tertiary text-[12px]" colSpan={5}>No students supplied.</td></tr>
                ) : initialStudents.map((s, i) => (
                  <tr key={i} className={i < initialStudents.length - 1 ? 'border-b border-bdr-light' : ''}>
                    <td className="px-3 py-2.5 font-semibold text-txt-primary whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2.5 text-txt-secondary whitespace-nowrap">{s.primaryGap}</td>
                    <td className="px-3 py-2.5 text-txt-primary font-medium whitespace-nowrap">{s.attendance}</td>
                    <td className="px-3 py-2.5 text-txt-primary font-medium whitespace-nowrap">{s.score}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <AlertPill value={s.alert} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Recommended Plan */}
      <Section title="Recommended Plan">
        <ol className="border border-bdr rounded-xl overflow-hidden">
          {plan.map((step, i) => (
            <li key={i} className={`flex items-start gap-3 px-3 py-2.5 ${i < plan.length - 1 ? 'border-b border-bdr-light' : ''}`}>
              <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary text-[11px] font-bold">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-txt-primary">{step.day}</div>
                <div className="text-[12px] text-txt-secondary leading-snug mt-0.5">{step.topic}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        <ActionTile icon={BookOpen}      label="Generate lesson plan"        onClick={handleGenerateLessonPlan} />
        <ActionTile icon={FileText}      label="Generate practice worksheet" onClick={handleGenerateWorksheet} />
        <ActionTile icon={MessageSquare} label="Send parent alerts"          onClick={handleSendParentAlerts} />
        <ActionTile icon={Bell}          label="Create reminder"             onClick={handleCreateReminder} />
        <ActionTile icon={Save}          label={saved ? 'Group saved' : 'Save group'} onClick={handleSave} primary disabled={saved} />
      </div>

      {/* Sticky close */}
      <div className="sticky bottom-0 bg-white pt-3 mt-3 border-t border-bdr-light">
        <button
          onClick={closeCanvas}
          className="w-full h-11 rounded-2xl border-[1.5px] border-bdr text-txt-secondary font-bold text-[13px]"
        >Close</button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-4">
      <div className="text-[11px] font-bold tracking-[0.4px] uppercase text-txt-tertiary mb-2">{title}</div>
      {children}
    </section>
  )
}

function Field({ label, children, full = false }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="block text-[11px] font-semibold text-txt-secondary mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function AlertPill({ value }) {
  const tone =
    value === 'Yes'        ? 'bg-[#FDEAEA] text-[#C0392B]' :
    value === 'Preventive' ? 'bg-[#FFF3CC] text-[#9A6500]' :
    value === 'No'         ? 'bg-[#ECECEC] text-[#7383A5]' :
    'bg-surface-secondary text-txt-secondary'
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tone}`}>{value}</span>
}

function ActionTile({ icon: Icon, label, onClick, primary = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${
        primary
          ? 'border-primary bg-primary text-white hover:bg-primary-dark'
          : 'border-bdr bg-white text-txt-primary hover:border-primary hover:text-primary'
      }`}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="leading-snug text-left">{label}</span>
    </button>
  )
}
