import React, { useMemo } from 'react'
import { AlertTriangle, Phone, MessageSquare, BookOpen, Bell, Users } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { AT_RISK_STUDENTS } from '../../data/mockData'

// At-Risk Students canvas — opens when the teacher taps the "AT RISK" home
// stat tile. Renders the 3 high-risk students with parent contact details,
// risk level, attendance, dropout signals, and the same CTAs Ask AI shows
// for the after-school cohort: create intervention, generate lesson plan,
// send parent alerts, create reminder.

// Curated parent contacts for the AT_RISK_STUDENTS demo set so the canvas
// can show "who to call" without depending on the full STUDENTS roster.
const PARENT_CONTACTS = {
  'Ravi Patel':    { parent: 'Mehul Patel',    phone: '+91 98765 50121', region: 'Mehsana · Class 8' },
  'Dhruv Vaghela': { parent: 'Rekha Vaghela',  phone: '+91 98765 50122', region: 'Mehsana · Class 8' },
  'Harsh Bhatt':   { parent: 'Bhavna Bhatt',   phone: '+91 98765 50123', region: 'Mehsana · Class 8' },
  'Komal Patel':   { parent: 'Kiran Patel',    phone: '+91 98765 50124', region: 'Mehsana · Class 8' },
  'Hetal Chauhan': { parent: 'Pankaj Chauhan', phone: '+91 98765 50125', region: 'Mehsana · Class 8' },
  'Jay Prajapati': { parent: 'Nilesh Prajapati', phone: '+91 98765 50116', region: 'Mehsana · Class 6' },
}

// Risk-level → dropout-likelihood label used on the row pill. Maps the
// existing AT_RISK_STUDENTS.risk values onto the user-friendly four-tier
// labels: Urgent / High / Medium / Low.
function riskLabel(risk, attendance) {
  if (risk === 'high' && attendance < 60) return { label: 'Urgent', bg: '#FFEBEE', fg: '#B71C1C', accent: '#B71C1C' }
  if (risk === 'high')                    return { label: 'High',   bg: '#FFEBEE', fg: '#C62828', accent: '#C62828' }
  if (risk === 'medium')                  return { label: 'Medium', bg: '#FFF3CC', fg: '#9A6500', accent: '#F8B200' }
  return { label: 'Low', bg: '#E8F5E9', fg: '#2E7D32', accent: '#16A34A' }
}

function dropoutSignal(student) {
  if (student.attendance < 60)               return 'Likely to drop out within 4 weeks'
  if (student.attendance < 70)               return 'Dropout risk rising — needs follow-up this week'
  if (student.risk === 'high')               return 'Repeated absence pattern — verify reason'
  if (student.risk === 'medium')             return 'Declining trend — preventive support'
  return 'Monitoring'
}

export default function AtRiskStudentsCanvas({ context }) {
  const { closeCanvas, openCanvas, openNotificationsCanvas, showToast } = useApp()
  const focusGrade = context?.grade || 8

  const students = useMemo(() => {
    const list = (AT_RISK_STUDENTS || []).filter(s => !focusGrade || s.grade === focusGrade)
    return list.length ? list : (AT_RISK_STUDENTS || [])
  }, [focusGrade])

  const counts = useMemo(() => {
    const by = { Urgent: 0, High: 0, Medium: 0, Low: 0 }
    students.forEach(s => { by[riskLabel(s.risk, s.attendance).label]++ })
    return by
  }, [students])

  const studentNames = students.map(s => s.name)

  const handleCreateIntervention = () => {
    openCanvas({
      type: 'intervention',
      groupName: 'At-Risk Intervention Group',
      subject: 'Mathematics',
      topic: 'Attendance + Foundations',
      duration: '1 week',
      session: 'After school',
      students: studentNames,
    })
  }

  const handleGenerateLessonPlan = () => {
    openCanvas({
      type: 'lesson-plan',
      subject: 'Mathematics',
      topic: 'Foundations Recap',
      classId: `Class ${focusGrade}`,
      students: studentNames,
    })
  }

  const handleParentAlerts = () => {
    showToast?.(`Parent alerts queued for ${students.length} guardians.`, 'ok')
  }

  const handleParentAlert = (s) => {
    const p = PARENT_CONTACTS[s.name]
    showToast?.(`Parent alert prepared${p ? ` for ${p.parent}` : ''}.`, 'ok')
  }

  const handleCreateReminder = () => {
    openNotificationsCanvas?.({
      view: 'reminder',
      reminderPrefill: {
        title: 'Follow up on at-risk students',
        message: `Review ${students.length} at-risk cases — call parents and schedule intervention.`,
        priority: 'high',
      },
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bdr-light bg-white flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-light flex items-center justify-center text-danger flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-txt-primary">At-Risk Students</div>
            <div className="text-[12px] text-txt-secondary">{students.length} students flagged for dropout / learning risk</div>
          </div>
        </div>

        {/* Risk-level summary chips */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <SummaryChip value={counts.Urgent} label="Urgent" color="#B71C1C" />
          <SummaryChip value={counts.High}   label="High"   color="#C62828" />
          <SummaryChip value={counts.Medium} label="Medium" color="#9A6500" />
          <SummaryChip value={counts.Low}    label="Low"    color="#2E7D32" />
        </div>
      </div>

      {/* Table-style list */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary px-3 py-3">
        <div className="rounded-2xl border border-bdr bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-[12.5px] text-left">
              <thead className="bg-surface-secondary">
                <tr>
                  {['Student','Parent','Phone','Region · Class','Risk','Attendance','Dropout Signal'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-semibold tracking-[0.4px] uppercase text-txt-secondary border-b border-bdr-light whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const r = riskLabel(s.risk, s.attendance)
                  const p = PARENT_CONTACTS[s.name] || { parent: '—', phone: '—', region: `Class ${s.grade}` }
                  return (
                    <tr key={i} className={i < students.length - 1 ? 'border-b border-bdr-light' : ''}>
                      <td className="px-3 py-2.5 font-bold text-txt-primary whitespace-nowrap">{s.name}</td>
                      <td className="px-3 py-2.5 text-txt-secondary whitespace-nowrap">{p.parent}</td>
                      <td className="px-3 py-2.5 text-txt-primary font-medium whitespace-nowrap">{p.phone}</td>
                      <td className="px-3 py-2.5 text-txt-secondary whitespace-nowrap">{p.region}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: r.bg, color: r.fg }}>{r.label}</span>
                      </td>
                      <td className="px-3 py-2.5 font-bold whitespace-nowrap" style={{ color: r.accent }}>{s.attendance}%</td>
                      <td className="px-3 py-2.5 text-txt-secondary whitespace-nowrap">{dropoutSignal(s)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-student quick actions */}
        <div className="mt-3 grid gap-2">
          {students.map((s, i) => {
            const p = PARENT_CONTACTS[s.name]
            return (
              <div key={i} className="bg-white border border-bdr rounded-2xl p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-danger-light text-danger flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                  {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-txt-primary">{s.name}</div>
                  <div className="text-[11.5px] text-txt-secondary leading-snug">{s.reason} · {s.attendance}% attendance · {s.days} day(s) absent</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionChip onClick={() => handleParentAlert(s)} variant="warn"><MessageSquare size={11} /> Parent alert</ActionChip>
                    {p?.phone && <ActionChip variant="primary" as="a" href={`tel:${p.phone.replace(/\s+/g,'')}`}><Phone size={11} /> Call parent</ActionChip>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* AI Insight */}
        <div className="mt-3 px-3 py-3 rounded-2xl border border-[#00BA34] bg-[#D4F5DC]">
          <div className="text-[10px] font-bold tracking-[0.4px] uppercase text-[#007B22] mb-1">AI Insight</div>
          <div className="text-[12.5px] leading-snug text-[#007B22]">
            Start with the highest-risk row. Calling the parent within 24 hours typically prevents the next absence cycle.
            Pair attendance follow-up with a one-week intervention group on the weakest topic.
          </div>
        </div>
      </div>

      {/* Bottom CTAs (mirrors the Ask AI after-school result card) */}
      <div className="px-3 py-3 border-t border-bdr-light bg-white flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Cta onClick={handleCreateIntervention}  icon={Users}        label="Create intervention group" />
          <Cta onClick={handleGenerateLessonPlan}  icon={BookOpen}     label="Generate lesson plan" />
          <Cta onClick={handleParentAlerts}        icon={MessageSquare} label="Send parent alerts" variant="warn" />
          <Cta onClick={handleCreateReminder}      icon={Bell}         label="Create reminder" />
        </div>
        <button
          onClick={closeCanvas}
          className="mt-2 w-full h-10 rounded-2xl border-[1.5px] border-bdr text-txt-secondary text-[12.5px] font-bold"
        >Close</button>
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

function ActionChip({ onClick, children, variant = 'primary', as = 'button', href }) {
  const tone = variant === 'warn'
    ? 'border-warn text-[#9A6500] hover:bg-warn-light'
    : 'border-primary text-primary hover:bg-primary-light'
  const cls = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-[1.5px] bg-white text-[11px] font-bold ${tone}`
  if (as === 'a') {
    return <a href={href} className={cls}>{children}</a>
  }
  return <button onClick={onClick} className={cls}>{children}</button>
}

function Cta({ onClick, icon: Icon, label, variant = 'primary' }) {
  const tone = variant === 'warn'
    ? 'border-warn text-[#9A6500] hover:bg-warn-light'
    : 'border-primary text-primary hover:bg-primary-light'
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] bg-white text-[12px] font-bold text-left ${tone}`}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span className="leading-snug">{label}</span>
    </button>
  )
}
