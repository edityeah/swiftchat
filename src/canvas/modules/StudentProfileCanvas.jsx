import React, { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Phone, BookOpen, Heart, IdCard } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { STUDENTS } from '../../data/mockData'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// Find a student by 18-digit SSMID or grNo. We accept either because the
// upstream click handler isn't strict about which one it passes.
function findStudent(idOrSsmid, hintGrade) {
  if (!idOrSsmid) return null
  if (hintGrade) {
    const inGrade = (STUDENTS[hintGrade] || []).find(s => s.id === idOrSsmid || s.ssmid === idOrSsmid || s.grNo === idOrSsmid)
    if (inGrade) return { student: inGrade, grade: hintGrade }
  }
  for (const g of Object.keys(STUDENTS)) {
    const hit = STUDENTS[g].find(s => s.id === idOrSsmid || s.ssmid === idOrSsmid || s.grNo === idOrSsmid)
    if (hit) return { student: hit, grade: +g }
  }
  return null
}

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(+d)) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

// 14-day P/A pattern from a student's attendance % — deterministic, biased
// to Monday/Friday absences (matches how chronic absentees behave IRL).
function buildPattern(seed, attendance) {
  const absences = Math.round(((100 - attendance) / 100) * 14)
  const pattern = new Array(14).fill('P')
  const candidates = []
  for (let i = 0; i < 14; i++) {
    const dow = (i + 6) % 7
    let weight = 1
    if (dow === 1 || dow === 5) weight = 2.2
    if (i >= 9)                  weight *= 1.4
    const r = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280
    candidates.push({ i, w: weight * (0.6 + r * 0.6) })
  }
  candidates.sort((a, b) => b.w - a.w)
  candidates.slice(0, absences).forEach(c => { pattern[c.i] = 'A' })
  return pattern
}

function strHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
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

function PatternStrip({ pattern }) {
  return (
    <div className="flex gap-[3px]">
      {pattern.map((d, i) => (
        <span
          key={i}
          title={d === 'A' ? 'Absent' : 'Present'}
          style={{ width: 14, height: 18, borderRadius: 3, background: d === 'A' ? '#FCA5A5' : '#86EFAC' }}
        />
      ))}
    </div>
  )
}

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function StudentProfileCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const hit = useMemo(
    () => findStudent(context?.studentId, context?.grade),
    [context?.studentId, context?.grade]
  )
  if (!hit) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        Student not found.
      </div>
    )
  }
  const { student, grade } = hit
  const age = calcAge(student.dob)
  const pattern = buildPattern(strHash(student.id), student.attendance)
  // 7-day attendance % trend — synthesised, ends at the student's current %.
  const trendValues = useMemo(() => {
    const base = student.attendance
    return [base - 8, base - 5, base - 2, base + 1, base - 3, base + 2, base]
      .map(v => Math.max(20, Math.min(100, +v.toFixed(0))))
  }, [student.attendance])

  const riskPill =
    student.risk === 'high'   ? { bg: '#FEE2E2', fg: '#B91C1C', label: 'HIGH RISK' } :
    student.risk === 'medium' ? { bg: '#FEF3C7', fg: '#92400E', label: 'WATCH' } :
                                { bg: '#D1FAE5', fg: '#065F46', label: 'ON TRACK' }

  // Data block the chat sends to OpenAI. Only the fields actually visible to
  // the user — keeps the prompt grounded and stops the model hallucinating.
  const chatData = {
    student: {
      id: student.id, grNo: student.grNo, name: student.name,
      class: `${grade}-${student.section}`, age,
      gender: student.gender === 'F' ? 'Female' : 'Male',
      dob: student.dob, bloodGroup: student.bloodGroup,
      socialCategory: student.socialCategory, religion: student.religion,
      medium: student.medium, isRTE: student.isRTE,
      fatherName: student.fatherName, motherName: student.motherName,
      parentPhone: student.parentPhone, fatherPhone: student.fatherPhone,
      schoolId: student.schoolId, enrollmentDate: student.enrollmentDate,
      attendance: student.attendance, risk: student.risk, ewsFlag: student.ewsFlag,
      math: student.math, sci: student.sci, guj: student.guj, level: student.level,
      namoLaxmi: student.namoLaxmi,
    },
    fortnightPattern: pattern.join(''),         // e.g. PAPPAAPPP... — the model can quote this directly
    attendanceTrend7Days: trendValues,
  }

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
      const replyText = await fetchCanvasReply({
        role, profile,
        canvas: { title: `${student.name} · Profile`, subtitle: `Class ${grade}-${student.section}` },
        data: chatData,
        messages: apiMessages,
      })
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        markdown: replyText,
        html: mdToHtml(replyText),
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
  function askAboutChart(prompt) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const chips = [
    'Why is this student missing school?',
    'Draft a parent call script',
    'Compare with class average',
    'Suggest intervention plan',
    'Recent academic trend',
  ]

  function goBack() {
    // Re-open the parent canvas (attendance dashboard for the same grade).
    if (context?.from === 'attendance-dashboard') {
      openCanvas({ type: 'attendance-dashboard', scope: 'class' })
    } else if (context?.from === 'kpi_insight' && context?.kpiId) {
      openCanvas({ type: 'kpi_insight', kpiId: context.kpiId })
    }
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          {(context?.from) && (
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
            Student profile · Class {grade}-{student.section}
          </span>
        </div>

        {/* Name + risk pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0E0E0E', lineHeight: '26px' }}>
              {student.name}
            </h2>
            <div style={{ fontSize: 12.5, color: '#7383A5', marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>
              Student ID · {student.id}
            </div>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 1 }}>
              GR No. {student.grNo} · {profile?.school || 'Sardar Patel Prathmik Shala'}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            background: riskPill.bg, color: riskPill.fg, letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            {riskPill.label}
          </span>
        </div>

        {/* Demographic */}
        <SectionCard title="Demographic" icon={<IdCard size={14} color="#386AF6" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Date of birth" value={`${student.dob}${age != null ? ` · ${age} yrs` : ''}`} />
            <Field label="Gender"        value={student.gender === 'F' ? 'Female' : 'Male'} />
            <Field label="Blood group"   value={student.bloodGroup} />
            <Field label="Social cat."   value={student.socialCategory} />
            <Field label="Religion"      value={student.religion} />
            <Field label="Medium"        value={student.medium} />
            <Field label="RTE admission" value={student.isRTE ? 'Yes' : 'No'} />
            <Field label="Enrolled on"   value={student.enrollmentDate} />
          </div>
        </SectionCard>

        {/* Guardian */}
        <SectionCard title="Guardian" icon={<Phone size={14} color="#10B981" />}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Father"        value={student.fatherName} />
            <Field label="Mother"        value={student.motherName} />
            <Field label="Father phone"  value={student.fatherPhone}  mono />
            <Field label="Mother phone"  value={student.parentPhone} mono />
          </div>
        </SectionCard>

        {/* Attendance */}
        <ChartCard
          title="Attendance · last 14 days"
          askPrompt={`Why is ${student.name.split(' ')[0]} absent so often? Show me the pattern.`}
          onAsk={askAboutChart}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: student.attendance < 65 ? '#B91C1C' : student.attendance < 75 ? '#92400E' : '#065F46' }}>
                {student.attendance}%
              </div>
              <div style={{ fontSize: 11, color: '#7383A5', marginTop: 1 }}>Term-to-date</div>
            </div>
            <PatternStrip pattern={pattern} />
          </div>
          <InteractiveTrendChart values={trendValues} unit="%" status={student.attendance >= 80 ? 'green' : student.attendance >= 65 ? 'yellow' : 'red'} />
          {student.ewsFlag && (
            <div className="mt-3" style={{ borderRadius: 8, background: '#FEF2F2', color: '#B91C1C', padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>
              ⚠ Flagged by the Early Warning System · combination of low attendance + low LO scores
            </div>
          )}
        </ChartCard>

        {/* Academic */}
        <SectionCard title="Learning outcomes (latest cycle)" icon={<BookOpen size={14} color="#7C3AED" />}>
          <div className="grid grid-cols-3 gap-3">
            <ScoreCell label="Maths"    value={student.math} />
            <ScoreCell label="Science"  value={student.sci}  />
            <ScoreCell label="Gujarati" value={student.guj}  />
          </div>
          <div className="mt-3" style={{ fontSize: 12, color: '#7383A5' }}>
            Level: <b style={{ color: '#0E0E0E' }}>{student.level}</b>
          </div>
        </SectionCard>

        {/* Schemes */}
        {student.namoLaxmi && (
          <SectionCard title="Schemes" icon={<Heart size={14} color="#F59E0B" />}>
            <div className="flex items-center justify-between">
              <div style={{ fontSize: 12.5, color: '#0E0E0E' }}>Namo Lakshmi</div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                background: student.namoLaxmi === 'approved' ? '#D1FAE5' : student.namoLaxmi === 'pending' ? '#FEF3C7' : '#FEE2E2',
                color:      student.namoLaxmi === 'approved' ? '#065F46' : student.namoLaxmi === 'pending' ? '#92400E' : '#B91C1C',
              }}>
                {student.namoLaxmi.toUpperCase()}
              </span>
            </div>
          </SectionCard>
        )}

        {/* Source footnote */}
        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · Gujarat Student Registry (StudentDetailsMst_GRNO) · CTS + EWS · Xamta + Gyan Prabhav
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
        placeholder={`Ask about ${student.name.split(' ')[0]}…`}
      />
    </div>
  )
}

function ScoreCell({ label, value }) {
  const c = value >= 75 ? '#065F46' : value >= 50 ? '#92400E' : '#B91C1C'
  return (
    <div style={{ borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px', background: '#FAFBFC' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: c, marginTop: 2 }}>{value}%</div>
    </div>
  )
}
