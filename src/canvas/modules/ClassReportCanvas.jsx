import React, { useMemo, useState } from 'react'
import { BarChart3, Calendar, TrendingUp, Download } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { STUDENTS } from '../../data/mockData'

// Class Report canvas — opens when the teacher taps the "AVG SCORE" home
// stat tile. Shows per-student attendance for this month + cumulative for
// the year, plus average marks across Math / Science / Gujarati. Two view
// modes: Attendance and Marks.

function avgScore(s) {
  return Math.round(((s.math || 0) + (s.sci || 0) + (s.guj || 0)) / 3)
}

// Synthesize a "yearly" attendance number from the monthly value so the demo
// shows two distinct columns. Yearly is anchored 2 pp higher than monthly,
// clamped to 50–98 so the spread looks realistic.
function yearlyFromMonth(month) {
  const y = month + 2
  return Math.max(50, Math.min(98, y))
}

function attendanceTone(att) {
  if (att < 65) return { color: '#C62828', label: 'Critical' }
  if (att < 75) return { color: '#9A6500', label: 'Warning' }
  if (att < 85) return { color: '#345CCC', label: 'OK' }
  return { color: '#2E7D32', label: 'Good' }
}

function scoreTone(score) {
  if (score < 50) return { color: '#C62828' }
  if (score < 70) return { color: '#9A6500' }
  if (score < 85) return { color: '#345CCC' }
  return { color: '#2E7D32' }
}

const VIEW_TABS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'marks',      label: 'Marks' },
]

export default function ClassReportCanvas({ context }) {
  const { closeCanvas, openCanvas, showToast } = useApp()
  const grade = context?.grade || context?.classId || 8
  const klassLabel = context?.classLabel || `Class ${grade}`

  const all = useMemo(() => STUDENTS[grade] || STUDENTS[8] || [], [grade])

  const [view, setView] = useState('attendance')

  // ── Aggregates ─────────────────────────────────────────────────────────
  const aggregates = useMemo(() => {
    if (!all.length) return null
    const month = Math.round(all.reduce((a, s) => a + (s.attendance || 0), 0) / all.length)
    const year  = Math.round(all.reduce((a, s) => a + yearlyFromMonth(s.attendance || 0), 0) / all.length)
    const present = Math.round((month / 100) * all.length)
    const absent  = all.length - present
    const subjects = ['math', 'sci', 'guj']
    const subjectAvg = Object.fromEntries(subjects.map(k => [k, Math.round(all.reduce((a, s) => a + (s[k] || 0), 0) / all.length)]))
    const overallAvg = Math.round(all.reduce((a, s) => a + avgScore(s), 0) / all.length)
    return { month, year, present, absent, subjectAvg, overallAvg }
  }, [all])

  const handleOpenAttendance = () => openCanvas({ type: 'attendance', classId: `${grade}-A` })
  const handleOpenDashboard  = () => openCanvas({ type: 'dashboard', scope: 'class', grade })
  const handleDownload       = () => showToast?.('Report downloaded (mock).', 'ok')

  if (!aggregates) {
    return (
      <div className="px-6 py-12 text-center text-[12px] text-txt-tertiary">No class data available.</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bdr-light bg-white flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
            <BarChart3 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold text-txt-primary">{klassLabel} · Class Report</div>
            <div className="text-[12px] text-txt-secondary">Attendance + marks across {all.length} students</div>
          </div>
          <button
            onClick={handleDownload}
            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-bdr text-[11px] font-bold text-txt-secondary hover:border-primary hover:text-primary"
          ><Download size={12} /> Export</button>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <SummaryChip value={`${aggregates.month}%`} label="Att. (Month)" color="#16A34A" />
          <SummaryChip value={`${aggregates.year}%`}  label="Att. (Year)"  color="#7C3AED" />
          <SummaryChip value={`${aggregates.overallAvg}%`} label="Avg Score" color="#386AF6" />
          <SummaryChip value={`${aggregates.present}/${all.length}`} label="Present" color="#2E7D32" />
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 mt-3">
          {VIEW_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                view === t.id ? 'bg-primary text-white' : 'bg-surface-secondary text-txt-secondary'
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary px-3 py-3">
        {view === 'attendance' && (
          <AttendanceTable students={all} />
        )}
        {view === 'marks' && (
          <MarksTable students={all} subjectAvg={aggregates.subjectAvg} />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-bdr-light bg-white flex gap-2 flex-shrink-0">
        <button
          onClick={handleOpenAttendance}
          className="flex-1 h-10 rounded-2xl border-[1.5px] border-primary text-primary text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5"
        ><Calendar size={13} /> Mark attendance</button>
        <button
          onClick={handleOpenDashboard}
          className="flex-1 h-10 rounded-2xl bg-primary text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5"
        ><TrendingUp size={13} /> Class dashboard</button>
      </div>
    </div>
  )
}

function AttendanceTable({ students }) {
  return (
    <div className="rounded-2xl border border-bdr bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-[12.5px] text-left">
          <thead className="bg-surface-secondary">
            <tr>
              {['Student','Roll','This Month','This Year','Last 7 days','Status'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold tracking-[0.4px] uppercase text-txt-secondary border-b border-bdr-light whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const month = s.attendance
              const year = yearlyFromMonth(month)
              const tone = attendanceTone(month)
              const last7 = Math.max(0, Math.min(7, Math.round(month / 14.3)))
              return (
                <tr key={s.id} className={i < students.length - 1 ? 'border-b border-bdr-light' : ''}>
                  <td className="px-3 py-2 font-bold text-txt-primary whitespace-nowrap">{s.name}</td>
                  <td className="px-3 py-2 text-txt-secondary whitespace-nowrap">{s.id}</td>
                  <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: tone.color }}>{month}%</td>
                  <td className="px-3 py-2 font-medium text-txt-primary whitespace-nowrap">{year}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-txt-secondary">{last7}/7</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F4F5F7', color: tone.color }}>{tone.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MarksTable({ students, subjectAvg }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <SubjectAvg label="Mathematics" value={subjectAvg.math} />
        <SubjectAvg label="Science"     value={subjectAvg.sci} />
        <SubjectAvg label="Gujarati"    value={subjectAvg.guj} />
      </div>
      <div className="rounded-2xl border border-bdr bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-[12.5px] text-left">
            <thead className="bg-surface-secondary">
              <tr>
                {['Student','Roll','Math','Science','Gujarati','Avg','Level'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-semibold tracking-[0.4px] uppercase text-txt-secondary border-b border-bdr-light whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const a = avgScore(s)
                const tone = scoreTone(a)
                return (
                  <tr key={s.id} className={i < students.length - 1 ? 'border-b border-bdr-light' : ''}>
                    <td className="px-3 py-2 font-bold text-txt-primary whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2 text-txt-secondary whitespace-nowrap">{s.id}</td>
                    <td className="px-3 py-2 text-txt-primary font-medium whitespace-nowrap" style={{ color: scoreTone(s.math).color }}>{s.math}%</td>
                    <td className="px-3 py-2 text-txt-primary font-medium whitespace-nowrap" style={{ color: scoreTone(s.sci).color }}>{s.sci}%</td>
                    <td className="px-3 py-2 text-txt-primary font-medium whitespace-nowrap" style={{ color: scoreTone(s.guj).color }}>{s.guj}%</td>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: tone.color }}>{a}%</td>
                    <td className="px-3 py-2 whitespace-nowrap text-txt-secondary">{s.level}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
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

function SubjectAvg({ label, value }) {
  const tone = scoreTone(value)
  return (
    <div className="bg-white border border-bdr rounded-xl px-3 py-2 text-center">
      <div className="text-[10px] text-txt-tertiary uppercase tracking-[0.4px] mb-0.5">{label}</div>
      <div className="text-[16px] font-bold" style={{ color: tone.color }}>{value}%</div>
    </div>
  )
}
