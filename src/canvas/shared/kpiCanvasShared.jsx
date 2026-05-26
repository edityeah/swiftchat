// Shared building blocks for KPI-style canvases (KpiInsightCanvas,
// AttendanceDashboardCanvas, and any future ones). The goal is parity: every
// canvas gets the same ✨ Ask AI buttons on chart cards, the same interactive
// 7-day trend chart with date hover, and the same drag-to-resize chat panel
// at the bottom.
//
// Anything used in more than one canvas lives here. Anything canvas-specific
// stays in the canvas file.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Send, Sparkles, GripHorizontal } from 'lucide-react'

const FONT = 'Montserrat, sans-serif'

// ─── Tiny markdown → safe HTML ─────────────────────────────────────────────
// We don't want to add the `marked` dependency just for chat bubbles. This
// handles the subset the OpenAI replies actually use: **bold**, *italic*,
// bullet lists, numbered lists, paragraphs, line breaks. Everything else is
// HTML-escaped first so the model can't inject script tags.
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
export function mdToHtml(md) {
  if (!md) return ''
  const lines = String(md).split(/\r?\n/)
  const out = []
  let listType = null   // 'ul' | 'ol' | null
  function closeList() { if (listType) { out.push(`</${listType}>`); listType = null } }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { closeList(); continue }
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/)
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ulMatch) {
      if (listType !== 'ul') { closeList(); out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); listType = 'ul' }
      out.push(`<li style="margin:2px 0">${inlineMd(ulMatch[1])}</li>`)
    } else if (olMatch) {
      if (listType !== 'ol') { closeList(); out.push('<ol style="margin:4px 0 4px 20px;padding:0">'); listType = 'ol' }
      out.push(`<li style="margin:2px 0">${inlineMd(olMatch[1])}</li>`)
    } else {
      closeList()
      out.push(`<div>${inlineMd(line)}</div>`)
    }
  }
  closeList()
  return out.join('')
}
function inlineMd(s) {
  let out = escapeHtml(s)
  // bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  out = out.replace(/__([^_]+)__/g, '<b>$1</b>')
  // italic: *text* or _text_
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, '$1<i>$2</i>')
  // inline code: `text`
  out = out.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
  return out
}

// ─── Canvas chat fetch ─────────────────────────────────────────────────────
// One round-trip to /api/chat/canvas (gpt-4o-mini, JSON mode). Returns
// { text, cards } where text is short markdown and cards is an array of
// rich UI cards (see Card schemas in api/chat/canvas.js). Caller should
// mdToHtml() the text and pass cards to <CardStack />.
export async function fetchCanvasReply({ role, profile, canvas, data, messages }) {
  const resp = await fetch('/api/chat/canvas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, profile, canvas, data, messages }),
  })
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    throw new Error(`chat failed: ${resp.status} ${detail.slice(0, 200)}`)
  }
  const j = await resp.json()
  return { text: j.text || '', cards: Array.isArray(j.cards) ? j.cards : [] }
}

// ─── Rich chat-card renderer ───────────────────────────────────────────────
// Cards arrive from the model as structured JSON. Each one renders to a
// small visual card the user can act on (open profile, see trend, etc.).
function PAStrip({ pattern }) {
  const arr = String(pattern || '').toUpperCase().split('')
  return (
    <div className="flex gap-[2px]">
      {arr.map((d, i) => (
        <span
          key={i}
          title={d === 'A' ? 'Absent' : 'Present'}
          style={{ width: 9, height: 13, borderRadius: 2, background: d === 'A' ? '#FCA5A5' : '#86EFAC' }}
        />
      ))}
    </div>
  )
}

function StudentAttendanceCard({ card, onOpenStudent }) {
  const risk = card.risk === 'high' ? { bg: '#FEE2E2', fg: '#B91C1C', label: 'HIGH' }
             : card.risk === 'medium' ? { bg: '#FEF3C7', fg: '#92400E', label: 'WATCH' }
             : { bg: '#D1FAE5', fg: '#065F46', label: 'OK' }
  return (
    <div style={{
      borderRadius: 10, border: '1px solid #E5E7EB', background: '#FFFFFF',
      padding: '10px 12px', marginTop: 6, fontFamily: FONT,
    }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0E0E0E' }}>{card.name}</div>
          {card.ssmid && (
            <div style={{ fontSize: 10.5, color: '#7383A5', marginTop: 1, fontFamily: 'ui-monospace, monospace' }}>
              Student ID · {card.ssmid}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {card.ewsFlag && (
            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#FEF2F2', color: '#B91C1C', letterSpacing: '0.02em' }}>
              EWS
            </span>
          )}
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: risk.bg, color: risk.fg, letterSpacing: '0.02em' }}>
            {risk.label}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div style={{ fontSize: 11, color: '#0E0E0E' }}>
          <b style={{ color: '#B91C1C' }}>{card.attendancePct ?? '—'}%</b>
          {card.daysAbsent != null && <span style={{ color: '#7383A5' }}> · {card.daysAbsent} days absent</span>}
        </div>
        {card.pattern && <PAStrip pattern={card.pattern} />}
      </div>
      {card.recommendation && (
        <div style={{ fontSize: 11, color: '#0E0E0E', marginTop: 6, lineHeight: '15px' }}>
          {card.recommendation}
        </div>
      )}
      {onOpenStudent && card.ssmid && (
        <button
          onClick={() => onOpenStudent({ ssmid: card.ssmid, name: card.name })}
          className="active:scale-95 transition-all mt-2"
          style={{
            fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
            background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Open profile ›
        </button>
      )}
    </div>
  )
}

function MetricCalloutCard({ card }) {
  const tones = {
    red:   { bg: '#FEE2E2', fg: '#B91C1C', bd: '#FECACA' },
    amber: { bg: '#FEF3C7', fg: '#92400E', bd: '#FDE68A' },
    green: { bg: '#D1FAE5', fg: '#065F46', bd: '#A7F3D0' },
    info:  { bg: '#EEF2FF', fg: '#3730A3', bd: '#C7D2FE' },
  }
  const t = tones[card.tone] || tones.info
  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${t.bd}`, background: t.bg,
      padding: '10px 12px', marginTop: 6, fontFamily: FONT,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.fg, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{card.label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.fg, lineHeight: '24px', marginTop: 2 }}>{card.value}</div>
      {card.subtitle && (
        <div style={{ fontSize: 11.5, color: t.fg, opacity: 0.85, marginTop: 2 }}>{card.subtitle}</div>
      )}
    </div>
  )
}

function CompareBarsCard({ card }) {
  const items = Array.isArray(card.items) ? card.items : []
  const max = Math.max(...items.map(i => Number(i.value) || 0), 1)
  return (
    <div style={{
      borderRadius: 10, border: '1px solid #E5E7EB', background: '#FFFFFF',
      padding: '10px 12px', marginTop: 6, fontFamily: FONT,
    }}>
      {card.title && (
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
          {card.title}
        </div>
      )}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: '#0E0E0E', fontWeight: 600 }}>{it.label}</span>
              <span style={{ color: '#7383A5' }}>{it.value}{card.unit || ''}</span>
            </div>
            <div className="h-2 rounded-full mt-1" style={{ background: '#F1F5F9' }}>
              <div className="h-full rounded-full" style={{ width: `${(Number(it.value) / max) * 100}%`, background: '#386AF6' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTrendCard({ card }) {
  const vals = Array.isArray(card.values) ? card.values.map(Number) : []
  const labels = Array.isArray(card.labels) ? card.labels : vals.map((_, i) => `D${i + 1}`)
  if (!vals.length) return null
  const W = 280, H = 70, padL = 8, padR = 8, padT = 8, padB = 18
  const min = Math.min(...vals) - 2
  const max = Math.max(...vals) + 2
  const range = max - min || 1
  const pts = vals.map((v, i) => [
    padL + (i / (vals.length - 1)) * (W - padL - padR),
    padT + (H - padT - padB) - ((v - min) / range) * (H - padT - padB),
  ])
  const stroke = card.tone === 'red' ? '#B91C1C' : card.tone === 'amber' ? '#92400E' : card.tone === 'green' ? '#065F46' : '#386AF6'
  const fill   = card.tone === 'red' ? '#FEE2E2' : card.tone === 'amber' ? '#FEF3C7' : card.tone === 'green' ? '#D1FAE5' : '#DBEAFE'
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - padB} L${pts[0][0].toFixed(1)},${H - padB} Z`
  return (
    <div style={{
      borderRadius: 10, border: '1px solid #E5E7EB', background: '#FFFFFF',
      padding: '10px 12px', marginTop: 6, fontFamily: FONT,
    }}>
      {card.title && (
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#828996', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
          {card.title}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={area} fill={fill} opacity={0.55} />
        <path d={line} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 2} fill={stroke} />)}
        {labels.map((lab, i) => (
          <text key={i} x={pts[i][0]} y={H - 4} textAnchor="middle" style={{ fontSize: 9.5, fill: '#7383A5', fontFamily: FONT }}>
            {lab}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function CardStack({ cards, onOpenStudent }) {
  if (!Array.isArray(cards) || cards.length === 0) return null
  return (
    <div className="space-y-1.5">
      {cards.map((c, i) => {
        switch (c?.kind) {
          case 'student_attendance': return <StudentAttendanceCard key={i} card={c} onOpenStudent={onOpenStudent} />
          case 'metric_callout':     return <MetricCalloutCard     key={i} card={c} />
          case 'compare_bars':       return <CompareBarsCard       key={i} card={c} />
          case 'mini_trend':         return <MiniTrendCard         key={i} card={c} />
          default: return null
        }
      })}
    </div>
  )
}

// ─── ChartCard ────────────────────────────────────────────────────────────
// Wraps any chart with a consistent header + Ask-AI button (KSK style).
// `onAsk(prompt)` should pre-fill the canvas chat input (don't auto-send) so
// the user can edit the prompt before pressing return.
//
// The content area has `overflow-x: auto` so wide tables scroll horizontally
// instead of breaking out of the card (and the canvas). SVG charts use
// width="100%" so they don't trigger the scroll.
export function ChartCard({ title, askPrompt, onAsk, children, style }) {
  return (
    <div className="mt-4" style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 12, background: '#FFFFFF', minWidth: 0, ...style }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
        {askPrompt && (
          <button
            onClick={() => onAsk?.(askPrompt)}
            title="Ask AI about this chart"
            className="active:scale-95 transition-all inline-flex items-center gap-1"
            style={{
              fontSize: 10.5, fontWeight: 700,
              padding: '3px 8px', borderRadius: 999,
              border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#3730A3',
              cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.02em', flexShrink: 0,
            }}
          >
            <Sparkles size={11} /> Ask AI
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// ─── InteractiveTrendChart ────────────────────────────────────────────────
// 7-day SVG line chart with x-axis date labels, hover tooltip showing the
// date + value, and a vertical guide line. Day labels are derived from
// today's date going back N days (last item = today).
//
// Props:
//   values: number[]          — the data points (oldest → newest)
//   status: 'red'|'yellow'|'green'  — affects stroke + fill tints
//   unit:   '%' | 'hours' | '' (default '')
//   height: number            — chart height in px (default 110)
export function InteractiveTrendChart({ values, status = 'green', unit = '', height = 110 }) {
  const containerRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [containerW, setContainerW] = useState(360)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setContainerW(Math.max(220, e.contentRect.width))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Date labels for the last N days ending today.
  const dateLabels = useMemo(() => {
    const out = []
    const now = new Date()
    for (let i = values.length - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      out.push({
        short: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        full:  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      })
    }
    return out
  }, [values.length])

  const W = containerW
  const H = height
  const padL = 8, padR = 8, padT = 14, padB = 22   // padB leaves room for date labels

  const min = Math.min(...values) - 4
  const max = Math.max(...values) + 4
  const range = max - min || 1
  const xFor = i => padL + (i / (values.length - 1)) * (W - padL - padR)
  const yFor = v => padT + (H - padT - padB) - ((v - min) / range) * (H - padT - padB)

  const pts = values.map((v, i) => [xFor(i), yFor(v)])

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaBottom = H - padB
  const areaPath = `${linePath} L${pts[pts.length - 1][0].toFixed(1)},${areaBottom} L${pts[0][0].toFixed(1)},${areaBottom} Z`

  const tones = { red: '#B91C1C', yellow: '#92400E', green: '#065F46', unknown: '#386AF6' }
  const fills = { red: '#FEE2E2', yellow: '#FEF3C7', green: '#D1FAE5', unknown: '#DBEAFE' }
  const stroke = tones[status] || tones.unknown
  const fill   = fills[status] || fills.unknown

  // Snap hover to nearest point index from pointer X.
  function onPointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const step = (W - padL - padR) / (values.length - 1)
    let idx = Math.round((x - padL) / step)
    idx = Math.max(0, Math.min(values.length - 1, idx))
    setHoverIdx(idx)
  }
  function onPointerLeave() { setHoverIdx(null) }

  // Trend annotations: arrow icon + change vs first point.
  const first = values[0]
  const last  = values[values.length - 1]
  const change = +(last - first).toFixed(1)
  const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→'
  const directionColor = change > 0 ? '#065F46' : change < 0 ? '#B91C1C' : '#7383A5'

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ display: 'block', touchAction: 'none' }}
        preserveAspectRatio="none"
      >
        {/* Area + line */}
        <path d={areaPath} fill={fill} opacity={0.55} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2.5} fill={stroke} />
        ))}

        {/* Hover guide */}
        {hoverIdx != null && (
          <>
            <line
              x1={pts[hoverIdx][0]} x2={pts[hoverIdx][0]}
              y1={padT - 2}         y2={H - padB}
              stroke="#9CA3AF" strokeWidth={1} strokeDasharray="3 3"
            />
            <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r={5} fill="#FFFFFF" stroke={stroke} strokeWidth={2} />
          </>
        )}

        {/* Date labels along x-axis */}
        {dateLabels.map((d, i) => (
          <text
            key={i}
            x={pts[i][0]}
            y={H - 6}
            textAnchor="middle"
            style={{ fontSize: 9.5, fontFamily: FONT, fill: hoverIdx === i ? '#0E0E0E' : '#7383A5', fontWeight: hoverIdx === i ? 700 : 500 }}
          >
            {d.short}
          </text>
        ))}
      </svg>

      {/* Hover tooltip — positioned over the chart */}
      {hoverIdx != null && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(W - 130, Math.max(0, pts[hoverIdx][0] - 60)),
            top: Math.max(0, pts[hoverIdx][1] - 56),
            background: '#0E0E0E', color: '#FFFFFF',
            borderRadius: 8, padding: '6px 10px',
            fontFamily: FONT, fontSize: 11.5, lineHeight: '14px',
            pointerEvents: 'none',
            boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
            minWidth: 110,
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {values[hoverIdx].toFixed(values[hoverIdx] < 10 ? 1 : 0)}{unit}
          </div>
          <div style={{ color: '#A3B1CC', marginTop: 1 }}>
            {dateLabels[hoverIdx]?.full} · {dateLabels[hoverIdx]?.short}
          </div>
        </div>
      )}

      {/* Footer: net change */}
      <div style={{
        marginTop: 4,
        fontSize: 10.5, color: '#7383A5', fontFamily: FONT,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>
          7-day change:
          <b style={{ color: directionColor, marginLeft: 4 }}>
            {direction} {Math.abs(change)}{unit}
          </b>
        </span>
        <span>Hover any day for details</span>
      </div>
    </div>
  )
}

// ─── Drag handle ───────────────────────────────────────────────────────────
export function DragHandle({ onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      title="Drag to resize chat"
      style={{
        height: 12,
        background: '#F8FAFC',
        borderTop: '1px solid #E5E7EB',
        borderBottom: '1px solid #E5E7EB',
        cursor: 'row-resize',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <GripHorizontal size={14} color="#7383A5" />
    </div>
  )
}

// ─── useResizableChat ──────────────────────────────────────────────────────
// State + handler for the drag handle. Default 240px, min 140, max 80% of
// container height.
export function useResizableChat(containerRef, initial = 240) {
  const [chatHeight, setChatHeight] = useState(initial)
  const draggingRef = useRef(false)

  const onPointerDown = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const total = rect.height
      const newChat = total - (e.clientY - rect.top)
      const min = 140
      const max = Math.max(min, total * 0.8)
      setChatHeight(Math.min(max, Math.max(min, newChat)))
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [containerRef])

  return { chatHeight, onPointerDown }
}

// ─── Bubble + Typing (chat bits) ───────────────────────────────────────────
export function Bubble({ message, onOpenStudent }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[88%]' : 'max-w-[96%]'} px-3 py-2 rounded-2xl text-[12.5px] ${isUser ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
        style={{
          background: isUser ? '#386AF6' : '#FFFFFF',
          color: isUser ? '#FFFFFF' : '#0E0E0E',
          fontFamily: FONT, lineHeight: '18px',
          border: isUser ? 'none' : '1px solid #E5E7EB',
        }}
      >
        {isUser ? message.text : (
          <>
            {message.html && <div dangerouslySetInnerHTML={{ __html: message.html }} />}
            {Array.isArray(message.cards) && message.cards.length > 0 && (
              <div style={{ marginTop: message.html ? 6 : 0 }}>
                <CardStack cards={message.cards} onOpenStudent={onOpenStudent} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function Typing() {
  return (
    <div className="flex justify-start">
      <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] bg-[#F8FAFC] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

// ─── Resizable chat panel (chips + messages + input) ───────────────────────
// Use after a DragHandle. The parent should set its height to `chatHeight`.
// `inputRef` is exposed so per-chart Ask AI buttons can focus it.
export function ChatPanel({
  chatHeight, chips = [], messages = [], typing, onSend, input, setInput,
  placeholder = 'Ask…', inputRef, emptyHint, onOpenStudent,
}) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend?.(input) }
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: chatHeight,
        flexShrink: 0,
        background: '#FFFFFF',
      }}
    >
      {/* Quick-ask chips */}
      {chips.length > 0 && (
        <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
          {chips.map(c => (
            <button
              key={c}
              onClick={() => onSend?.(c)}
              className="active:scale-95 transition-all"
              style={{
                fontSize: 11.5, fontWeight: 600, color: '#386AF6',
                padding: '5px 12px', borderRadius: 999,
                border: '1px solid #C7D2FE', background: '#FFFFFF',
                fontFamily: FONT, cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Messages — flex-1 so they expand to fill whatever the resize gave us. */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0" style={{ background: '#F8FAFC' }}>
        {messages.length === 0 && !typing && (
          <div style={{ fontSize: 12, color: '#7383A5', textAlign: 'center', padding: '12px 8px' }}>
            {emptyHint || 'Use a chip above, click an ✨ Ask AI button on any chart, or type a question below.'}
          </div>
        )}
        {messages.map(m => <Bubble key={m.id} message={m} onOpenStudent={onOpenStudent} />)}
        {typing && <Typing />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 outline-none"
          style={{
            padding: '9px 14px', borderRadius: 999,
            border: '1px solid #D5D8DF', background: '#FFFFFF',
            fontSize: 13, color: '#0E0E0E', fontFamily: FONT,
          }}
        />
        <button
          onClick={() => onSend?.(input)}
          disabled={!input.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-full active:scale-95 transition-all"
          style={{
            background: input.trim() ? '#386AF6' : '#E5E7EB',
            color: '#FFFFFF', cursor: input.trim() ? 'pointer' : 'default',
            border: 'none', flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
