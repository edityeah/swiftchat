import React, { useState, useEffect } from 'react'
import { MicOff, PhoneOff, Volume2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Logo from './Logo'

function WaveBar({ delay = 0 }) {
  return (
    <div
      className="w-1.5 rounded-full bg-white/80 animate-wave origin-bottom"
      style={{ animationDelay: `${delay}s`, height: '24px' }}
    />
  )
}

const DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.3, 0.2, 0.1, 0, 0.15, 0.25, 0.15, 0]

export default function CallOverlay() {
  const { call, endCall, showToast } = useApp()
  const [dur, setDur] = useState(0)

  useEffect(() => {
    if (!call) return
    const iv = setInterval(() => setDur(d => d + 1), 1000)
    return () => clearInterval(iv)
  }, [call])

  if (!call) return null

  const mins = String(Math.floor(dur / 60)).padStart(2, '0')
  const secs = String(dur % 60).padStart(2, '0')

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-primary to-[#1a3fa8] z-50 flex flex-col text-white animate-fade-in">
      <div className="pt-10 px-6 text-center flex-shrink-0">
        <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 mx-auto mb-3 flex items-center justify-center">
          <Logo size={44} />
        </div>
        <div className="text-xl font-bold">{call.botName || 'SwiftChat AI'}</div>
        <div className="text-white/70 text-sm mt-1">{mins}:{secs} · AI Voice Call</div>
      </div>

      {/* Wave animation */}
      <div className="flex items-end justify-center gap-1 h-16 flex-shrink-0 my-4 px-6">
        {DELAYS.map((d, i) => <WaveBar key={i} delay={d} />)}
      </div>

      {/* Live transcript */}
      <div className="flex-1 mx-4 rounded-2xl bg-white/10 p-3 text-sm leading-relaxed text-white/90 overflow-y-auto">
        <div className="font-bold text-xs text-white/50 mb-2 uppercase tracking-wide">Live Transcript</div>
        <p><em>SwiftChat AI connected. How can I help you today?</em></p>
      </div>

      {/* Controls */}
      <div className="p-6 flex justify-center gap-6 flex-shrink-0">
        <button
          onClick={() => showToast('Muted', '')}
          className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
        >
          <MicOff size={22} className="text-white" />
        </button>
        <button
          onClick={() => { endCall(); showToast('Call ended', '') }}
          className="w-16 h-16 rounded-full bg-danger flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <PhoneOff size={24} className="text-white" />
        </button>
        <button
          onClick={() => showToast('Speaker on', '')}
          className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
        >
          <Volume2 size={22} className="text-white" />
        </button>
      </div>
    </div>
  )
}
