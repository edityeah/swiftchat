import React, { useMemo, useRef, useState } from 'react'
import { Building2, Filter as FilterIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getSchoolCohort } from '../../data/atRiskData'
import {
  ChartCard, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// ─── Mini atoms ─────────────────────────────────────────────────────────────
function StatPill({ label, value, tone = 'neutral' }) {
  const tones = {
    urgent:  { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    high:    { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
    medium:  { bg: '#DBEAFE', fg: '#1E3A8A', bd: '#BFDBFE' },
    neutral: { bg: '#F1F5F9', fg: '#0E0E0E', bd: '#E5E7EB' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: '10px 12px', borderRadius: 12,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`,
      fontFamily: FONT, textAlign: 'left',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '24px' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function BarList({ rows, accent = '#F59E0B', suffix = '%', max }) {
  const m = max ?? Math.max(...rows.map(r => r.pct ?? r.count), 1)
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: FONT }}>
            <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{r.label}</span>
            <span style={{ color: '#7383A5' }}>{r.count} · {r.pct}{suffix}</span>
          </div>
          <div className="h-2 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
            <div className="h-full rounded-full" style={{ width: `${((r.pct ?? r.count) / m) * 100}%`, background: accent }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function SchoolsAtRiskCanvas({ context }) {
  const { role, userProfile, openCanvas, openNotificationsCanvas, showToast } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  // Two modes — comes from the KPI drilldown's `context.filter`.
  // 'schools_below_benchmark' (A1) → attendance < 75
  // 'low_performing_schools'   (A5) → GSQAC < 3.5
  const mode = context?.filter === 'low_performing_schools' ? 'low_performing' : 'below_attendance_benchmark'

  const cohort = useMemo(() => getSchoolCohort(role, profile, { mode }), [role, profile, mode])
  const { scope, scopeLabel, totalSchools, atRisk, schools, breakdowns } = cohort

  const modeLabel = mode === 'low_performing'
    ? 'Low-performing schools'
    : 'Schools below attendance benchmark'

  const chatData = useMemo(() => ({
    scope, scopeLabel, role, mode,
    totalSchools, atRisk,
    breakdowns,
    // Cap to 25 schools sent to OpenAI.
    schools: schools.slice(0, 25).map(s => ({
      udise: s.udise, name: s.name, district: s.district, block: s.block, cluster: s.cluster,
      attendance: s.attendance, submissionPct: s.submissionPct, gsqac: s.gsqac, dropoutPct: s.dropoutPct,
      students: s.totalStudents, teachers: s.totalTeachers,
      management: s.management, category: s.category, location: s.location, medium: s.medium,
      tier: s.tier, flags: s.flags,
    })),
  }), [scope, scopeLabel, role, mode, totalSchools, atRisk, breakdowns, schools])

  async function send(text) {
    const tt = String(text || '').trim()
    if (!tt) return
    const userMsg = { id: Date.now(), role: 'user', text: tt }
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
        canvas: { title: modeLabel, subtitle: scopeLabel },
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
  function openSchool(s) {
    openCanvas({
      type: 'school-profile',
      schoolId: s.schoolId || s.udise,
      schoolName: s.name,
      from: 'schools-at-risk',
      fromMode: mode,
    })
  }

  const chips = [
    'Which schools need urgent visit?',
    'What\'s the common factor?',
    'Compare top vs bottom',
    'Draft a CRC visit plan',
    'Send improvement plan to HMs',
  ]

  // Empty state — render something useful if pool is empty (e.g. principal scope).
  if (!schools.length) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        No schools in scope match the {modeLabel.toLowerCase()} threshold.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={18} color="#92400E" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {modeLabel} · {scope[0].toUpperCase() + scope.slice(1)} level
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
              {atRisk.total.toLocaleString()} schools · {scopeLabel}
            </h2>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 2 }}>
              of {totalSchools.toLocaleString()} total schools in scope ·
              {mode === 'low_performing' ? ' GSQAC < 3.5 threshold' : ' attendance < 75% threshold'}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mt-4 flex gap-2">
          <StatPill label="Urgent" value={atRisk.urgent} tone="urgent" />
          <StatPill label="High"   value={atRisk.high}   tone="high" />
          <StatPill label="Medium" value={atRisk.medium} tone="medium" />
          <StatPill label="Total"  value={atRisk.total}  tone="neutral" />
        </div>

        {/* Breakdowns grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {breakdowns.byManagement?.length > 0 && (
            <ChartCard title="By management" askPrompt="Is one management type over-represented?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byManagement} accent="#3B82F6" max={atRisk.total} />
            </ChartCard>
          )}
          {breakdowns.byCategory?.length > 0 && (
            <ChartCard title="By school category" askPrompt="Which category needs the most help?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byCategory} accent="#F59E0B" max={atRisk.total} />
            </ChartCard>
          )}
          {breakdowns.byLocation?.length > 0 && (
            <ChartCard title="Urban vs Rural" askPrompt="Is the issue concentrated rurally?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byLocation} accent="#10B981" max={atRisk.total} />
            </ChartCard>
          )}
          {breakdowns.byMedium?.length > 0 && (
            <ChartCard title="By medium of instruction" askPrompt="Which medium is most affected?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byMedium} accent="#7C3AED" max={atRisk.total} />
            </ChartCard>
          )}
          {breakdowns.byDistrict?.length > 0 && (
            <ChartCard title="Worst districts" askPrompt="Which district to escalate first?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byDistrict} accent="#EF4444" max={atRisk.total} />
            </ChartCard>
          )}
          {breakdowns.byBlock?.length > 0 && (
            <ChartCard title="Worst blocks" askPrompt="Which block needs immediate intervention?" onAsk={askAboutChart}>
              <BarList rows={breakdowns.byBlock} accent="#EF4444" max={atRisk.total} />
            </ChartCard>
          )}
        </div>

        {/* Schools list */}
        <div className="mt-4" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #D5D8DF', background: '#FAFBFC' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Schools · showing {Math.min(schools.length, 80)} of {schools.length}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#FAFBFC' }}>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>School</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>UDISE</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Students</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attendance</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GSQAC</th>
                <th style={{ textAlign: 'left',  padding: '8px 12px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tier</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {schools.slice(0, 80).map(s => {
                const tone = s.tier === 'urgent' ? { bg: '#FEE2E2', fg: '#B91C1C', label: 'URGENT' }
                           : s.tier === 'high'   ? { bg: '#FEF3C7', fg: '#92400E', label: 'HIGH' }
                           : s.tier === 'medium' ? { bg: '#DBEAFE', fg: '#1E3A8A', label: 'WATCH' }
                           : { bg: '#D1FAE5', fg: '#065F46', label: 'OK' }
                return (
                  <tr key={s.schoolId} style={{ borderTop: '1px solid #F1F5F9', cursor: 'pointer' }} onClick={() => openSchool(s)}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#386AF6', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                    <td style={{ padding: '8px 12px', color: '#7383A5', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{s.udise}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{s.totalStudents}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: s.attendance < 75 ? '#B91C1C' : '#0E0E0E', fontWeight: s.attendance < 75 ? 700 : 500 }}>{s.attendance}%</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: s.gsqac < 3.5 ? '#B91C1C' : '#0E0E0E', fontWeight: s.gsqac < 3.5 ? 700 : 500 }}>{s.gsqac}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>
                        {tone.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); openSchool(s) }}
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

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => openNotificationsCanvas?.({ view: 'reminder', reminderPrefill: { title: 'School visits needed', message: `Review ${schools.length} schools in ${scopeLabel}.`, priority: 'high' } })}
            className="active:scale-95 transition-all"
            style={{ padding: '10px 12px', borderRadius: 12, border: '1.5px solid #386AF6', background: '#FFFFFF', color: '#386AF6', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
          >
            Create reminder for visits
          </button>
          <button
            onClick={() => showToast?.(`Improvement plans queued for ${schools.length} schools.`, 'ok')}
            className="active:scale-95 transition-all"
            style={{ padding: '10px 12px', borderRadius: 12, border: '1.5px solid #F59E0B', background: '#FFFFFF', color: '#92400E', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
          >
            Send improvement plans
          </button>
          <button
            onClick={() => showToast?.(`Notifications sent to ${schools.length} HMs.`, 'ok')}
            className="active:scale-95 transition-all"
            style={{ padding: '10px 12px', borderRadius: 12, border: '1.5px solid #10B981', background: '#FFFFFF', color: '#065F46', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
          >
            Notify Headmasters
          </button>
        </div>

        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · SCHOOLS master registry · Smart Attendance System (OAS) submissions · GSQAC + Saksham Shala scores.
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
        placeholder={`Ask about schools in ${scopeLabel}…`}
      />
    </div>
  )
}
