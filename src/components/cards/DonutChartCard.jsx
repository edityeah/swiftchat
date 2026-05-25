// DonutChartCard — distribution pie chart with legend.
// Schema: { type:'donut_chart', title, data:[{label, value, color?}], annotation, chips }

import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Sparkles } from 'lucide-react'

const PALETTE = ['#386AF6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#0EA5E9', '#14B8A6', '#D946EF']

function fmt(n) {
  if (typeof n !== 'number') return n
  if (n >= 1e7) return (n / 1e7).toFixed(1) + ' Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + ' L'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString('en-IN')
}

export default function DonutChartCard({ card }) {
  const data = Array.isArray(card.data) ? card.data : []
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)

  return (
    <div className="rounded-2xl border border-[#D5D8DF] bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#D5D8DF]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#386AF6]">{card.title || 'Distribution'}</div>
      </div>
      <div className="p-3">
        {card.annotation && (
          <div className="mb-3 text-[12px] text-[#475569] inline-flex items-start gap-1.5 px-2">
            <Sparkles className="w-3 h-3 mt-0.5 text-[#386AF6] flex-shrink-0" />
            <span>{card.annotation}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div style={{ width: 200, height: 200, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color || PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => fmt(v)}
                  contentStyle={{ background: 'white', border: '1px solid #CFD8E6', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0E0E0E' }}>{fmt(total)}</div>
              <div style={{ fontSize: 10, color: '#828996', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total</div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ul className="space-y-1.5">
              {data.map((d, i) => {
                const pct = total ? (d.value / total) * 100 : 0
                return (
                  <li key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color || PALETTE[i % PALETTE.length] }} />
                    <span className="flex-1 text-[#0E0E0E] truncate">{d.label}</span>
                    <span className="text-[#0E0E0E] font-semibold">{fmt(d.value)}</span>
                    <span className="text-[#828996] w-12 text-right">{pct.toFixed(1)}%</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
