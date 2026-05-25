import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles, GripHorizontal } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { KPI_CATALOG } from '../../kpi/kpiCatalog'
import { computeKpi } from '../../kpi/kpiEngine'
import { getDetailsFor } from './kpiInsightDetails'

const FONT = 'Montserrat, sans-serif'

const PILL = {
  red:     { bg: '#FEE2E2', fg: '#B91C1C', label: 'RED' },
  yellow:  { bg: '#FEF3C7', fg: '#92400E', label: 'WATCH' },
  green:   { bg: '#D1FAE5', fg: '#065F46', label: 'GOOD' },
  unknown: { bg: '#E5E7EB', fg: '#6B7280', label: '—' },
}

const VALUE_COLOR = {
  red:     '#B91C1C',
  yellow:  '#92400E',
  green:   '#065F46',
  unknown: '#0E0E0E',
}

// Roles that get the full dashboard treatment (trend + breakdown charts).
// Teachers and parents just see numbers + insights + chat.
const ADMIN_ROLES = new Set(['principal', 'crc', 'beo', 'state_secretary', 'pfms'])

function formatValue(value, unit) {
  if (value == null) return '—'
  if (unit === '%')      return `${value}%`
  if (unit === 'hours')  return `${value} hrs`
  return String(value)
}

function benchSentence(c) {
  if (c.benchmark == null) return null
  const { kpi, benchmark, delta } = c
  const absDelta = delta == null ? null : Math.abs(delta).toFixed(0)
  const noun =
    kpi.benchmarkSource === 'fixed_target' ? `the ${benchmark}${kpi.unit === '%' ? '%' : ''} target` :
    kpi.benchmarkSource === 'school_avg'   ? `the school average of ${benchmark}` :
    kpi.benchmarkSource === 'cluster_avg'  ? `the cluster average of ${benchmark}` :
    `the state average of ${benchmark}${kpi.unit === '%' ? '%' : ''}`
  if (absDelta == null) return `Benchmark: ${noun}.`
  if (delta >= 0) return `You're ${absDelta} pts above ${noun}.`
  return `You're ${absDelta} pts below ${noun}.`
}

// ─── Chart card wrapper ─────────────────────────────────────────────────────
// Every chart on the canvas sits inside a ChartCard so it gets a consistent
// header + the ✨ Ask-AI button in the top-right (KSK-style). Clicking that
// button focuses the chat input and pre-fills it with a chart-specific
// question so the user can edit/send without losing context.
function ChartCard({ title, askPrompt, onAsk, children }) {
  return (
    <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 12, background: '#FFFFFF' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
        {askPrompt && (
          <button
            onClick={() => onAsk?.(askPrompt)}
            title="Ask AI about this chart"
            className="active:scale-95 transition-all inline-flex items-center gap-1"
            style={{
              fontSize: 10.5, fontWeight: 700,
              padding: '3px 8px', borderRadius: 999,
              border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3',
              cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.02em',
            }}
          >
            <Sparkles size={11} /> Ask AI
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Charts ────────────────────────────────────────────────────────────────

// Tiny 7-day trend line built from the current value.
function TrendChart({ endValue = 70, status = 'red' }) {
  const days = 7
  const stroke = VALUE_COLOR[status] || '#386AF6'
  const fill = (PILL[status] || PILL.unknown).bg
  const values = useMemo(() => {
    const arr = []
    for (let i = 0; i < days; i++) {
      const offset = Math.sin((i + 1) * 1.3) * 5 + (Math.random() - 0.5) * 2
      arr.push(Math.max(20, endValue - 4 + offset))
    }
    arr[days - 1] = endValue
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const W = 280, H = 70, pad = 8
  const min = Math.min(...values) - 3
  const max = Math.max(...values) + 3
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (days - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return [x, y]
  })
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={areaPath} fill={fill} opacity={0.55} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 2} fill={stroke} />
      ))}
    </svg>
  )
}

function BarRow({ label, value, max, accent = '#386AF6', suffix = '' }) {
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

function BreakdownBars({ entries, accent = '#386AF6' }) {
  const maxV = Math.max(...entries.map(e => e.value), 1)
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <BarRow key={i} label={e.label} value={e.value} max={maxV} accent={accent} suffix={e.unit || ''} />
      ))}
    </div>
  )
}

function getBreakdown(role, kpi) {
  const labels =
    role === 'state_secretary' ? ['Ahmedabad', 'Surat', 'Mehsana', 'Kachchh', 'Rajkot'] :
    role === 'beo'              ? ['Mehsana Block', 'Kadi', 'Visnagar', 'Becharaji', 'Vijapur'] :
    role === 'crc'              ? ['MADHAPAR-1', 'MADHAPAR-2', 'BHACHAU', 'ANJAR', 'GANDHIDHAM'] :
    role === 'principal'        ? ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'] :
    role === 'pfms'             ? ['Namo Lakshmi', 'Namo Saraswati', 'DigiVritti', 'Gyan Sadhana', 'Gyan Sethu'] :
    ['Class 6-A', 'Class 6-B', 'Class 7-A', 'Class 8-A', 'Class 8-B']
  return labels.map((label, i) => ({
    label,
    value: i === 0 ? 92 : i === 1 ? 87 : i === 2 ? 78 : i === 3 ? 69 : 58,
    unit: kpi.unit === '%' ? '%' : kpi.unit === 'hours' ? ' hrs' : '',
  }))
}

// ─── Details renderers (the inline content that replaces the old nested CTA) ─

// 14-day pattern strip used in the chronic-absentees student list. Each cell
// is one school day: green = present, red = absent.
function PatternStrip({ pattern }) {
  return (
    <div className="flex gap-[3px]">
      {pattern.map((d, i) => (
        <span
          key={i}
          title={d === 'A' ? 'Absent' : 'Present'}
          style={{
            width: 10, height: 14, borderRadius: 2,
            background: d === 'A' ? '#FCA5A5' : '#86EFAC',
          }}
        />
      ))}
    </div>
  )
}

function StudentListDetails({ details, onAsk }) {
  return (
    <ChartCard
      title={`Students · ${details.title}`}
      askPrompt="Why are these students absent so often? Show me the pattern."
      onAsk={onAsk}
    >
      <div className="space-y-3 mt-1">
        {details.students.map((s, i) => {
          const risk = s.risk === 'high' ? { bg: '#FEE2E2', fg: '#B91C1C' } : { bg: '#FEF3C7', fg: '#92400E' }
          return (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #F1F5F9', paddingTop: i === 0 ? 0 : 10 }}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0E0E0E' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#7383A5', marginTop: 1 }}>
                    {s.klass} · last seen {s.lastSeen}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: risk.bg, color: risk.fg, letterSpacing: '0.02em',
                  }}>
                    {s.risk === 'high' ? 'HIGH' : 'WATCH'}
                  </span>
                  <div style={{ fontSize: 11, color: '#B91C1C', fontWeight: 700, marginTop: 2 }}>
                    {s.absentDays} days absent
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <PatternStrip pattern={s.pattern} />
                <span style={{ fontSize: 10.5, color: '#828996', marginLeft: 8 }}>Last 14 days</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#0E0E0E', marginTop: 6, lineHeight: '16px' }}>
                {s.reason}
              </div>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

function EntityListDetails({ details, onAsk }) {
  if (!details?.rows?.length) return null
  return (
    <ChartCard
      title={details.title}
      askPrompt="Compare these. Which one needs intervention first?"
      onAsk={onAsk}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 12 }}>
          <thead>
            <tr>
              {details.headers.map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '6px 8px', color: '#828996',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                  borderBottom: '1px solid #E5E7EB',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '6px 8px',
                    textAlign: ci === 0 ? 'left' : 'right',
                    color: '#0E0E0E', fontSize: 12,
                    borderBottom: '1px solid #F1F5F9',
                    fontWeight: ci === 0 ? 600 : 500,
                  }}>
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

function SegmentBarsDetails({ details, onAsk }) {
  if (!details?.segments?.length) return null
  return (
    <ChartCard
      title={details.title}
      askPrompt={`Why is ${details.segments[details.segments.length - 1]?.label || 'the bottom'} lagging? What can fix it?`}
      onAsk={onAsk}
    >
      <BreakdownBars entries={details.segments} accent="#386AF6" />
    </ChartCard>
  )
}

function DomainBreakdownDetails({ details, onAsk }) {
  if (!details?.domains?.length) return null
  const max = Math.max(...details.domains.map(d => d.value), 5)
  return (
    <ChartCard
      title={details.title}
      askPrompt="Which domain is dragging down the overall score?"
      onAsk={onAsk}
    >
      <div className="space-y-2">
        {details.domains.map((d, i) => (
          <BarRow key={i} label={d.label} value={d.value} max={max} accent={d.color} suffix="" />
        ))}
      </div>
    </ChartCard>
  )
}

function DetailsRenderer({ details, onAsk }) {
  if (!details) return null
  switch (details.type) {
    case 'student_list':     return <StudentListDetails    details={details} onAsk={onAsk} />
    case 'entity_list':      return <EntityListDetails     details={details} onAsk={onAsk} />
    case 'segment_bars':     return <SegmentBarsDetails    details={details} onAsk={onAsk} />
    case 'domain_breakdown': return <DomainBreakdownDetails details={details} onAsk={onAsk} />
    default: return null
  }
}

// ─── Per-KPI quick-ask chips ────────────────────────────────────────────────
const COMMON_CHIPS = [
  'What should I do first?',
  'Show me the 7-day trend',
  'Compare with peers',
]

const PER_KPI_CHIPS = {
  attendance_today:               ['Show unmarked students', 'Compare with last week',     'Who marked late today?'],
  chronic_absentees:              ['List high-risk students',  'Last home-visit dates',     'Compare with last month'],
  attendance_reporting_compliance:['Which schools missed today?','Avg submission time',     'Weekly compliance trend'],
  assessment_participation:       ['Show absent students',     'Subject-wise gaps',         'Last cycle comparison'],
  proficiency:                    ['Breakdown by subject',     'Below cut-off list',        'Trend across cycles'],
  students_below_proficiency:     ['Who is closest to passing','Score bucket breakdown',    'Recommended remediation'],
  student_improvement_delta:      ['Top improvers',            'Students who regressed',    'Cycle-on-cycle trend'],
  orf_fln_improvement:            ['ORF wpm distribution',     'FLN levels by class',       'Vaachan Samiksha view'],
  reports_generated_downloaded:   ['Schools that have not downloaded', 'Most-downloaded reports', 'Send a reminder'],
  student_module_completion:      ['Show incomplete cohort',    'Top-engaging modules',     'Send a nudge'],
  tpd_hours:                      ['What modules are pending?', 'Recommend next training',  'Show TPD calendar'],
  scheme_beneficiary_mapping:     ['Unmapped students',         'By scheme breakdown',      'Send to IPMS'],
  payment_completion:             ['Failed transactions',       'By scheme breakdown',      'Open PFMS queue'],
  pending_payments_grievances:    ['Open grievances',           'Past SLA cases',           'By type breakdown'],
  issue_resolution_sla:           ['Past-SLA tickets',          'By category breakdown',    'Average TAT'],
  repeat_pending_cases:           ['Root-cause clusters',       'Recently re-opened',       'Suggest fix patterns'],
  gsqac_score:                    ['Domain-wise breakdown',     'Compare with cluster',     'Action items'],
  schools_meeting_quality_benchmark: ['Schools above A grade',  'Schools dropping out',     'Improvement plans'],
  low_performing_schools:         ['C/D grade list',            'Targeted support plan',    'Next inspection date'],
  gsqac_improvement_cycles:       ['Schools improving',         'Schools regressing',       'Action completion'],
  improvement_actions_completed:  ['Open actions',              'Closed late',              'Most-stuck items'],
  pending_issues_cross_system:    ['By system breakdown',       'Aging buckets',            'Priority queue'],
  repeat_issues_pct:              ['Root-cause categories',     'By system breakdown',      'Resolution patterns'],
  action_on_ews_flagged:          ['Untouched cases',           'Average action time',      'By severity'],
  dropout_reduction:              ['Worst-hit blocks',          'Intervention impact',      'Re-enrollment funnel'],
  reenrollment_vs_target:         ['Block-wise progress',       'OOSC discovered',          'Target vs actual'],
  samagra_shiksha_expenditure:    ['Under-utilised heads',      'Approved vs spent',        'Audit flags'],
}

function chipsFor(kpiId) {
  return PER_KPI_CHIPS[kpiId] || COMMON_CHIPS
}

// ─── Canned bot responses ───────────────────────────────────────────────────
function mockBotHtml(kpi, role, prompt, computed) {
  const colorFor = s => VALUE_COLOR[s] || '#0E0E0E'
  const pill = PILL[computed.status]
  const p = String(prompt || '').toLowerCase()

  if (/(trend|last week|cycle|over time)/i.test(p)) {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      Over the last 7 days <b>${kpi.shortName}</b> has held around <b style="color:${colorFor(computed.status)}">${formatValue(computed.value, kpi.unit)}</b>.
      Variation ±4 pts day-to-day. Direction: <b>${computed.delta >= 0 ? 'improving' : 'declining'}</b>.
    </div>`
  }
  if (/(compare|peers|cluster|state)/i.test(p)) {
    const bench = computed.benchmark
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      You: <b style="color:${colorFor(computed.status)}">${formatValue(computed.value, kpi.unit)}</b> ·
      Benchmark: <b>${bench ?? '—'}${kpi.unit === '%' ? '%' : ''}</b> ·
      Gap: <b style="color:${(computed.delta ?? 0) >= 0 ? '#065F46' : '#B91C1C'}">${(computed.delta ?? 0) >= 0 ? '+' : '−'}${Math.abs(computed.delta ?? 0).toFixed(0)} pts</b>.
    </div>`
  }
  if (/(why|pattern|reason|absent)/i.test(p) && kpi.id === 'chronic_absentees') {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      The 6 flagged students share two patterns: <b>Monday/Friday clustering</b> (4 of 6) and
      <b>family-economic reasons</b> (Ravi & Jay — seasonal labour, sibling care).
      <br/><br/>Recommendation: prioritise home visits to Ravi, Dhruv, and Harsh this week.
    </div>`
  }
  if (/(do first|priority|fix|action)/i.test(p)) {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      Recommended next action: <b>focus on the 3 HIGH-risk students</b>.
      ${computed.reason ? `<br/><span style="color:#7383A5">Context: ${computed.reason}</span>` : ''}
    </div>`
  }
  if (/(list|show|who|which|breakdown)/i.test(p)) {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      The list is in the chart above. Scroll up to see all ${formatValue(computed.value, kpi.unit)} entries with their patterns.
    </div>`
  }
  return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
    Got it. <b style="color:${pill.fg}">${kpi.shortName}</b> is currently
    <b style="color:${colorFor(computed.status)}">${formatValue(computed.value, kpi.unit)}</b>${benchSentence(computed) ? ` (${benchSentence(computed).toLowerCase()})` : ''}.
    Ask me about the trend, peer comparison, or the priority action.
  </div>`
}

function Bubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-3 py-2 rounded-2xl text-[12.5px] ${isUser ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
        style={{
          background: isUser ? '#386AF6' : '#F8FAFC',
          color: isUser ? '#FFFFFF' : '#0E0E0E',
          fontFamily: FONT,
          lineHeight: '18px',
        }}
      >
        {isUser
          ? message.text
          : <div dangerouslySetInnerHTML={{ __html: message.html }} />}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] bg-[#F8FAFC] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ─── Resizable split hook ───────────────────────────────────────────────────
// Tracks the chat-panel height in px. Drag the handle between dashboard and
// chat to resize. Min 140 (just enough for input + a couple of bubbles), max
// 80% of the canvas height. Default 280 (enough for 3-4 messages).
function useResizableChat(containerRef) {
  const [chatHeight, setChatHeight] = useState(280)
  const draggingRef = useRef(false)

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const total = rect.height
      const newChat = total - (e.clientY - rect.top)
      const min = 140
      const max = Math.max(min, total * 0.8)
      setChatHeight(Math.min(max, Math.max(min, newChat)))
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [containerRef])

  return { chatHeight, onPointerDown }
}

// ─── Main canvas ────────────────────────────────────────────────────────────
export default function KpiInsightCanvas({ context }) {
  const { role, userProfile } = useApp()
  const profile = userProfile || {}

  const computed = useMemo(() => {
    const kpiId = context?.kpiId
    if (!kpiId) return null
    const kpi = KPI_CATALOG.find(k => k.id === kpiId)
    if (!kpi) return null
    return computeKpi(kpi, role, profile)
  }, [context?.kpiId, role, profile])

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    setMessages([])
    setInput('')
    setTyping(false)
  }, [context?.kpiId])

  if (!computed || !computed.kpi) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        KPI not available for this role.
      </div>
    )
  }

  const { kpi, value, status, reason } = computed
  const pill = PILL[status] || PILL.unknown
  const valueColor = VALUE_COLOR[status] || VALUE_COLOR.unknown
  const showCharts = ADMIN_ROLES.has(role)
  const chips = chipsFor(kpi.id)
  const breakdown = getBreakdown(role, kpi)
  const details = getDetailsFor(kpi, role, profile, computed)

  function send(text) {
    const t = String(text || '').trim()
    if (!t) return
    const userMsg = { id: Date.now(), role: 'user', text: t, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const botMsg = { id: Date.now() + 1, role: 'bot', html: mockBotHtml(kpi, role, t, computed) }
      setMessages(prev => [...prev, botMsg])
    }, 650)
  }

  // Used by the per-chart ✨ Ask AI button. Pre-fills the input (so the user
  // can edit before sending) and focuses it. The chat panel grows
  // automatically on first message via the messages list.
  function askAboutChart(prompt) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      {/* ─── Top: dashboard (scrollable, flex-1) ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {kpi.framework} · {kpi.domain}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: pill.bg, color: pill.fg, letterSpacing: '0.02em',
          }}>
            {pill.label}
          </span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px' }}>
          {kpi.shortName}
        </h2>

        {/* Value + benchmark */}
        <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 16, background: '#FAFBFC' }}>
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: '44px', color: valueColor }}>
            {formatValue(value, kpi.unit)}
          </div>
          {benchSentence(computed) && (
            <div style={{ fontSize: 12.5, color: '#0E0E0E', marginTop: 6, lineHeight: '18px' }}>
              {benchSentence(computed)}
            </div>
          )}
          {reason && (
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 6, lineHeight: '17px' }}>
              {reason}
            </div>
          )}
        </div>

        {/* Inline details (replaces the old "Open X list" CTA — content is
            now right here on the same canvas). */}
        {details && <DetailsRenderer details={details} onAsk={askAboutChart} />}

        {/* Admin-only: 7-day trend chart */}
        {showCharts && (
          <ChartCard title="7-day trend" askPrompt={`Why is the ${kpi.shortName.toLowerCase()} trend like this?`} onAsk={askAboutChart}>
            <TrendChart endValue={typeof value === 'number' ? value : 70} status={status} />
          </ChartCard>
        )}

        {/* Admin-only: breakdown bars */}
        {showCharts && (
          <ChartCard
            title={
              role === 'state_secretary' ? 'Top districts' :
              role === 'beo'              ? 'Schools in block' :
              role === 'crc'              ? 'Schools in cluster' :
              role === 'principal'        ? 'Classes' :
              role === 'pfms'             ? 'By scheme' :
              'Breakdown'
            }
            askPrompt="Why is the bottom entity lagging?"
            onAsk={askAboutChart}
          >
            <BreakdownBars entries={breakdown} accent="#386AF6" />
          </ChartCard>
        )}

        {/* What this measures */}
        {kpi.description && (
          <div className="mt-5">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              What this measures
            </div>
            <div style={{ fontSize: 12.5, color: '#7383A5', lineHeight: '18px' }}>
              {kpi.description}
            </div>
          </div>
        )}

        {/* Source footnote */}
        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source: {kpi.dataSource}
          <br />
          Dashboard: {kpi.sourceDashboard}
        </div>
      </div>

      {/* ─── Drag handle (resize chat panel up/down) ─────────────────────── */}
      <div
        onPointerDown={onPointerDown}
        title="Drag to resize chat"
        style={{
          height: 12,
          background: '#F8FAFC',
          borderTop: '1px solid #E5E7EB',
          borderBottom: '1px solid #E5E7EB',
          cursor: 'row-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <GripHorizontal size={14} color="#7383A5" />
      </div>

      {/* ─── Bottom: chat (height controlled by drag handle) ─────────────── */}
      <div
        className="flex flex-col"
        style={{
          height: chatHeight,
          flexShrink: 0,
          borderColor: '#E5E7EB',
          background: '#FFFFFF',
        }}
      >
        {/* Quick-ask chips */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
          {chips.map(c => (
            <button
              key={c}
              onClick={() => send(c)}
              className="active:scale-95 transition-all"
              style={{
                fontSize: 11.5, fontWeight: 600, color: '#386AF6',
                padding: '5px 12px', borderRadius: 999,
                border: '1px solid #C7D2FE', background: '#FFFFFF',
                fontFamily: FONT, cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Messages — flex-1 so they expand to fill whatever the resize gave us. */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0" style={{ background: '#F8FAFC' }}>
          {messages.length === 0 && !typing && (
            <div style={{ fontSize: 12, color: '#7383A5', textAlign: 'center', padding: '12px 8px' }}>
              Use a chip above, click an ✨ Ask AI button on any chart, or type a question below.
            </div>
          )}
          {messages.map(m => <Bubble key={m.id} message={m} />)}
          {typing && <Typing />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about ${kpi.shortName.toLowerCase()}…`}
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
