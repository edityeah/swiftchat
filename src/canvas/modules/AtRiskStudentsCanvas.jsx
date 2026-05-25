import React, { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Filter as FilterIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { STUDENTS } from '../../data/mockData'
import { getAtRiskCohort } from '../../data/atRiskData'
import {
  ChartCard, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// ─── Atoms ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, tone = 'neutral', active, onClick }) {
  const tones = {
    urgent:  { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    high:    { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
    medium:  { bg: '#DBEAFE', fg: '#1E3A8A', bd: '#BFDBFE' },
    low:     { bg: '#D1FAE5', fg: '#065F46', bd: '#A7F3D0' },
    neutral: { bg: '#F1F5F9', fg: '#0E0E0E', bd: '#E5E7EB' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <button
      onClick={onClick}
      className="active:scale-95 transition-all"
      style={{
        flex: 1, minWidth: 0,
        padding: '10px 12px', borderRadius: 12,
        background: t.bg, color: t.fg,
        border: `${active ? 2 : 1}px solid ${active ? t.fg : t.bd}`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left', fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '24px' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </div>
    </button>
  )
}

function BarRow({ label, value, max, accent = '#386AF6', suffix = '%' }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: FONT }}>
        <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#7383A5' }}>{value}{suffix}</span>
      </div>
      <div className="h-2 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: accent }} />
      </div>
    </div>
  )
}

function DonutChart({ label, value, color }) {
  const r = 28, c = 2 * Math.PI * r
  const dash = (value / 100) * c
  return (
    <div className="flex items-center gap-3">
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke="#F1F5F9" strokeWidth={8} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x={36} y={40} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#0E0E0E', fontFamily: FONT }}>
          {value}%
        </text>
      </svg>
      <div style={{ fontSize: 12, color: '#0E0E0E', fontWeight: 600, fontFamily: FONT }}>{label}</div>
    </div>
  )
}

function PredictorBars({ rows }) {
  const max = Math.max(...rows.map(r => r.pct), 1)
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <BarRow key={i} label={r.label} value={r.pct} max={max} accent="#F59E0B" suffix="%" />
      ))}
    </div>
  )
}

function StackedCategoryBar({ rows }) {
  const total = rows.reduce((a, r) => a + r.count, 0) || 1
  const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444']
  return (
    <div>
      <div className="h-7 rounded-md overflow-hidden flex" style={{ border: '1px solid #E5E7EB' }}>
        {rows.map((r, i) => (
          <div key={i} title={`${r.label}: ${r.pct}%`}
            style={{ width: `${(r.count / total) * 100}%`, background: colors[i % colors.length], color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: r.pct > 5 ? 'auto' : 0 }}>
            {r.pct > 8 ? `${r.label} ${r.pct}%` : ''}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length] }} />
            <span style={{ fontSize: 10.5, color: '#0E0E0E', fontWeight: 600 }}>{r.label} · {r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function AtRiskStudentsCanvas({ context }) {
  const { role, userProfile, openCanvas, openNotificationsCanvas, showToast } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  // Role-aware filter state. Each filter only applies to scopes that
  // surface it; the others are no-ops at the data layer.
  const [grade, setGrade]         = useState(context?.grade || 'all')
  const [tierFilter, setTierFilter] = useState(null)
  // CRC/BEO/DEO/State: future filter expansion (school, cluster, block) —
  // kept as state stubs so the UI can already render the controls.

  const cohort = useMemo(() => getAtRiskCohort(role, profile, {
    grade, tierFilter,
    school: context?.school, cluster: context?.cluster, block: context?.block, district: context?.district,
  }), [role, profile, grade, tierFilter, context])

  const { scope, scopeLabel, atRisk, students, breakdowns, totalStudents } = cohort

  const availableGrades = useMemo(
    () => Object.keys(STUDENTS).map(Number).sort((a, b) => a - b),
    [],
  )

  // What chat sees — exactly what's on screen.
  const chatData = useMemo(() => ({
    scope, scopeLabel, role,
    totalStudents, atRisk,
    activeFilters: { grade, tierFilter },
    breakdowns: {
      gender:    breakdowns.gender,
      category:  breakdowns.category,
      classWise: breakdowns.classWise,
      schoolWise: breakdowns.schoolWise,
      districtWise: breakdowns.districtWise,
      predictors: breakdowns.predictors,
    },
    // Cap the student list sent to OpenAI — 25 rows is enough to answer any
    // question without bloating the prompt.
    students: students.slice(0, 25).map(s => ({
      name: s.name, ssmid: s.id || s.ssmid, grade: s.grade, section: s.section,
      attendance: s.attendance, risk: s.risk, ewsFlag: s.ewsFlag,
      math: s.math, sci: s.sci, guj: s.guj,
      gender: s.gender === 'F' ? 'Female' : 'Male',
      socialCategory: s.socialCategory,
    })),
  }), [scope, scopeLabel, role, totalStudents, atRisk, breakdowns, students, grade, tierFilter])

  async function send(text) {
    const t = String(text || '').trim()
    if (!t) return
    const userMsg = { id: Date.now(), role: 'user', text: t }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setTyping(true)
    try {
      const apiMessages = next.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user' ? m.text : (m.markdown || ''),
      }))
      const { text: replyText, cards } = await fetchCanvasReply({
        role, profile,
        canvas: { title: 'At-Risk Students · Early Warning System', subtitle: scopeLabel },
        data: chatData,
        messages: apiMessages,
      })
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', markdown: replyText, html: mdToHtml(replyText), cards }])
    } catch (err) {
      const safe = String(err?.message || err).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', html: `<div style="color:#B91C1C;font-size:12.5px">Couldn't reach Saathi. ${safe}</div>` }])
    } finally {
      setTyping(false)
    }
  }
  function askAboutChart(prompt) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 30)
  }
  function openStudent(s) {
    openCanvas({
      type: 'student-profile',
      studentId: s.id || s.ssmid,
      grade: s.grade,
      studentName: s.name,
      from: 'at-risk-students',
    })
  }

  // Chat chips: a mix of EWS analytical prompts.
  const chips = [
    'Why are these students at risk?',
    'Which factor is driving the most cases?',
    'Suggest an intervention plan',
    scope === 'class' ? 'Draft parent-call scripts' : 'Which schools need help first?',
    'Create reminder for follow-up',
  ]

  // Stat tile click toggles a tier filter; clicking the same tile again clears.
  function toggleTier(tier) {
    setTierFilter(prev => prev === tier ? null : tier)
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#B91C1C" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Early Warning System · {scope[0].toUpperCase() + scope.slice(1)} level
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
              At-Risk Students · {scopeLabel}
            </h2>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 2 }}>
              {atRisk.total.toLocaleString()} flagged of {totalStudents.toLocaleString()} students
            </div>
          </div>
        </div>

        {/* Filter bar — role-aware. */}
        {(role === 'principal' || role === 'crc' || role === 'beo' || role === 'deo' || role === 'state_secretary') && (
          <div className="mt-3 flex flex-wrap items-center gap-2" style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #D5D8DF', background: '#FAFBFC' }}>
            <FilterIcon size={13} color="#7383A5" />
            <span style={{ fontSize: 10.5, color: '#828996', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Filter</span>
            {/* Class / grade filter — principal + above (BEO etc see class filter too) */}
            <select
              value={grade}
              onChange={e => setGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT }}
            >
              <option value="all">All classes</option>
              {availableGrades.map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
            {(role === 'crc' || role === 'beo' || role === 'deo' || role === 'state_secretary') && (
              <select disabled style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#7383A5', fontFamily: FONT }}>
                <option>All schools in {scope === 'cluster' ? 'cluster' : scope === 'block' ? 'block' : scope === 'state' ? 'state' : 'district'}</option>
              </select>
            )}
            {tierFilter && (
              <button onClick={() => setTierFilter(null)}
                style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA', cursor: 'pointer', fontFamily: FONT }}>
                Clear: {tierFilter} ×
              </button>
            )}
          </div>
        )}

        {/* Risk-tier stat tiles — clickable to filter the list */}
        <div className="mt-4 flex gap-2">
          <StatPill label="Urgent" value={atRisk.urgent} tone="urgent" active={tierFilter === 'urgent'} onClick={() => toggleTier('urgent')} />
          <StatPill label="High"   value={atRisk.high}   tone="high"   active={tierFilter === 'high'}   onClick={() => toggleTier('high')} />
          <StatPill label="Medium" value={atRisk.medium} tone="medium" active={tierFilter === 'medium'} onClick={() => toggleTier('medium')} />
          <StatPill label="Low"    value={atRisk.low}    tone="low"    active={tierFilter === 'low'}    onClick={() => toggleTier('low')} />
        </div>

        {/* EWS-style breakdowns grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChartCard title="Gender split" askPrompt="Is the gender split unusual? What does it tell us?" onAsk={askAboutChart}>
            <div className="flex items-center justify-around">
              {breakdowns.gender.map(g => (
                <DonutChart key={g.label} label={g.label} value={g.pct} color={g.label === 'Female' ? '#EF4444' : '#3B82F6'} />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Social category" askPrompt="Which social category is most over-represented?" onAsk={askAboutChart}>
            <StackedCategoryBar rows={breakdowns.category} />
          </ChartCard>

          <ChartCard title="Predictor risk %" askPrompt="Which predictor is driving the most flags?" onAsk={askAboutChart}>
            <PredictorBars rows={breakdowns.predictors} />
          </ChartCard>

          {/* Scope-appropriate roll-up card. Class-wise for school/teacher,
              school-wise for cluster/block, district-wise for state. */}
          {(scope === 'class' || scope === 'school') && breakdowns.classWise?.length > 0 && (
            <ChartCard title="Class-wise distribution" askPrompt="Which class needs intervention first?" onAsk={askAboutChart}>
              <PredictorBars rows={breakdowns.classWise.map(r => ({ label: r.label, pct: r.pct }))} />
            </ChartCard>
          )}
          {(scope === 'cluster' || scope === 'block') && breakdowns.schoolWise?.length > 0 && (
            <ChartCard title={`Top schools by at-risk count`} askPrompt="Which school is dragging the cohort? What support should they get?" onAsk={askAboutChart}>
              <PredictorBars rows={breakdowns.schoolWise.map(r => ({ label: r.label, pct: r.pct }))} />
            </ChartCard>
          )}
          {scope === 'state' && breakdowns.districtWise?.length > 0 && (
            <ChartCard title="Top districts by at-risk count" askPrompt="Which district to escalate first?" onAsk={askAboutChart}>
              <PredictorBars rows={breakdowns.districtWise.map(r => ({ label: r.label, pct: r.pct }))} />
            </ChartCard>
          )}
        </div>

        {/* Student list */}
        {students.length > 0 && (
          <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Students {tierFilter ? `· ${tierFilter}` : ''} · showing {Math.min(students.length, 50)} of {students.length}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#FAFBFC' }}>
                  <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                  <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Class</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</th>
                  <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tier</th>
                  <th style={{ padding: '8px 12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 50).map(s => {
                  const tier =
                    s.ewsFlag ? { label: 'URGENT', bg: '#FEE2E2', fg: '#B91C1C' } :
                    s.risk === 'high' ? { label: 'HIGH', bg: '#FEF3C7', fg: '#92400E' } :
                    s.risk === 'medium' ? { label: 'WATCH', bg: '#DBEAFE', fg: '#1E3A8A' } :
                    { label: 'OK', bg: '#D1FAE5', fg: '#065F46' }
                  return (
                    <tr key={s.id || s.ssmid} style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer' }} onClick={() => openStudent(s)}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0E0E0E' }}>
                        {s.name}
                        {s.ewsFlag && <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C' }}>EWS</span>}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#0E0E0E' }}>Class {s.grade}{s.section ? `-${s.section}` : ''}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: s.attendance < 70 ? '#B91C1C' : '#0E0E0E', fontWeight: s.attendance < 70 ? 700 : 500 }}>{s.attendance}%</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tier.bg, color: tier.fg }}>
                          {tier.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <button onClick={e => { e.stopPropagation(); openStudent(s) }}
                          style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', cursor: 'pointer', fontFamily: FONT }}>
                          Open profile ›
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <ActionCard label="Create intervention group" onClick={() => openCanvas({
            type: 'intervention', groupName: 'At-Risk Intervention Group',
            subject: 'Mathematics', topic: 'Attendance + Foundations',
            duration: '1 week', session: 'After school',
            students: students.slice(0, 12).map(s => s.name),
          })} />
          <ActionCard label="Generate lesson plan" onClick={() => openCanvas({
            type: 'lesson-plan', subject: 'Mathematics', topic: 'Foundations Recap',
            classId: `${scopeLabel}`, students: students.slice(0, 12).map(s => s.name),
          })} />
          <ActionCard label="Send parent alerts" onClick={() => showToast?.(`Parent alerts queued for ${students.length} guardians.`, 'ok')} variant="warn" />
          <ActionCard label="Create reminder" onClick={() => openNotificationsCanvas?.({
            view: 'reminder',
            reminderPrefill: {
              title: 'Follow up on at-risk students',
              message: `Review ${students.length} at-risk cases in ${scopeLabel}.`,
              priority: 'high',
            },
          })} />
        </div>

        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · EWS predictor model on Smart Attendance + Xamta + UDISE+ + DigiVritti master tables.
          Risk tiers: Urgent = composite EWS flag · High / Medium / Low from attendance and LO scores.
        </div>
      </div>

      <DragHandle onPointerDown={onPointerDown} />
      <ChatPanel
        chatHeight={chatHeight}
        chips={chips}
        messages={messages}
        typing={typing}
        onSend={send}
        input={input}
        setInput={setInput}
        inputRef={inputRef}
        placeholder={`Ask about at-risk students in ${scopeLabel}…`}
        onOpenStudent={({ ssmid, name }) => openCanvas({
          type: 'student-profile',
          studentId: ssmid, studentName: name,
          from: 'at-risk-students',
        })}
      />
    </div>
  )
}

function ActionCard({ label, onClick, variant }) {
  const tones = {
    default: { bd: '#386AF6', fg: '#386AF6', bg: '#FFFFFF' },
    warn:    { bd: '#F59E0B', fg: '#92400E', bg: '#FFFFFF' },
  }
  const t = tones[variant] || tones.default
  return (
    <button
      onClick={onClick}
      className="active:scale-95 transition-all"
      style={{
        padding: '10px 12px', borderRadius: 12,
        border: `1.5px solid ${t.bd}`, background: t.bg, color: t.fg,
        fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
        textAlign: 'left', lineHeight: '15px',
      }}
    >
      {label}
    </button>
  )
}
