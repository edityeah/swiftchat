import React, { useMemo, useRef, useState } from 'react'
import { ArrowLeft, GraduationCap, IdCard, Award, Layers, MapPin } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { findTeacherByCode, buildTeacherProfile, titleCase } from '../../data/registries'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// Roles ordered by hierarchy depth — the deeper the role, the more rollup
// sections the canvas shows. Defined at top so we can compare cleanly.
const ROLE_DEPTH = {
  teacher: 0, parent: 0,
  principal: 1,
  crc: 2,
  beo: 3,
  deo: 4, state_secretary: 4, pfms: 4,
}

// ─── Atoms ─────────────────────────────────────────────────────────────────
function Field({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0E0E0E', marginTop: 2, fontFamily: mono ? 'ui-monospace, monospace' : FONT }}>
        {value || '—'}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 14, background: '#FFFFFF' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0E0E0E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function MetricTile({ label, value, sub, tone = 'neutral' }) {
  const tones = {
    neutral: { fg: '#0E0E0E', bg: '#FAFBFC' },
    green:   { fg: '#065F46', bg: '#D1FAE5' },
    amber:   { fg: '#92400E', bg: '#FEF3C7' },
    red:     { fg: '#B91C1C', bg: '#FEE2E2' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px', background: t.bg }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: t.fg, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#7383A5', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function PercentileBar({ percentile, label, peers }) {
  const tone = percentile >= 75 ? '#10B981' : percentile >= 40 ? '#3B82F6' : '#EF4444'
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between" style={{ fontSize: 11.5, color: '#0E0E0E' }}>
        <span><b>{label}</b> peer group{peers ? ` · ${peers} teachers` : ''}</span>
        <span style={{ color: tone, fontWeight: 700 }}>{percentile}<sup>th</sup> percentile</span>
      </div>
      <div className="h-2 rounded-full mt-1.5" style={{ background: '#F1F5F9', position: 'relative' }}>
        <div className="h-full rounded-full" style={{ width: `${percentile}%`, background: tone }} />
        <div style={{ position: 'absolute', left: `${percentile}%`, top: -3, width: 2, height: 14, background: '#0E0E0E', transform: 'translateX(-1px)' }} />
      </div>
    </div>
  )
}

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function TeacherProfileCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  // Resolve teacher from `teacherCode` (preferred) or fall back to lookup
  // by employeeId if the caller passes that instead.
  const teacher = useMemo(() => findTeacherByCode(context?.teacherCode), [context?.teacherCode])
  const t = useMemo(() => buildTeacherProfile(teacher), [teacher])

  if (!t) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        Teacher not found. (teacherCode: {String(context?.teacherCode || '—')})
      </div>
    )
  }

  // 7-day attendance trend — synthesised, ends at current attendance %.
  const trend = useMemo(() => {
    const base = t.attendance
    return [base - 5, base - 2, base + 1, base - 3, base + 2, base + 1, base]
      .map(v => Math.max(40, Math.min(100, +v.toFixed(0))))
  }, [t.attendance])

  // What chat sees — same data the user sees.
  const chatData = {
    teacher: {
      teacherCode: t.teacherCode,
      name: t.name, gender: t.gender, designation: t.designation,
      qualification: t.qualification, additionalQualification: t.additionalQualification,
      teacherType: t.teacherType, classes: t.classes, subjects: t.subjects,
      schoolId: t.schoolId, school: t.school,
      district: t.district, block: t.block, cluster: t.cluster,
      yearsService: t.yearsService, attendance: t.attendance,
      tpdHours: t.tpdHours, loDelta: t.loDelta, parentRating: t.parentRating,
      isPunctual: t.isPunctual, flagged: t.flagged,
      recognition: t.recognition,
    },
    role,
    percentile: t.percentile,
    attendanceTrend7: trend,
  }

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
        canvas: { title: `${t.name} · Teacher profile`, subtitle: `${t.designation} · ${t.school}` },
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

  // Role-dependent chips — deeper roles get system-of-record questions.
  const depth = ROLE_DEPTH[role] ?? 1
  const baseChips = [
    'Why is the attendance %  trending this way?',
    'Compare with peers in the cluster',
    'Draft a feedback note',
  ]
  const roleChips = depth >= 2 ? ['Block ranking', 'Recommend training', 'Open recognition history'] : []
  const stateChips = depth >= 3 ? ['State-wide rank', 'Eligibility for state recognition'] : []
  const chips = [...baseChips, ...roleChips, ...stateChips]

  function goBack() {
    if (context?.from === 'registry') {
      openCanvas({ type: 'registry', kind: 'teachers', scope: context.fromScope || 'school', schoolId: context.fromSchoolId, district: context.fromDistrict, block: context.fromBlock, cluster: context.fromCluster })
    }
  }

  // Tones for headline tiles
  const attTone = t.attendance >= 90 ? 'green' : t.attendance >= 80 ? 'amber' : 'red'
  const tpdTone = t.tpdHours >= 45 ? 'green' : t.tpdHours >= 30 ? 'amber' : 'red'
  const loTone  = t.loDelta >= 3 ? 'green' : t.loDelta >= 0 ? 'amber' : 'red'

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {context?.from && (
            <button
              onClick={goBack}
              className="active:scale-95 transition-all"
              title="Back"
              style={{ width: 28, height: 28, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={14} color="#7383A5" />
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Teacher profile · {role === 'principal' ? 'Principal view' : role === 'crc' ? 'Cluster view' : role === 'beo' ? 'Block view' : role === 'deo' ? 'District view' : role === 'state_secretary' ? 'State view' : 'View'}
          </span>
        </div>

        {/* Name + flags */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0E0E0E', lineHeight: '26px' }}>
              {t.name}
            </h2>
            <div style={{ fontSize: 12.5, color: '#7383A5', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
              Teacher code · {t.teacherCode}
            </div>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 1 }}>
              {t.designation} · {t.qualification || '—'}
            </div>
          </div>
          {t.flagged && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              background: '#FEE2E2', color: '#B91C1C', letterSpacing: '0.02em', flexShrink: 0,
            }}>
              FOLLOW-UP
            </span>
          )}
        </div>

        {/* Headline tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricTile label="Attendance" value={`${t.attendance}%`} sub={t.isPunctual ? 'Punctual' : 'Watch'} tone={attTone} />
          <MetricTile label="TPD hours"  value={`${t.tpdHours}/50`} sub={t.tpdHours < 50 ? `${50 - t.tpdHours} hrs short` : 'Target met'} tone={tpdTone} />
          <MetricTile label="LO Δ vs cycle" value={`${t.loDelta >= 0 ? '+' : ''}${t.loDelta} pp`} sub="Students' improvement" tone={loTone} />
        </div>

        {/* Identity — everyone gets this */}
        <SectionCard title="Identity & qualification" icon={<IdCard size={14} color="#386AF6" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Gender" value={t.gender} />
            <Field label="Years of service" value={`${t.yearsService} yrs`} />
            <Field label="Qualification" value={t.qualification} />
            <Field label="Additional qual." value={t.additionalQualification} />
            <Field label="Teacher type" value={t.teacherType} />
            <Field label="Employee ID" value={t.employeeId} mono />
          </div>
        </SectionCard>

        {/* Posting + classes */}
        <SectionCard title="Posting" icon={<MapPin size={14} color="#10B981" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="School" value={t.school} />
            <Field label="School ID" value={t.schoolId} mono />
            <Field label="Cluster" value={titleCase(t.cluster || '')} />
            <Field label="Block" value={t.block} />
            <Field label="District" value={t.district} />
            <Field label="Joined" value={t.joiningYear || '—'} />
          </div>
        </SectionCard>

        {/* Classes + subjects */}
        <SectionCard title="Classes & subjects taught" icon={<Layers size={14} color="#7C3AED" />}>
          <div className="flex flex-wrap gap-1.5">
            {t.classes.length === 0 && <span style={{ fontSize: 12, color: '#7383A5' }}>No class assignment on record.</span>}
            {t.classes.map(c => (
              <span key={c} style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3' }}>
                Class {c}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {t.subjects.map(s => (
              <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#F1F5F9', color: '#0E0E0E' }}>
                {s}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* Attendance trend chart */}
        <ChartCard
          title="7-day attendance trend"
          askPrompt={`Walk me through ${t.name.split(' ')[0]}'s attendance trend — which days were missed and why?`}
          onAsk={askAboutChart}
        >
          <InteractiveTrendChart values={trend} unit="%" status={attTone === 'green' ? 'green' : attTone === 'amber' ? 'yellow' : 'red'} />
        </ChartCard>

        {/* ── Role-stacked sections ──
            Each layer adds one more peer-comparison rung. Principal sees
            school-rank only. CRC sees school + cluster. BEO adds block.
            DEO / State Secretary see the full set up to state. */}
        {(depth >= 1) && (
          <SectionCard title="Peer comparison" icon={<Award size={14} color="#F59E0B" />}>
            <PercentileBar label="In the school" percentile={t.percentile.school} />
            {depth >= 2 && <PercentileBar label="In the cluster" percentile={t.percentile.cluster} />}
            {depth >= 3 && <PercentileBar label="In the block"   percentile={t.percentile.block} />}
            {depth >= 4 && <PercentileBar label="In the district" percentile={t.percentile.district} />}
            {depth >= 4 && <PercentileBar label="In the state"   percentile={t.percentile.state} />}
            <div className="mt-3" style={{ fontSize: 11.5, color: '#7383A5', lineHeight: '16px' }}>
              Percentile combines attendance, TPD completion, and student LO Δ within each peer group.
            </div>
          </SectionCard>
        )}

        {/* Parent feedback — visible to principal+ */}
        {depth >= 1 && (
          <SectionCard title="Parent feedback" icon={<GraduationCap size={14} color="#EF4444" />}>
            <div className="flex items-center gap-3">
              <div style={{ fontSize: 28, fontWeight: 700, color: t.parentRating >= 4.5 ? '#065F46' : t.parentRating >= 4 ? '#92400E' : '#B91C1C' }}>
                {t.parentRating.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: '#0E0E0E' }}>
                out of 5 · based on {Math.round(60 + (t.teacherCode % 60))} parent responses this term
              </div>
            </div>
          </SectionCard>
        )}

        {/* Recognition — block+ get this with extra context */}
        {(t.recognition?.length > 0 || depth >= 2) && (
          <SectionCard title="Recognition & training" icon={<Award size={14} color="#F59E0B" />}>
            {t.recognition.length === 0
              ? <div style={{ fontSize: 12, color: '#7383A5' }}>No recognition on record. Eligible for nomination cycle this year.</div>
              : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0E0E0E', lineHeight: '20px' }}>
                  {t.recognition.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )
            }
            <div className="mt-2" style={{ fontSize: 11.5, color: '#7383A5' }}>
              TPD modules completed: {Math.round(t.tpdHours / 5)} of 10 · last training {2025 - (t.teacherCode % 3)}-Q{(t.teacherCode % 4) + 1}
            </div>
          </SectionCard>
        )}

        {/* District / State only — admin actions */}
        {depth >= 3 && (
          <SectionCard title="Administrative" icon={<IdCard size={14} color="#0E0E0E" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Phone (masked)" value={t.phone} mono />
              <Field label="Email"          value={t.email} mono />
              <Field label="Service end"    value="—" />
              <Field label="Status"         value="Active" />
            </div>
          </SectionCard>
        )}

        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · Teacher Master Registry (TeacherDirectory) · Prashikshak (TPD) · GSQAC · Saksham Shala
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
        placeholder={`Ask about ${t.name.split(' ')[0]}…`}
      />
    </div>
  )
}
