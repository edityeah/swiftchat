import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { KPI_CATALOG } from '../../kpi/kpiCatalog'
import { computeKpi } from '../../kpi/kpiEngine'
import { resolveDrilldown } from '../../kpi/kpiActions'

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

// ─── Charts ────────────────────────────────────────────────────────────────

// Tiny 7-day trend line built from the current value (mock — synthesises a
// plausible series ending at `endValue`). Visual only — no Y-axis labels.
function TrendChart({ endValue = 70, status = 'red' }) {
  const days = 7
  const stroke = VALUE_COLOR[status] || '#386AF6'
  const fill = (PILL[status] || PILL.unknown).bg
  // Synthesise: gentle wobble around endValue ± 6 ending exactly at endValue.
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

// Horizontal bar breakdown. Shows top 5 entities with mock labels relative to
// the current role (e.g. blocks for state, schools for cluster).
function BreakdownBars({ entries, accent = '#386AF6' }) {
  const maxV = Math.max(...entries.map(e => e.value), 1)
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: FONT }}>
            <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{e.label}</span>
            <span style={{ color: '#7383A5' }}>{e.value}{e.unit || ''}</span>
          </div>
          <div className="h-2 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(e.value / maxV) * 100}%`, background: accent }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Generic breakdown source depending on role + KPI. Returns 5 mock rows so the
// chart always has something to render in the prototype.
function getBreakdown(role, kpi) {
  const labels =
    role === 'state_secretary' ? ['Ahmedabad', 'Surat', 'Mehsana', 'Kachchh', 'Rajkot'] :
    role === 'beo'              ? ['Mehsana Block', 'Kadi', 'Visnagar', 'Becharaji', 'Vijapur'] :
    role === 'crc'              ? ['MADHAPAR-1', 'MADHAPAR-2', 'BHACHAU', 'ANJAR', 'GANDHIDHAM'] :
    role === 'principal'        ? ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'] :
    role === 'pfms'             ? ['Namo Lakshmi', 'Namo Saraswati', 'DigiVritti', 'Gyan Sadhana', 'Gyan Sethu'] :
    ['Class 6-A', 'Class 6-B', 'Class 7-A', 'Class 8-A', 'Class 8-B']
  // Synthesise values around the catalog value
  return labels.map((label, i) => ({
    label,
    value: i === 0 ? 92 : i === 1 ? 87 : i === 2 ? 78 : i === 3 ? 69 : 58,
    unit: kpi.unit === '%' ? '%' : kpi.unit === 'hours' ? ' hrs' : '',
  }))
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
  ews_followup_completed:         ['Show pending follow-ups',  'Who needs urgent action?',  'EWS flag reasons'],
  assessment_participation:       ['Show absent students',     'Subject-wise gaps',         'Last cycle comparison'],
  proficiency:                    ['Breakdown by subject',     'Below cut-off list',        'Trend across cycles'],
  students_below_proficiency:     ['Who is closest to passing','Score bucket breakdown',    'Recommended remediation'],
  student_improvement_delta:      ['Top improvers',            'Students who regressed',    'Cycle-on-cycle trend'],
  orf_fln_improvement:            ['ORF wpm distribution',     'FLN levels by class',       'Vaachan Samiksha view'],
  reports_generated_downloaded:   ['Schools that have not downloaded', 'Most-downloaded reports', 'Send a reminder'],
  student_module_completion:      ['Show incomplete cohort',    'Top-engaging modules',     'Send a nudge'],
  tpd_hours:                      ['What modules are pending?', 'Recommend next training',  'Show TPD calendar'],
  students_identified_remediation:['Identification by subject', 'Most recent flags',        'Send to remediation'],
  students_receiving_remediation: ['Who hasn\'t started yet?',  'Module assignment',        'Track engagement'],
  improvement_after_intervention: ['Which interventions worked?','Cohort comparison',       'Schedule next cycle'],
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
  same_day_reporting:             ['Late submitters',           'Average lag',              'Compliance trend'],
  dashboard_data_lag:             ['Latest sync times',         'Slowest pipelines',        'Outages this week'],
  pending_issues_cross_system:    ['By system breakdown',       'Aging buckets',            'Priority queue'],
  repeat_issues_pct:              ['Root-cause categories',     'By system breakdown',      'Resolution patterns'],
  action_on_ews_flagged:          ['Untouched cases',           'Average action time',      'By severity'],
  dropout_reduction:              ['Worst-hit blocks',          'Intervention impact',      'Re-enrollment funnel'],
  reenrollment_vs_target:         ['Block-wise progress',       'OOSC discovered',          'Target vs actual'],
  samagra_shiksha_expenditure:    ['Under-utilised heads',      'Approved vs spent',        'Audit flags'],
  pm_shri_performance:            ['PM SHRI school list',       'Outcome trends',           'Compliance status'],
  child_attendance:               ['Last 30 days',              'Reasons for absence',      'Message teacher'],
  child_proficiency:              ['Subject-wise scores',       'Improvement areas',        'Tips for parents'],
  child_chronic_absence_flag:     ['Why was my child flagged?', 'Removal criteria',         'Message teacher'],
  child_scholarship_status:       ['Documents required',        'Next payment date',        'Bank details'],
  child_namo_docs_pending:        ['Document checklist',        'Upload steps',             'Customer support'],
}

function chipsFor(kpiId) {
  return PER_KPI_CHIPS[kpiId] || COMMON_CHIPS
}

// ─── Canned bot responses ───────────────────────────────────────────────────
function mockBotHtml(kpi, role, prompt, computed) {
  const colorFor = s => VALUE_COLOR[s] || '#0E0E0E'
  const pill = PILL[computed.status]
  // Tries to match the prompt against PER_KPI_CHIPS — gives a tailored
  // mock response — otherwise a generic acknowledgement.
  const p = String(prompt || '').toLowerCase()

  // Generic "trend" response
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
  if (/(do first|priority|fix|action)/i.test(p)) {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      Recommended next action: <b>${kpi.ctaLabel || 'Open the drill-down view'}</b>.
      ${computed.reason ? `<br/><span style="color:#7383A5">Context: ${computed.reason}</span>` : ''}
    </div>`
  }
  if (/(list|show|who|which|breakdown)/i.test(p)) {
    return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
      Opening the related drill-down view in the canvas above. Tap <b>${kpi.ctaLabel || 'Open'}</b> for the full record list.
    </div>`
  }
  // Default
  return `<div style="font-family:${FONT};font-size:12.5px;color:#0E0E0E;line-height:18px">
    Got it. <b style="color:${pill.fg}">${kpi.shortName}</b> is currently
    <b style="color:${colorFor(computed.status)}">${formatValue(computed.value, kpi.unit)}</b>${benchSentence(computed) ? ` (${benchSentence(computed).toLowerCase()})` : ''}.
    Ask me about the trend, peer comparison, or the priority action.
  </div>`
}

// ─── Bubble + typing ────────────────────────────────────────────────────────
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

// ─── Main canvas ────────────────────────────────────────────────────────────
export default function KpiInsightCanvas({ context }) {
  const { role, userProfile, openCanvas, navigate, closeCanvas } = useApp()
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

  // Auto-scroll the chat to the bottom when new messages come in.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Reset chat history when the canvas's KPI changes.
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

  const { kpi, value, status, reason, meta } = computed
  const pill = PILL[status] || PILL.unknown
  const valueColor = VALUE_COLOR[status] || VALUE_COLOR.unknown
  const showCharts = ADMIN_ROLES.has(role)
  const chips = chipsFor(kpi.id)
  const breakdown = getBreakdown(role, kpi)

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

  function runPrimary() {
    const dd = resolveDrilldown(kpi.id, role, profile)
    if (!dd) return
    if (dd.kind === 'canvas') {
      openCanvas({ type: dd.canvasType, ...dd.canvasContext })
    } else if (dd.kind === 'chat') {
      closeCanvas?.()
      navigate('chat_' + dd.chatId)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      {/* ─── Top: dashboard (scrollable) ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
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
        </div>

        {/* Admin-only: 7-day trend chart */}
        {showCharts && (
          <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 12, background: '#FFFFFF' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              7-day trend
            </div>
            <TrendChart endValue={typeof value === 'number' ? value : 70} status={status} />
          </div>
        )}

        {/* Admin-only: breakdown bars */}
        {showCharts && (
          <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 14, background: '#FFFFFF' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              {role === 'state_secretary' ? 'Top districts' :
               role === 'beo'              ? 'Schools in block' :
               role === 'crc'              ? 'Schools in cluster' :
               role === 'principal'        ? 'Classes' :
               role === 'pfms'             ? 'By scheme' :
               'Breakdown'}
            </div>
            <BreakdownBars entries={breakdown} accent="#386AF6" />
          </div>
        )}

        {/* Why */}
        {reason && (
          <div className="mt-5">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              Why
            </div>
            <div style={{ fontSize: 13, color: '#0E0E0E', lineHeight: '19px' }}>
              {reason}
            </div>
          </div>
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

        {/* Primary action */}
        {kpi.ctaLabel && (
          <button
            onClick={runPrimary}
            className="w-full mt-6 active:scale-[0.98] transition-all"
            style={{
              padding: '12px 16px', borderRadius: 999,
              background: '#386AF6', color: '#FFFFFF',
              fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            {kpi.ctaLabel} ›
          </button>
        )}

        {/* Source footnote */}
        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source: {kpi.dataSource}
          <br />
          Dashboard: {kpi.sourceDashboard}
        </div>
      </div>

      {/* ─── Bottom: chat (sticky) ────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
        {/* Quick-ask chips */}
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
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

        {/* Messages (capped height; scrolls internally if long) */}
        {(messages.length > 0 || typing) && (
          <div className="px-4 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: 240, background: '#F8FAFC' }}>
            {messages.map(m => <Bubble key={m.id} message={m} />)}
            {typing && <Typing />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: '1px solid #E5E7EB' }}>
          <input
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
