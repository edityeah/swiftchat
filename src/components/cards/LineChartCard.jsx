// LineChartCard — time-series line chart. Schema:
// { type:'line_chart', title, data:[{label, value}], color, annotation, unit, chips }

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Sparkles } from 'lucide-react'

const COLORS = {
  primary: '#386AF6', emerald: '#10B981', amber: '#F59E0B',
  rose: '#F43F5E', violet: '#8B5CF6', sky: '#0EA5E9',
}

function fmt(n) {
  if (typeof n !== 'number') return n
  if (n >= 1e7) return (n / 1e7).toFixed(1) + ' Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + ' L'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString('en-IN')
}

export default function LineChartCard({ card }) {
  const data = Array.isArray(card.data) ? card.data : []
  const color = COLORS[card.color] || COLORS.primary

  return (
    <div className="rounded-2xl border border-[#D5D8DF] bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#D5D8DF]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#386AF6]">{card.title || 'Trend'}</div>
        {card.unit && <div className="text-[10px] text-[#828996] mt-0.5">Unit: {card.unit}</div>}
      </div>
      <div className="p-3">
        {card.annotation && (
          <div className="mb-3 text-[12px] text-[#475569] inline-flex items-start gap-1.5 px-2">
            <Sparkles className="w-3 h-3 mt-0.5 text-[#386AF6] flex-shrink-0" />
            <span>{card.annotation}</span>
          </div>
        )}
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" fontSize={10} stroke="#7383A5" />
              <YAxis tickFormatter={fmt} fontSize={10} stroke="#7383A5" />
              <Tooltip
                formatter={(v) => fmt(v)}
                contentStyle={{ background: 'white', border: '1px solid #CFD8E6', borderRadius: 8, fontSize: 11 }}
                cursor={{ stroke: color, strokeOpacity: 0.2 }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
