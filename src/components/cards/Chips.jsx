// Chips — follow-up prompt suggestions rendered below a card. Tapping a chip
// fires the same query path as typing it in the composer.

import React from 'react'

export default function Chips({ chips = [], onChip }) {
  if (!chips.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={() => onChip?.(c)}
          className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition active:scale-95"
          style={{
            background: '#FFFFFF', border: '1px solid #C7D2FE', color: '#386AF6',
            fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
