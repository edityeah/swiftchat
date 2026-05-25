import React from 'react'
import { Phone, PhoneOff, Mic, MicOff, Monitor, MonitorOff, Eye, X } from 'lucide-react'
import { useVoiceCall } from './VoiceCallProvider'

const FONT = 'Montserrat, sans-serif'

export default function VoiceCallOverlay() {
  const v = useVoiceCall()
  if (!v) return null
  const {
    status, muted, agentSpeaking, transcript,
    screenSharing, visionMode, setVisionMode, lastVisionDescription, errorMessage,
    endCall, toggleMute, startScreenShare, stopScreenShare, askWhatYouSee,
  } = v
  if (status === 'idle') return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 60,
        width: 360,
        maxHeight: 'calc(100vh - 48px)',
        borderRadius: 16,
        background: '#FFFFFF',
        boxShadow: '0 12px 40px rgba(15, 23, 42, 0.18)',
        border: '1px solid #D5D8DF',
        fontFamily: FONT,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E5E7EB', background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SpeakingDot active={agentSpeaking} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0E0E0E' }}>
              Saathi — voice call
            </div>
            <div style={{ fontSize: 11, color: '#7383A5', marginTop: 1 }}>
              {status === 'connecting' && 'Connecting…'}
              {status === 'connected' && (agentSpeaking ? 'Speaking…' : muted ? 'Mic muted — listening' : 'Listening')}
              {status === 'ending'    && 'Ending call…'}
              {status === 'error'     && 'Connection error'}
            </div>
          </div>
          <button onClick={endCall} title="End call"
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#B91C1C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body — transcript */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', minHeight: 80, maxHeight: 260, background: '#F8FAFC' }}>
        {status === 'error' && (
          <div style={{ padding: '8px 10px', borderRadius: 8, background: '#FEE2E2', color: '#B91C1C', fontSize: 12 }}>
            {errorMessage || 'Could not start the call. Check OPENAI_API_KEY in Vercel env vars.'}
          </div>
        )}
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

      {/* Vision description chip */}
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

      {/* Vision-mode toggle (only when sharing) */}
      {screenSharing && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Vision</span>
          <button
            onClick={() => setVisionMode('continuous')}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: '3px 9px', borderRadius: 999,
              border: visionMode === 'continuous' ? '1px solid #386AF6' : '1px solid #D5D8DF',
              background: visionMode === 'continuous' ? '#386AF6' : '#FFFFFF',
              color:      visionMode === 'continuous' ? '#FFFFFF' : '#0E0E0E',
              cursor: 'pointer',
            }}
          >
            Auto (every 3s)
          </button>
          <button
            onClick={() => setVisionMode('on_demand')}
            style={{
              fontSize: 11, fontWeight: 600,
              padding: '3px 9px', borderRadius: 999,
              border: visionMode === 'on_demand' ? '1px solid #386AF6' : '1px solid #D5D8DF',
              background: visionMode === 'on_demand' ? '#386AF6' : '#FFFFFF',
              color:      visionMode === 'on_demand' ? '#FFFFFF' : '#0E0E0E',
              cursor: 'pointer',
            }}
          >
            On demand
          </button>
          {visionMode === 'on_demand' && (
            <button onClick={() => askWhatYouSee()} title="Send a frame now"
              style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, border: '1px solid #C7D2FE', background: '#FFFFFF', color: '#386AF6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Eye size={11} /> Snap
            </button>
          )}
        </div>
      )}

      {/* Action row */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
        <ActionBtn
          onClick={toggleMute}
          icon={muted ? <MicOff size={14} /> : <Mic size={14} />}
          label={muted ? 'Unmute' : 'Mute'}
          tone={muted ? 'rose' : 'neutral'}
          disabled={status !== 'connected'}
        />
        {screenSharing ? (
          <ActionBtn
            onClick={stopScreenShare}
            icon={<MonitorOff size={14} />}
            label="Stop sharing"
            tone="amber"
          />
        ) : (
          <ActionBtn
            onClick={startScreenShare}
            icon={<Monitor size={14} />}
            label="Share screen"
            tone="neutral"
            disabled={status !== 'connected'}
          />
        )}
        <button
          onClick={endCall}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 999,
            background: '#B91C1C', color: '#FFFFFF',
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: FONT,
          }}
        >
          <PhoneOff size={14} /> End
        </button>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, tone = 'neutral', disabled }) {
  const tones = {
    neutral: { bg: '#FFFFFF', fg: '#0E0E0E', bd: '#D5D8DF' },
    rose:    { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    amber:   { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 11px', borderRadius: 999,
        background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: 11.5, fontWeight: 600, fontFamily: FONT,
      }}
    >
      {icon} {label}
    </button>
  )
}

function SpeakingDot({ active }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 999,
      background: active ? '#10B981' : '#386AF6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, position: 'relative',
    }}>
      <Phone size={13} color="#FFFFFF" />
      {active && (
        <span style={{
          position: 'absolute', inset: -4, borderRadius: 999,
          border: '2px solid #10B981', opacity: 0.5,
          animation: 'pulse-ring 1.2s ease-out infinite',
        }} />
      )}
    </div>
  )
}
