import React from 'react'

export default function QuickReplies({ chips = [], onSelect, usedChips = [] }) {
  if (!chips.length) return null
  return (
    <div className="px-2.5 py-1.5 flex gap-1.5 overflow-x-auto flex-shrink-0 bg-surface-chat scrollbar-hide">
      {chips.map((chip, i) => {
        const used = usedChips.includes(chip)
        return (
          <button
            key={i}
            onClick={() => !used && onSelect(chip)}
            className={`px-3.5 py-2 rounded-full flex-shrink-0 text-[12.5px] font-medium whitespace-nowrap transition-colors ${
              used
                ? 'border border-bdr text-txt-tertiary cursor-default'
                : 'border-[1.5px] border-primary text-primary bg-white active:bg-primary-light'
            }`}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
