import React from 'react'
import { ChevronRight } from 'lucide-react'

// One layer's prompts as a vertical list of large tap targets. Used inside
// AskAiPromptPanel for the "More Prompts" overlay.
export default function AskAiPromptGroup({ title, subtitle, prompts = [], onSelect }) {
  if (!prompts.length) return null
  return (
    <section className="mb-4">
      <div className="px-1 mb-2">
        <div className="text-[11px] font-bold tracking-[0.4px] text-[#7C3AED] uppercase">{title}</div>
        {subtitle && <div className="text-[12px] text-txt-secondary mt-0.5">{subtitle}</div>}
      </div>
      <div className="bg-white border border-bdr-light rounded-xl overflow-hidden">
        {prompts.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p)}
            className={`w-full text-left flex items-center gap-2 px-3 py-3 hover:bg-surface-secondary active:bg-surface-secondary transition-colors ${
              i < prompts.length - 1 ? 'border-b border-bdr-light' : ''
            }`}
          >
            <span className="text-[#386AF6] font-bold flex-shrink-0">→</span>
            <span className="text-[13px] text-txt-primary flex-1 leading-snug">{p.text}</span>
            <ChevronRight size={14} className="text-txt-tertiary flex-shrink-0" />
          </button>
        ))}
      </div>
    </section>
  )
}
