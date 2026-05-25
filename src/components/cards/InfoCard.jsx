// InfoCard — narrative answer with optional bullets. Fallback card when no
// chart applies. Schema: { type:'info', title, body, bullets?, chips, tone? }

import React from 'react'
import { Info, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react'

const TONE_META = {
  info:    { icon: Info,           bg: '#EEF2FF', fg: '#1E3A8A', bd: '#C7D2FE' },
  insight: { icon: Sparkles,       bg: '#F0F9FF', fg: '#075985', bd: '#BAE6FD' },
  warn:    { icon: AlertTriangle,  bg: '#FFFBEB', fg: '#92400E', bd: '#FDE68A' },
  ok:      { icon: CheckCircle2,   bg: '#ECFDF5', fg: '#065F46', bd: '#A7F3D0' },
}

export default function InfoCard({ card }) {
  const meta = TONE_META[card.tone] || TONE_META.info
  const Icon = meta.icon
  const bullets = Array.isArray(card.bullets) ? card.bullets : []
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: meta.bg, border: `1px solid ${meta.bd}` }}
    >
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderBottomColor: meta.bd }}>
        <Icon size={14} style={{ color: meta.fg }} />
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: meta.fg }}>
          {card.title || 'Answer'}
        </div>
      </div>
      <div className="p-3">
        {card.body && (
          <div className="text-[13px] leading-relaxed" style={{ color: '#0E0E0E' }}>
            {card.body}
          </div>
        )}
        {bullets.length > 0 && (
          <ul className="mt-2 space-y-1 text-[12.5px]" style={{ color: '#0E0E0E' }}>
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#386AF6] flex-shrink-0 mt-0.5">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
