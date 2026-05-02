import React, { useState, useEffect } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function SSOFailPage() {
  const { navigate, goBack } = useApp()
  const [secs, setSecs] = useState(60)

  useEffect(() => {
    const iv = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(iv); navigate('sso_redirect', true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [navigate])

  const mins = Math.floor(secs / 60)
  const sec  = secs % 60
  const pct  = (secs / 60) * 100

  // SVG circle countdown
  const R  = 44
  const C  = 2 * Math.PI * R
  const dash = (pct / 100) * C

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#12122A' }}>
    <div className="w-full max-w-[420px] flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className="text-[15px] font-bold"
          style={{ color: '#F0F0FF', fontFamily: 'Montserrat, sans-serif' }}
        >
          Login with State ID
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* Warning icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#3A2010' }}
        >
          <span className="text-[28px]">!</span>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h2
            className="text-[20px] font-bold mb-2"
            style={{ color: '#F0F0FF', fontFamily: 'Montserrat, sans-serif' }}
          >
            Couldn't reach State login
          </h2>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Back in a few minutes.
          </p>
        </div>

        {/* Circular countdown */}
        <div className="relative" style={{ width: 108, height: 108 }}>
          <svg width={108} height={108} viewBox="0 0 108 108">
            {/* Track */}
            <circle
              cx={54} cy={54} r={R}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={5}
            />
            {/* Progress arc */}
            <circle
              cx={54} cy={54} r={R}
              fill="none"
              stroke="#3D5AFE"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={C / 4}
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          {/* Time overlay — centered inside circle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[22px] font-bold"
              style={{ color: '#7B96FF', fontFamily: 'Montserrat, sans-serif' }}
            >
              {mins}:{String(sec).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-bold tracking-[1.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              AUTO-RETRY
            </span>
          </div>
        </div>

        {/* Status chip */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div className="w-2 h-2 rounded-full bg-warn animate-live" />
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Waiting to reconnect
          </span>
        </div>
      </div>

      {/* Retry button */}
      <div className="px-5 pb-8 flex-shrink-0">
        <button
          onClick={() => navigate('sso_redirect', true)}
          className="w-full bg-primary text-white font-bold text-[15px] py-3.5 rounded-pill flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          <RefreshCw size={16} />
          Retry now
        </button>
      </div>
    </div>
    </div>
  )
}
