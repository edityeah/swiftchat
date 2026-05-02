import React, { useMemo, useState } from 'react'
import {
  ArrowLeft, Eye, EyeOff, Save, Printer, Download,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { WORKSHEET_TEMPLATES, WORKSHEET_STYLES } from './WorksheetTemplateCanvas'

// Worksheet HTML editor canvas — opened from the template-selection picker
// with `templateId` + `styleId` already chosen. Renders a styled, editable
// worksheet using contentEditable so existing demo features (inline edit,
// preview, print/download mock, save-to-chat) all work without bringing back
// the WYSIWYG library.

const SCHOOL = 'Sardar Patel Prathmik Shala'
const TODAY  = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })

// Default question banks, keyed by template — kept tiny so the worksheet feels
// hand-authored rather than randomised.
const QUESTION_BANK = {
  clean_classroom: [
    'Find an equivalent fraction for 2/5 with denominator 20.',
    'Compare 3/4 and 5/8. Use < , > or =.',
    '5/12 + 1/4 = ?',
    'Write 0.6 as a fraction in simplest form.',
    'Riya ate 2/5 of a pizza, Diya ate 3/10. How much remains?',
    'Solve: 7/9 - 1/3.',
    'Convert 3 1/2 into an improper fraction.',
    'Order from least to greatest: 1/2, 3/8, 5/12.',
    'A jug holds 3/4 L of milk. How much in 4 jugs?',
    'Reduce 18/24 to its simplest form.',
  ],
  practice_cards: [
    { problem: '2/3 of 18 = ?', hint: 'Divide 18 by 3 then multiply by 2.' },
    { problem: 'Compare 5/6 and 7/9', hint: 'Find common denominator 18.' },
    { problem: 'Write 0.75 as a fraction', hint: 'Hundredths first, then simplify.' },
    { problem: '1/2 + 3/8', hint: 'Make denominators equal.' },
    { problem: 'Equivalent of 4/5 with denominator 25', hint: 'Multiply by 5.' },
    { problem: 'Reduce 12/18', hint: 'GCD is 6.' },
    { problem: 'Order: 1/4, 3/8, 1/2', hint: 'Compare 8ths.' },
    { problem: '5/6 - 1/3', hint: 'Common denominator 6.' },
  ],
  exit_ticket: [
    'I can identify equivalent fractions.  ☐ Yes  ☐ Not yet',
    'I can compare two fractions.        ☐ Yes  ☐ Not yet',
    'Solve: 2/3 + 1/6 = ____',
    'Find an equivalent fraction for 5/8 with denominator 16.',
    'One thing I want to practice more next class:',
  ],
}

function styleColors(styleId) {
  switch (styleId) {
    case 'canva':
      return {
        primary: '#7B2FF2', primarySoft: '#F4EEFF', accent: '#FF6F61',
        bg: '#FFFFFF', surface: '#FFF7FB', text: '#1B1B2F', muted: '#6B6B85',
        chip: '#E2D3FA',
      }
    case 'adobe':
      return {
        primary: '#E8344E', primarySoft: '#FDEAEA', accent: '#1B1B2F',
        bg: '#FFFFFF', surface: '#FAFAFA', text: '#1B1B2F', muted: '#5C5F6B',
        chip: '#F2D9DD',
      }
    case 'minimal':
    default:
      return {
        primary: '#0E0E0E', primarySoft: '#F2F2F2', accent: '#0E0E0E',
        bg: '#FFFFFF', surface: '#FAFAFA', text: '#0E0E0E', muted: '#7383A5',
        chip: '#ECECEC',
      }
  }
}

export default function WorksheetEditorCanvas({ context }) {
  const { closeCanvas, openCanvas, showToast, appendMessage, activeChatId } = useApp()
  const templateId = context?.templateId || 'clean_classroom'
  const styleId    = context?.styleId    || 'minimal'
  const subject    = context?.subject    || 'Mathematics'
  const topic      = context?.topic      || 'Fractions Readiness'
  const klassLabel = context?.classId    || 'Class 6'
  const colors     = useMemo(() => styleColors(styleId), [styleId])
  const templateMeta = WORKSHEET_TEMPLATES.find(t => t.id === templateId) || WORKSHEET_TEMPLATES[0]
  const styleMeta    = WORKSHEET_STYLES.find(s => s.id === styleId) || WORKSHEET_STYLES[2]

  const [previewing, setPreviewing] = useState(false)
  const [title, setTitle]           = useState(`${topic} — Practice Worksheet`)
  const [instructions, setInstructions] = useState(
    'Read each question carefully. Show working in the answer space. Time: 25 minutes.'
  )
  const [questions, setQuestions]   = useState(() => {
    const base = QUESTION_BANK[templateId] || QUESTION_BANK.clean_classroom
    return JSON.parse(JSON.stringify(base))  // deep clone so edits don't leak across re-mounts
  })

  const editable = !previewing
  const setText = (idx, val) => setQuestions(list => list.map((v, i) => i === idx ? val : v))
  const setCardField = (idx, field, val) => setQuestions(list => list.map((v, i) => i === idx ? { ...v, [field]: val } : v))

  const handleBackToPicker = () => {
    openCanvas({
      type: 'worksheet-template',
      preferredTemplate: templateId,
      preferredStyle: styleId,
      subject, topic,
      students: context?.students || [],
      sourceLessonPlan: context?.sourceLessonPlan || null,
      sourceGroup: context?.sourceGroup || null,
    })
  }

  const handlePrint = () => {
    showToast?.('Print preview prepared (mock).', 'ok')
  }
  const handleDownload = () => {
    showToast?.(`${title} prepared as ${styleMeta.title} PDF (mock).`, 'ok')
  }
  const handleSaveChat = () => {
    if (!activeChatId) {
      showToast?.('No active chat to save to.', 'info')
      return
    }
    appendMessage?.(activeChatId, {
      id: Date.now(),
      role: 'bot',
      text: `📝 Saved worksheet: "${title}" (${templateMeta.title} · ${styleMeta.title}).`,
      opts: [],
    })
    showToast?.('Worksheet saved to chat.', 'ok')
  }

  const editableProps = (val, onChange) => ({
    contentEditable: editable,
    suppressContentEditableWarning: true,
    onBlur: e => onChange(e.currentTarget.innerText),
    dangerouslySetInnerHTML: { __html: val },
    style: { outline: editable ? `1px dashed ${colors.chip}` : 'none', borderRadius: 4, padding: editable ? 2 : 0 },
  })

  return (
    <div className="px-3 py-3 pb-24" style={{ background: '#F7F8FA' }}>
      {/* Sub-header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleBackToPicker}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary px-2 py-1 rounded-full hover:bg-primary-light"
        >
          <ArrowLeft size={13} /> Back to template selection
        </button>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.3px] px-2 py-1 rounded-full" style={{ background: colors.primarySoft, color: colors.primary }}>
          {styleMeta.title}
        </span>
      </div>

      {/* Worksheet preview / editor */}
      <div
        className="rounded-2xl shadow-card border overflow-hidden"
        style={{ borderColor: colors.chip, background: colors.bg, color: colors.text }}
      >
        {/* Worksheet header */}
        <div className="px-5 py-4" style={{ background: colors.primarySoft }}>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.4px] font-bold" style={{ color: colors.primary }}>{templateMeta.title}</span>
            <span className="text-[10px] font-semibold" style={{ color: colors.muted }}>{SCHOOL} · {klassLabel} · {TODAY}</span>
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={previewing}
            className="w-full bg-transparent border-none focus:outline-none text-[20px] font-extrabold mt-1"
            style={{ color: colors.text }}
          />
          <div className="grid grid-cols-2 gap-3 mt-2 text-[11px]" style={{ color: colors.muted }}>
            <div>Subject: <strong style={{ color: colors.text }}>{subject}</strong></div>
            <div>Topic:   <strong style={{ color: colors.text }}>{topic}</strong></div>
            <div>Name:    ___________________________</div>
            <div>Date:    {TODAY}</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 py-3 border-t" style={{ borderColor: colors.chip, background: colors.surface }}>
          <div className="text-[10px] uppercase tracking-[0.4px] font-bold mb-1" style={{ color: colors.primary }}>Instructions</div>
          {editable ? (
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={2}
              className="w-full bg-transparent border-none focus:outline-none text-[12.5px] resize-none"
              style={{ color: colors.text }}
            />
          ) : (
            <div className="text-[12.5px] leading-snug">{instructions}</div>
          )}
        </div>

        {/* Body — varies by template */}
        {templateId === 'clean_classroom' && (
          <CleanClassroomBody questions={questions} setText={setText} editable={editable} colors={colors} />
        )}
        {templateId === 'practice_cards' && (
          <PracticeCardsBody questions={questions} setCardField={setCardField} editable={editable} colors={colors} />
        )}
        {templateId === 'exit_ticket' && (
          <ExitTicketBody questions={questions} setText={setText} editable={editable} colors={colors} />
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: colors.chip, color: colors.muted }}>
          <span>Teacher Note: ___________________________________</span>
          <span>Score: ____ / {questions.length}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <Tile icon={previewing ? EyeOff : Eye} label={previewing ? 'Edit mode' : 'Preview'} onClick={() => setPreviewing(p => !p)} />
        <Tile icon={Printer}   label="Print"          onClick={handlePrint} />
        <Tile icon={Download}  label="Download PDF"   onClick={handleDownload} />
        <Tile icon={Save}      label="Save to chat"   onClick={handleSaveChat} primary />
      </div>

      {/* Sticky close */}
      <div className="sticky bottom-0 pt-3 mt-3 border-t border-bdr-light bg-[#F7F8FA]">
        <button onClick={closeCanvas} className="w-full h-11 rounded-2xl border-[1.5px] border-bdr text-txt-secondary font-bold text-[13px] bg-white">Close</button>
      </div>
    </div>
  )
}

// ── Body renderers ────────────────────────────────────────────────────────

function CleanClassroomBody({ questions, setText, editable, colors }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.4px] font-bold mb-2" style={{ color: colors.primary }}>Questions</div>
      <ol className="space-y-3 list-decimal pl-5">
        {questions.map((q, i) => (
          <li key={i} className="text-[13px] leading-snug" style={{ color: colors.text }}>
            {editable ? (
              <input
                value={q}
                onChange={e => setText(i, e.target.value)}
                className="w-full bg-transparent border-b focus:outline-none text-[13px]"
                style={{ borderColor: colors.chip, color: colors.text }}
              />
            ) : (
              <div>{q}</div>
            )}
            <div className="mt-1.5 h-7 rounded" style={{ background: colors.surface, border: `1px dashed ${colors.chip}` }} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function PracticeCardsBody({ questions, setCardField, editable, colors }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.4px] font-bold mb-2" style={{ color: colors.primary }}>Practice Cards (cut along the dashed lines)</div>
      <div className="grid grid-cols-2 gap-3">
        {questions.map((c, i) => (
          <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: `1px dashed ${colors.chip}`, background: colors.surface }}>
            <div className="text-[10px] uppercase font-bold tracking-[0.3px]" style={{ color: colors.primary }}>Card {i + 1}</div>
            {editable ? (
              <input value={c.problem} onChange={e => setCardField(i, 'problem', e.target.value)} className="bg-transparent border-b text-[13px] font-semibold" style={{ borderColor: colors.chip, color: colors.text }} />
            ) : (
              <div className="text-[13px] font-semibold" style={{ color: colors.text }}>{c.problem}</div>
            )}
            {editable ? (
              <input value={c.hint} onChange={e => setCardField(i, 'hint', e.target.value)} className="bg-transparent border-b text-[11.5px]" style={{ borderColor: colors.chip, color: colors.muted }} />
            ) : (
              <div className="text-[11.5px]" style={{ color: colors.muted }}>Hint: {c.hint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExitTicketBody({ questions, setText, editable, colors }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.4px] font-bold mb-2" style={{ color: colors.primary }}>5-Question Exit Ticket</div>
      <ol className="space-y-3 list-decimal pl-5">
        {questions.map((q, i) => (
          <li key={i} className="text-[13px]" style={{ color: colors.text }}>
            {editable ? (
              <input value={q} onChange={e => setText(i, e.target.value)} className="w-full bg-transparent border-b text-[13px]" style={{ borderColor: colors.chip, color: colors.text }} />
            ) : (
              <span>{q}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Tile({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] text-[12.5px] font-semibold transition-colors text-left ${
        primary ? 'border-primary bg-primary text-white hover:bg-primary-dark'
                : 'border-bdr bg-white text-txt-primary hover:border-primary hover:text-primary'
      }`}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="leading-snug">{label}</span>
    </button>
  )
}
