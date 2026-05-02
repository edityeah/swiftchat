import React from 'react'

const VARIANTS = {
  primary: 'border-[#386AF6] text-[#386AF6] hover:bg-[#EEF2FF] active:bg-[#386AF6]',
  ok:      'border-[#00BA34] text-[#00BA34] hover:bg-[#D4F5DC] active:bg-[#00BA34]',
  warn:    'border-[#F8B200] text-[#9A6500] hover:bg-[#FFF3CC] active:bg-[#F8B200]',
  err:     'border-[#EB5757] text-[#C0392B] hover:bg-[#FDEAEA] active:bg-[#EB5757]',
}

// Mirror of the chat-bubble action button row, used when Ask AI components
// render outside the chat thread.
export default function AskAiActionButtons({ actions = [], onRun }) {
  if (!actions.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.map((a, i) => (
        <button
          key={a.id || i}
          onClick={() => onRun?.(a)}
          className={`px-4 py-1.5 rounded-full border-[1.5px] text-[12px] font-semibold bg-white transition-colors active:text-white whitespace-normal text-left max-w-full ${VARIANTS[a.variant] || VARIANTS.primary}`}
          style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.25px' }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
