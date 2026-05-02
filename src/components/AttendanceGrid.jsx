import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const STUDENTS = [
  'Ravi P.','Komal S.','Isha T.','Mehul J.','Priya M.','Anil K.',
  'Sonal D.','Vijay R.','Meena B.','Hema V.','Raju P.','Anita S.',
  'Tara G.','Mohan L.','Geeta K.','Ramesh V.',
]

export default function AttendanceGrid({ onSubmit }) {
  const { showToast } = useApp()
  const [att, setAtt] = useState(() =>
    Object.fromEntries(STUDENTS.map((s, i) => [s, i >= 3]))
  )

  const toggle = n => setAtt(p => ({ ...p, [n]: !p[n] }))

  const handleSubmit = () => {
    showToast('Attendance submitted. Parent alerts queued 5 PM ✓', 'ok')
    onSubmit?.()
  }

  const present = Object.values(att).filter(Boolean).length

  return (
    <div className="px-1">
      <div className="text-[11px] font-bold text-txt-secondary mb-2">
        {present}/{STUDENTS.length} present today — tap to toggle
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {STUDENTS.map(name => (
          <button
            key={name}
            onClick={() => toggle(name)}
            className={`py-1.5 px-1 rounded-lg text-center text-[9.5px] font-bold border transition-all active:scale-95 select-none ${
              att[name]
                ? 'bg-ok-light border-[#C8E6C9] text-[#2E7D32]'
                : 'bg-danger-light border-[#FFCDD2] text-danger'
            }`}
          >
            {att[name] ? '✓ ' : '✗ '}{name}
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        className="w-full bg-primary text-white rounded-xl py-3 font-bold text-sm active:opacity-80"
      >
        ✅ Submit Attendance
      </button>
    </div>
  )
}
