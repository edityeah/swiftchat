import React from 'react'
import { useApp } from '../../context/AppContext'
import { resolveDrilldown } from '../../kpi/kpiActions'

const PILL = {
  red:     'bg-rose-100 text-rose-700',
  yellow:  'bg-amber-100 text-amber-800',
  green:   'bg-emerald-100 text-emerald-700',
  unknown: 'bg-slate-100 text-slate-600',
}
const LABEL = { red: 'RED', yellow: 'WATCH', green: 'GOOD', unknown: '—' }

export default function KpiInsightCard({ data }) {
  const { role, openCanvas, navigate } = useApp()
  if (!data || !data.kpi) return null
  const { kpi, value, benchmark, delta, status, reason } = data

  function runPrimary() {
    const dd = resolveDrilldown(kpi.id, role, {})
    if (!dd) return
    if (dd.kind === 'canvas') openCanvas({ type: dd.canvasType, ...dd.canvasContext })
    if (dd.kind === 'chat')   navigate('chat_' + dd.chatId)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden max-w-[360px]">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{kpi.shortName}</div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PILL[status] || PILL.unknown}`}>{LABEL[status] || LABEL.unknown}</span>
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-extrabold text-slate-900">{value ?? '—'}{kpi.unit === '%' ? '%' : ''}</span>
          {benchmark != null && delta != null && (
            <span className="text-[11px] text-slate-500">
              {kpi.benchmarkSource === 'fixed_target' ? 'Target' :
               kpi.benchmarkSource === 'school_avg' ? 'School' :
               kpi.benchmarkSource === 'cluster_avg' ? 'Cluster' : 'State'}{' '}
              {benchmark}{kpi.unit === '%' ? '%' : ''} · {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(0)} pts
            </span>
          )}
        </div>

        {reason && (
          <div className="text-[12.5px] text-slate-700 mt-2 leading-relaxed">{reason}</div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={runPrimary}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold border-[1.5px] border-primary text-primary bg-white"
          >
            {kpi.ctaLabel || 'Open'} ›
          </button>
        </div>

        <div className="text-[10px] text-slate-400 mt-2.5">
          {kpi.dataSource} · {kpi.sourceDashboard}
        </div>
      </div>
    </div>
  )
}
