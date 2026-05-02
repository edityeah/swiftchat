import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────────────────────

const CLASS_DATA = {
  class: {
    title: 'Class 6-B · GPS Mehsana',
    kpis: [
      { icon: '📅', label: 'Attendance', value: '89.5%', sub: '34/38 today', trend: 'up',   color: '#4CAF50' },
      { icon: '⚠️', label: 'At-Risk',   value: '3',     sub: 'Namo Laxmi',  trend: 'warn', color: '#FFB300' },
      { icon: '🏅', label: 'Scholarship',value: '32/38', sub: '84% eligible',trend: 'up',  color: '#386AF6' },
      { icon: '📝', label: 'XAMTA Avg', value: '67%',   sub: 'Last test',   trend: 'down', color: '#E53935' },
    ],
    trend: {
      label: 'Last 7 Days — Class 6-B Attendance',
      bars: [
        { day: 'Mon', pct: 86 },{ day: 'Tue', pct: 89 },{ day: 'Wed', pct: 84 },
        { day: 'Thu', pct: 92 },{ day: 'Fri', pct: 88 },{ day: 'Sat', pct: 79 },{ day: 'Today', pct: 90 },
      ],
    },
    table: {
      heading: 'Subject Performance',
      cols: ['Subject', 'Avg %', 'Below 40%', 'Status'],
      rows: [
        ['Mathematics', '67%', '8', '🟡 Remediation'],
        ['Science',     '72%', '5', '🟢 On track'   ],
        ['English',     '58%', '12','🔴 Needs work'  ],
        ['Gujarati',    '81%', '2', '🟢 On track'   ],
        ['Social Sci.', '74%', '4', '🟡 Review'     ],
      ],
    },
    alerts: [
      { icon: '🔴', text: 'Ravi Patel — 72% dropout risk · Schedule home visit' },
      { icon: '🟡', text: 'Komal Shah — 74% attendance · Namo Laxmi at risk'   },
      { icon: '🟡', text: '8 students below 40% in English — remediation class' },
    ],
  },
  school: {
    title: 'GPS Mehsana — School Overview',
    kpis: [
      { icon: '📅', label: 'Attendance', value: '88%',  sub: '784/892 today', trend: 'up',   color: '#4CAF50' },
      { icon: '🏫', label: 'Classes',    value: '22',   sub: '3 below 75%',   trend: 'warn', color: '#FFB300' },
      { icon: '🏅', label: 'Namo Laxmi',value: '91%',  sub: '813 eligible',  trend: 'up',   color: '#386AF6' },
      { icon: '📨', label: 'Alerts Sent',value: '34',  sub: 'Today',         trend: 'up',   color: '#9C27B0' },
    ],
    trend: {
      label: 'Last 7 Days — School Attendance',
      bars: [
        { day: 'Mon', pct: 85 },{ day: 'Tue', pct: 87 },{ day: 'Wed', pct: 83 },
        { day: 'Thu', pct: 90 },{ day: 'Fri', pct: 88 },{ day: 'Sat', pct: 80 },{ day: 'Today', pct: 88 },
      ],
    },
    table: {
      heading: 'Class-wise Attendance',
      cols: ['Class', 'Present', 'Att. %', 'Status'],
      rows: [
        ['8-A', '38/40', '95%', '🟢'],
        ['7-B', '36/40', '90%', '🟢'],
        ['7-A', '35/40', '87%', '🟢'],
        ['8-B', '34/40', '85%', '🟡'],
        ['6-A', '33/40', '82%', '🟡'],
        ['6-B', '34/38', '89%', '🟢'],
        ['5-A', '28/38', '73%', '🔴'],
        ['4-B', '27/38', '71%', '🔴'],
      ],
    },
    alerts: [
      { icon: '🔴', text: 'Class 5-A — 73% below threshold · 3 days this week' },
      { icon: '🔴', text: 'Class 4-B — 71% · 5 chronic absentees' },
      { icon: '🟡', text: '3 parent callback requests pending' },
    ],
  },
  district: {
    title: 'Ahmedabad District Overview',
    kpis: [
      { icon: '📅', label: 'District Avg', value: '87.3%', sub: '48,290 schools', trend: 'up',   color: '#4CAF50' },
      { icon: '🔴', label: 'War Room',     value: 'Active', sub: 'Daskroi 72.1%', trend: 'warn', color: '#E53935' },
      { icon: '💰', label: 'DBT',          value: '97%',   sub: '1128 blocked',  trend: 'up',   color: '#386AF6' },
      { icon: '🏫', label: 'Below 70%',   value: '142',   sub: 'Schools',       trend: 'down', color: '#E53935' },
    ],
    trend: {
      label: 'District Attendance — Last 7 Days',
      bars: [
        { day: 'Mon', pct: 86 },{ day: 'Tue', pct: 87 },{ day: 'Wed', pct: 85 },
        { day: 'Thu', pct: 88 },{ day: 'Fri', pct: 87 },{ day: 'Sat', pct: 82 },{ day: 'Today', pct: 87 },
      ],
    },
    table: {
      heading: 'Block-wise Status',
      cols: ['Block', 'Avg Att.', 'Schools <70%', 'Status'],
      rows: [
        ['Bavla',    '91.8%', '0',  '🟢 Excellent'],
        ['Sanand',   '84.2%', '12', '🟡 Monitor'  ],
        ['Viramgam', '83.1%', '15', '🟡 Monitor'  ],
        ['Dholka',   '80.4%', '22', '🟡 Review'   ],
        ['Detroj',   '76.8%', '31', '🔴 Flagged'  ],
        ['Daskroi',  '72.1%', '62', '🔴 War Room' ],
      ],
    },
    alerts: [
      { icon: '🔴', text: 'Daskroi — War Room Day 1/14 · Target: 80% by Apr 22' },
      { icon: '🔴', text: '1,128 Namo Laxmi DBT blocked — invalid bank / docs'   },
      { icon: '🟡', text: '142 schools below 70% — BRC interventions required'   },
    ],
  },
}

// Determine scope from context
function getScope(ctx) {
  if (ctx.scope) return ctx.scope
  if (ctx.role === 'deo') return 'district'
  if (ctx.role === 'principal') return 'school'
  return 'class'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ kpi }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus
  const trendColor = kpi.trend === 'up' ? '#4CAF50' : kpi.trend === 'down' ? '#E53935' : '#FFB300'
  return (
    <div className="bg-white rounded-2xl p-3 border border-bdr-light shadow-card flex flex-col gap-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-base leading-none">{kpi.icon}</span>
        <TrendIcon size={13} style={{ color: trendColor }} />
      </div>
      <div className="text-[20px] font-bold leading-none" style={{ color: kpi.color }}>
        {kpi.value}
      </div>
      <div className="text-[11px] font-bold text-txt-primary">{kpi.label}</div>
      <div className="text-[10px] text-txt-secondary">{kpi.sub}</div>
    </div>
  )
}

function BarChart({ data }) {
  const max = Math.max(...data.bars.map(b => b.pct))
  return (
    <div className="bg-white rounded-2xl p-3.5 border border-bdr-light shadow-card">
      <div className="text-[12px] font-bold text-txt-primary mb-3">{data.label}</div>
      <div className="flex items-end justify-between gap-1 h-20">
        {data.bars.map((bar, i) => {
          const h = Math.round((bar.pct / max) * 80)
          const isToday = bar.day === 'Today'
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-txt-tertiary">{bar.pct}%</span>
              <div
                className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-primary' : 'bg-primary/30'}`}
                style={{ height: `${h}px` }}
              />
              <span className={`text-[8.5px] font-semibold ${isToday ? 'text-primary' : 'text-txt-tertiary'}`}>
                {bar.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DataTable({ table }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-bdr-light shadow-card">
      <div className="px-3.5 py-2.5 border-b border-bdr-light">
        <span className="text-[12px] font-bold text-txt-primary">{table.heading}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-secondary">
              {table.cols.map((col, i) => (
                <th key={i} className="px-3 py-2 text-[10px] font-bold text-txt-tertiary uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-bdr-light">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 text-[12px] whitespace-nowrap ${j === 0 ? 'font-bold text-txt-primary' : 'text-txt-secondary'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlertsList({ alerts }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-bdr-light shadow-card">
      <div className="px-3.5 py-2.5 border-b border-bdr-light flex items-center gap-1.5">
        <AlertCircle size={13} className="text-danger" />
        <span className="text-[12px] font-bold text-txt-primary">Active Alerts</span>
      </div>
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 border-t border-bdr-light first:border-0">
          <span className="text-base leading-none mt-0.5 flex-shrink-0">{alert.icon}</span>
          <span className="text-[12px] text-txt-secondary leading-relaxed">{alert.text}</span>
        </div>
      ))}
    </div>
  )
}

// ── Scope Tabs ────────────────────────────────────────────────────────────────

const SCOPE_OPTIONS = {
  teacher:   [{ id: 'class',    label: 'Class'    }],
  principal: [{ id: 'school',   label: 'School'   }, { id: 'class', label: 'Class' }],
  deo:       [{ id: 'district', label: 'District' }, { id: 'blocks', label: 'Blocks' }],
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardCanvas({ context }) {
  const initialScope = getScope(context)
  const [scope, setScope] = useState(initialScope === 'blocks' ? 'district' : initialScope)
  const data = CLASS_DATA[scope] || CLASS_DATA.class
  const scopeOptions = SCOPE_OPTIONS[context.role] || SCOPE_OPTIONS.teacher

  return (
    <div className="flex flex-col h-full">
      {/* Scope tabs */}
      {scopeOptions.length > 1 && (
        <div className="flex border-b border-bdr-light bg-white flex-shrink-0 px-3.5 pt-2">
          {scopeOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setScope(opt.id)}
              className={`px-4 py-2 text-[13px] font-semibold transition-colors border-b-2 mr-2 ${
                scope === opt.id
                  ? 'text-primary border-primary'
                  : 'text-txt-secondary border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 bg-surface-secondary space-y-3">
        {/* Context label */}
        <div className="flex items-center gap-1.5">
          <CheckCircle size={13} className="text-primary" />
          <span className="text-[12px] font-bold text-txt-secondary">{data.title}</span>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2">
          {data.kpis.map((kpi, i) => <KPICard key={i} kpi={kpi} />)}
        </div>

        {/* Bar chart */}
        <BarChart data={data.trend} />

        {/* Table */}
        <DataTable table={data.table} />

        {/* Alerts */}
        <AlertsList alerts={data.alerts} />

        {/* Spacer */}
        <div className="h-2" />
      </div>

      {/* Quick action footer */}
      <div className="border-t border-bdr-light bg-white px-3.5 py-3 flex gap-2 flex-shrink-0">
        <button className="flex-1 h-10 rounded-xl bg-primary-light text-primary text-[12px] font-bold active:bg-primary active:text-white transition-colors">
          📊 Export
        </button>
        <button className="flex-1 h-10 rounded-xl bg-surface-secondary text-txt-primary text-[12px] font-bold border border-bdr active:bg-primary-light transition-colors">
          📨 Share
        </button>
        <button className="flex-1 h-10 rounded-xl bg-surface-secondary text-txt-primary text-[12px] font-bold border border-bdr active:bg-primary-light transition-colors">
          🖨️ Print
        </button>
      </div>
    </div>
  )
}
