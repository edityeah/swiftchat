import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import Shield3D from '../assets/icons/Shield3D'

export default function SSOVerifyingPage() {
  const { navigate } = useApp()
  const [progress, setProgress] = useState(0)
  const [label, setLabel] = useState('Connecting to State IAM…')

  const LABELS = [
    'Connecting to State IAM…',
    'Authenticating credentials…',
    'Verifying role & permissions…',
    'Fetching school data…',
    'Setting up your workspace…',
  ]

  useEffect(() => {
    // Animate progress 0 → 100% over ~2.5s in steps
    let step = 0
    const iv = setInterval(() => {
      step++
      const pct = Math.min(step * 22, 100)
      setProgress(pct)
      setLabel(LABELS[Math.min(Math.floor(step * 0.9), LABELS.length - 1)])
      if (pct >= 100) {
        clearInterval(iv)
        setTimeout(() => navigate('sso_ok', true), 500)
      }
    }, 480)
    return () => clearInterval(iv)
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: '#12122A' }}>
    <div className="w-full max-w-[420px] flex flex-col items-center justify-between px-6 py-10 h-full">
      {/* Top spacer */}
      <div />

      {/* Shield + progress */}
      <div className="flex flex-col items-center gap-8 w-full max-w-[320px]">
        {/* Shield glow */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: 140, height: 140 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(56,106,246,0.25) 0%, transparent 70%)',
              animation: 'pulseRing 1.6s ease infinite',
            }}
          />
          <Shield3D width={100} height={120} />
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #3D5AFE 0%, #5C7CFF 100%)',
              }}
            />
          </div>
        </div>

        {/* Status label */}
        <p
          className="text-[14px] font-semibold text-center"
          style={{ color: '#E0E4FF', fontFamily: 'Montserrat, sans-serif' }}
        >
          {label}
        </p>
      </div>

      {/* Bottom hint */}
      <p
        className="text-[11px] text-center"
        style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Montserrat, sans-serif' }}
      >
        Redirecting securely via state portal
      </p>
    </div>
    </div>
  )
}
