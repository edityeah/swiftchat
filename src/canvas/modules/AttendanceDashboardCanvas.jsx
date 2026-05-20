import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  DISTRICTS, SCHOOLS, AGGREGATES, titleCase,
  schoolsInDistrict, schoolsInBlock, schoolsInCluster,
} from '../../data/registries'
import { STUDENTS, SCHOOL_INFO } from '../../data/mockData'

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

function TrendChart({ values, status = 'green' }) {
  const W = 280, H = 70, pad = 8
  const tones = { red: '#B91C1C', yellow: '#92400E', green: '#065F46' }
  const fills = { red: '#FEE2E2', yellow: '#FEF3C7', green: '#D1FAE5' }
  const stroke = tones[status] || '#386AF6'
  const fill = fills[status] || '#DBEAFE'
  const min = Math.min(...values) - 4
  const max = Math.max(...values) + 4
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return [x, y]
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill={fill} opacity={0.55} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 2} fill={stroke} />)}
    </svg>
  )
}

// ─── Chat ───────────────────────────────────────────────────────────────────
function Bubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-3 py-2 rounded-2xl text-[12.5px] ${isUser ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
        style={{
          background: isUser ? '#386AF6' : '#F8FAFC',
          color: isUser ? '#FFFFFF' : '#0E0E0E',
          fontFamily: FONT, lineHeight: '18px',
        }}
      >
        {isUser ? message.text : <div dangerouslySetInnerHTML={{ __html: message.html }} />}
      </div>
    </div>
  )
}

// ─── Per-scope content builders ─────────────────────────────────────────────

// Class scope (teacher / parent): just THIS class.
function ClassScopeView({ profile, scopeLabel }) {
  const grade = profile?.classes?.[0] || 6
  const students = STUDENTS[grade] || []
  const total = students.length
  // Today's present count: derive from per-student attendance % deterministically.
  // A student with attendance ≥ 60% is "present today" 5/6 of the time.
  const presentToday = useMemo(() => {
    return students.filter((s, i) => {
      const seed = (s.attendance ?? 70) + i
      return ((seed * 11) % 100) > 18
    }).length
  }, [students])
  const absentToday = total - presentToday
  const todayPct = total ? (presentToday / total) * 100 : 0
  const t = tone(todayPct)

  // Synthesised 7-day trend
  const trend = useMemo(() => [todayPct - 6, todayPct - 3, todayPct + 1, todayPct - 2, todayPct + 4, todayPct + 1, todayPct].map(v => Math.max(40, Math.min(100, v))), [todayPct])

  // Top absentees today (simulate from lowest attendance)
  const absentList = [...students].sort((a, b) => (a.attendance || 0) - (b.attendance || 0)).slice(0, Math.min(absentToday, 8))

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Attendance · Class level
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
        Class {grade} — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </h2>
      <div style={{ fontSize: 12, color: '#7383A5', marginTop: 2 }}>{profile?.school || 'Sardar Patel Prathmik Shala'}</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Class size"         value={total}                                  accent="#3B82F6" />
        <StatCard label="Present today"      value={presentToday}      sub={`of ${total}`}  accent="#10B981" statusPct={todayPct} />
        <StatCard label="Absent today"       value={absentToday}                            accent="#EF4444" />
        <StatCard label="Class avg (term)"   value={`${Math.round(students.reduce((a, s) => a + (s.attendance || 0), 0) / (total || 1))}%`} accent="#7C3AED" />
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          7-day trend
        </div>
        <TrendChart values={trend} status={todayPct >= 80 ? 'green' : todayPct >= 60 ? 'yellow' : 'red'} />
      </div>

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
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ID</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Term att.</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {absentList.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>{s.name}</td>
                  <td style={{ padding: '8px 12px', color: '#7383A5' }}>{s.id}</td>
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
function SchoolScopeView({ profile }) {
  const allGrades = Object.keys(STUDENTS).map(Number).sort((a, b) => a - b)
  const classes = allGrades.map(g => {
    const list = STUDENTS[g] || []
    const present = list.filter((s, i) => ((s.attendance ?? 70) + i) * 11 % 100 > 18).length
    const pct = list.length ? (present / list.length) * 100 : 0
    return { grade: g, total: list.length, present, absent: list.length - present, pct }
  })
  const totalStudents = classes.reduce((a, c) => a + c.total, 0)
  const totalPresent = classes.reduce((a, c) => a + c.present, 0)
  const schoolPct = totalStudents ? (totalPresent / totalStudents) * 100 : 0
  const submitted = classes.filter(c => c.pct > 0).length
  const trend = useMemo(() => [schoolPct - 5, schoolPct - 2, schoolPct + 1, schoolPct - 1, schoolPct + 3, schoolPct + 1, schoolPct].map(v => Math.max(40, Math.min(100, v))), [schoolPct])

  const ranked = [...classes].sort((a, b) => b.pct - a.pct)
  const top3 = ranked.slice(0, 3).map(c => ({ label: `Class ${c.grade}`, value: c.pct }))
  const bot3 = ranked.slice(-3).reverse().map(c => ({ label: `Class ${c.grade}`, value: c.pct }))

  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Attendance · School level
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
        {profile?.school || 'Sardar Patel Prathmik Shala'} — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatCard label="Total students"   value={totalStudents} accent="#3B82F6" />
        <StatCard label="Present today"    value={totalPresent}  sub={`of ${totalStudents}`} accent="#10B981" statusPct={schoolPct} />
        <StatCard label="Classes submitted" value={`${submitted} / ${classes.length}`} accent="#F59E0B" />
        <StatCard label="Teachers"         value={SCHOOL_INFO?.totalTeachers || 18} accent="#7C3AED" />
      </div>

      <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          7-day school trend
        </div>
        <TrendChart values={trend} status={schoolPct >= 80 ? 'green' : schoolPct >= 60 ? 'yellow' : 'red'} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Top 3 classes</div>
          <HBarList rows={top3} accent="#10B981" maxBars={100} />
        </div>
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Bottom 3 classes</div>
          <HBarList rows={bot3} accent="#EF4444" maxBars={100} />
        </div>
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
function ScopedSchoolsView({ scope, scopeLabel, scopedSchools, totals, topRows, botRows }) {
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

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Top 5 schools</div>
          <HBarList rows={topRows} accent="#10B981" maxBars={100} />
        </div>
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Bottom 5 schools</div>
          <HBarList rows={botRows} accent="#EF4444" maxBars={100} />
        </div>
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
function StateScopeView({ districtRows, top5, bottom5, totals, byMgmt }) {
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

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Top 5 performer</div>
          <HBarList rows={top5} accent="#F59E0B" maxBars={Math.max(...top5.map(r => r.value), ...bottom5.map(r => r.value), 1)} />
        </div>
        <div style={{ border: '1px solid #D5D8DF', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Bottom 5 performer</div>
          <HBarList rows={bottom5} accent="#FBBF24" maxBars={Math.max(...top5.map(r => r.value), ...bottom5.map(r => r.value), 1)} />
        </div>
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
  const { role, userProfile } = useApp()
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

  // Chat
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  // Scope-specific chips
  const CHIPS = scope === 'class' ? [
    'Who is absent today?',
    'Compare with last week',
    'Mark attendance now',
    'Suggest parent calls',
    'Class trend by month',
  ] : scope === 'school' ? [
    'Which class has lowest attendance?',
    'Submission gaps by class',
    'Teacher attendance today',
    'Compare with last week',
    'Send a reminder to class teachers',
  ] : ['block', 'cluster', 'district'].includes(scope) ? [
    'Which schools haven\'t submitted?',
    'Top 3 schools to nudge',
    'Compare with last week',
    'Schools below 50% present',
    'Send broadcast to non-reporters',
  ] : [
    'Why is overall submission so low?',
    'Which districts are improving?',
    'Top 3 districts to nudge today',
    'Compare today vs last week',
    'Show districts below 30%',
  ]

  function send(text) {
    const t = String(text || '').trim()
    if (!t) return
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: t }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      let html = ''
      const p = t.toLowerCase()
      if (scope === 'class') {
        if (/absent|who/.test(p)) html = `Today's absentees are listed in the table above. Recommend parent calls for high-risk students first.`
        else if (/mark|attendance/.test(p)) html = `Open the "Mark attendance now" CTA from the home KPI tile to mark today's attendance.`
        else html = `Class ${profile?.classes?.[0] || 6} is currently at <b>${scopeLabel}</b> for today. Ask about absentees, last-week comparison, or parent calls.`
      } else if (scope === 'school') {
        if (/low/.test(p)) html = `Lowest class today is bottom of the chart above. Class teachers nudged in the dashboard.`
        else if (/teacher/.test(p)) html = `Open "Teacher Att." tile on home for teacher-by-teacher status.`
        else html = `Today's school-wide attendance is shown above. Use chips to drill into class-level or teacher-level views.`
      } else if (['block', 'cluster', 'district'].includes(scope)) {
        if (/submit|haven/.test(p)) html = `Tap the schools table above — schools with "—" in the Submitted column haven't filed today.`
        else if (/nudge|broadcast/.test(p)) html = `Bottom 3 schools in the chart above are the highest-impact nudges. Broadcast queued via Notifications canvas.`
        else html = `Scope: <b>${scopeLabel}</b>. ${scopedSchoolsData?.totals.submitted ?? 0} of ${scopedSchoolsData?.totals.schools ?? 0} schools submitted today.`
      } else {
        if (/low/.test(p)) html = `Bottom-5 districts dragging the state submission %: <b>${stateData.bot5.map(b => b.label).join(', ')}</b>.`
        else if (/improving/.test(p)) html = `Top-5 districts today: <b>${stateData.top5.map(b => b.label).join(', ')}</b>.`
        else html = `Today: <b>${compactNum(stateData.totals.submittedSch)} of ${compactNum(stateData.totals.totalSchools)}</b> schools submitted. Ask about districts, comparisons, or below-threshold filters.`
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', html }])
    }, 600)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5">
        {scope === 'class'   && <ClassScopeView profile={profile} scopeLabel={scopeLabel} />}
        {scope === 'school'  && <SchoolScopeView profile={profile} />}
        {['block', 'cluster', 'district'].includes(scope) && scopedSchoolsData && (
          <ScopedSchoolsView
            scope={scope}
            scopeLabel={scopeLabel}
            scopedSchools={scopedSchoolsData.rows}
            totals={scopedSchoolsData.totals}
            topRows={scopedSchoolsData.top}
            botRows={scopedSchoolsData.bot}
          />
        )}
        {scope === 'state' && (
          <StateScopeView
            districtRows={districtRows}
            top5={stateData.top5}
            bottom5={stateData.bot5}
            totals={stateData.totals}
          />
        )}

        <div className="mt-3" style={{ fontSize: 10.5, color: '#828996', lineHeight: '15px' }}>
          Source · Smart Attendance System (OAS) submission logs + VSK master tables. Today's submission rates
          are synthesised for the prototype; live pipeline replaces these.
        </div>
      </div>

      {/* Bottom: chat */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
          {CHIPS.map(c => (
            <button key={c} onClick={() => send(c)}
              className="active:scale-95 transition-all"
              style={{
                fontSize: 11.5, fontWeight: 600, color: '#386AF6',
                padding: '5px 12px', borderRadius: 999,
                border: '1px solid #C7D2FE', background: '#FFFFFF',
                fontFamily: FONT, cursor: 'pointer',
              }}
            >{c}</button>
          ))}
        </div>

        {(messages.length > 0 || typing) && (
          <div className="px-4 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: 220, background: '#F8FAFC' }}>
            {messages.map(m => <Bubble key={m.id} message={m} />)}
            {typing && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] bg-[#F1F5F9] inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #E5E7EB' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about ${scopeLabel}'s attendance…`}
            className="flex-1 outline-none"
            style={{
              padding: '9px 14px', borderRadius: 999,
              border: '1px solid #D5D8DF', background: '#FFFFFF',
              fontSize: 13, color: '#0E0E0E', fontFamily: FONT,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-all"
            style={{
              background: input.trim() ? '#386AF6' : '#E5E7EB',
              color: '#FFFFFF', cursor: input.trim() ? 'pointer' : 'default',
              border: 'none', flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
