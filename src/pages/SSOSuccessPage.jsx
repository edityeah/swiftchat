import React, { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Check } from 'lucide-react'

export default function SSOSuccessPage() {
  const { navigate } = useApp()

  useEffect(() => {
    // Role is already set in SSORedirectPage — do NOT override it here
    const t = setTimeout(() => navigate('home', true), 3000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#12122A' }}>
    <div className="w-full max-w-[420px] flex flex-col items-center justify-center px-8 text-center py-16">
      {/* Outer glow ring */}
      <div
        className="relative flex items-center justify-center mb-8"
        style={{ width: 120, height: 120 }}
      >
        {/* Faint outer ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid rgba(76,175,80,0.3)',
            borderRadius: '50%',
          }}
        />
        {/* Mid ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: 96, height: 96,
            border: '1.5px solid rgba(76,175,80,0.5)',
            borderRadius: '50%',
          }}
        />
        {/* Green circle */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center animate-pop"
          style={{ background: '#4CAF50' }}
        >
          <Check size={30} color="#fff" strokeWidth={3} />
        </div>
      </div>

      <h2
        className="text-[22px] font-bold mb-3"
        style={{ color: '#F0F0FF', fontFamily: 'Montserrat, sans-serif' }}
      >
        Verification Successful
      </h2>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Montserrat, sans-serif' }}
      >
        Thanks for verifying it's you. Your identity<br />has been securely confirmed.
      </p>

      {/* Redirecting indicator */}
      <div className="flex items-center gap-2 mt-10">
        <div className="w-1.5 h-1.5 rounded-full bg-ok animate-live" />
        <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Redirecting to home…
        </span>
      </div>
    </div>
    </div>
  )
}
