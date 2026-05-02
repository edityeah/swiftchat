import React from 'react'

export default function TypingIndicator() {
  return (
    <div className="flex gap-1.5 self-start animate-bubble-in">
      <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center text-sm flex-shrink-0 self-end">
        🐦
      </div>
      <div className="px-3 py-3 rounded-2xl rounded-bl-[4px] bg-white shadow-card flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-txt-tertiary animate-typing"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}
