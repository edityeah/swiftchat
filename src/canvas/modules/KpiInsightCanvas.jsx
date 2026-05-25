import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { KPI_CATALOG } from '../../kpi/kpiCatalog'
import { computeKpi } from '../../kpi/kpiEngine'
import { getDetailsFor } from './kpiInsightDetails'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

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

// (ChartCard, InteractiveTrendChart, Bubble, Typing, useResizableChat,
//  DragHandle, ChatPanel — all live in ../shared/kpiCanvasShared.jsx.)

// Build a 7-day series of plausible values ending at `endValue`. Used to
// feed the interactive trend chart with deterministic but believable data.
function build7DaySeries(endValue) {
  if (typeof endValue !== 'number') endValue = 70
  const arr = []
  for (let i = 0; i < 7; i++) {
    const offset = Math.sin((i + 1) * 1.3) * 4 + Math.cos((i + 2) * 0.9) * 2
    arr.push(Math.max(20, endValue - 3 + offset))
  }
  arr[6] = endValue
  return arr.map(v => +v.toFixed(1))
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

function EntityListDetails({ details, onAsk, onOpenSchool, onOpenFullCanvas }) {
  if (!details?.rows?.length) return null
  // Schools-list entity_list always has UDISE in column 1 — that's our key
  // for routing to the SchoolProfileCanvas. Detect it via the header label.
  const isSchoolList = (details.headers || []).map(h => String(h).toLowerCase()).includes('udise')
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
              {isSchoolList && <th style={{ borderBottom: '1px solid #E5E7EB' }}></th>}
            </tr>
          </thead>
          <tbody>
            {details.rows.map((row, ri) => {
              const clickHandler = isSchoolList && onOpenSchool
                ? () => onOpenSchool({ name: row[0], udise: row[1] })
                : undefined
              return (
                <tr
                  key={ri}
                  onClick={clickHandler}
                  style={{ cursor: clickHandler ? 'pointer' : 'default' }}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '6px 8px',
                      textAlign: ci === 0 ? 'left' : 'right',
                      color: ci === 0 && isSchoolList ? '#386AF6' : '#0E0E0E',
                      fontSize: 12,
                      borderBottom: '1px solid #F1F5F9',
                      fontWeight: ci === 0 ? 600 : 500,
                      textDecoration: ci === 0 && isSchoolList ? 'underline' : 'none',
                      textDecorationColor: '#C7D2FE',
                      textUnderlineOffset: '3px',
                      whiteSpace: ci === 0 ? 'normal' : 'nowrap',
                      maxWidth: ci === 0 ? 240 : undefined,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {String(cell)}
                    </td>
                  ))}
                  {isSchoolList && (
                    <td style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '3px 9px', borderRadius: 999,
                        background: '#EEF2FF', color: '#3730A3',
                        border: '1px solid #C7D2FE',
                      }}>
                        Open ›
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {/* "Showing N of total" + dedicated-canvas chip */}
      {details.rowCount > details.rows.length && (
        <div className="mt-3 flex items-center justify-between" style={{ fontSize: 11.5, color: '#7383A5' }}>
          <span>Showing {details.rows.length} of {details.rowCount.toLocaleString()}.</span>
          {details.drilldownCanvas && onOpenFullCanvas && (
            <button
              onClick={() => onOpenFullCanvas(details)}
              className="active:scale-95 transition-all"
              style={{
                fontSize: 11.5, fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
                background: '#386AF6', color: '#FFFFFF',
                border: 'none', cursor: 'pointer', fontFamily: FONT,
              }}
            >
              View all {details.rowCount.toLocaleString()} ›
            </button>
          )}
        </div>
      )}
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

function DetailsRenderer({ details, onAsk, onOpenSchool, onOpenFullCanvas }) {
  if (!details) return null
  switch (details.type) {
    case 'student_list':     return <StudentListDetails    details={details} onAsk={onAsk} />
    case 'entity_list':      return <EntityListDetails     details={details} onAsk={onAsk} onOpenSchool={onOpenSchool} onOpenFullCanvas={onOpenFullCanvas} />
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

// ─── Main canvas ────────────────────────────────────────────────────────────
export default function KpiInsightCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
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
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 280)

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

  async function send(text) {
    const t = String(text || '').trim()
    if (!t) return
    const userMsg = { id: Date.now(), role: 'user', text: t, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setTyping(true)
    try {
      // Build the data block the model will see. Keep it tight — just the
      // numbers and lists actually visible on this canvas right now.
      const chatData = {
        kpi: { id: kpi.id, name: kpi.shortName, framework: kpi.framework, domain: kpi.domain, unit: kpi.unit },
        value, status, benchmark: computed.benchmark, delta: computed.delta, reason,
        breakdown,
        details,   // student_list, entity_list, etc.
      }
      const apiMessages = nextMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.role === 'user' ? m.text : (m.markdown || ''),
      }))
      const { text: replyText, cards } = await fetchCanvasReply({
        role, profile,
        canvas: { title: kpi.shortName, subtitle: `${kpi.framework} · ${kpi.domain}` },
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
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'bot',
        html: `<div style="color:#B91C1C;font-size:12.5px">Couldn't reach Saathi. ${escapeForHtml(err?.message || String(err))}</div>`,
      }])
    } finally {
      setTyping(false)
    }
  }
  function escapeForHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

  // Used by the per-chart ✨ Ask AI button. Pre-fills the input (so the user
  // can edit before sending) and focuses it. The chat panel grows
  // automatically on first message via the messages list.
  function askAboutChart(prompt) {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 30)
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
        {details && (
          <DetailsRenderer
            details={details}
            onAsk={askAboutChart}
            onOpenSchool={({ name, udise }) => openCanvas({
              type: 'school-profile',
              schoolId: udise, schoolName: name,
              from: 'kpi_insight', kpiId: kpi.id,
            })}
            onOpenFullCanvas={(d) => openCanvas({
              type: d.drilldownCanvas,
              ...(d.drilldownContext || {}),
            })}
          />
        )}

        {/* 7-day trend — now interactive (hover for date + value tooltip).
            Shown for every role on this canvas, not just admins, because
            the user explicitly asked for it on the teacher view too. */}
        <ChartCard title="7-day trend" askPrompt={`Why is the ${kpi.shortName.toLowerCase()} trend like this?`} onAsk={askAboutChart}>
          <InteractiveTrendChart
            values={build7DaySeries(typeof value === 'number' ? value : 70)}
            status={status}
            unit={kpi.unit === '%' ? '%' : kpi.unit === 'hours' ? ' hrs' : ''}
          />
        </ChartCard>

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

      {/* Drag handle + chat panel are shared (same UX across all canvases). */}
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
        placeholder={`Ask about ${kpi.shortName.toLowerCase()}…`}
        onOpenStudent={({ ssmid, name }) => openCanvas({
          type: 'student-profile',
          studentId: ssmid,
          studentName: name,
          from: 'kpi_insight',
          kpiId: kpi.id,
        })}
      />
    </div>
  )
}
