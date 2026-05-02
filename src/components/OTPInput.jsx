import React, { useRef, useState } from 'react'

export default function OTPInput({ length = 6, onComplete }) {
  const [vals, setVals] = useState(Array(length).fill(''))
  const refs = useRef([])

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...vals]
    next[i] = v
    setVals(next)
    if (v && i < length - 1) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) onComplete?.(next.join(''))
  }

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !vals[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="grid grid-cols-6 gap-2 my-3">
      {vals.map((v, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`aspect-square rounded-xl border-[1.5px] text-xl font-bold text-center bg-white text-txt-primary outline-none transition-colors ${
            v ? 'border-primary bg-primary-light text-primary' : 'border-bdr'
          }`}
        />
      ))}
    </div>
  )
}
