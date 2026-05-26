import React, { useMemo, useRef, useState } from 'react'
import { ClipboardList, Download } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  subjectsForGrade, classAssessmentRollup, schoolAssessmentRollup,
  studentsForAssessment, scopedAssessmentBreakdown,
  participationForScope, PROFICIENCY_THRESHOLD,
  _assessHash, _assessRollup,
} from '../../data/assessmentData'
import { getDistrictHierarchy, getBlockHierarchy, schoolsForCluster } from '../../data/attendanceHierarchy'
import { DISTRICTS, titleCase } from '../../data/registries'
import { openStudentReportCard, openBulkStudentReportCards } from '../shared/studentReportCard'
import { openScopeAttendanceReport, openStudentAttendanceReport } from '../shared/attendanceReport'
import { openParticipationPdfForScope } from '../shared/participationReport'
import {
  ChartCard, InteractiveTrendChart, DragHandle, useResizableChat, ChatPanel,
  fetchCanvasReply, mdToHtml,
} from '../shared/kpiCanvasShared'

const FONT = 'Montserrat, sans-serif'

// ─── Six KPI configurations ─────────────────────────────────────────────────
// Each KPI surfaces a different mix of charts so the cards visually differ.
const KPI_CONFIG = {
  assessment_participation: {
    title: 'Assessment Participation',
    metric:  r => r.participationPct, unit: '%',
    sub:     r => `${r.participated.toLocaleString()} of ${r.totalStudents.toLocaleString()} students`,
    target: 95,
    tone:   v => v >= 95 ? 'green' : v >= 85 ? 'amber' : 'red',
    showSubjectsBars: true, showParticipationDonut: true, showStudentTable: true,
  },
  proficiency: {
    title: 'Assessment Result',
    metric:  r => r.passedPct, unit: '%',
    sub:     r => `${r.passedCount.toLocaleString()} passed of ${r.participated.toLocaleString()} appeared`,
    target: 75,
    tone:   v => v >= 75 ? 'green' : v >= 50 ? 'amber' : 'red',
    showScoreDistribution: true, showSubjectScoreBars: true, showStudentTable: true, allowReportCardDownload: true,
  },
  students_below_proficiency: {
    title: 'Below Assessment Result',
    metric:  r => r.belowPct, unit: '%',
    sub:     r => `${r.belowCount.toLocaleString()} students below ${PROFICIENCY_THRESHOLD}% threshold`,
    target: 10, lowerIsBetter: true,
    tone:   v => v <= 10 ? 'green' : v <= 25 ? 'amber' : 'red',
    showScoreDistribution: true, showStudentTable: true, allowReportCardDownload: true,
  },
  student_improvement_delta: {
    title: 'Student Improvement Δ',
    metric:  r => r.deltaScore, unit: ' pp',
    sub:     r => `${r.improvedCount.toLocaleString()} students improved by ≥ 5 pp`,
    target: 3,
    tone:   v => v >= 3 ? 'green' : v >= 0 ? 'amber' : 'red',
    showImprovementHistogram: true, showTopImprovers: true, showStudentTable: true,
  },
  orf_fln_improvement: {
    title: 'ORF / FLN Improvement',
    metric:  r => r.deltaScore, unit: ' pp',
    sub:     r => `Reading + foundational numeracy gain vs last cycle`,
    target: 4,
    tone:   v => v >= 4 ? 'green' : v >= 0 ? 'amber' : 'red',
    showOrfLevels: true, showFlnLevels: true,
  },
  reports_generated_downloaded: {
    title: 'Reports Downloaded',
    metric:  () => 93, unit: '%',
    sub:     () => 'Schools that have generated + downloaded report cards',
    target: 95,
    tone:   v => v >= 95 ? 'green' : v >= 80 ? 'amber' : 'red',
    showDownloadFunnel: true, showSchoolTable: true,
  },
}

// ─── Atoms ──────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, tone = 'neutral' }) {
  const tones = {
    green: { bg: '#D1FAE5', fg: '#065F46', bd: '#A7F3D0' },
    amber: { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
    red:   { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    neutral: { bg: '#FAFBFC', fg: '#0E0E0E', bd: '#E5E7EB' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 12, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontFamily: FONT }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '24px', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, marginTop: 2, opacity: 0.85 }}>{sub}</div>}
    </div>
  )
}

// Donut for binary participation (participated vs not).
function DonutBig({ value, tone = 'green', size = 120 }) {
  const stroke = tone === 'red' ? '#B91C1C' : tone === 'amber' ? '#92400E' : '#065F46'
  const r = 48, c = 2 * Math.PI * r
  const dash = (value / 100) * c
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#F1F5F9" strokeWidth={14} />
      <circle cx="60" cy="60" r={r} fill="none" stroke={stroke} strokeWidth={14} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: '#0E0E0E', fontFamily: FONT }}>{value}%</text>
      <text x="60" y="76" textAnchor="middle" style={{ fontSize: 10, fill: '#7383A5', fontFamily: FONT }}>participated</text>
    </svg>
  )
}

// Score-band histogram (90+, 75-89, 50-74, <50).
function ScoreBands({ counts, total }) {
  const bands = [
    { label: 'Distinction (90+)',  pct: total ? (counts.dist / total) * 100 : 0, count: counts.dist, color: '#065F46' },
    { label: 'Pass (75-89)',       pct: total ? (counts.pass / total) * 100 : 0, count: counts.pass, color: '#10B981' },
    { label: 'Just clear (50-74)', pct: total ? (counts.clear / total) * 100 : 0, count: counts.clear, color: '#F59E0B' },
    { label: 'Below (<50)',        pct: total ? (counts.below / total) * 100 : 0, count: counts.below, color: '#B91C1C' },
  ]
  return (
    <div>
      <div className="h-7 rounded-md overflow-hidden flex" style={{ border: '1px solid #E5E7EB' }}>
        {bands.map((b, i) => (
          <div key={i} title={`${b.label}: ${b.count} (${b.pct.toFixed(1)}%)`}
            style={{ width: `${b.pct}%`, background: b.color, color: '#FFFFFF', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: b.pct > 4 ? 'auto' : 0 }}>
            {b.pct > 8 ? `${b.count}` : ''}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {bands.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
            <span style={{ fontSize: 10.5, color: '#0E0E0E', fontWeight: 600 }}>{b.label} · {b.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Horizontal bars for "subject performance" — one row per subject.
function SubjectBars({ rows, valueKey = 'participationPct', accent = '#386AF6', max = 100, suffix = '%' }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const v = r[valueKey]
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: FONT }}>
              <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{r.subject}</span>
              <span style={{ color: '#7383A5' }}>{v}{suffix}{r.participated != null ? ` · ${r.participated} of ${r.totalStudents}` : ''}</span>
            </div>
            <div className="h-2 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
              <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: v >= 90 ? '#065F46' : v >= 75 ? '#10B981' : v >= 50 ? '#F59E0B' : '#B91C1C' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Histogram bins for the improvement delta KPI.
function ImprovementHistogram({ rows }) {
  // Bin deltas into [-20,-10), [-10,0), [0,5), [5,10), [10,20], >20
  const bins = [
    { label: 'Regressed',     min: -100, max: 0,   color: '#B91C1C' },
    { label: 'Flat',          min: 0,    max: 5,   color: '#F59E0B' },
    { label: 'Improved 5-10', min: 5,    max: 10,  color: '#10B981' },
    { label: 'Improved 10+',  min: 10,   max: 999, color: '#065F46' },
  ]
  const counts = bins.map(b => rows.filter(r => r.delta != null && r.delta >= b.min && r.delta < b.max).length)
  const max = Math.max(...counts, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '14px 6px', height: 140 }}>
      {bins.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0E0E0E', marginBottom: 4 }}>{counts[i]}</div>
          <div style={{ width: '70%', background: b.color, borderRadius: '6px 6px 0 0', height: `${(counts[i] / max) * 90}px`, minHeight: 4 }} />
          <div style={{ fontSize: 10.5, color: '#7383A5', marginTop: 6, textAlign: 'center', lineHeight: '13px' }}>{b.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Sub-views (one per KPI) ────────────────────────────────────────────────
function ParticipationView({ data, scope, subjectsTabs, schoolSubjectRows, onDownload }) {
  return (
    <>
      <div className="flex items-center gap-4 mt-3">
        <DonutBig value={data.participationPct} tone={data.participationPct >= 90 ? 'green' : data.participationPct >= 75 ? 'amber' : 'red'} />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <StatTile label="Enrolled"      value={data.totalStudents.toLocaleString()} tone="neutral" />
          <StatTile label="Appeared"      value={data.participated.toLocaleString()}  tone="green" />
          <StatTile label="Did not appear"value={(data.totalStudents - data.participated).toLocaleString()} sub="across all subjects" tone="red" />
          <StatTile label="Submission ✓"  value={`${data.participationPct}%`} sub="target 95%" tone={data.participationPct >= 95 ? 'green' : 'amber'} />
        </div>
      </div>

      {schoolSubjectRows && schoolSubjectRows.length > 0 && (
        <ChartCard title="Subject-wise participation" askPrompt="Which subject has the worst participation? Why?" onAsk={() => {}}>
          <SubjectBars rows={schoolSubjectRows} valueKey="participationPct" />
        </ChartCard>
      )}
    </>
  )
}

function ResultView({ data, schoolSubjectRows, scoreBands }) {
  return (
    <>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatTile label="Average score" value={`${data.avgScore}%`} tone={data.avgScore >= 75 ? 'green' : data.avgScore >= 50 ? 'amber' : 'red'} />
        <StatTile label="Passed"        value={data.passedCount.toLocaleString()} sub={`${data.passedPct}% of appeared`} tone={data.passedPct >= 75 ? 'green' : 'amber'} />
        <StatTile label="Below threshold" value={data.belowCount.toLocaleString()} sub={`${data.belowPct}%`} tone="red" />
        <StatTile label="Improved (Δ ≥ 5)" value={data.improvedCount.toLocaleString()} sub={`${data.improvedPct}%`} tone="green" />
      </div>

      <ChartCard title="Score distribution" askPrompt="Which score band needs the most help?" onAsk={() => {}}>
        <ScoreBands counts={scoreBands} total={data.participated} />
      </ChartCard>

      {schoolSubjectRows && schoolSubjectRows.length > 0 && (
        <ChartCard title="Subject-wise average score" askPrompt="Which subject is weakest?" onAsk={() => {}}>
          <SubjectBars rows={schoolSubjectRows} valueKey="avgScore" />
        </ChartCard>
      )}
    </>
  )
}

function BelowResultView({ data, scoreBands, students }) {
  const atRisk = students.filter(s => s.participated && s.score < PROFICIENCY_THRESHOLD)
  return (
    <>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatTile label="Below threshold" value={data.belowCount.toLocaleString()} sub={`${data.belowPct}% of appeared`} tone="red" />
        <StatTile label="Avg score (these)" value={`${atRisk.length ? Math.round(atRisk.reduce((a, s) => a + s.score, 0) / atRisk.length) : 0}%`} tone="red" />
        <StatTile label="EWS-flagged"  value={atRisk.filter(s => s.ewsFlag).length} sub="composite at-risk" tone="amber" />
        <StatTile label="High remedial" value={atRisk.filter(s => s.remedialCount >= 5).length} sub="≥5 LOs flagged" tone="red" />
      </div>

      <ChartCard title="Score distribution — focus on the red band" askPrompt="What support do these students need?" onAsk={() => {}}>
        <ScoreBands counts={scoreBands} total={data.participated} />
      </ChartCard>
    </>
  )
}

function DeltaView({ data, students }) {
  const validDeltas = students.filter(s => s.delta != null)
  const meanDelta = validDeltas.length ? +(validDeltas.reduce((a, s) => a + s.delta, 0) / validDeltas.length).toFixed(1) : 0
  const topImprovers = [...validDeltas].sort((a, b) => b.delta - a.delta).slice(0, 6)
  return (
    <>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatTile label="Mean Δ" value={`${meanDelta >= 0 ? '+' : ''}${meanDelta} pp`} tone={meanDelta >= 3 ? 'green' : meanDelta >= 0 ? 'amber' : 'red'} />
        <StatTile label="Improved (Δ ≥ 5)" value={data.improvedCount.toLocaleString()} sub={`${data.improvedPct}%`} tone="green" />
        <StatTile label="Regressed (Δ < 0)" value={validDeltas.filter(s => s.delta < 0).length} tone="red" />
        <StatTile label="Flat (0 ≤ Δ < 5)"   value={validDeltas.filter(s => s.delta >= 0 && s.delta < 5).length} tone="amber" />
      </div>

      <ChartCard title="Improvement histogram" askPrompt="Which bucket is the largest? What does that tell us?" onAsk={() => {}}>
        <ImprovementHistogram rows={validDeltas} />
      </ChartCard>

      <ChartCard title="Top 6 improvers" askPrompt="What did these students do differently?" onAsk={() => {}}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#FAFBFC' }}>
            <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prev</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Now</th>
            <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Δ</th>
          </tr></thead>
          <tbody>
            {topImprovers.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0E0E0E' }}>{s.name}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.prevScore}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.score}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', color: '#065F46', fontWeight: 700 }}>+{s.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </>
  )
}

function OrfFlnView({ data }) {
  // 4-level ORF + 5-level FLN distributions (synthesised from data.deltaScore).
  const orf = [
    { label: 'Beginner', count: 18, color: '#B91C1C' },
    { label: 'Letter',   count: 22, color: '#F59E0B' },
    { label: 'Word',     count: 28, color: '#10B981' },
    { label: 'Story',    count: 32, color: '#065F46' },
  ]
  const fln = [
    { label: 'Pre-numeric',    count: 12, color: '#B91C1C' },
    { label: 'Number ID',      count: 18, color: '#F59E0B' },
    { label: '1-digit ops',    count: 25, color: '#10B981' },
    { label: 'Multi-digit',    count: 28, color: '#10B981' },
    { label: 'Word problems',  count: 17, color: '#065F46' },
  ]
  const max = Math.max(...orf.map(o => o.count), ...fln.map(f => f.count))
  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile label="ORF gain" value={`${data.deltaScore >= 0 ? '+' : ''}${data.deltaScore} pp`} sub="words-per-minute, last cycle" tone={data.deltaScore >= 4 ? 'green' : 'amber'} />
        <StatTile label="FLN gain" value={`${(data.deltaScore + 1).toFixed(1)} pp`} sub="foundational numeracy" tone="green" />
        <StatTile label="At Story / Multi-digit" value={`${orf[3].count + fln[3].count + fln[4].count}`} sub="top-band students" tone="green" />
      </div>
      <ChartCard title="Oral Reading Fluency — current cycle levels" askPrompt="How do I move students from Word to Story?" onAsk={() => {}}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '14px 6px', height: 140 }}>
          {orf.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{b.count}</div>
              <div style={{ width: '70%', background: b.color, borderRadius: '6px 6px 0 0', height: `${(b.count / max) * 90}px`, minHeight: 4 }} />
              <div style={{ fontSize: 10.5, color: '#7383A5', marginTop: 6, textAlign: 'center' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </ChartCard>
      <ChartCard title="Foundational Literacy & Numeracy" askPrompt="Which FLN band needs intervention?" onAsk={() => {}}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, padding: '14px 6px', height: 140 }}>
          {fln.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{b.count}</div>
              <div style={{ width: '70%', background: b.color, borderRadius: '6px 6px 0 0', height: `${(b.count / max) * 90}px`, minHeight: 4 }} />
              <div style={{ fontSize: 10.5, color: '#7383A5', marginTop: 6, textAlign: 'center' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </ChartCard>
    </>
  )
}

function ReportsDownloadedView({ data }) {
  const funnel = [
    { label: 'Schools eligible',      value: 100, count: 33248 },
    { label: 'Reports generated',     value: 97,  count: 32260 },
    { label: 'Reports downloaded',    value: 93,  count: 30920 },
    { label: 'Sent to parents',       value: 78,  count: 25933 },
  ]
  return (
    <>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatTile label="Schools downloaded" value="93%" sub="30,920 / 33,248" tone="green" />
        <StatTile label="Awaiting download"  value="2,328" sub="2 weeks past cycle close" tone="amber" />
        <StatTile label="Sent to parents"   value="78%" sub="via SwiftChat broadcast" tone="amber" />
      </div>
      <ChartCard title="Report-card funnel" askPrompt="Why is the parent-share rate so low?" onAsk={() => {}}>
        <div className="space-y-2">
          {funnel.map((f, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-[11px]" style={{ fontFamily: FONT }}>
                <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: '#7383A5' }}>{f.count.toLocaleString()} · {f.value}%</span>
              </div>
              <div className="h-2.5 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${f.value}%`, background: f.value >= 90 ? '#065F46' : f.value >= 75 ? '#10B981' : '#F59E0B' }} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    </>
  )
}

// ─── Main canvas ───────────────────────────────────────────────────────────
export default function AssessmentDashboardCanvas({ context }) {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const { chatHeight, onPointerDown } = useResizableChat(containerRef, 240)

  const kpiId = context?.kpiId || 'assessment_participation'
  const cfg = KPI_CONFIG[kpiId] || KPI_CONFIG.assessment_participation

  // ── Scope resolution ──────────────────────────────────────────────────
  // Teacher = single class; Principal = whole school; CRC/BEO/DEO/State =
  // scope-aware breakdown (cluster/block/district/state).
  const scope = role === 'teacher' || role === 'parent' ? 'class'
              : role === 'principal' ? 'school'
              : role === 'crc' ? 'cluster'
              : role === 'beo' ? 'block'
              : role === 'deo' ? 'district'
              :                  'state'

  // Teacher's grade is FIXED (their assigned class). Principal+ can pick any
  // grade in the school. Cluster/Block/District/State use it as the grade
  // filter on the scope-aware table.
  const teacherFixedGrade = profile?.classes?.[0] || 6
  const [grade, setGrade] = useState(teacherFixedGrade)
  const subjects = subjectsForGrade(grade)
  const [subject, setSubject] = useState(subjects[0])
  // Keep subject valid when grade changes (different grades have different subjects)
  useMemo(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  // ── Hierarchical filters (DEO + BEO only) ──────────────────────────────
  // Same UX as the Attendance Dashboard: block / cluster / school dropdowns
  // that drill the entire canvas — table, headline, downloads — to that
  // sub-scope. When a filter is set we "promote" the effective scope as
  // though the user were a BEO / CRC / Principal viewing that entity.
  const [hierFilters, setHierFilters] = useState({ district: '', block: '', cluster: '', school: '' })

  // Cached hierarchy used to populate the dropdowns. State scope uses the
  // filter.district selection to build a fresh district hierarchy. DEO uses
  // its OWN district. BEO uses its own block. CRC's schools come straight
  // from schoolsForCluster.
  const districtHier = useMemo(() => {
    if (scope === 'district') return getDistrictHierarchy(profile?.district || 'Ahmedabad', 'today')
    if (scope === 'state' && hierFilters.district) return getDistrictHierarchy(hierFilters.district, 'today')
    return null
  }, [scope, profile?.district, hierFilters.district])
  const blockHier = useMemo(
    () => (scope === 'block') ? getBlockHierarchy(profile?.block || 'Mehsana', 'today') : null,
    [scope, profile?.block]
  )

  // Dropdown option sources — cascading based on parent selection.
  const allDistricts = scope === 'state' ? DISTRICTS.map(d => ({ name: titleCase(d.name) })) : []
  const allBlocks = (scope === 'district' || (scope === 'state' && hierFilters.district))
    ? (districtHier?.blocks || []) : []
  const allClusters = (() => {
    if ((scope === 'district' || scope === 'state') && hierFilters.block) {
      return districtHier?.blocks.find(b => b.name === hierFilters.block)?.clusters || []
    }
    return scope === 'block' ? (blockHier?.clusters || []) : []
  })()
  // Schools list — comes from the hierarchy when a parent filter is active,
  // OR straight from the CRC's own cluster (no parent filter needed since
  // they're already scoped to their cluster).
  const allSchools = useMemo(() => {
    if ((scope === 'district' || scope === 'state') && hierFilters.cluster) {
      return districtHier?.blocks.flatMap(b => b.clusters).find(c => c.name === hierFilters.cluster)?.schools || []
    }
    if (scope === 'block' && hierFilters.cluster) {
      return blockHier?.clusters.find(c => c.name === hierFilters.cluster)?.schools || []
    }
    if (scope === 'cluster') {
      // CRC: list all schools in their cluster (real + synth-padded). Convert
      // to hierarchy-shape so the override scopeTable can re-use the same
      // `metrics.total` fallback path as block/district drill-downs.
      return schoolsForCluster(profile?.cluster || 'MADHAPAR', profile?.block).map(s => ({
        schoolid: s.schoolid,
        name: s.school,
        metrics: { total: s.students || 100, present: 0, absent: 0, pct: 0 },
      }))
    }
    return []
  }, [scope, hierFilters.cluster, hierFilters.block, districtHier, blockHier, profile?.cluster, profile?.block])

  // Compute the EFFECTIVE scope + profile based on the active filter so all
  // downstream data (table, headline, downloads) drills to the selection.
  // - school filter → effective 'school' (one entity)
  // - cluster filter → effective 'cluster' (CRC view)
  // - block filter (DEO only) → effective 'block' (BEO view)
  // - no filter → keep the user's role-driven scope
  const effective = useMemo(() => {
    const overrideDistrict = hierFilters.district || profile?.district
    if (hierFilters.school) {
      const school = allSchools.find(s => String(s.schoolid) === String(hierFilters.school))
      return {
        scope: 'school',
        profile: {
          ...profile,
          district: overrideDistrict,
          school: school?.name || 'Selected school',
          schoolId: school?.schoolid,
          cluster: hierFilters.cluster || profile?.cluster,
          block: hierFilters.block || profile?.block,
        },
      }
    }
    if (hierFilters.cluster) {
      return { scope: 'cluster', profile: { ...profile, district: overrideDistrict, cluster: hierFilters.cluster, block: hierFilters.block || profile?.block } }
    }
    if (hierFilters.block) {
      return { scope: 'block', profile: { ...profile, district: overrideDistrict, block: hierFilters.block } }
    }
    if (hierFilters.district && scope === 'state') {
      return { scope: 'district', profile: { ...profile, district: hierFilters.district } }
    }
    return { scope, profile }
  }, [hierFilters.district, hierFilters.block, hierFilters.cluster, hierFilters.school, scope, profile, allSchools])

  // CRC's cluster view: by default the user has no school filter, but we
  // still want the table to list every school in their cluster (real +
  // synth-padded). Treat "CRC, no filter" the same as "CRC with implicit
  // cluster filter = profile.cluster" so the scopeTable override kicks in.
  const crcImplicitCluster = scope === 'cluster' && !hierFilters.school && !hierFilters.cluster
    ? (profile?.cluster || 'MADHAPAR')
    : ''

  // Per-scope data — use EFFECTIVE scope so filters drill the view.
  const classData  = useMemo(() => classAssessmentRollup(grade, subject), [grade, subject])
  const schoolData = useMemo(() => schoolAssessmentRollup(subject),       [subject])
  const scopedBreakdown = useMemo(() => scopedAssessmentBreakdown(effective.scope, subject), [effective.scope, subject])
  const students  = useMemo(() => studentsForAssessment(grade, subject),  [grade, subject])
  const rawScopeTable = useMemo(
    () => participationForScope({ scope: effective.scope, role, profile: effective.profile, subject, grade }),
    [effective.scope, role, effective.profile, subject, grade]
  )

  // When a hierarchical filter is active, rebuild the scope table directly
  // from the same hierarchy used to populate the dropdowns. This guarantees
  // the table shows EVERY entity the dropdown listed — e.g. if the cluster
  // dropdown shows 4 schools (real + synth-padded), the table also lists 4
  // schools, not just the 1-2 real ones from the registry sample.
  const scopeTable = useMemo(() => {
    if (!hierFilters.district && !hierFilters.block && !hierFilters.cluster && !hierFilters.school && !crcImplicitCluster) return rawScopeTable
    // CRC default (no explicit filter) → behave as if cluster filter was set
    // to their own cluster, so the table shows every school in the cluster.
    const activeCluster = hierFilters.cluster || crcImplicitCluster
    function rollupFor(key, total) {
      const r = _assessRollup(_assessHash(`${key}|${subject}|${grade}`), total)
      return { total, submitted: r.submitted, pct: r.pct, present: r.present, absent: r.absent }
    }
    // School filter — drop straight through to rawScopeTable, which (since
    // effective.scope === 'school') already returns STUDENT rows. The user
    // expects the same student list a Principal would see, so they can
    // download GCERT report cards from there. Don't replace with a 1-row
    // school summary.
    if (hierFilters.school) {
      return rawScopeTable
    }
    // Cluster filter (explicit OR CRC default) — one row per school in
    // the cluster, using the synth-padded list so dropdown == table.
    if (activeCluster) {
      const schools = allSchools
      const rows = schools.map(s => {
        const per = Math.max(15, Math.round((s.metrics?.total || 100) / 8))
        const r = rollupFor(`${s.schoolid}|school`, per)
        return { name: s.name, code: String(s.schoolid), ...r }
      }).sort((a, b) => b.pct - a.pct)
      const totals = rows.reduce((acc, r) => ({
        total: acc.total + r.total, submitted: acc.submitted + r.submitted,
        present: acc.present + r.present, absent: acc.absent + r.absent,
      }), { total: 0, submitted: 0, present: 0, absent: 0 })
      totals.pct = totals.total ? +((totals.submitted / totals.total) * 100).toFixed(1) : 0
      return { kind: 'schools', entityNoun: 'School', scope: 'cluster', scopeLabel: activeCluster, rows, totals }
    }
    // District filter (State role only) — one row per block in district
    if (hierFilters.district && !hierFilters.block && allBlocks.length) {
      const blocks = allBlocks
      const rows = blocks.map(b => {
        const per = b.clusters.reduce((acc, c) => acc + c.schools.reduce((a, s) => a + Math.max(15, Math.round((s.metrics?.total || 100) / 8)), 0), 0)
        const r = rollupFor(`${b.name}|block`, per)
        return { name: b.name, code: `${b.clusters.length} clusters`, schoolCount: b.clusters.reduce((a, c) => a + c.schools.length, 0), ...r }
      }).sort((a, b) => b.pct - a.pct)
      const totals = rows.reduce((acc, r) => ({
        total: acc.total + r.total, submitted: acc.submitted + r.submitted,
        present: acc.present + r.present, absent: acc.absent + r.absent,
      }), { total: 0, submitted: 0, present: 0, absent: 0 })
      totals.pct = totals.total ? +((totals.submitted / totals.total) * 100).toFixed(1) : 0
      return { kind: 'blocks', entityNoun: 'Block', scope: 'district', scopeLabel: hierFilters.district, rows, totals }
    }
    // Block filter — one row per cluster in the block (uses hierarchy clusters)
    if (hierFilters.block) {
      const clusters = allClusters
      const rows = clusters.map(c => {
        const per = c.schools.reduce((a, s) => a + Math.max(15, Math.round((s.metrics?.total || 100) / 8)), 0)
        const r = rollupFor(`${c.name}|cluster`, per)
        return { name: c.name, code: `${c.schools.length} schools`, schoolCount: c.schools.length, ...r }
      }).sort((a, b) => b.pct - a.pct)
      const totals = rows.reduce((acc, r) => ({
        total: acc.total + r.total, submitted: acc.submitted + r.submitted,
        present: acc.present + r.present, absent: acc.absent + r.absent,
      }), { total: 0, submitted: 0, present: 0, absent: 0 })
      totals.pct = totals.total ? +((totals.submitted / totals.total) * 100).toFixed(1) : 0
      return { kind: 'clusters', entityNoun: 'Cluster', scope: 'block', scopeLabel: hierFilters.block, rows, totals }
    }
    return rawScopeTable
  }, [rawScopeTable, hierFilters.district, hierFilters.block, hierFilters.cluster, hierFilters.school, crcImplicitCluster, allBlocks, allClusters, allSchools, subject, grade])

  // Headline = class data (teacher) / school data (others). When a sub-scope
  // filter is active for DEO/BEO on the participation KPI, recompute the
  // donut + KPI value from scopeTable so they reflect ONLY the selected
  // block / cluster / school. For other KPIs we keep the unfiltered headline
  // (score-rollups per block don't exist yet) — filters still drill the
  // table and download, which is what the user actually exports.
  const headlineOverride = (
    kpiId === 'assessment_participation' &&
    (hierFilters.block || hierFilters.cluster || hierFilters.school) &&
    scopeTable?.totals
  ) ? {
      ...schoolData,
      participationPct: scopeTable.totals.pct,
      participated:     scopeTable.totals.submitted,
      totalStudents:    scopeTable.totals.total,
    } : null
  const headline = headlineOverride || (effective.scope === 'class' ? classData : schoolData)

  // Per-subject summary rows for the bar charts (across all subjects in this grade)
  const schoolSubjectRows = useMemo(
    () => subjects.map(sub => effective.scope === 'class' ? classAssessmentRollup(grade, sub) : schoolAssessmentRollup(sub)).filter(Boolean),
    [subjects, grade, effective.scope]
  )

  // Score band counts for distribution charts (from per-student scores).
  const scoreBands = useMemo(() => {
    const c = { dist: 0, pass: 0, clear: 0, below: 0 }
    students.forEach(s => {
      if (!s.participated) return
      if (s.score >= 90)      c.dist++
      else if (s.score >= 75) c.pass++
      else if (s.score >= 50) c.clear++
      else                    c.below++
    })
    return c
  }, [students])

  if (!headline) {
    return <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>No assessment data in scope.</div>
  }

  // ── Downloads (scope-aware) ────────────────────────────────────────────
  // The contract:
  //   Teacher  → multi-page student participation report — ONE PAGE PER
  //              SUBJECT, all students of the teacher's class on each page.
  //   Principal→ ONE page · all students of the SELECTED class+subject.
  //   CRC      → school-level participation report for the cluster.
  //   BEO      → cluster-level for the block.
  //   DEO      → block-level for the district.
  //   State    → district-level statewide.
  const today = new Date()
  function downloadStudentParticipationReport(opts = {}) {
    // Used by Teacher (allSubjects=true) and Principal (allSubjects=false).
    // ONE PDF with multiple pages — never multiple windows. Each page has
    // donut + 4 stat tiles + student table (mirrors the on-screen view).
    const allSubjects = !!opts.allSubjects
    const subjList = allSubjects ? subjects : [subject]
    const school = {
      name: effective.profile?.school || profile?.school || 'Sardar Patel Prathmik Shala',
      udise: effective.profile?.schoolId || profile?.schoolId || '24330411449',
      district: effective.profile?.district || profile?.district || 'Mehsana',
    }
    openParticipationPdfForScope({
      scope: effective.scope, role, profile: effective.profile,
      grade, subjects: subjList, school,
    })
  }
  function downloadScopeParticipationReport() {
    // For CRC/BEO/DEO/State — uses the rolled-up entity rows.
    const rows = scopeTable.rows.map(r => ({
      entity: r.name, code: r.code,
      totalStudents: r.total ?? 0,
      submitted: r.submitted ?? 0,
      pct: r.pct ?? 0,
      present: r.present ?? r.submitted ?? 0,
      absent:  r.absent ?? Math.max(0, (r.total ?? 0) - (r.submitted ?? 0)),
    }))
    openScopeAttendanceReport({
      title: `XAMTA Data Entry Status · ${cfg.title} · Class ${grade} · ${subject}`,
      scopeLabel: scopeTable.scopeLabel,
      scopeFilter: `${subject} · Class ${grade}`,
      dateFrom: today, dateTo: today,
      entityNoun: scopeTable.entityNoun,
      rows,
    })
  }
  function downloadCurrentParticipation() {
    // Teacher (class): all 6 subjects of their class — ONE PDF, 6 pages.
    // Principal (school): all 6 subjects of the SELECTED grade — ONE PDF, 6 pages.
    // CRC/BEO/DEO/State: entity rollup for the current subject + grade.
    // If a sub-scope filter is active, use the drilled-to scope so a DEO
    // filtering to a single school gets a school PDF, not a district PDF.
    if (effective.scope === 'class' || effective.scope === 'school') {
      return downloadStudentParticipationReport({ allSubjects: true })
    }
    return downloadScopeParticipationReport()
  }
  function downloadDataEntryReport() {
    // Legacy alias for non-participation KPIs — keeps a usable district-style
    // export for KPIs we haven't migrated yet (Result, Below, etc.).
    downloadScopeParticipationReport()
  }
  function downloadAllReportCards() {
    const school = {
      name: profile?.school || 'Sardar Patel Prathmik Shala',
      udise: profile?.schoolId || '24330411449',
      district: profile?.district || 'Mehsana',
      block: profile?.block || 'Mehsana',
      cluster: profile?.cluster || 'Taluka Shala No. 1',
      subjectTeacher: 'Vyas Payalben Arvindkumar',
    }
    openBulkStudentReportCards({
      students: students.filter(s => s.participated).slice(0, 20).map(s => ({
        ...s, grade, dob: undefined, gender: s.gender,
      })),
      school,
      subjectsFilter: [subject],
    })
  }
  function downloadSingleReportCard(s) {
    const school = {
      name: profile?.school || 'Sardar Patel Prathmik Shala',
      udise: profile?.schoolId || '24330411449',
      district: profile?.district || 'Mehsana',
      block: profile?.block || 'Mehsana',
      cluster: profile?.cluster || 'Taluka Shala No. 1',
      subjectTeacher: 'Vyas Payalben Arvindkumar',
    }
    openStudentReportCard({
      student: { ...s, grade, dob: undefined, gender: s.gender },
      school,
    })
  }

  // ── Chat ──────────────────────────────────────────────────────────────
  const chatData = useMemo(() => ({
    kpi: kpiId, kpiTitle: cfg.title, scope, scopeLabel: profile?.school || profile?.district || 'Scope',
    subject, headline, scoreBands, schoolSubjectRows,
    studentsSample: students.slice(0, 20).map(s => ({ name: s.name, score: s.score, participated: s.participated, delta: s.delta })),
  }), [kpiId, cfg.title, scope, profile, subject, headline, scoreBands, schoolSubjectRows, students])

  async function send(text) {
    const tt = String(text || '').trim()
    if (!tt) return
    const userMsg = { id: Date.now(), role: 'user', text: tt }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')

    const lower = tt.toLowerCase()
    if (/^[⬇\s]*download.*data.entry/.test(lower) || /export.*xamta/.test(lower)) {
      downloadDataEntryReport()
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', html: `<div style="font-family:Montserrat,sans-serif;font-size:12.5px">Opening the XAMTA Data Entry Status report for <b>${subject}</b>. Use your browser's <b>Save as PDF</b> in the print dialog.</div>` }])
      return
    }
    if (/(report card|report cards).*download|download.*report cards/.test(lower)) {
      downloadAllReportCards()
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'bot', html: `<div style="font-family:Montserrat,sans-serif;font-size:12.5px">Opening 20 GCERT-style student report cards. Use <b>Save as PDF</b> in the print dialog.</div>` }])
      return
    }

    setTyping(true)
    try {
      const apiMessages = next.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.role === 'user' ? m.text : (m.markdown || '') }))
      const { text: replyText, cards } = await fetchCanvasReply({
        role, profile,
        canvas: { title: cfg.title, subtitle: `${subject} · ${scope}` },
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
  function askAboutChart(prompt) { setInput(prompt); setTimeout(() => inputRef.current?.focus(), 30) }

  const chips = [
    'Which subject is weakest?',
    'Who needs immediate intervention?',
    'Compare with last cycle',
    cfg.allowReportCardDownload ? '⬇ Download student report cards' : '⬇ Download data-entry report',
    `Plan a remediation week for ${subject}`,
  ]

  // ── Render ────────────────────────────────────────────────────────────
  const headlineValue = cfg.metric(headline)
  const headlineTone  = cfg.tone(headlineValue)
  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        {/* Header */}
        <div className="flex items-start gap-3 mb-1">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={18} color="#3730A3" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              A2 · Assessment & Learning Outcomes · {
                hierFilters.school ? (allSchools.find(s => String(s.schoolid) === String(hierFilters.school))?.name || 'Selected school') :
                hierFilters.cluster ? `${hierFilters.cluster} cluster` :
                hierFilters.block ? `${hierFilters.block} block · ${hierFilters.district || profile?.district || 'District'}` :
                hierFilters.district ? `${hierFilters.district} district` :
                scope === 'class'    ? `Class ${grade}` :
                scope === 'school'   ? (profile?.school || 'School level') :
                scope === 'cluster'  ? `${profile?.cluster || 'Cluster'} cluster` :
                scope === 'block'    ? `${profile?.block || 'Block'} block` :
                scope === 'district' ? `${profile?.district || 'District'} district` :
                scope === 'state'    ? 'Gujarat state' : `${scope} level`
              }
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E', lineHeight: '24px', marginTop: 2 }}>
              {cfg.title} · {headlineValue}{cfg.unit}
            </h2>
            <div style={{ fontSize: 12, color: '#7383A5', marginTop: 2 }}>
              {cfg.sub(headline)} · Target: {cfg.target}{cfg.unit}
            </div>
          </div>
          {/* Download button — scope-aware AND KPI-aware.
              - Teacher / Principal: student-level (per-subject participation
                or GCERT report cards for Result).
              - CRC / BEO / DEO / State: entity-level rollup. Schools roll
                up to clusters → blocks → districts → state. No student
                report cards at these scopes — that would be nonsensical
                (a DEO doesn't print 1.5L individual cards from one button). */}
          <button
            onClick={() => {
              if (kpiId === 'assessment_participation') return downloadCurrentParticipation()
              // For Result / Below / Δ / ORF / Reports KPIs:
              if (effective.scope === 'class' || effective.scope === 'school') {
                // Class scope (Teacher) or school scope (Principal):
                // Result + Below allow student GCERT cards. Others fall
                // through to the data report.
                if (cfg.allowReportCardDownload) return downloadAllReportCards()
                return downloadScopeParticipationReport()
              }
              // Cluster / block / district / state — always entity rollup.
              return downloadScopeParticipationReport()
            }}
            className="active:scale-95 transition-all inline-flex items-center gap-1.5"
            style={{ padding: '6px 12px', borderRadius: 999, background: '#386AF6', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}
          >
            <Download size={13} /> {
              kpiId === 'assessment_participation'
                ? (effective.scope === 'class' || effective.scope === 'school'
                    ? `All subjects (PDF) · Class ${grade}`
                    : `${scopeTable.entityNoun}-level (PDF)`)
                : (effective.scope === 'class' || effective.scope === 'school'
                    ? (cfg.allowReportCardDownload ? 'Report cards' : 'Data report')
                    : `${scopeTable.entityNoun}-level report (PDF)`)
            }
          </button>
        </div>

        {/* Block / Cluster / School drill-down filters (DEO + BEO only).
            Same UX as the Attendance Dashboard — when the user picks an
            entity, the headline, table AND the download report drill to
            that selection. */}
        {(scope === 'state' || scope === 'district' || scope === 'block' || scope === 'cluster') && (
          <div className="mt-3 flex items-center gap-2 flex-wrap" style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #D5D8DF', background: '#FAFBFC', fontFamily: FONT }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Filter</span>
            {scope === 'state' && (
              <select
                value={hierFilters.district}
                onChange={e => setHierFilters({ district: e.target.value, block: '', cluster: '', school: '' })}
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT }}
              >
                <option value="">All districts ({allDistricts.length})</option>
                {allDistricts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            )}
            {(scope === 'district' || scope === 'state') && (
              <select
                value={hierFilters.block}
                onChange={e => setHierFilters({ ...hierFilters, block: e.target.value, cluster: '', school: '' })}
                disabled={scope === 'state' && !hierFilters.district}
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT, opacity: (scope === 'state' && !hierFilters.district) ? 0.5 : 1 }}
              >
                <option value="">All blocks{allBlocks.length ? ` (${allBlocks.length})` : ''}</option>
                {allBlocks.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            )}
            {/* Cluster dropdown — hidden for CRC since they're locked to ONE cluster. */}
            {scope !== 'cluster' && (
              <select
                value={hierFilters.cluster}
                onChange={e => setHierFilters({ ...hierFilters, cluster: e.target.value, school: '' })}
                disabled={(scope === 'district' || scope === 'state') && !hierFilters.block}
                style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT, opacity: ((scope === 'district' || scope === 'state') && !hierFilters.block) ? 0.5 : 1 }}
              >
                <option value="">All clusters{allClusters.length ? ` (${allClusters.length})` : ''}</option>
                {allClusters.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            )}
            <select
              value={hierFilters.school}
              onChange={e => setHierFilters({ ...hierFilters, school: e.target.value })}
              disabled={scope !== 'cluster' && !hierFilters.cluster}
              style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT, opacity: (scope !== 'cluster' && !hierFilters.cluster) ? 0.5 : 1 }}
            >
              <option value="">All schools{allSchools.length ? ` (${allSchools.length})` : ''}</option>
              {allSchools.map(s => <option key={s.schoolid} value={s.schoolid}>{s.name}</option>)}
            </select>
            {(hierFilters.district || hierFilters.block || hierFilters.cluster || hierFilters.school) && (
              <button
                onClick={() => setHierFilters({ district: '', block: '', cluster: '', school: '' })}
                style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA', cursor: 'pointer', fontFamily: FONT }}
              >
                Clear filters ×
              </button>
            )}
          </div>
        )}

        {/* Filter row: Class selector (for Principal+) + Subject tabs */}
        {/* Class selector — locked for Teacher, free for everyone else. */}
        {scope !== 'class' && (
          <div className="mt-3 flex items-center gap-2 flex-wrap" style={{ fontFamily: FONT }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Class</span>
            <select
              value={grade}
              onChange={e => setGrade(Number(e.target.value))}
              style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, border: '1px solid #D5D8DF', background: '#FFFFFF', color: '#0E0E0E', fontFamily: FONT }}
            >
              {[1,2,3,4,5,6,7,8].map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase', marginLeft: 6 }}>Subject</span>
          </div>
        )}
        <div className={scope === 'class' ? 'mt-3 flex flex-wrap gap-1.5' : 'mt-2 flex flex-wrap gap-1.5'}>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              style={{
                fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
                background: s === subject ? '#386AF6' : '#FFFFFF',
                color:      s === subject ? '#FFFFFF' : '#0E0E0E',
                border: `1px solid ${s === subject ? '#386AF6' : '#D5D8DF'}`,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* KPI-specific body */}
        {kpiId === 'assessment_participation' && (
          <ParticipationView data={headline} scope={scope} schoolSubjectRows={schoolSubjectRows} onDownload={downloadDataEntryReport} />
        )}
        {kpiId === 'proficiency' && (
          <ResultView data={headline} schoolSubjectRows={schoolSubjectRows} scoreBands={scoreBands} />
        )}
        {kpiId === 'students_below_proficiency' && (
          <BelowResultView data={headline} scoreBands={scoreBands} students={students} />
        )}
        {kpiId === 'student_improvement_delta' && (
          <DeltaView data={headline} students={students} />
        )}
        {kpiId === 'orf_fln_improvement' && (
          <OrfFlnView data={headline} />
        )}
        {kpiId === 'reports_generated_downloaded' && (
          <ReportsDownloadedView data={headline} />
        )}

        {/* Scope-appropriate tabular data — driven by participationForScope.
            Teacher/Principal: student rows. Cluster: schools. Block:
            clusters. District: blocks. State: districts. */}
        {scopeTable.kind === 'students' && scopeTable.rows.length > 0 && (
          <ChartCard
            title={`Students · ${scopeTable.scopeLabel} · ${subject}`}
            askPrompt="Who needs immediate intervention?"
            onAsk={askAboutChart}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#FAFBFC' }}>
                  <th style={{ textAlign: 'left',  padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Name</th>
                  <th style={{ textAlign: 'left',  padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student ID</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Appeared</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Δ</th>
                  <th style={{ padding: '8px 10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {scopeTable.rows.slice(0, 60).map(s => {
                  const tone = !s.participated ? { bg: '#F1F5F9', fg: '#7383A5' }
                            : s.score >= 75 ? { bg: '#D1FAE5', fg: '#065F46' }
                            : s.score >= 50 ? { bg: '#FEF3C7', fg: '#92400E' }
                            : { bg: '#FEE2E2', fg: '#B91C1C' }
                  return (
                    <tr key={s.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0E0E0E' }}>
                        {s.name}{s.ewsFlag && <span style={{ fontSize: 9.5, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C' }}>EWS</span>}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#7383A5', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{s.ssmid}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.participated ? '✓' : '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>
                          {s.participated ? `${s.score}%` : 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: s.delta != null && s.delta > 0 ? '#065F46' : s.delta != null && s.delta < 0 ? '#B91C1C' : '#7383A5', fontWeight: 700 }}>
                        {s.delta != null ? (s.delta > 0 ? '+' : '') + s.delta : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {s.participated && (
                          <button onClick={() => downloadSingleReportCard(s)}
                            style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', cursor: 'pointer', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Download size={11} /> Report card
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ChartCard>
        )}

        {/* Schools / Clusters / Blocks / Districts — entity rollup table */}
        {scopeTable.kind !== 'students' && scopeTable.rows.length > 0 && (
          <ChartCard
            title={`${scopeTable.entityNoun}-wise breakdown · Class ${grade} · ${subject}`}
            askPrompt="Which ones need the most help?"
            onAsk={askAboutChart}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#FAFBFC' }}>
                  <th style={{ textAlign: 'left',  padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{scopeTable.entityNoun}</th>
                  <th style={{ textAlign: 'left',  padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Code</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submitted</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Submit %</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Present</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, color: '#828996', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Absent</th>
                </tr>
              </thead>
              <tbody>
                {scopeTable.rows.slice(0, 40).map((r, i) => {
                  const tone = r.pct >= 95 ? { bg: '#D1FAE5', fg: '#065F46' } : r.pct >= 85 ? { bg: '#FEF3C7', fg: '#92400E' } : { bg: '#FEE2E2', fg: '#B91C1C' }
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0E0E0E', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                      <td style={{ padding: '6px 10px', color: '#7383A5', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{r.code}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(r.total ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(r.submitted ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>{r.pct}%</span>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(r.present ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(r.absent ?? 0).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ChartCard>
        )}

        <div className="mt-6" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source · Xamta App (PAT/SAT digitisation) · Gyan Prabhav · GCERT report-card pipeline.
          Result threshold = {PROFICIENCY_THRESHOLD}%.
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
        placeholder={`Ask about ${cfg.title.toLowerCase()}…`}
      />
    </div>
  )
}
