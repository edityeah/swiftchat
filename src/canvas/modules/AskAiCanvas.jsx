import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import CardRenderer from '../../components/cards/CardRenderer'
import { answerQuery, suggestedPromptsFor } from '../../features/askAi2/queryEngine'

const FONT = 'Montserrat, sans-serif'

// One conversational turn = a user prompt + the bot's card response.
// We append turns in order; the chat scroll auto-pins to the latest.
function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[88%] px-3 py-2 rounded-2xl rounded-br-[4px]"
        style={{ background: '#386AF6', color: '#FFFFFF', fontFamily: FONT, fontSize: 12.5, lineHeight: '18px' }}
      >
        {text}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="px-3 py-2 rounded-2xl rounded-bl-[4px] bg-[#F1F5F9] inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function AskAiCanvas({ context }) {
  const { role } = useApp()
  const seedPrompt = context?.prompt || null

  const [turns, setTurns] = useState([])      // [{ id, query, card }]
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)
  const seededRef = useRef(false)

  const suggestions = useMemo(() => suggestedPromptsFor(role), [role])

  // Auto-scroll on new turn / typing
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns, typing])

  // If the canvas opens with a seed prompt (e.g., the Quick Action triggered
  // a specific question), fire it once.
  useEffect(() => {
    if (seedPrompt && !seededRef.current) {
      seededRef.current = true
      ask(seedPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPrompt])

  function ask(text) {
    const q = String(text || '').trim()
    if (!q) return
    setInput('')
    setTyping(true)
    // simulate latency so the typing indicator is visible briefly
    setTimeout(() => {
      const { card } = answerQuery(q) || {}
      setTyping(false)
      setTurns(prev => [...prev, { id: Date.now() + Math.random(), query: q, card }])
    }, 520)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      {/* Top: thread (cards + bubbles) */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: '#F8FAFC' }}>
        {turns.length === 0 && !typing && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} style={{ color: '#7C3AED' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0E0E0E' }}>Ask AI · Saathi</div>
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', lineHeight: '18px' }}>
              I read across attendance, schools, teachers, students, scholarships and KPIs for your scope.
              Try one of these — or type any question.
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map(p => (
                <button
                  key={p}
                  onClick={() => ask(p)}
                  className="active:scale-95 transition-all"
                  style={{
                    fontSize: 11.5, fontWeight: 600, color: '#386AF6',
                    padding: '6px 12px', borderRadius: 999,
                    border: '1px solid #C7D2FE', background: '#FFFFFF',
                    fontFamily: FONT, cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map(t => (
          <div key={t.id} className="space-y-2 mb-4">
            <UserBubble text={t.query} />
            {t.card && (
              <CardRenderer card={t.card} onChip={ask} />
            )}
          </div>
        ))}

        {typing && <Typing />}
        <div ref={endRef} />
      </div>

      {/* Bottom: chips + composer */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
        {turns.length > 0 && (
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 4).map(p => (
              <button
                key={p}
                onClick={() => ask(p)}
                className="active:scale-95 transition-all"
                style={{
                  fontSize: 11, fontWeight: 600, color: '#386AF6',
                  padding: '4px 10px', borderRadius: 999,
                  border: '1px solid #C7D2FE', background: '#FFFFFF',
                  fontFamily: FONT, cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: turns.length > 0 ? '1px solid #E5E7EB' : 'none' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything — students, schools, attendance, scholarships…"
            className="flex-1 outline-none"
            style={{
              padding: '10px 14px', borderRadius: 999,
              border: '1px solid #D5D8DF', background: '#FFFFFF',
              fontSize: 13, color: '#0E0E0E', fontFamily: FONT,
            }}
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all"
            style={{
              background: input.trim() ? '#386AF6' : '#E5E7EB',
              color: '#FFFFFF', cursor: input.trim() ? 'pointer' : 'default',
              border: 'none', flexShrink: 0,
            }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
