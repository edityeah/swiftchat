import React from 'react'
import { useApp } from '../context/AppContext'

const bgMap = { ok: 'bg-ok', info: 'bg-primary', e: 'bg-[#C62828]', '': 'bg-[#323232]' }

export default function Toast() {
  const { toast } = useApp()
  return (
    <div
      className={`fixed bottom-[72px] left-1/2 -translate-x-1/2 text-white px-4 py-2.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap z-[9999] shadow-modal pointer-events-none transition-all duration-200 ${
        bgMap[toast.type] || 'bg-[#323232]'
      } ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5'}`}
    >
      {toast.message}
    </div>
  )
}
