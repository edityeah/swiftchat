import React, { useState } from 'react'
import {
  Phone, PhoneOff, Mic, MicOff, Monitor, MonitorOff,
  Eye, X, Sparkles, Maximize2, Minimize2,
} from 'lucide-react'
import { useVoiceCall } from './VoiceCallProvider'

const FONT = 'Montserrat, sans-serif'

// Compact top-right voice-call strip — modeled on the KSK header bar.
// When collapsed it's a single horizontal toolbar with title + controls.
// When expanded (chevron) it drops a transcript / vision panel below it.
export default function VoiceCallOverlay() {
  const v = useVoiceCall()
  const [expanded, setExpanded] = useState(false)
  if (!v) return null
  const {
    status, muted, agentSpeaking, transcript,
    screenSharing, visionMode, setVisionMode, lastVisionDescription, errorMessage,
    endCall, toggleMute, startScreenShare, stopScreenShare, askWhatYouSee,
  } = v
  if (status === 'idle') return null

  const subtitle = (() => {
    if (status === 'connecting') return 'Connecting…'
    if (status === 'ending')     return 'Ending call…'
    if (status === 'error')      return 'Connection error'
    if (agentSpeaking)           return 'Saathi is speaking…'
    if (muted)                   return 'Mic muted — Saathi is listening'
    return 'Your VSK voice companion — ask anything'
  })()

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 60,
        width: 'min(720px, calc(100vw - 32px))',
        borderRadius: 14,
        background: '#FFFFFF',
        boxShadow: '0 14px 40px rgba(15, 23, 42, 0.18)',
        border: '1px solid #D5D8DF',
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      {/* ─── Header strip (always visible) ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
        {/* Back / collapse-to-icon — for now toggles the expanded panel */}
        <IconBtn onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand transcript'}>
          {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </IconBtn>

        {/* Sparkle icon tile */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <Sparkles size={18} color="#386AF6" />
          {agentSpeaking && (
            <span style={{
              position: 'absolute', inset: -3, borderRadius: 12,
              border: '2px solid #10B981', opacity: 0.55,
              animation: 'pulse-ring 1.2s ease-out infinite',
            }} />
          )}
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0E0E0E', lineHeight: '18px' }}>
            Saathi
          </div>
          <div style={{
            fontSize: 11.5, color: '#7383A5', marginTop: 1, lineHeight: '14px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        </div>

        {/* Mic toggle */}
        <CircleBtn
          onClick={toggleMute}
          title={muted ? 'Unmute' : 'Mute'}
          disabled={status !== 'connected'}
          tone={muted ? 'rose' : 'neutral'}
        >
          {muted ? <MicOff size={15} /> : <Mic size={15} />}
        </CircleBtn>

        {/* Screen share toggle */}
        <CircleBtn
          onClick={screenSharing ? stopScreenShare : startScreenShare}
          title={screenSharing ? 'Stop sharing' : 'Share screen'}
          disabled={status !== 'connected'}
          tone={screenSharing ? 'amber' : 'neutral'}
        >
          {screenSharing ? <MonitorOff size={15} /> : <Monitor size={15} />}
        </CircleBtn>

        {/* End call pill */}
        <button
          onClick={endCall}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 999,
            background: '#B91C1C', color: '#FFFFFF',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          <PhoneOff size={14} /> End
        </button>

        {/* Close (×) — hide overlay without ending — actually ends call too */}
        <IconBtn onClick={endCall} title="Close">
          <X size={15} />
        </IconBtn>
      </div>

      {/* ─── Expanded panel (transcript + vision controls) ───────────────── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #E5E7EB' }}>
          {/* Error banner */}
          {status === 'error' && (
            <div style={{ margin: 10, padding: '8px 10px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', fontSize: 12 }}>
              {errorMessage || 'Could not start the call. Check OPENAI_API_KEY in Vercel env vars.'}
            </div>
          )}

          {/* Transcript */}
          <div style={{
            padding: '10px 14px', minHeight: 80, maxHeight: 240,
            overflowY: 'auto', background: '#F8FAFC',
          }}>
            {status !== 'error' && transcript.length === 0 && (
              <div style={{ fontSize: 12, color: '#7383A5', textAlign: 'center', padding: '12px 8px' }}>
                {status === 'connecting' ? 'Setting up secure connection…' : 'Say something to start the conversation.'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {transcript.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '6px 10px',
                    borderRadius: 12,
                    background: m.role === 'user' ? '#386AF6' : '#FFFFFF',
                    color: m.role === 'user' ? '#FFFFFF' : '#0E0E0E',
                    border: m.role === 'user' ? 'none' : '1px solid #E5E7EB',
                    fontSize: 12.5, lineHeight: '17px',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vision-description chip */}
          {screenSharing && lastVisionDescription && (
            <div style={{ padding: '6px 14px', background: '#EEF2FF', borderTop: '1px solid #C7D2FE' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3730A3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Agent sees
              </div>
              <div style={{ fontSize: 11.5, color: '#1E1B4B', marginTop: 1, lineHeight: '15px' }}>
                {lastVisionDescription}
              </div>
            </div>
          )}

          {/* Vision-mode toggle */}
          {screenSharing && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Vision</span>
              <PillBtn active={visionMode === 'continuous'} onClick={() => setVisionMode('continuous')}>Auto (every 3s)</PillBtn>
              <PillBtn active={visionMode === 'on_demand'}  onClick={() => setVisionMode('on_demand')}>On demand</PillBtn>
              {visionMode === 'on_demand' && (
                <button onClick={() => askWhatYouSee()} title="Send a frame now"
                  style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, border: '1px solid #C7D2FE', background: '#FFFFFF', color: '#386AF6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={11} /> Snap
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────

function CircleBtn({ children, onClick, title, disabled, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#FFFFFF', fg: '#0E0E0E', bd: '#D5D8DF' },
    rose:    { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    amber:   { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 999,
        background: t.bg, color: t.fg,
        border: `1px solid ${t.bd}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'transparent', color: '#7383A5',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function PillBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, fontWeight: 600,
        padding: '3px 9px', borderRadius: 999,
        border: active ? '1px solid #386AF6' : '1px solid #D5D8DF',
        background: active ? '#386AF6' : '#FFFFFF',
        color:      active ? '#FFFFFF' : '#0E0E0E',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
