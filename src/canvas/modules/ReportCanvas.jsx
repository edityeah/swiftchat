import React, { useState } from 'react'
import { Download, Filter, CheckCircle, BarChart2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// ── Report type definitions ───────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: 'attendance',  icon: '📅', label: 'Attendance Summary',  sub: 'Daily/monthly attendance report' },
  { id: 'academic',    icon: '📝', label: 'Academic Report',     sub: 'Marks, grades, performance' },
  { id: 'class-perf',  icon: '📊', label: 'Class Performance',   sub: 'Subject-wise class analysis' },
  { id: 'scholarship', icon: '🏅', label: 'Scholarship Status',  sub: 'Namo Laxmi eligibility' },
  { id: 'ews',         icon: '⚠️', label: 'EWS / At-Risk',       sub: 'Early warning system report' },
]

const DATE_RANGES = [
  { id: 'today',  label: 'Today'       },
  { id: 'week',   label: 'This Week'   },
  { id: 'month',  label: 'This Month'  },
  { id: 'term',   label: 'This Term'   },
  { id: 'year',   label: 'This Year'   },
]

// ── Report preview data per type ──────────────────────────────────────────────

const REPORT_CONTENT = {
  attendance: {
    summary: { title: 'Attendance Summary — Class 6-B', period: 'March 2025', generated: '8 Apr 2025' },
    stats: [
      { label: 'Total School Days', value: '23' },
      { label: 'Avg Attendance',    value: '87.4%' },
      { label: 'Perfect Attendance', value: '8 students' },
      { label: 'Chronic Absentees', value: '3 students' },
    ],
    rows: [
      { name: 'Ravi Patel',      days: '17/23', pct: '74%', status: '🔴 At Risk' },
      { name: 'Komal Shah',      days: '16/23', pct: '70%', status: '🔴 At Risk' },
      { name: 'Isha Trivedi',    days: '18/23', pct: '78%', status: '🟡 Watch'   },
      { name: 'Mehul Joshi',     days: '20/23', pct: '87%', status: '🟢 Good'    },
      { name: 'Priya Mehta',     days: '23/23', pct: '100%', status: '🟢 Perfect' },
      { name: 'Anil Kumar',      days: '21/23', pct: '91%', status: '🟢 Good'    },
      { name: 'Sonal Desai',     days: '22/23', pct: '96%', status: '🟢 Good'    },
      { name: 'Vijay Rajput',    days: '19/23', pct: '83%', status: '🟢 Good'    },
    ],
    cols: ['Student', 'Days', '%', 'Status'],
  },
  academic: {
    summary: { title: 'Academic Report — Class 6-B', period: 'Term 2 · 2024-25', generated: '8 Apr 2025' },
    stats: [
      { label: 'Class Average',   value: '71.2%' },
      { label: 'Highest Score',   value: '91% (Priya M.)' },
      { label: 'Below 40%',       value: '8 students' },
      { label: 'Remediation',     value: 'English, Maths' },
    ],
    rows: [
      { name: 'Mathematics', days: '67%',  pct: '8',   status: '🟡 Remediation' },
      { name: 'Science',     days: '72%',  pct: '5',   status: '🟢 On track'    },
      { name: 'English',     days: '58%',  pct: '12',  status: '🔴 Needs work'  },
      { name: 'Gujarati',    days: '81%',  pct: '2',   status: '🟢 Excellent'   },
      { name: 'Social Sci.', days: '74%',  pct: '4',   status: '🟡 Review'      },
    ],
    cols: ['Subject', 'Avg %', 'Below 40', 'Status'],
  },
  'class-perf': {
    summary: { title: 'Class Performance — GPS Mehsana', period: 'March 2025', generated: '8 Apr 2025' },
    stats: [
      { label: 'School Avg',      value: '88%' },
      { label: 'Best Class',      value: '8-A (95%)' },
      { label: 'Below Threshold', value: '3 classes' },
      { label: 'Alerts Sent',     value: '34 today' },
    ],
    rows: [
      { name: '8-A', days: '38/40', pct: '95%', status: '🟢 Excellent' },
      { name: '7-B', days: '36/40', pct: '90%', status: '🟢 Good'      },
      { name: '6-B', days: '34/38', pct: '89%', status: '🟢 Good'      },
      { name: '5-A', days: '28/38', pct: '73%', status: '🔴 Flagged'   },
      { name: '4-B', days: '27/38', pct: '71%', status: '🔴 Flagged'   },
    ],
    cols: ['Class', 'Present', 'Att. %', 'Status'],
  },
  scholarship: {
    summary: { title: 'Namo Laxmi Status — Class 6-B', period: 'March 2025', generated: '8 Apr 2025' },
    stats: [
      { label: 'Total Girls',    value: '19' },
      { label: 'Eligible (≥80%)',value: '16 (84%)' },
      { label: 'At Risk (<80%)', value: '3' },
      { label: 'DBT Pending',    value: '2' },
    ],
    rows: [
      { name: 'Ravi Patel',    days: '74%', pct: '< 80%', status: '🔴 At Risk'   },
      { name: 'Komal Shah',    days: '71%', pct: '< 80%', status: '🔴 At Risk'   },
      { name: 'Isha Trivedi',  days: '79%', pct: '< 80%', status: '🟡 Borderline' },
      { name: 'Priya Mehta',   days: '100%', pct: '> 80%', status: '🟢 Eligible' },
      { name: 'Sonal Desai',   days: '96%',  pct: '> 80%', status: '🟢 Eligible' },
    ],
    cols: ['Student', 'Att.', 'vs 80%', 'Status'],
  },
  ews: {
    summary: { title: 'EWS Alert Report — Class 6-B', period: 'March 2025', generated: '8 Apr 2025' },
    stats: [
      { label: 'Flagged',       value: '3 students' },
      { label: 'High Risk',     value: '1 (>60%)' },
      { label: 'Visits Pending',value: '1' },
      { label: 'Parents Notified', value: '3' },
    ],
    rows: [
      { name: 'Ravi Patel',   days: '72%', pct: 'High',   status: '🔴 Home Visit' },
      { name: 'Komal Shah',   days: '45%', pct: 'Medium', status: '🟡 Notify'     },
      { name: 'Isha Trivedi', days: '28%', pct: 'Low',    status: '🟡 Monitor'    },
    ],
    cols: ['Student', 'Risk %', 'Level', 'Action'],
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReportPreview({ type, dateRange }) {
  const content = REPORT_CONTENT[type] || REPORT_CONTENT.attendance
  return (
    <div className="mx-3.5 my-3 bg-white rounded-2xl border border-bdr-light shadow-card overflow-hidden">
      {/* Doc header */}
      <div className="bg-primary px-4 py-3 text-white">
        <div className="text-[9px] font-bold tracking-widest opacity-75">GOVERNMENT OF GUJARAT · VSK GUJARAT</div>
        <div className="text-[14px] font-bold mt-0.5">{content.summary.title}</div>
        <div className="text-[11px] opacity-75 mt-0.5">
          Period: {content.summary.period} · Generated: {content.summary.generated}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-px bg-bdr-light border-b border-bdr-light">
        {content.stats.map((stat, i) => (
          <div key={i} className="bg-primary-light px-3 py-2">
            <div className="text-[15px] font-bold text-primary">{stat.value}</div>
            <div className="text-[10px] text-txt-secondary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-left">
        <thead>
          <tr className="bg-surface-secondary">
            {content.cols.map((col, i) => (
              <th key={i} className="px-3 py-2 text-[9.5px] font-bold text-txt-tertiary uppercase tracking-wide whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, i) => (
            <tr key={i} className="border-t border-bdr-light">
              <td className="px-3 py-2 text-[11.5px] font-bold text-txt-primary">{row.name}</td>
              <td className="px-3 py-2 text-[11.5px] text-txt-secondary">{row.days}</td>
              <td className="px-3 py-2 text-[11.5px] text-txt-secondary">{row.pct}</td>
              <td className="px-3 py-2 text-[11.5px] text-txt-secondary">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-surface-secondary border-t border-bdr-light text-[10px] text-txt-tertiary flex items-center justify-between">
        <span>SwiftChat · VSK Gujarat · Confidential</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  )
}

// ── KPI drill-down view definitions ──────────────────────────────────────────

const KPI_REPORT_VIEWS = [
  { view: 'proficiency_breakdown',  title: 'Proficiency breakdown',             desc: 'Distribution of students by proficiency band (mock).' },
  { view: 'progression',            title: 'Cycle-on-cycle progression',         desc: 'Score trajectory across assessment cycles (mock).' },
  { view: 'fln',                    title: 'ORF / FLN breakdown',               desc: 'Oral reading fluency and foundational literacy/numeracy data (mock).' },
  { view: 'intervention_impact',    title: 'Intervention impact',               desc: 'Before/after comparison for remediation interventions (mock).' },
  { view: 'gsqac',                  title: 'GSQAC score breakdown',             desc: 'GSQAC school quality inspection scores by domain (mock).' },
  { view: 'gsqac_distribution',     title: 'Quality benchmark distribution',    desc: 'Schools distributed across quality benchmark tiers (mock).' },
  { view: 'gsqac_history',          title: 'GSQAC historical comparison',       desc: 'Year-on-year GSQAC score trend for this cluster (mock).' },
  { view: 'improvement_actions',    title: 'Improvement actions tracker',       desc: 'Outstanding and completed quality improvement actions (mock).' },
  { view: 'data_timeliness',        title: 'Same-day reporting timeliness',     desc: 'Percentage of schools submitting attendance same day (mock).' },
  { view: 'data_lag',               title: 'Dashboard data lag monitor',        desc: 'Time between data entry and dashboard sync across schools (mock).' },
  { view: 'dropout',                title: 'Dropout reduction view',            desc: 'Trend in student dropouts vs retention interventions (mock).' },
  { view: 'reenrollment',           title: 'Re-enrollment progress',            desc: 'Students successfully re-enrolled after dropout (mock).' },
  { view: 'pm_shri',                title: 'PM SHRI school performance',        desc: 'Performance indicators for PM SHRI designated schools (mock).' },
  { view: 'parent_proficiency',     title: "Your child's assessment",           desc: 'Parent-facing view of the child\'s latest assessment result (mock).' },
  { view: 'pending_downloads',      title: 'Schools with pending report downloads', desc: 'Schools that have not yet downloaded the latest cycle report (mock).' },
  { view: 'tpd_progress',           title: 'TPD hours — training progress',     desc: 'Your professional development progress (hours logged vs the 50-hour annual target). Modules across Prashikshak and Shikshak Sahayak 2.0 (mock).' },
]

function KpiReportView({ viewKey, onClose }) {
  const meta = KPI_REPORT_VIEWS.find(v => v.view === viewKey)
  if (!meta) return null
  return (
    <section className="p-4">
      <div className="rounded-2xl border border-bdr-light bg-white p-4 shadow-card">
        <h3 className="text-[13px] font-bold text-txt-primary">{meta.title}</h3>
        <p className="text-[12px] text-txt-secondary mt-1">{meta.desc}</p>
        <div className="mt-3 h-32 rounded-lg bg-surface-page" />
      </div>
    </section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ReportCanvas({ context }) {
  const { showToast, closeCanvas } = useApp()
  const view = context?.view || null
  const [reportType, setReportType] = useState(context.reportType || 'attendance')
  const [dateRange, setDateRange] = useState('month')
  const [generated, setGenerated] = useState(false)

  // If a KPI view key is supplied, render the targeted placeholder and skip
  // the full report-generator UI entirely.
  if (view && KPI_REPORT_VIEWS.some(v => v.view === view)) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto bg-surface-secondary">
          <KpiReportView viewKey={view} />
        </div>
        <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex-shrink-0">
          <button
            onClick={closeCanvas}
            className="w-full h-11 rounded-2xl border-[1.5px] border-bdr text-txt-secondary font-bold text-[13px]"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const handleGenerate = () => {
    setGenerated(true)
    showToast('Report generated ✓', 'ok')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Config strip */}
      {!generated && (
        <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-surface-secondary space-y-3">
          {/* Report type */}
          <div className="text-[13px] font-bold text-txt-primary mb-1">Report Type</div>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setReportType(rt.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border-[1.5px] text-left transition-all active:scale-[0.98] ${
                reportType === rt.id
                  ? 'border-primary bg-primary-light'
                  : 'border-bdr bg-white shadow-card'
              }`}
            >
              <span className="text-xl flex-shrink-0">{rt.icon}</span>
              <div>
                <div className={`text-[13px] font-bold ${reportType === rt.id ? 'text-primary' : 'text-txt-primary'}`}>
                  {rt.label}
                </div>
                <div className="text-[11px] text-txt-secondary">{rt.sub}</div>
              </div>
              {reportType === rt.id && (
                <CheckCircle size={16} className="text-primary ml-auto flex-shrink-0" />
              )}
            </button>
          ))}

          {/* Date range */}
          <div className="text-[13px] font-bold text-txt-primary mt-4 mb-1">Date Range</div>
          <div className="flex flex-wrap gap-2">
            {DATE_RANGES.map(dr => (
              <button
                key={dr.id}
                onClick={() => setDateRange(dr.id)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-colors ${
                  dateRange === dr.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-txt-secondary border-bdr'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>

          <div className="h-2" />
        </div>
      )}

      {/* Generated report */}
      {generated && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3.5 pt-3 pb-0">
            <div className="flex items-center gap-2 bg-ok-light border border-[#A5D6A7] rounded-2xl px-3 py-2">
              <CheckCircle size={14} className="text-ok" />
              <span className="text-[12px] font-bold text-ok">Report generated · Ready to download</span>
              <button
                onClick={() => setGenerated(false)}
                className="ml-auto text-[11px] text-txt-secondary font-semibold"
              >
                Edit
              </button>
            </div>
          </div>
          <ReportPreview type={reportType} dateRange={dateRange} />
        </div>
      )}

      {/* Footer actions */}
      <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex gap-2 flex-shrink-0">
        {!generated ? (
          <button
            onClick={handleGenerate}
            className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-[15px] active:opacity-80 flex items-center justify-center gap-2"
          >
            <BarChart2 size={17} /> Generate Report →
          </button>
        ) : (
          <>
            <button
              onClick={() => showToast('Shared via WhatsApp ✓', 'ok')}
              className="flex-1 h-12 rounded-2xl bg-surface-secondary text-txt-primary border border-bdr font-bold text-[13px] flex items-center justify-center gap-1.5 active:bg-primary-light"
            >
              📤 Share
            </button>
            <button
              onClick={() => { showToast('Report downloaded ✓', 'ok'); setTimeout(closeCanvas, 800) }}
              className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:opacity-80"
            >
              <Download size={15} /> Download
            </button>
          </>
        )}
      </div>
    </div>
  )
}
