import React, { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Building2, MapPin, IdCard, Award, GraduationCap } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { findSchoolById, buildSchoolProfile, titleCase } from '../../data/registries'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// Role hierarchy depth — used to stack additional sections at deeper roles.
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
        {value ?? '—'}
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

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function SchoolProfileCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const raw = useMemo(() => findSchoolById(context?.schoolId), [context?.schoolId])
  const s = useMemo(() => buildSchoolProfile(raw), [raw])

  if (!s) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        School not found. (UDISE: {String(context?.schoolId || '—')})
      </div>
    )
  }

  // 7-day attendance trend — synthesised, ends at the school's current %.
  const trend = useMemo(() => {
    const base = s.attendance
    return [base - 6, base - 3, base + 1, base - 2, base + 3, base + 1, base]
      .map(v => Math.max(40, Math.min(100, +v.toFixed(0))))
  }, [s.attendance])

  const chatData = {
    school: {
      udise: s.udise, name: s.name,
      management: s.management, category: s.category, classes: s.classes,
      location: s.location, medium: s.medium, village: s.village,
      cluster: s.cluster, block: s.block, district: s.district,
      established: s.established, isActive: s.isActive,
      students: s.totalStudents, teachers: s.totalTeachers,
      headmaster: s.headmaster,
      attendance: s.attendance, submissionPct: s.submissionPct, gsqac: s.gsqac,
      dropoutPct: s.dropoutPct, infraScore: s.infraScore,
      teacherAttendance: s.teacherAttendance, enrollmentDelta: s.enrollmentDelta,
      tier: s.tier, flags: s.flags, recognition: s.recognition,
    },
    attendanceTrend7: trend,
    role,
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
        canvas: { title: `${s.name} · School profile`, subtitle: `${s.block} · ${s.district}` },
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

  const depth = ROLE_DEPTH[role] ?? 1
  const chips = [
    'Why is this school underperforming?',
    'Compare with peers in the cluster',
    'Draft an improvement plan',
    'Recent attendance trend',
    'Show me the headmaster\'s contact',
  ]

  function goBack() {
    if (context?.from === 'schools-at-risk') {
      openCanvas({ type: 'schools-at-risk', filter: context.fromMode === 'low_performing' ? 'low_performing_schools' : 'schools_below_benchmark' })
    } else if (context?.from === 'registry') {
      openCanvas({ type: 'registry', kind: 'schools', scope: context.fromScope || 'district', district: context.fromDistrict, block: context.fromBlock, cluster: context.fromCluster })
    }
  }

  const attTone = s.attendance >= 85 ? 'green' : s.attendance >= 70 ? 'amber' : 'red'
  const gsqacTone = s.gsqac >= 4 ? 'green' : s.gsqac >= 3.5 ? 'amber' : 'red'
  const dropoutTone = s.dropoutPct <= 1.5 ? 'green' : s.dropoutPct <= 3 ? 'amber' : 'red'

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {context?.from && (
            <button onClick={goBack} className="active:scale-95 transition-all" title="Back"
              style={{ width: 28, height: 28, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={14} color="#7383A5" />
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            School profile · {role === 'principal' ? 'Principal view' : role === 'crc' ? 'Cluster view' : role === 'beo' ? 'Block view' : role === 'deo' ? 'District view' : role === 'state_secretary' ? 'State view' : 'View'}
          </span>
        </div>

        {/* Name + tier */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0E0E0E', lineHeight: '26px' }}>
              {s.name}
            </h2>
            <div style={{ fontSize: 12.5, color: '#7383A5', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
              UDISE · {s.udise}
            </div>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 1 }}>
              {s.category} · {s.management}
            </div>
          </div>
          {(s.tier === 'urgent' || s.tier === 'high') && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
              background: s.tier === 'urgent' ? '#FEE2E2' : '#FEF3C7',
              color:      s.tier === 'urgent' ? '#B91C1C' : '#92400E',
              letterSpacing: '0.02em', flexShrink: 0,
            }}>
              {s.tier.toUpperCase()}
            </span>
          )}
        </div>

        {/* Headline tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MetricTile label="Attendance"  value={`${s.attendance}%`}    sub="Term-to-date" tone={attTone} />
          <MetricTile label="GSQAC score" value={s.gsqac.toFixed(1)}    sub={s.gsqac >= 4 ? 'A grade' : s.gsqac >= 3.5 ? 'B grade' : 'C/D grade'} tone={gsqacTone} />
          <MetricTile label="Dropout %"   value={`${s.dropoutPct}%`}    sub="Last academic year" tone={dropoutTone} />
        </div>

        {/* Identity */}
        <SectionCard title="Identity" icon={<IdCard size={14} color="#386AF6" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="UDISE code" value={s.udise} mono />
            <Field label="Status" value={s.isActive ? 'Active' : 'Inactive'} />
            <Field label="School category" value={s.category} />
            <Field label="Management" value={s.management} />
            <Field label="Classes offered" value={s.classes} />
            <Field label="Medium" value={s.medium} />
            <Field label="Established" value={s.established || '—'} />
            <Field label="Total students" value={s.totalStudents?.toLocaleString()} />
          </div>
        </SectionCard>

        {/* Location */}
        <SectionCard title="Location" icon={<MapPin size={14} color="#10B981" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Village" value={s.village || '—'} />
            <Field label="Location" value={s.location} />
            <Field label="Cluster" value={titleCase(s.cluster || '')} />
            <Field label="Block" value={s.block} />
            <Field label="District" value={s.district} />
          </div>
        </SectionCard>

        {/* Headmaster — visible at principal+ */}
        {depth >= 1 && (
          <SectionCard title="Headmaster" icon={<GraduationCap size={14} color="#7C3AED" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Name" value={s.headmaster.name} />
              <Field label="Phone (masked)" value={s.headmaster.phone} mono />
              <Field label="Tenure" value={`${s.headmaster.tenureYears} years`} />
              <Field label="Total teachers" value={s.totalTeachers?.toLocaleString()} />
            </div>
          </SectionCard>
        )}

        {/* Attendance trend */}
        <ChartCard
          title="7-day attendance trend"
          askPrompt={`Walk me through ${s.name}'s 7-day attendance — what happened on the dips?`}
          onAsk={askAboutChart}
        >
          <InteractiveTrendChart values={trend} unit="%" status={attTone === 'green' ? 'green' : attTone === 'amber' ? 'yellow' : 'red'} />
        </ChartCard>

        {/* Flags / risk reasons */}
        {s.flags.length > 0 && (
          <SectionCard title="Risk flags" icon={<Building2 size={14} color="#EF4444" />}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0E0E0E', lineHeight: '20px' }}>
              {s.flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </SectionCard>
        )}

        {/* Cluster/Block/District/State extras — more rows the deeper you go */}
        {depth >= 2 && (
          <SectionCard title="Operational metrics" icon={<Award size={14} color="#F59E0B" />}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Data submission %" value={`${s.submissionPct}%`} />
              <Field label="Teacher attendance %" value={`${s.teacherAttendance}%`} />
              <Field label="Infrastructure score" value={`${s.infraScore} / 100`} />
              <Field label="Enrollment YoY" value={`${s.enrollmentDelta >= 0 ? '+' : ''}${s.enrollmentDelta}%`} />
            </div>
          </SectionCard>
        )}

        {/* Recognition */}
        {(s.recognition.length > 0 || depth >= 2) && (
          <SectionCard title="Recognition & schemes" icon={<Award size={14} color="#F59E0B" />}>
            {s.recognition.length === 0
              ? <div style={{ fontSize: 12, color: '#7383A5' }}>No recognition on record.</div>
              : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0E0E0E', lineHeight: '20px' }}>
                  {s.recognition.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )
            }
          </SectionCard>
        )}

        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · School Master Registry (UDISE+) · OAS attendance · GSQAC + Saksham Shala
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
        placeholder={`Ask about ${s.name.split(' ').slice(0, 2).join(' ')}…`}
      />
    </div>
  )
}
