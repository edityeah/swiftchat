import React, { useState, useEffect } from 'react'
import { Wifi, Battery } from 'lucide-react'

export default function StatusBar({ dark = false }) {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const iv = setInterval(() =>
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 30000)
    return () => clearInterval(iv)
  }, [])

  const cls = dark ? 'text-white' : 'text-txt-primary'

  return (
    <div className={`h-[22px] px-3.5 flex items-center justify-between text-[11px] font-bold flex-shrink-0 ${
      dark ? 'bg-primary text-white' : 'bg-white text-txt-primary'
    }`}>
      <span>{time}</span>
      <div className={`flex items-center gap-1.5 ${cls}`}>
        <Wifi size={12} strokeWidth={2.5} />
        <Battery size={14} strokeWidth={2.5} />
      </div>
    </div>
  )
}
