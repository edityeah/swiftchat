import React from 'react'
import AskAiInsightCard from './AskAiInsightCard'
import AskAiActionButtons from './AskAiActionButtons'

// JSX-rendered version of the Ask AI result card. The chat surface uses the
// HTML renderer (`askAiCardHtml`) for consistency with the existing chat
// bubble pipeline; this component is for non-chat surfaces (e.g. dedicated
// pages, future Ask AI canvas).
export default function AskAiResultCard({
  question, answer, table = [], insight, category = 'Access', onRunAction, actions = [],
}) {
  const keys = table[0] ? Object.keys(table[0]) : []
  return (
    <div className="bg-white border border-bdr-light rounded-xl p-4 max-w-full overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] leading-none">✨</span>
        <span className="text-[12px] font-bold tracking-[0.4px] text-[#7C3AED] uppercase">Ask AI</span>
        <span className="ml-auto text-[10px] font-bold tracking-[0.3px] text-[#7C3AED] uppercase px-2 py-0.5 rounded-full bg-[#F4EEFF] border border-[#D8C9F8]">
          {category}
        </span>
      </div>
      <div className="text-[14px] font-semibold text-txt-primary mb-2 break-words">{question}</div>
      {answer && (
        <div className="text-[13px] text-txt-primary mb-2 leading-snug break-words">
          <span className="text-[10px] font-bold uppercase tracking-[0.3px] mr-1.5 px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#345CCC]">Answer</span>
          {answer}
        </div>
      )}
      {table.length > 0 && (
        <div className="border border-bdr-light rounded-lg overflow-hidden mb-2">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-[13px] text-left">
              <thead className="bg-surface-secondary">
                <tr>
                  {keys.map(k => (
                    <th key={k} className="px-3 py-2 text-[10px] font-semibold tracking-[0.4px] uppercase text-txt-secondary border-b border-bdr-light">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((r, i) => (
                  <tr key={i}>
                    {keys.map(k => (
                      <td key={k} className="px-3 py-2.5 text-[13px] text-txt-primary border-b border-bdr-light whitespace-nowrap">
                        {String(r[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AskAiInsightCard>{insight}</AskAiInsightCard>
      <AskAiActionButtons actions={actions} onRun={onRunAction} />
    </div>
  )
}
