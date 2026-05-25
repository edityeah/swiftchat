// KpiGridCard — hero KPI strip rendered as a responsive tile grid.
// Schema: { type:'kpi_grid', title, items:[{label, value, delta?, tone?, hint?}], chips }

import React from 'react'

const TONES = {
  primary: { bg: '#EEF2FF', fg: '#3730A3', border: '#C7D2FE' },
  sky:     { bg: '#E0F2FE', fg: '#075985', border: '#BAE6FD' },
  violet:  { bg: '#F3E8FF', fg: '#6B21A8', border: '#E9D5FF' },
  emerald: { bg: '#D1FAE5', fg: '#065F46', border: '#A7F3D0' },
  amber:   { bg: '#FEF3C7', fg: '#92400E', border: '#FDE68A' },
  rose:    { bg: '#FFE4E6', fg: '#9F1239', border: '#FECDD3' },
  indigo:  { bg: '#E0E7FF', fg: '#3730A3', border: '#C7D2FE' },
  teal:    { bg: '#CCFBF1', fg: '#115E59', border: '#99F6E4' },
}

export default function KpiGridCard({ card, onChip }) {
  const items = Array.isArray(card.items) ? card.items : []
  return (
    <div className="rounded-2xl border border-[#D5D8DF] bg-white shadow-sm overflow-hidden">
      {card.title && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#D5D8DF]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#386AF6]">{card.title}</div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3">
        {items.map((it, i) => {
          const tone = TONES[it.tone] || TONES.primary
          const deltaUp = typeof it.delta === 'string' && /^\+|↑|up/i.test(it.delta)
          const deltaDn = typeof it.delta === 'string' && /^-|↓|down|dip|drop/i.test(it.delta)
          const interactive = !!it.chip
          const Wrapper = interactive ? 'button' : 'div'
          return (
            <Wrapper
              key={i}
              onClick={interactive ? () => onChip?.(it.chip) : undefined}
              type={interactive ? 'button' : undefined}
              className={`text-left rounded-xl p-3 transition hover:shadow ${interactive ? 'cursor-pointer' : ''}`}
              style={{ background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold opacity-70 truncate inline-flex items-center gap-1 w-full">
                <span className="truncate">{it.label}</span>
                {interactive && <span className="ml-auto opacity-60 text-[9px]">›</span>}
              </div>
              <div className="text-[20px] md:text-[22px] font-bold leading-tight mt-0.5">{it.value}</div>
              {it.delta && (
                <div className={`text-[10px] font-bold mt-1 inline-flex items-center gap-1 ${deltaDn ? 'text-[#B91C1C]' : deltaUp ? 'text-[#065F46]' : 'text-[#475569]'}`}>
                  {it.delta}
                </div>
              )}
              {it.hint && (
                <div className="text-[10px] italic opacity-70 leading-snug mt-1">{it.hint}</div>
              )}
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}
