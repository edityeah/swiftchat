import React, { useMemo, useState } from 'react'
import {
  BookOpen, Edit3, Download, FileText, Save, Palette,
  Layers, Check, ChevronRight,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

// Lesson Plan canvas — opened from Ask AI's "Generate lesson plan" or from
// inside the Intervention Group canvas. Distinct from PDFCanvas: this surface
// renders an actual editable lesson plan rather than a "pick a document type"
// menu. The PDF flow stays parked behind the Reports tile.

const DEFAULT_OBJECTIVES = [
  'Identify equivalent fractions',
  'Compare fractions using visual models',
  'Solve simple fraction word problems',
  'Improve division fluency needed for fractions',
]

const DEFAULT_FLOW = [
  { phase: 'Warm-up',           detail: 'Division facts drill',                          duration: '5 min' },
  { phase: 'Concept recap',      detail: 'Equivalent fractions using number line',        duration: '10 min' },
  { phase: 'Guided practice',    detail: 'Fraction comparison',                           duration: '15 min' },
  { phase: 'Word problem routine', detail: 'Read, draw, solve',                            duration: '15 min' },
  { phase: 'Exit ticket',         detail: '5 questions',                                   duration: '10 min' },
]

const DEFAULT_MATERIALS = [
  'Fraction strips',
  'Number line worksheet',
  'Practice cards',
  'Exit ticket',
]

const DEFAULT_DIFFERENTIATION = {
  'Aarav Desai':   'extra support for word problem setup',
  'Nisha Parma':   'visual fraction model practice',
  'Harsh Vaghela': 'division facts fluency support',
  'Ishit Dabhi':   'comparison practice',
  'Tanvi Panchal': 'guided word problem examples',
}

function buildDefaultDifferentiation(students) {
  if (!students?.length) return Object.entries(DEFAULT_DIFFERENTIATION).map(([name, plan]) => ({ name, plan }))
  return students.map(name => ({
    name,
    plan: DEFAULT_DIFFERENTIATION[name] || 'targeted practice for the weakest topic',
  }))
}

export default function LessonPlanCanvas({ context }) {
  const { showToast, closeCanvas, openCanvas, appendMessage, activeChatId } = useApp()
  const subject = context?.subject || 'Mathematics'
  const klass   = context?.classId || context?.klass || 'Class 6'
  const topic   = context?.topic   || 'Fractions Readiness'

  const initialStudents = useMemo(() => {
    return Array.isArray(context?.students) && context.students.length
      ? context.students
      : Object.keys(DEFAULT_DIFFERENTIATION)
  }, [context])

  const [title, setTitle] = useState(`Lesson Plan — ${topic}`)
  const [editing, setEditing] = useState(false)
  const [objectives, setObjectives] = useState(context?.objectives || DEFAULT_OBJECTIVES)
  const [flow, setFlow]               = useState(context?.flow || DEFAULT_FLOW)
  const [materials, setMaterials]     = useState(context?.materials || DEFAULT_MATERIALS)
  const [differentiation, setDifferentiation] = useState(() => buildDefaultDifferentiation(initialStudents))

  const handleCreateWorksheet = () => {
    openCanvas({
      type: 'worksheet-template',
      subject,
      topic,
      students: initialStudents,
      sourceLessonPlan: title,
    })
  }
  const handleOpenDesign = (tool) => {
    openCanvas({
      type: 'worksheet-template',
      subject,
      topic,
      students: initialStudents,
      sourceLessonPlan: title,
      preferredStyle: tool,  // 'canva' | 'adobe'
    })
  }
  const handleDownloadPdf = () => {
    showToast?.('Lesson plan PDF prepared (mock).', 'ok')
  }
  const handleSaveToChat = () => {
    if (!activeChatId) {
      showToast?.('No active chat to save to.', 'info')
      return
    }
    appendMessage?.(activeChatId, {
      id: Date.now(),
      role: 'bot',
      text: `📚 ${title} saved to chat.`,
      opts: [],
    })
    showToast?.('Lesson plan saved to chat.', 'ok')
  }

  return (
    <div className="px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
          <BookOpen size={20} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-2 py-1 border border-bdr rounded-lg text-[15px] font-bold bg-white"
            />
          ) : (
            <div className="text-[16px] font-bold text-txt-primary leading-snug truncate">{title}</div>
          )}
          <div className="text-[12px] text-txt-secondary leading-snug mt-0.5">{subject} · {klass} · Topic: {topic}</div>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${editing ? 'bg-primary text-white border-primary' : 'border-bdr text-txt-secondary'}`}
        >
          {editing ? (<><Check size={12} /> Done</>) : (<><Edit3 size={12} /> Edit</>)}
        </button>
      </div>

      {/* Target Students */}
      <Section title="Target Students">
        <div className="flex flex-wrap gap-2">
          {initialStudents.map(name => (
            <span key={name} className="px-3 py-1.5 rounded-full bg-primary-light text-primary text-[12px] font-semibold">{name}</span>
          ))}
        </div>
      </Section>

      {/* Learning Objectives */}
      <Section title="Learning Objectives">
        <ul className="border border-bdr rounded-xl overflow-hidden">
          {objectives.map((o, i) => (
            <li key={i} className={`px-3 py-2 flex items-start gap-2 ${i < objectives.length - 1 ? 'border-b border-bdr-light' : ''}`}>
              <span className="text-primary text-[12px] mt-0.5">•</span>
              {editing ? (
                <input
                  value={o}
                  onChange={e => setObjectives(list => list.map((v, idx) => idx === i ? e.target.value : v))}
                  className="flex-1 px-2 py-0.5 border border-bdr rounded text-[12.5px] bg-white"
                />
              ) : (
                <span className="text-[12.5px] text-txt-primary leading-snug">{o}</span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Lesson Flow */}
      <Section title="Lesson Flow">
        <ol className="border border-bdr rounded-xl overflow-hidden">
          {flow.map((step, i) => (
            <li key={i} className={`px-3 py-2.5 flex items-start gap-3 ${i < flow.length - 1 ? 'border-b border-bdr-light' : ''}`}>
              <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-light text-primary text-[11px] font-bold">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-txt-primary">{step.phase}</div>
                {editing ? (
                  <textarea
                    value={step.detail}
                    onChange={e => setFlow(list => list.map((v, idx) => idx === i ? { ...v, detail: e.target.value } : v))}
                    rows={2}
                    className="w-full mt-1 px-2 py-1 border border-bdr rounded text-[12px] bg-white"
                  />
                ) : (
                  <div className="text-[12px] text-txt-secondary leading-snug mt-0.5">{step.detail}</div>
                )}
              </div>
              <span className="flex-shrink-0 text-[11px] text-txt-tertiary font-semibold">{step.duration}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Materials */}
      <Section title="Materials">
        <div className="flex flex-wrap gap-2">
          {materials.map((m, i) => editing ? (
            <input
              key={i}
              value={m}
              onChange={e => setMaterials(list => list.map((v, idx) => idx === i ? e.target.value : v))}
              className="px-2 py-1 border border-bdr rounded-full text-[12px] bg-white"
            />
          ) : (
            <span key={i} className="px-3 py-1.5 rounded-full border border-bdr text-[12px] text-txt-primary">{m}</span>
          ))}
        </div>
      </Section>

      {/* Differentiation */}
      <Section title="Differentiation">
        <div className="border border-bdr rounded-xl overflow-hidden">
          {differentiation.map((d, i) => (
            <div key={i} className={`px-3 py-2.5 flex items-start gap-2 ${i < differentiation.length - 1 ? 'border-b border-bdr-light' : ''}`}>
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary-light text-primary text-[10px] font-bold uppercase">{d.name}</span>
              {editing ? (
                <input
                  value={d.plan}
                  onChange={e => setDifferentiation(list => list.map((v, idx) => idx === i ? { ...v, plan: e.target.value } : v))}
                  className="flex-1 px-2 py-0.5 border border-bdr rounded text-[12px] bg-white"
                />
              ) : (
                <span className="text-[12px] text-txt-secondary leading-snug">{d.plan}</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Assessment */}
      <Section title="Assessment">
        <div className="px-3 py-2.5 border border-bdr rounded-xl bg-surface-secondary">
          <div className="text-[12.5px] text-txt-primary font-semibold">5-question exit ticket</div>
          <div className="text-[12px] text-txt-secondary mt-0.5">Target improvement: +10 percentage points in next XAMTA check.</div>
        </div>
      </Section>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        <Tile icon={Edit3}     label={editing ? 'Save edits' : 'Edit lesson plan'} onClick={() => setEditing(e => !e)} />
        <Tile icon={Download}  label="Download as PDF"     onClick={handleDownloadPdf} />
        <Tile icon={FileText}  label="Create worksheet"    onClick={handleCreateWorksheet} />
        <Tile icon={Palette}   label="Open Canva-style design" onClick={() => handleOpenDesign('canva')} />
        <Tile icon={Layers}    label="Open Adobe-style design" onClick={() => handleOpenDesign('adobe')} />
        <Tile icon={Save}      label="Save to chat"        onClick={handleSaveToChat} primary />
      </div>

      {/* Sticky close */}
      <div className="sticky bottom-0 bg-white pt-3 mt-3 border-t border-bdr-light">
        <button onClick={closeCanvas} className="w-full h-11 rounded-2xl border-[1.5px] border-bdr text-txt-secondary font-bold text-[13px]">Close</button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-4">
      <div className="text-[11px] font-bold tracking-[0.4px] uppercase text-txt-tertiary mb-2">{title}</div>
      {children}
    </section>
  )
}

function Tile({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-[1.5px] text-[12.5px] font-semibold transition-colors text-left ${
        primary
          ? 'border-primary bg-primary text-white hover:bg-primary-dark'
          : 'border-bdr bg-white text-txt-primary hover:border-primary hover:text-primary'
      }`}
    >
      <Icon size={15} className="flex-shrink-0" />
      <span className="leading-snug">{label}</span>
      {!primary && <ChevronRight size={13} className="flex-shrink-0 ml-auto opacity-60" />}
    </button>
  )
}
