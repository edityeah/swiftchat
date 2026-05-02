import React, { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import {
  getOrderedPromptsForRole,
} from '../../data/askAi/askAiPrompts'

// Flat, role-filtered prompt list rendered as a single bubble-chip pool. Used
// by non-chat surfaces (e.g. when the chat surface isn't available). The chat
// flow itself uses progressive reveal via askAiEngine; this component is the
// "show everything in one place" alternative without layer headings.
export default function AskAiPromptPanel({ role, onSelect }) {
  const prompts = useMemo(() => getOrderedPromptsForRole(role), [role])
  if (!prompts.length) return null
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-[#7C3AED]" />
        <span className="text-[12px] font-bold tracking-[0.4px] text-[#7C3AED] uppercase">Ask AI · Prompts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p)}
            className="px-3 py-1.5 rounded-full border border-bdr text-[12.5px] text-txt-primary bg-white hover:bg-surface-secondary active:bg-surface-secondary text-left max-w-full"
            style={{ fontFamily: 'Montserrat, sans-serif', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {p.text}
          </button>
        ))}
      </div>
    </div>
  )
}
