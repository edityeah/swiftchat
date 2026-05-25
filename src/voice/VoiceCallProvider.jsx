import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const VoiceCallContext = createContext(null)
export const useVoiceCall = () => useContext(VoiceCallContext)

// Vision frame cadence (ms). Cheap throttle — actual API cost is ~$0.003/frame.
const CONTINUOUS_FRAME_MS = 3000
// JPEG quality for the streamed frame. 0.6 keeps each frame ~30-80 KB.
const FRAME_JPEG_QUALITY = 0.6
// Cap frame width so we don't ship 4K screenshots. Aspect ratio preserved.
const FRAME_MAX_WIDTH = 1024

export function VoiceCallProvider({ children }) {
  const { role, userProfile } = useApp()

  // ─── State exposed to UI ─────────────────────────────────────────────────
  const [status, setStatus] = useState('idle')         // 'idle' | 'connecting' | 'connected' | 'ending' | 'error'
  const [muted, setMuted] = useState(false)
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [transcript, setTranscript] = useState([])     // [{ role: 'user'|'assistant', text }]
  const [screenSharing, setScreenSharing] = useState(false)
  const [visionMode, setVisionMode] = useState('continuous') // 'continuous' | 'on_demand'
  const [lastVisionDescription, setLastVisionDescription] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // ─── Refs (don't trigger re-renders) ─────────────────────────────────────
  const pcRef = useRef(null)            // RTCPeerConnection
  const dcRef = useRef(null)            // RTCDataChannel (oai-events)
  const micStreamRef = useRef(null)     // MediaStream from mic
  const screenStreamRef = useRef(null)  // MediaStream from getDisplayMedia
  const screenVideoRef = useRef(null)   // off-DOM <video> playing the screen stream
  const remoteAudioRef = useRef(null)   // <audio> playing the agent's audio
  const frameIntervalRef = useRef(null) // setInterval handle for streaming frames
  const lastFrameSentAtRef = useRef(0)

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function cleanup() {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null
      screenVideoRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
    if (dcRef.current) {
      try { dcRef.current.close() } catch {}
      dcRef.current = null
    }
    if (pcRef.current) {
      try { pcRef.current.close() } catch {}
      pcRef.current = null
    }
    setScreenSharing(false)
    setAgentSpeaking(false)
  }

  function sendEvent(event) {
    if (dcRef.current && dcRef.current.readyState === 'open') {
      dcRef.current.send(JSON.stringify(event))
      return true
    }
    return false
  }

  // Push a system message into the active Realtime session so the voice
  // agent can react to it on its next turn.
  function pushSystemContext(text) {
    if (!text) return
    sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{ type: 'input_text', text: `[Screen context] ${text}` }],
      },
    })
  }

  // ─── Frame capture ───────────────────────────────────────────────────────
  async function captureFrame() {
    const video = screenVideoRef.current
    if (!video || video.readyState < 2) return null
    const srcW = video.videoWidth
    const srcH = video.videoHeight
    if (!srcW || !srcH) return null
    const scale = Math.min(1, FRAME_MAX_WIDTH / srcW)
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', FRAME_JPEG_QUALITY)
  }

  async function analyzeFrame(reason = 'auto') {
    try {
      const dataUrl = await captureFrame()
      if (!dataUrl) return null
      lastFrameSentAtRef.current = Date.now()
      const resp = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, role }),
      })
      if (!resp.ok) {
        const err = await resp.text()
        console.warn('[voice] vision call failed', resp.status, err)
        return null
      }
      const { description } = await resp.json()
      if (description) {
        setLastVisionDescription(description)
        pushSystemContext(description)
      }
      return description
    } catch (e) {
      console.warn('[voice] vision call exception', e)
      return null
    }
  }

  function startFrameStreaming() {
    stopFrameStreaming()
    if (visionMode !== 'continuous') return
    frameIntervalRef.current = setInterval(() => {
      analyzeFrame('continuous')
    }, CONTINUOUS_FRAME_MS)
    // Kick one off immediately so the agent gets context fast.
    analyzeFrame('initial')
  }

  function stopFrameStreaming() {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }

  // ─── Public actions ──────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return
    setStatus('connecting')
    setErrorMessage(null)
    setTranscript([])
    setLastVisionDescription(null)

    try {
      // 1. Mint ephemeral session via our server route
      const tokenResp = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, profile: userProfile || null }),
      })
      if (!tokenResp.ok) {
        const err = await tokenResp.text()
        throw new Error(`session mint failed: ${tokenResp.status} ${err}`)
      }
      const { client_secret, model } = await tokenResp.json()
      if (!client_secret) throw new Error('no client_secret in session response')

      // 2. Set up WebRTC peer connection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Remote audio sink (the agent's voice)
      let audioEl = remoteAudioRef.current
      if (!audioEl) {
        audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioEl.style.display = 'none'
        document.body.appendChild(audioEl)
        remoteAudioRef.current = audioEl
      }
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0]
      }

      // Local mic
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = mic
      mic.getTracks().forEach(track => pc.addTrack(track, mic))

      // Data channel for events (transcripts, tool calls, system context)
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          handleRealtimeEvent(msg)
        } catch { /* ignore non-JSON */ }
      })

      // 3. Offer/answer with OpenAI
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // GA Realtime SDP endpoint is /v1/realtime/calls (model passed as query
      // param). The old beta /v1/realtime path now returns "Realtime Beta API
      // is no longer supported."
      const sdpResp = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${client_secret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })
      if (!sdpResp.ok) {
        const err = await sdpResp.text()
        throw new Error(`SDP exchange failed: ${sdpResp.status} ${err}`)
      }
      const answerSdp = await sdpResp.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setStatus('connected')
    } catch (err) {
      console.error('[voice] startCall failed', err)
      setErrorMessage(String(err?.message || err))
      setStatus('error')
      cleanup()
    }
  }, [role, userProfile, status])

  const endCall = useCallback(() => {
    setStatus('ending')
    cleanup()
    setStatus('idle')
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => { t.enabled = !next })
      }
      return next
    })
  }, [])

  const startScreenShare = useCallback(async () => {
    if (screenSharing) return
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false,
      })
      screenStreamRef.current = stream
      // Off-DOM video element to read frames from
      const v = document.createElement('video')
      v.srcObject = stream
      v.muted = true
      v.playsInline = true
      await v.play().catch(() => { /* autoplay policy can throw; play still happens */ })
      screenVideoRef.current = v
      // Stop sharing if user picks 'Stop sharing' in browser chrome
      stream.getVideoTracks()[0].addEventListener('ended', () => stopScreenShare())
      setScreenSharing(true)
      if (visionMode === 'continuous') startFrameStreaming()
      pushSystemContext('User has just started sharing their screen. You will receive periodic screen descriptions.')
    } catch (err) {
      console.warn('[voice] screen share denied or failed', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSharing, visionMode])

  const stopScreenShare = useCallback(() => {
    stopFrameStreaming()
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null
      screenVideoRef.current = null
    }
    setScreenSharing(false)
    pushSystemContext('User has stopped sharing their screen.')
  }, [])

  const askWhatYouSee = useCallback(async () => {
    if (!screenSharing) return null
    const desc = await analyzeFrame('on_demand')
    return desc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSharing])

  // Switch vision mode mid-call
  useEffect(() => {
    if (status !== 'connected' || !screenSharing) return
    if (visionMode === 'continuous') startFrameStreaming()
    else stopFrameStreaming()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visionMode, screenSharing, status])

  // Hard cleanup on unmount
  useEffect(() => () => cleanup(), [])

  // ─── Realtime event handler ──────────────────────────────────────────────
  function handleRealtimeEvent(msg) {
    if (!msg || !msg.type) return
    switch (msg.type) {
      case 'response.audio_transcript.delta': {
        setAgentSpeaking(true)
        setTranscript(prev => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + (msg.delta || '') }]
          }
          return [...prev, { role: 'assistant', text: msg.delta || '', streaming: true }]
        })
        break
      }
      case 'response.audio_transcript.done':
      case 'response.done': {
        setAgentSpeaking(false)
        setTranscript(prev => {
          const last = prev[prev.length - 1]
          if (last && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }]
          }
          return prev
        })
        break
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const t = msg.transcript || ''
        if (t) setTranscript(prev => [...prev, { role: 'user', text: t }])
        break
      }
      case 'error': {
        console.warn('[voice] realtime error event', msg)
        setErrorMessage(msg.error?.message || 'realtime error')
        break
      }
      default:
        // (ignore the dozens of housekeeping event types)
        break
    }
  }

  // ─── Provider value ──────────────────────────────────────────────────────
  const value = {
    status,
    muted,
    agentSpeaking,
    transcript,
    screenSharing,
    visionMode,
    setVisionMode,
    lastVisionDescription,
    errorMessage,
    startCall,
    endCall,
    toggleMute,
    startScreenShare,
    stopScreenShare,
    askWhatYouSee,
  }

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
    </VoiceCallContext.Provider>
  )
}
