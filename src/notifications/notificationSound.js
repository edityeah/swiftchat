// Tiny Web Audio chime + bell-buzz hint.
//
// We avoid bundling audio assets — the chime is generated on the fly from
// two short sine bursts. Browsers typically require a user interaction
// before AudioContext.resume() succeeds, so we lazily construct the context
// on first play and silently skip if blocked.

let audioCtx = null
let blocked = false

function getCtx() {
  if (blocked) return null
  if (audioCtx) return audioCtx
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) { blocked = true; return null }
    audioCtx = new Ctor()
    return audioCtx
  } catch {
    blocked = true
    return null
  }
}

function tone(ctx, freq, start, duration, gain = 0.18) {
  const osc = ctx.createOscillator()
  const env = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(env).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playNotificationSound({ urgent = false } = {}) {
  const ctx = getCtx()
  if (!ctx) return false
  try {
    if (ctx.state === 'suspended') {
      // Best-effort resume — browsers allow this only after a user gesture.
      const p = ctx.resume?.()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }
    const t0 = ctx.currentTime + 0.01
    if (urgent) {
      tone(ctx, 880, t0,        0.14, 0.22)
      tone(ctx, 1175, t0 + 0.14, 0.14, 0.22)
      tone(ctx, 880, t0 + 0.30,  0.14, 0.22)
    } else {
      tone(ctx, 880, t0,         0.10, 0.20)
      tone(ctx, 1175, t0 + 0.10, 0.16, 0.20)
    }
    return true
  } catch {
    return false
  }
}

// Lets a "click" inside the app warm up the audio context so subsequent,
// scheduler-driven plays succeed under autoplay policies.
export function primeAudioOnUserGesture() {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') {
    try { ctx.resume?.() } catch { /* noop */ }
  }
}
