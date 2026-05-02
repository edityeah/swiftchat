import React, { useState } from 'react'
import {
  Layout, ArrowRight, Sparkles, Palette, Layers, Printer,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

// Worksheet template + design-style picker.
//
// Opened by:
//   • Lesson Plan canvas → "Create worksheet" / "Open Canva-style" / "Open Adobe-style"
//   • Intervention Group canvas → "Generate practice worksheet"
//   • Ask AI prompts that ask for a worksheet / practice activity
//
// User selects ONE template + ONE design style, then taps "Open Editor" to
// land on the worksheet HTML editor canvas pre-filled with the choices.

const TEMPLATES = [
  {
    id: 'clean_classroom',
    title: 'Worksheet — Clean Classroom',
    description: 'Simple printable worksheet with questions and answer space.',
    type: 'HTML worksheet',
    icon: '📝',
  },
  {
    id: 'practice_cards',
    title: 'Practice Cards — Fractions',
    description: 'Card-style activity for small groups.',
    type: 'HTML cards',
    icon: '🃏',
  },
  {
    id: 'exit_ticket',
    title: 'Exit Ticket — Quick Check',
    description: '5-question exit ticket for the end of session.',
    type: 'HTML exit ticket',
    icon: '🎟️',
  },
]

const STYLES = [
  {
    id: 'canva',
    title: 'Canva Style — Colorful',
    description: 'Bright, student-friendly layout with icons and section blocks.',
    icon: Palette,
    accent: '#7B2FF2',
    accentLight: '#F4EEFF',
  },
  {
    id: 'adobe',
    title: 'Adobe Style — Professional',
    description: 'Clean editorial layout with strong hierarchy.',
    icon: Layers,
    accent: '#E8344E',
    accentLight: '#FDEAEA',
  },
  {
    id: 'minimal',
    title: 'Minimal Print',
    description: 'Ink-friendly black-and-white layout for printing.',
    icon: Printer,
    accent: '#0E0E0E',
    accentLight: '#ECECEC',
  },
]

export default function WorksheetTemplateCanvas({ context }) {
  const { closeCanvas, openCanvas } = useApp()

  // Honour a preferred style passed in by the lesson plan canvas (e.g.
  // "Open Canva-style design" → style preselected).
  const initialStyle = STYLES.find(s => s.id === context?.preferredStyle)?.id || null
  const [templateId, setTemplateId] = useState(context?.preferredTemplate || null)
  const [styleId, setStyleId]       = useState(initialStyle)

  const ready = templateId && styleId

  const handleOpenEditor = () => {
    if (!ready) return
    openCanvas({
      type: 'worksheet-editor',
      templateId,
      styleId,
      subject: context?.subject || 'Mathematics',
      topic: context?.topic || 'Fractions Readiness',
      students: Array.isArray(context?.students) ? context.students : [],
      sourceLessonPlan: context?.sourceLessonPlan || null,
      sourceGroup: context?.sourceGroup || null,
    })
  }

  return (
    <div className="px-4 py-4 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
          <Layout size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-txt-primary leading-snug">Choose a Design Template</div>
          <div className="text-[12px] text-txt-secondary leading-snug mt-0.5">Select a design style before editing the worksheet.</div>
        </div>
      </div>

      {/* Template options */}
      <Section title="Template" subtitle="Pick the layout that matches your goal.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map(t => {
            const selected = templateId === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`text-left rounded-xl border-[1.5px] p-3 transition-colors ${
                  selected ? 'border-primary bg-primary-light' : 'border-bdr bg-white hover:border-primary/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[20px] leading-none">{t.icon}</span>
                  <span className="text-[13px] font-bold text-txt-primary leading-snug">{t.title}</span>
                  {selected && <span className="ml-auto text-[10px] font-bold text-primary uppercase">Selected</span>}
                </div>
                <div className="text-[12px] text-txt-secondary leading-snug">{t.description}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.4px] text-txt-tertiary mt-2">{t.type}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Design styles */}
      <Section title="Design style" subtitle="Pick the visual treatment.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STYLES.map(s => {
            const Icon = s.icon
            const selected = styleId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`text-left rounded-xl border-[1.5px] p-3 transition-colors ${
                  selected ? 'bg-primary-light border-primary' : 'border-bdr bg-white hover:border-primary/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.accentLight, color: s.accent }}>
                    <Icon size={16} />
                  </span>
                  <span className="text-[13px] font-bold text-txt-primary leading-snug">{s.title}</span>
                  {selected && <span className="ml-auto text-[10px] font-bold text-primary uppercase">Selected</span>}
                </div>
                <div className="text-[12px] text-txt-secondary leading-snug">{s.description}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 bg-white pt-3 mt-3 border-t border-bdr-light flex gap-2">
        <button onClick={closeCanvas} className="flex-1 h-11 rounded-2xl border-[1.5px] border-bdr text-txt-secondary font-bold text-[13px]">Cancel</button>
        <button
          onClick={handleOpenEditor}
          disabled={!ready}
          className={`flex-1 h-11 rounded-2xl font-bold text-[13px] inline-flex items-center justify-center gap-1.5 transition-colors ${
            ready ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-surface-secondary text-txt-tertiary'
          }`}
        >
          <Sparkles size={14} /> Open Editor <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-4">
      <div className="mb-2">
        <div className="text-[11px] font-bold tracking-[0.4px] uppercase text-txt-tertiary">{title}</div>
        {subtitle && <div className="text-[11px] text-txt-tertiary">{subtitle}</div>}
      </div>
      {children}
    </section>
  )
}

export const WORKSHEET_TEMPLATES = TEMPLATES
export const WORKSHEET_STYLES = STYLES
