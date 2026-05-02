import React from 'react'
import { Lightbulb } from 'lucide-react'

// Standalone JSX equivalent of the green "AI Insight" banner used by the HTML
// renderer — handy if a future surface (e.g. a non-chat panel) wants to embed
// the insight without going through HTML strings.
export default function AskAiInsightCard({ children }) {
  if (!children) return null
  return (
    <div className="mt-2 flex items-start gap-2.5 px-3 py-3 rounded-xl bg-[#D4F5DC] border border-[#00BA34]">
      <Lightbulb size={18} className="text-[#007B22] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-[0.3px] text-[#007B22] uppercase mb-0.5">AI Insight</div>
        <div className="text-[13px] text-[#007B22] leading-snug font-medium break-words">{children}</div>
      </div>
    </div>
  )
}
