import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import {
  DISTRICTS, SCHOOLS, AGGREGATES, titleCase,
  schoolsInDistrict, schoolsInBlock, schoolsInCluster,
} from '../../data/registries'
import {
  STUDENTS, SCHOOL_INFO,
  get30DayClassAttendance, get30DayStudentSummaries, get30DaySchoolAttendance,
} from '../../data/mockData'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'
import {
  openStudentAttendanceReport, openTeacherAttendanceReport,
  openScopeAttendanceReport, downloadStudentAttendanceCsv,
} from '../shared/attendanceReport'
import { get7DayStudentSummaries } from '../../data/mockData'

const FONT = 'Montserrat, sans-serif'

// ─── Helpers ────────────────────────────────────────────────────────────────
function tone(pct) {
  if (pct >= 80) return { bg: '#D1FAE5', fg: '#065F46', dot: '#10B981' }
  if (pct >= 60) return { bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' }
  return { bg: '#FEE2E2', fg: '#B91C1C', dot: '#EF4444' }
}

function compactNum(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return Number(n).toLocaleString()
}

function attendanceFor(d) {
  const seed = Number(d.districtId) || 0
  const schoolsSubmittedPct = 0.5 + ((seed * 7) % 35)
  const teachersSubmittedPct = 0.3 + ((seed * 5) % 30)
  const teachersPresentPct = 25 + ((seed * 13) % 60)
  const studentsSubmittedPct = 0.05 + ((seed * 3) % 12) / 10
  const studentsPresentPct  = 95 + ((seed * 17) % 5)
  return { schoolsSubmittedPct, teachersSubmittedPct, teachersPresentPct, studentsSubmittedPct, studentsPresentPct }
}

// ─── Atoms ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, statusPct }) {
  const t = statusPct != null ? tone(statusPct) : null
  return (
    <div style={{ flex: 1, minWidth: 0, border: `1.5px solid ${accent}`, borderRadius: 12, padding: '12px 14px', background: '#FFFFFF' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, color: '#0E0E0E', fontWeight: 700, marginTop: 4, fontFamily: FONT, lineHeight: '24px' }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: '#7383A5', marginTop: 4, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{sub}</span>
          {t && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              background: t.bg, color: t.fg,
            }}>
              {statusPct.toFixed(statusPct < 1 ? 2 : 1)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function HBarList({ rows, accent = '#386AF6', maxBars }) {
  const max = maxBars ?? Math.max(...rows.map(r => r.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 140, fontSize: 11, fontWeight: 600, color: '#0E0E0E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT }}>
            {r.label}
          </div>
          <div style={{ flex: 1, height: 18, background: '#F1F5F9', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: accent, borderRadius: 4 }} />
          </div>
          <div style={{ width: 56, textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#0E0E0E', fontFamily: FONT }}>
            {r.display ?? `${r.value.toFixed(r.value < 10 ? 2 : 1)}%`}
          </div>
        </div>
      ))}
    </div>
  )
}

// TrendChart + Bubble removed — both come from ../shared/kpiCanvasShared.jsx
// (InteractiveTrendChart adds date hover, ChatPanel handles bubbles).

// ─── Data builders ─────────────────────────────────────────────────────────
// Pulled out of the scope-view components so the canvas's chat handler can
// pass the same numbers to OpenAI that the user sees on screen. The view and
// the chat are always looking at the same truth.

export function buildClassData(profile) {
  const grade = profile?.classes?.[0] || 6
  const students = STUDENTS[grade] || []
  const total = students.length
  const presentToday = students.filter((s, i) => (((s.attendance ?? 70) + i) * 11) % 100 > 18).length
  const absentToday = total - presentToday
  const todayPct = total ? (presentToday / total) * 100 : 0
  // Synthesised 7-day trend (oldest → newest = today).
  const trend = [todayPct - 6, todayPct - 3, todayPct + 1, todayPct - 2, todayPct + 4, todayPct + 1, todayPct]
    .map(v => Math.max(40, Math.min(100, +v.toFixed(1))))
  const absentList = [...students]
    .sort((a, b) => (a.attendance || 0) - (b.attendance || 0))
    .slice(0, Math.min(absentToday, 8))
    .map(s => ({ id: s.id, name: s.name, attendance: s.attendance, risk: s.risk }))
  const classAvgPct = total ? Math.round(students.reduce((a, s) => a + (s.attendance || 0), 0) / total) : 0
  return { grade, total, presentToday, absentToday, todayPct, trend, absentList, classAvgPct, school: profile?.school || 'Sardar Patel Prathmik Shala' }
}

// 30-day builder for the class scope. Returns the same shape as
// buildClassData() PLUS a 30-day trend, a per-student summary table, and
// chronic counts. Used by the "Last 30 days" tab.
export function build30DayClassData(profile) {
  const grade = profile?.classes?.[0] || 6
  const daily = get30DayClassAttendance(grade)
  const studentSummaries = get30DayStudentSummaries(grade)
  const totalStudents = studentSummaries.length
  // Avg present per working day across 30 days.
  const workingDays = daily.filter(d => !d.isHoliday).length
  const totalPresentEvents = daily.reduce((a, d) => a + d.presentCount, 0)
  const totalAbsentEvents  = daily.reduce((a, d) => a + d.absentCount, 0)
  const monthlyAvgPct = totalPresentEvents + totalAbsentEvents
    ? +((totalPresentEvents / (totalPresentEvents + totalAbsentEvents)) * 100).toFixed(1)
    : 0
  // Trend values (one per calendar day; null on holidays).
  const trendValues = daily.map(d => d.pct).filter(v => v != null)
  const chronicAbsentees = studentSummaries.filter(s => s.absentDays > 7).sort((a, b) => b.absentDays - a.absentDays)
  return {
    grade,
    school: profile?.school || 'Sardar Patel Prathmik Shala',
    totalStudents,
    workingDays,
    monthlyAvgPct,
    totalPresentEvents,
    totalAbsentEvents,
    daily,                 // [{ date, dow, isHoliday, presentCount, absentCount, totalWorking, pct }]
    trendValues,           // working-days only — feeds the 30-day chart
    studentSummaries,      // per-student 30-day roll-up
    chronicAbsentees,      // students absent >7 days in last 30
  }
}

// 30-day builder for the school scope — sums across all classes.
export function build30DaySchoolData(profile) {
  const daily = get30DaySchoolAttendance()
  const grades = Object.keys(STUDENTS).map(Number).sort((a, b) => a - b)
  const perClass = grades.map(g => {
    const cls = build30DayClassData({ classes: [g], school: profile?.school })
    return {
      grade: g,
      totalStudents: cls.totalStudents,
      avgPct: cls.monthlyAvgPct,
      chronic: cls.chronicAbsentees.length,
    }
  })
  const totalStudents = perClass.reduce((a, c) => a + c.totalStudents, 0)
  const workingDays = daily.filter(d => !d.isHoliday).length
  const totalPresent = daily.reduce((a, d) => a + d.presentCount, 0)
  const totalAbsent  = daily.reduce((a, d) => a + d.absentCount, 0)
  const monthlyAvgPct = totalPresent + totalAbsent
    ? +((totalPresent / (totalPresent + totalAbsent)) * 100).toFixed(1)
    : 0
  const trendValues = daily.map(d => d.pct).filter(v => v != null)
  const ranked = [...perClass].sort((a, b) => b.avgPct - a.avgPct)
  return {
    school: profile?.school || 'Sardar Patel Prathmik Shala',
    totalStudents, workingDays, monthlyAvgPct,
    totalPresent, totalAbsent,
    daily, trendValues,
    perClass,
    topClasses:  ranked.slice(0, 3).map(c => ({ label: `Class ${c.grade}`, value: c.avgPct })),
    botClasses:  ranked.slice(-3).reverse().map(c => ({ label: `Class ${c.grade}`, value: c.avgPct })),
    chronicTotal: perClass.reduce((a, c) => a + c.chronic, 0),
  }
}

export function buildSchoolData(profile) {
  const allGrades = Object.keys(STUDENTS).map(Number).sort((a, b) => a - b)
  const classes = allGrades.map(g => {
    const list = STUDENTS[g] || []
    const present = list.filter((s, i) => ((s.attendance ?? 70) + i) * 11 % 100 > 18).length
    const pct = list.length ? (present / list.length) * 100 : 0
    return { grade: g, total: list.length, present, absent: list.length - present, pct: +pct.toFixed(1) }
  })
  const totalStudents = classes.reduce((a, c) => a + c.total, 0)
  const totalPresent  = classes.reduce((a, c) => a + c.present, 0)
  const schoolPct     = totalStudents ? +((totalPresent / totalStudents) * 100).toFixed(1) : 0
  const submitted     = classes.filter(c => c.pct > 0).length
  const trend = [schoolPct - 5, schoolPct - 2, schoolPct + 1, schoolPct - 1, schoolPct + 3, schoolPct + 1, schoolPct]
    .map(v => Math.max(40, Math.min(100, +v.toFixed(1))))
  const ranked = [...classes].sort((a, b) => b.pct - a.pct)
  const top3 = ranked.slice(0, 3).map(c => ({ label: `Class ${c.grade}`, value: c.pct }))
  const bot3 = ranked.slice(-3).reverse().map(c => ({ label: `Class ${c.grade}`, value: c.pct }))
  return { classes, totalStudents, totalPresent, schoolPct, submitted, trend, top3, bot3, school: profile?.school || 'Sardar Patel Prathmik Shala' }
}

// ─── Per-scope content builders ─────────────────────────────────────────────

// Class scope (teacher / parent): just THIS class.
// ─── Range toggle ──────────────────────────────────────────────────────────
// Today vs Last-30-days tabs. Rendered at the TOP of every scope view so the
// same toggle works whether you're on class, school, block, district or state.
function RangeTabs({ range, setRange, onDownload }) {
  const tabs = [
    { id: 'today', label: 'Today' },
    { id: '30d',   label: 'Last 30 days' },
  ]
  return (
    <div className="flex items-center justify-between mt-2 mb-1">
      <div className="inline-flex" style={{ borderRadius: 999, background: '#F1F5F9', padding: 3, gap: 2 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setRange(t.id)}
            className="active:scale-95 transition-all"
            style={{
              fontSize: 11.5, fontWeight: 700,
              padding: '5px 14px', borderRadius: 999,
              background: range === t.id ? '#FFFFFF' : 'transparent',
              color:      range === t.id ? '#0E0E0E' : '#7383A5',
              boxShadow:  range === t.id ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              border: 'none', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {onDownload && range === '30d' && (
        <button
          onClick={onDownload}
          className="active:scale-95 transition-all"
          style={{
            fontSize: 11.5, fontWeight: 700,
            padding: '5px 12px', borderRadius: 999,
            background: '#386AF6', color: '#FFFFFF',
            border: 'none', cursor: 'pointer', fontFamily: FONT,
          }}
        >
          ⬇ Download report
        </button>
      )}
    </div>
  )
}

// ─── 30-day class view ─────────────────────────────────────────────────────
// Shown when the user toggles the tab to "Last 30 days". Top stats are
// month-level; trend has 30 working-day points; the absentee table is
// replaced by a per-student summary sorted by absent days descending.
function ClassScopeView30d({ profile, data, onAsk, onOpenStudent }) {
  const { grade, totalStudents, workingDays, monthlyAvgPct, totalAbsentEvents, trendValues, studentSummaries, chronicAbsentees } = data
  const sorted = [...studentSummaries].sort((a, b) => b.absentDays - a.absentDays)
  const t = tone(monthlyAvgPct)
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Class size"             value={totalStudents}                                              accent="#3B82F6" />
        <StatCard label="Avg attendance (30d)"   value={`${monthlyAvgPct}%`}        sub={`across ${workingDays} working days`} accent="#10B981" statusPct={monthlyAvgPct} />
        <StatCard label="Total absences (30d)"   value={totalAbsentEvents}                                          accent="#EF4444" />
        <StatCard label="Chronic absentees"      value={chronicAbsentees.length}     sub="absent > 7 days"          accent="#7C3AED" />
      </div>

      <ChartCard
        title="30-day attendance trend"
        askPrompt="Walk me through the 30-day trend — which weeks were the worst, why?"
        onAsk={onAsk}
      >
        <InteractiveTrendChart values={trendValues} unit="%" status={monthlyAvgPct >= 80 ? 'green' : monthlyAvgPct >= 60 ? 'yellow' : 'red'} />
      </ChartCard>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Per-student 30-day summary · {sorted.length} students
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
              <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SSMID</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Att %</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => {
              const cellTone = s.pct >= 85 ? { bg: '#D1FAE5', fg: '#065F46' } : s.pct >= 60 ? { bg: '#FEF3C7', fg: '#92400E' } : { bg: '#FEE2E2', fg: '#B91C1C' }
              return (
                <tr key={s.id} style={{ borderTop: '1px solid #F1F5F9', cursor: onOpenStudent ? 'pointer' : 'default' }} onClick={() => onOpenStudent?.(s)}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>
                    {s.name}{s.ewsFlag && <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C' }}>EWS</span>}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#7383A5', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{s.id}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{s.presentDays}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: s.absentDays > 7 ? '#B91C1C' : '#0E0E0E', fontWeight: s.absentDays > 7 ? 700 : 500 }}>{s.absentDays}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cellTone.bg, color: cellTone.fg }}>
                      {s.pct}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {onOpenStudent && (
                      <button onClick={e => { e.stopPropagation(); onOpenStudent(s) }}
                        style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', cursor: 'pointer', fontFamily: FONT }}>
                        Open profile ›
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// "Today" body for the class scope. Header (title + school) is now rendered
// by the parent so the Today/30-day toggle sits BELOW the title.
function ClassScopeViewBody({ profile, data, onAsk, onOpenStudent }) {
  const { grade, total, presentToday, absentToday, todayPct, trend, absentList, classAvgPct } = data

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Class size"         value={total}                                  accent="#3B82F6" />
        <StatCard label="Present today"      value={presentToday}      sub={`of ${total}`}  accent="#10B981" statusPct={todayPct} />
        <StatCard label="Absent today"       value={absentToday}                            accent="#EF4444" />
        <StatCard label="Class avg (term)"   value={`${classAvgPct}%`} accent="#7C3AED" />
      </div>

      <ChartCard
        title="7-day trend"
        askPrompt="Why did the trend dip / climb on those days? Show me the day-by-day numbers."
        onAsk={onAsk}
      >
        <InteractiveTrendChart
          values={trend}
          unit="%"
          status={todayPct >= 80 ? 'green' : todayPct >= 60 ? 'yellow' : 'red'}
        />
      </ChartCard>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Today's absentees · {absentList.length}
          </div>
        </div>
        {absentList.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#7383A5', fontSize: 13 }}>Everyone present — great work.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#FAFBFC' }}>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SSMID</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Term att.</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {absentList.map(s => (
                <tr
                  key={s.id}
                  style={{ borderTop: '1px solid #F1F5F9', cursor: onOpenStudent ? 'pointer' : 'default' }}
                  onClick={() => onOpenStudent?.(s)}
                  title={onOpenStudent ? 'Click to open student profile' : ''}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>{s.name}</td>
                  <td style={{ padding: '8px 12px', color: '#7383A5', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{s.id}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{s.attendance}%</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: s.risk === 'high' ? '#FEE2E2' : s.risk === 'medium' ? '#FEF3C7' : '#D1FAE5',
                      color:      s.risk === 'high' ? '#B91C1C' : s.risk === 'medium' ? '#92400E' : '#065F46',
                    }}>
                      {s.risk?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {onOpenStudent && (
                      <button
                        onClick={e => { e.stopPropagation(); onOpenStudent(s) }}
                        className="active:scale-95 transition-all"
                        style={{
                          fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                          background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE',
                          cursor: 'pointer', fontFamily: FONT,
                        }}
                      >
                        Open profile ›
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// School scope (principal): class-by-class within ONE school.
// 30-day school view — monthly KPIs + per-class table + trend.
function SchoolScopeView30d({ data, onAsk }) {
  const { totalStudents, workingDays, monthlyAvgPct, totalAbsent, trendValues, perClass, topClasses, botClasses, chronicTotal } = data
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Total students"        value={totalStudents}                                  accent="#3B82F6" />
        <StatCard label="Avg attendance (30d)"  value={`${monthlyAvgPct}%`} sub={`across ${workingDays} working days`} accent="#10B981" statusPct={monthlyAvgPct} />
        <StatCard label="Total absences (30d)"  value={totalAbsent.toLocaleString()}                   accent="#EF4444" />
        <StatCard label="Chronic absentees"     value={chronicTotal} sub="absent > 7 days"             accent="#7C3AED" />
      </div>

      <ChartCard
        title="30-day school trend"
        askPrompt="What were the worst weeks for the school in the last 30 days?"
        onAsk={onAsk}
      >
        <InteractiveTrendChart values={trendValues} unit="%" status={monthlyAvgPct >= 80 ? 'green' : monthlyAvgPct >= 60 ? 'yellow' : 'red'} />
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard title="Top 3 classes (30d)"    askPrompt="What is the top class doing right?"            onAsk={onAsk} style={{ marginTop: 16 }}>
          <HBarList rows={topClasses} accent="#10B981" maxBars={100} />
        </ChartCard>
        <ChartCard title="Bottom 3 classes (30d)" askPrompt="What's dragging the bottom class down?"        onAsk={onAsk} style={{ marginTop: 16 }}>
          <HBarList rows={botClasses} accent="#EF4444" maxBars={100} />
        </ChartCard>
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Class-by-class · 30-day summary
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Students</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg attendance</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chronic</th>
            </tr>
          </thead>
          <tbody>
            {perClass.map(c => {
              const t = tone(c.avgPct)
              return (
                <tr key={c.grade} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>Class {c.grade}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{c.totalStudents}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: t.bg, color: t.fg }}>
                      {c.avgPct}%
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: c.chronic > 0 ? '#B91C1C' : '#7383A5', fontWeight: c.chronic > 0 ? 700 : 500 }}>{c.chronic}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// "Today" body for the school scope. Parent renders the title.
function SchoolScopeView({ profile, data, onAsk }) {
  const { classes, totalStudents, totalPresent, schoolPct, submitted, trend, top3, bot3 } = data

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Total students"   value={totalStudents} accent="#3B82F6" />
        <StatCard label="Present today"    value={totalPresent}  sub={`of ${totalStudents}`} accent="#10B981" statusPct={schoolPct} />
        <StatCard label="Classes submitted" value={`${submitted} / ${classes.length}`} accent="#F59E0B" />
        <StatCard label="Teachers"         value={SCHOOL_INFO?.totalTeachers || 18} accent="#7C3AED" />
      </div>

      <ChartCard
        title="7-day school trend"
        askPrompt="Walk me through the week — which days improved or dropped, and why?"
        onAsk={onAsk}
      >
        <InteractiveTrendChart
          values={trend}
          unit="%"
          status={schoolPct >= 80 ? 'green' : schoolPct >= 60 ? 'yellow' : 'red'}
        />
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard
          title="Top 3 classes"
          askPrompt="What is the top class doing differently?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={top3} accent="#10B981" maxBars={100} />
        </ChartCard>
        <ChartCard
          title="Bottom 3 classes"
          askPrompt="Why is the bottom class lagging? What can the teacher do this week?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={bot3} accent="#EF4444" maxBars={100} />
        </ChartCard>
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Class-by-class breakdown
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(c => {
              const t = tone(c.pct)
              return (
                <tr key={c.grade} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>Class {c.grade}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{c.total}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{c.present}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{c.absent}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: t.bg, color: t.fg,
                    }}>
                      {c.pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Block / Cluster / District scope: schools inside the scope.
function ScopedSchoolsView({ scope, scopeLabel, scopedSchools, totals, topRows, botRows, onAsk }) {
  const scopeTitle =
    scope === 'block'    ? 'Block level' :
    scope === 'cluster'  ? 'Cluster level' :
    'District level'

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Attendance · {scopeTitle}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
        {scopeLabel} — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Schools" value={totals.schools.toLocaleString()} accent="#F59E0B" />
        <StatCard label="Submitted today" value={totals.submitted.toLocaleString()} sub={`of ${totals.schools.toLocaleString()}`} accent="#3B82F6" statusPct={totals.submittedPct} />
        <StatCard label="Teachers" value={compactNum(totals.teachers)} accent="#3B82F6" />
        <StatCard label="Students" value={compactNum(totals.students)} accent="#7C3AED" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard
          title="Top 5 schools"
          askPrompt="What is the top school doing right? Can we replicate it?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={topRows} accent="#10B981" maxBars={100} />
        </ChartCard>
        <ChartCard
          title="Bottom 5 schools"
          askPrompt="Why are these schools at the bottom? Who needs immediate intervention?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={botRows} accent="#EF4444" maxBars={100} />
        </ChartCard>
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Schools — {scopedSchools.length} shown
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: '#FAFBFC' }}>
              <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>School name</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present %</th>
            </tr>
          </thead>
          <tbody>
            {scopedSchools.slice(0, 18).map(s => (
              <tr key={s.schoolid} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E', whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.school}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{s.submitted ? '✓' : '—'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{s.presentPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// State scope: districts.
function StateScopeView({ districtRows, top5, bottom5, totals, byMgmt, onAsk }) {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Attendance · State level
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
        Gujarat — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="School submitted (Teacher)" value={`${compactNum(totals.submittedSch)} / ${compactNum(totals.totalSchools)}`}    accent="#F59E0B" statusPct={totals.totalSchools ? (totals.submittedSch / totals.totalSchools) * 100 : 0} />
        <StatCard label="Teacher submitted"          value={`${compactNum(totals.submittedTch)} / ${compactNum(totals.totalTeachers)}`}   accent="#3B82F6" statusPct={totals.totalTeachers ? (totals.submittedTch / totals.totalTeachers) * 100 : 0} />
        <StatCard label="Teacher present"            value={`${compactNum(totals.presentTch)} / ${compactNum(totals.submittedTch)}`}      accent="#3B82F6" statusPct={totals.submittedTch ? (totals.presentTch / totals.submittedTch) * 100 : 0} />
        <StatCard label="Student submitted"          value={`${compactNum(totals.submittedStu)} / ${compactNum(totals.totalStudents)}`}    accent="#F59E0B" statusPct={totals.totalStudents ? (totals.submittedStu / totals.totalStudents) * 100 : 0} />
        <StatCard label="Student present"            value={`${compactNum(totals.presentStu)} / ${compactNum(totals.submittedStu)}`}       accent="#F59E0B" statusPct={totals.submittedStu ? (totals.presentStu / totals.submittedStu) * 100 : 0} />
        <StatCard label="Districts"                  value={districtRows.length} accent="#7C3AED" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ChartCard
          title="Top 5 districts"
          askPrompt="Why are these districts leading? What playbook are they using?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={top5} accent="#F59E0B" maxBars={Math.max(...top5.map(r => r.value), ...bottom5.map(r => r.value), 1)} />
        </ChartCard>
        <ChartCard
          title="Bottom 5 districts"
          askPrompt="Why are these districts at the bottom? Which one should we escalate first?"
          onAsk={onAsk}
          style={{ marginTop: 16 }}
        >
          <HBarList rows={bottom5} accent="#FBBF24" maxBars={Math.max(...top5.map(r => r.value), ...bottom5.map(r => r.value), 1)} />
        </ChartCard>
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
          Districts by submission %
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {districtRows.map(d => {
            const t = tone(d.schoolsSubmittedPct)
            return (
              <div key={d.districtId} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: t.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: '#0E0E0E', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─── Main canvas ────────────────────────────────────────────────────────────
export default function AttendanceDashboardCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}

  const scope =
    context?.scope ||
    (role === 'state_secretary' ? 'state' :
     role === 'deo'              ? 'district' :
     role === 'beo'              ? 'block' :
     role === 'crc'              ? 'cluster' :
     role === 'principal'        ? 'school' :
     role === 'teacher'          ? 'class' :
     role === 'parent'           ? 'class' :
     role === 'pfms'             ? 'state' : 'state')

  const scopeLabel = useMemo(() => {
    if (scope === 'state') return 'Gujarat'
    if (scope === 'district') return titleCase(context?.district || profile?.district || 'Ahmedabad')
    if (scope === 'block')    return titleCase(context?.block    || profile?.block    || 'Mehsana')
    if (scope === 'cluster')  return titleCase(context?.cluster  || profile?.cluster  || 'MADHAPAR')
    if (scope === 'school')   return profile?.school || 'Sardar Patel Prathmik Shala'
    if (scope === 'class')    return `Class ${profile?.classes?.[0] || 6}`
    return 'Gujarat'
  }, [scope, context, profile])

  // Precompute state-scope data (used only for state scope)
  const districtRows = useMemo(() => DISTRICTS.map(d => {
    const a = attendanceFor(d)
    return {
      districtId: d.districtId,
      name: titleCase(d.name),
      schools: d.schools,
      teachers: d.teachers,
      students: d.students,
      schoolsSubmitted: Math.round((d.schools * a.schoolsSubmittedPct) / 100),
      teachersSubmitted: Math.round((d.teachers * a.teachersSubmittedPct) / 100),
      teachersPresent: Math.round((d.teachers * a.teachersSubmittedPct * a.teachersPresentPct) / 10000),
      studentsSubmitted: Math.round((d.students * a.studentsSubmittedPct) / 100),
      studentsPresent: Math.round((d.students * a.studentsSubmittedPct * a.studentsPresentPct) / 10000),
      schoolsSubmittedPct: a.schoolsSubmittedPct,
    }
  }), [])

  // Scope-specific totals + ranked lists
  const stateData = useMemo(() => {
    const totals = {
      totalSchools:  districtRows.reduce((s, d) => s + d.schools, 0),
      submittedSch:  districtRows.reduce((s, d) => s + d.schoolsSubmitted, 0),
      totalTeachers: districtRows.reduce((s, d) => s + d.teachers, 0),
      submittedTch:  districtRows.reduce((s, d) => s + d.teachersSubmitted, 0),
      presentTch:    districtRows.reduce((s, d) => s + d.teachersPresent, 0),
      totalStudents: districtRows.reduce((s, d) => s + d.students, 0),
      submittedStu:  districtRows.reduce((s, d) => s + d.studentsSubmitted, 0),
      presentStu:    districtRows.reduce((s, d) => s + d.studentsPresent, 0),
    }
    const top5 = [...districtRows].sort((a, b) => b.schoolsSubmittedPct - a.schoolsSubmittedPct).slice(0, 5).map(d => ({ label: d.name, value: d.schoolsSubmittedPct }))
    const bot5 = [...districtRows].sort((a, b) => a.schoolsSubmittedPct - b.schoolsSubmittedPct).slice(0, 5).map(d => ({ label: d.name, value: d.schoolsSubmittedPct }))
    return { totals, top5, bot5 }
  }, [districtRows])

  // For block / cluster / district scopes — schools in scope, ranked
  const scopedSchoolsData = useMemo(() => {
    if (!['block', 'cluster', 'district'].includes(scope)) return null
    let pool = []
    if (scope === 'district') pool = schoolsInDistrict(context?.district || profile?.district || '')
    if (scope === 'block')    pool = schoolsInBlock(context?.block       || profile?.block    || '')
    if (scope === 'cluster')  pool = schoolsInCluster(context?.cluster   || profile?.cluster  || '')
    // Synthesise per-school submission/present %
    const rows = pool.map((s, i) => {
      const seed = Number(s.schoolid) || i
      const submitted = ((seed * 7) % 100) > 30
      const presentPct = 30 + ((seed * 13) % 60)
      return { ...s, submitted, presentPct }
    })
    const teachers = rows.reduce((a, r) => a + (r.teachers || 0), 0)
    const students = rows.reduce((a, r) => a + (r.students || 0), 0)
    const submitted = rows.filter(r => r.submitted).length
    const totals = {
      schools: rows.length, teachers, students, submitted,
      submittedPct: rows.length ? (submitted / rows.length) * 100 : 0,
    }
    const top = [...rows].sort((a, b) => b.presentPct - a.presentPct).slice(0, 5).map(r => ({ label: r.school?.slice(0, 24) || '—', value: r.presentPct }))
    const bot = [...rows].sort((a, b) => a.presentPct - b.presentPct).slice(0, 5).map(r => ({ label: r.school?.slice(0, 24) || '—', value: r.presentPct }))
    return { rows, totals, top, bot }
  }, [scope, context?.district, context?.block, context?.cluster, profile?.district, profile?.block, profile?.cluster])

  // Chat — shared resizable panel + drag handle (same UX as KpiInsightCanvas).
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 260)

  // Today vs Last-30-days. The toggle pill is in every scope view.
  const [range, setRange] = useState('today')

  // Scope-aware data builders. Computed once at the parent so the rendered
  // view and the chat handler always quote the same numbers.
  const classData     = useMemo(() => buildClassData(profile),     [profile])
  const schoolData    = useMemo(() => buildSchoolData(profile),    [profile])
  const classData30   = useMemo(() => build30DayClassData(profile),  [profile])
  const schoolData30  = useMemo(() => build30DaySchoolData(profile), [profile])

  // What the chat sends to /api/chat/canvas as the data block. The model
  // sees exactly what the user sees on screen — including the range tab.
  const chatData = useMemo(() => {
    if (scope === 'class') {
      return range === '30d'
        ? { scope: 'class', range: '30d', ...classData30 }
        : { scope: 'class', range: 'today', ...classData }
    }
    if (scope === 'school') {
      return range === '30d'
        ? { scope: 'school', range: '30d', ...schoolData30 }
        : { scope: 'school', range: 'today', ...schoolData }
    }
    if (['block', 'cluster', 'district'].includes(scope) && scopedSchoolsData) {
      return { scope, range, scopeLabel, ...scopedSchoolsData }
    }
    if (scope === 'state')   return { scope: 'state', range, ...stateData }
    return { scope, range, scopeLabel }
  }, [scope, range, scopeLabel, classData, schoolData, classData30, schoolData30, scopedSchoolsData, stateData])

  // Scope-specific chips. The "Download …" chip is intercepted by send()
  // and triggers downloadCurrentReport() instead of an API call.
  const baseClassChips = range === 'today'
    ? ['Who is absent today?', 'Compare with last week', 'Mark attendance now', 'Suggest parent calls', 'Class trend by month']
    : ['Show me the chronic absentees', 'Which weeks were worst in the last 30 days?', 'Compare boys vs girls attendance', 'Who improved the most this month?']
  const baseSchoolChips = range === 'today'
    ? ['Which class has lowest attendance?', 'Submission gaps by class', 'Teacher attendance today', 'Compare with last week', 'Send a reminder to class teachers']
    : ['Which class has lowest 30-day attendance?', 'Most chronic absentees', 'Compare classes by month', 'Schools-day trend']
  const baseScopedChips = range === 'today'
    ? ['Which schools haven\'t submitted?', 'Top 3 schools to nudge', 'Compare with last week', 'Schools below 50% present', 'Send broadcast to non-reporters']
    : ['Schools with lowest 30-day attendance', 'Top schools this month', 'Most chronic-absentee schools', 'Compare blocks']
  const baseStateChips = range === 'today'
    ? ['Why is overall submission so low?', 'Which districts are improving?', 'Top 3 districts to nudge today', 'Compare today vs last week', 'Show districts below 30%']
    : ['Worst-performing districts (30d)', 'Districts above target', 'Month-on-month trend', 'Bottom 5 by attendance']

  const baseChips =
    scope === 'class'  ? baseClassChips :
    scope === 'school' ? baseSchoolChips :
    ['block', 'cluster', 'district'].includes(scope) ? baseScopedChips :
    baseStateChips

  // Append download chips. Wording matches the user-facing intent so the
  // intercept in send() can detect them without false-positives.
  const downloadChips = range === '30d'
    ? ['⬇ Download attendance report for last 30 days', '⬇ Download CSV']
    : ['⬇ Download attendance report for last week']
  const CHIPS = [...baseChips, ...downloadChips]

  async function send(text) {
    const t = String(text || '').trim()
    if (!t) return
    const userMsg = { id: Date.now(), role: 'user', text: t }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')

    // Intent intercept: "download …" routes to the report util instead of
    // OpenAI. Window is detected from the message text — "last week" / "7
    // days" → 7-day PDF, "30 days" / "month" → 30-day PDF. Falls back to the
    // current toggle if neither phrase appears.
    const lower = t.toLowerCase()
    if (/^[⬇\s]*download/.test(lower) || /(download|export)\s+(attendance|report|csv)/.test(lower)) {
      const isCsv = /\bcsv\b/.test(lower)
      // Window detection
      let windowOverride = null
      if (/\b(30|thirty)\s*day|\bmonth/.test(lower)) windowOverride = '30d'
      else if (/\b(7|seven)\s*day|\b(last\s+)?week/.test(lower)) windowOverride = '7d'

      if (isCsv) {
        // CSV is only meaningful for the class scope right now.
        if (scope === 'class') {
          const summaries = (windowOverride === '7d')
            ? get7DayStudentSummaries(classData?.grade)
            : (classData30?.studentSummaries || [])
          downloadStudentAttendanceCsv({
            rows: summaries.map(s => ({
              name: s.name, ssmid: s.id, working: s.workingDays,
              present: s.presentDays, absent: s.absentDays, pct: s.pct, risk: s.risk,
            })),
            scopeLabel: `class-${classData?.grade ?? ''}`,
            dateFrom: (() => { const d = new Date(); d.setDate(d.getDate() - (windowOverride === '7d' ? 6 : 29)); return d })(),
            dateTo: new Date(),
          })
        } else {
          // No CSV path for non-class scopes — generate the PDF instead.
          downloadCurrentReport(windowOverride)
        }
      } else {
        downloadCurrentReport(windowOverride)
      }
      const windowText = windowOverride === '7d' ? 'last 7 days' : windowOverride === '30d' ? 'last 30 days' : (range === '30d' ? 'last 30 days' : 'today')
      const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        html: `<div style="font-family:Montserrat,sans-serif;font-size:12.5px;color:#0E0E0E">Opening a print-friendly ${esc(scope)}-level <b>${esc(windowText)}</b> attendance report. Use your browser's <b>Save as PDF</b> in the print dialog.</div>`,
      }])
      return
    }

    setTyping(true)
    try {
      const apiMessages = nextMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user' ? m.text : (m.markdown || ''),
      }))
      const { text: replyText, cards } = await fetchCanvasReply({
        role, profile,
        canvas: { title: 'Attendance dashboard', subtitle: scopeLabel },
        data: chatData,
        messages: apiMessages,
      })
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        markdown: replyText,
        html: mdToHtml(replyText),
        cards,
      }])
    } catch (err) {
      const safe = String(err?.message || err).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        html: `<div style="color:#B91C1C;font-size:12.5px">Couldn't reach Saathi. ${safe}</div>`,
      }])
    } finally {
      setTyping(false)
    }
  }

  // Per-chart ✨ Ask AI handler — pre-fills the chat input (don't auto-send)
  // so the user can edit before pressing return.
  function askAboutChart(prompt) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  // Open a print-friendly PDF for the CURRENT scope + range. Every scope
  // and every range produces a real PDF — never silently falls back to CSV.
  // CSV is only ever produced via the explicit "Download CSV" chip, handled
  // in send().
  //
  // `windowOverride` lets the chat intercept request a specific window
  // ('7d' or '30d') regardless of the toggle (e.g. when the user types
  // "download last week" while sitting on the Today tab).
  function downloadCurrentReport(windowOverride) {
    const today = new Date()
    const isThirty = windowOverride ? windowOverride === '30d' : range === '30d'
    const days = isThirty ? 30 : 7
    const dateFrom = new Date(today); dateFrom.setDate(today.getDate() - (days - 1))
    const windowLabel = isThirty ? '30 days' : '7 days'

    // ── Class scope ──────────────────────────────────────────────────────
    if (scope === 'class') {
      const summaries = isThirty
        ? (classData30?.studentSummaries || [])
        : get7DayStudentSummaries(classData?.grade)
      const rows = summaries.map(s => ({
        name: s.name, ssmid: s.ssmid || s.id,
        working: s.workingDays, present: s.presentDays, absent: s.absentDays,
        pct: s.pct, risk: s.risk, ews: s.ewsFlag,
      }))
      openStudentAttendanceReport({
        title: `Student Attendance Report · Last ${windowLabel}`,
        scopeLabel: `Class ${classData?.grade ?? classData30?.grade}`,
        schoolName: classData?.school || classData30?.school,
        dateFrom, dateTo: today,
        rows,
      })
      return
    }

    // ── School scope ─────────────────────────────────────────────────────
    if (scope === 'school') {
      const data = isThirty ? schoolData30 : schoolData
      const rows = (isThirty ? schoolData30?.perClass : schoolData?.classes)?.map(c => {
        const studentsInClass = c.totalStudents ?? c.total ?? 0
        const avgPct = isThirty ? c.avgPct : c.pct
        return {
          name: `Class ${c.grade}`, ssmid: '—',
          working: isThirty ? schoolData30.workingDays : 1,
          present: Math.round(studentsInClass * (isThirty ? schoolData30.workingDays : 1) * (avgPct / 100)),
          absent:  Math.round(studentsInClass * (isThirty ? schoolData30.workingDays : 1) * (1 - avgPct / 100)),
          pct: avgPct, risk: avgPct >= 85 ? 'low' : avgPct >= 60 ? 'medium' : 'high',
        }
      }) || []
      openStudentAttendanceReport({
        title: `School Attendance Report · Last ${windowLabel}`,
        scopeLabel: 'Whole school',
        schoolName: data?.school || profile?.school,
        dateFrom, dateTo: today,
        rows,
      })
      return
    }

    // ── Cluster / Block / District ── one row per school in scope ───────
    if (['cluster', 'block', 'district'].includes(scope) && scopedSchoolsData) {
      const workingDays = isThirty ? 22 : 6   // approx working days in window
      const rows = scopedSchoolsData.rows.map(s => {
        const ts = s.students || 0
        const presPct = s.presentPct ?? 0
        return {
          entity: s.school || '—',
          code:   s.schoolid || '—',
          totalStudents: ts,
          present: Math.round(ts * workingDays * (presPct / 100)),
          absent:  Math.round(ts * workingDays * (1 - presPct / 100)),
          pct:     presPct,
          submitted: s.submitted ? 1 : 0,
          total: 1,
        }
      })
      openScopeAttendanceReport({
        title: `School Attendance Report · ${scope[0].toUpperCase()}${scope.slice(1)} level · Last ${windowLabel}`,
        scopeLabel,
        scopeFilter: `${scope[0].toUpperCase()}${scope.slice(1)}`,
        entityNoun: 'School',
        dateFrom, dateTo: today,
        rows,
      })
      return
    }

    // ── State scope ── one row per district ─────────────────────────────
    if (scope === 'state' && districtRows?.length) {
      const workingDays = isThirty ? 22 : 6
      const rows = districtRows.map(d => {
        const ts = d.students || 0
        // Approx % present for the period = studentsPresent / students.
        const presPct = ts ? +((d.studentsPresent / ts) * 100).toFixed(1) : 0
        return {
          entity: d.name,
          code:   d.districtId || '—',
          totalStudents: ts,
          present: Math.round(ts * workingDays * (presPct / 100)),
          absent:  Math.round(ts * workingDays * (1 - presPct / 100)),
          pct:     presPct,
          submitted: d.schoolsSubmitted ?? 0,
          total:    d.schools ?? 0,
        }
      })
      openScopeAttendanceReport({
        title: `Student Attendance Report · State level · Last ${windowLabel}`,
        scopeLabel: 'Gujarat',
        scopeFilter: 'All districts',
        entityNoun: 'District',
        dateFrom, dateTo: today,
        rows,
      })
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {scope === 'class' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Attendance · Class level
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
              Class {classData.grade} — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 2 }}>{profile?.school || 'Sardar Patel Prathmik Shala'}</div>
            <RangeTabs range={range} setRange={setRange} onDownload={downloadCurrentReport} />
            {range === 'today' ? (
              <ClassScopeViewBody
                profile={profile} data={classData} onAsk={askAboutChart}
                onOpenStudent={s => openCanvas({
                  type: 'student-profile',
                  studentId: s.id, grade: classData.grade,
                  studentName: s.name, from: 'attendance-dashboard',
                })}
              />
            ) : (
              <ClassScopeView30d
                profile={profile} data={classData30} onAsk={askAboutChart}
                onOpenStudent={s => openCanvas({
                  type: 'student-profile',
                  studentId: s.id, grade: classData30.grade,
                  studentName: s.name, from: 'attendance-dashboard',
                })}
              />
            )}
          </>
        )}
        {scope === 'school' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Attendance · School level
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
              {profile?.school || 'Sardar Patel Prathmik Shala'} — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <RangeTabs range={range} setRange={setRange} onDownload={downloadCurrentReport} />
            {range === 'today'
              ? <SchoolScopeView profile={profile} data={schoolData} onAsk={askAboutChart} />
              : <SchoolScopeView30d data={schoolData30} onAsk={askAboutChart} />}
          </>
        )}
        {['block', 'cluster', 'district'].includes(scope) && scopedSchoolsData && (
          <>
            <RangeTabs range={range} setRange={setRange} onDownload={downloadCurrentReport} />
            <ScopedSchoolsView
              scope={scope}
              scopeLabel={scopeLabel}
              scopedSchools={scopedSchoolsData.rows}
              totals={scopedSchoolsData.totals}
              topRows={scopedSchoolsData.top}
              botRows={scopedSchoolsData.bot}
              onAsk={askAboutChart}
              range={range}
            />
          </>
        )}
        {scope === 'state' && (
          <>
            <RangeTabs range={range} setRange={setRange} onDownload={downloadCurrentReport} />
            <StateScopeView
              districtRows={districtRows}
              top5={stateData.top5}
              bottom5={stateData.bot5}
              totals={stateData.totals}
              onAsk={askAboutChart}
              range={range}
            />
          </>
        )}

        <div className="mt-3" style={{ fontSize: 10.5, color: '#828996', lineHeight: '15px' }}>
          Source · Smart Attendance System (OAS) submission logs + VSK master tables. Today's submission rates
          are synthesised for the prototype; live pipeline replaces these.
        </div>
      </div>

      {/* Drag handle + shared chat panel (same UX as KpiInsightCanvas). */}
      <DragHandle onPointerDown={onPointerDown} />
      <ChatPanel
        chatHeight={chatHeight}
        chips={CHIPS}
        messages={messages}
        typing={typing}
        onSend={send}
        input={input}
        setInput={setInput}
        inputRef={inputRef}
        placeholder={`Ask about ${scopeLabel}'s attendance…`}
        onOpenStudent={({ ssmid, name }) => openCanvas({
          type: 'student-profile',
          studentId: ssmid,
          grade: scope === 'class' ? classData.grade : undefined,
          studentName: name,
          from: 'attendance-dashboard',
        })}
      />
    </div>
  )
}
