import React, { useState, useEffect } from 'react'
import { Download, Share2, Eye, FileText, Printer, CheckCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// ── Document types ────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { id: 'report-card',     icon: '📊', label: 'Report Card',        sub: 'Class 6-B · March 2025' },
  { id: 'attendance-cert', icon: '📅', label: 'Attendance Certificate', sub: 'Individual student' },
  { id: 'scholarship',     icon: '🏅', label: 'Scholarship Letter',  sub: 'Namo Laxmi eligibility' },
  { id: 'progress',        icon: '📈', label: 'Progress Report',     sub: 'Term 2 summary' },
  { id: 'consolidated',    icon: '📋', label: 'Consolidated Report', sub: 'Full class report' },
]

// ── Preview content per doc type ──────────────────────────────────────────────

const PREVIEWS = {
  'report-card': {
    title: 'ACADEMIC REPORT CARD',
    header: { school: 'GPS Mehsana', student: 'Ravi Patel', class: '6-B', roll: '01', year: '2024-25' },
    rows: [
      { subject: 'Mathematics',  marks: '72/100', grade: 'B', remarks: 'Good' },
      { subject: 'Science',      marks: '78/100', grade: 'B+', remarks: 'Very Good' },
      { subject: 'English',      marks: '58/100', grade: 'C', remarks: 'Needs Improvement' },
      { subject: 'Gujarati',     marks: '85/100', grade: 'A', remarks: 'Excellent' },
      { subject: 'Social Sci.',  marks: '74/100', grade: 'B', remarks: 'Good' },
    ],
    footer: { total: '367/500', pct: '73.4%', grade: 'B', result: 'PASS' },
  },
  'attendance-cert': {
    title: 'ATTENDANCE CERTIFICATE',
    header: { school: 'GPS Mehsana', student: 'Ravi Patel', class: '6-B', roll: '01', year: '2024-25' },
    rows: [
      { subject: 'April 2025',     marks: '19/22',  grade: '86%', remarks: '🟢 Good' },
      { subject: 'March 2025',     marks: '17/23',  grade: '74%', remarks: '🟡 At Risk' },
      { subject: 'February 2025',  marks: '20/20',  grade: '100%', remarks: '🟢 Perfect' },
      { subject: 'January 2025',   marks: '19/23',  grade: '83%', remarks: '🟢 Good' },
    ],
    footer: { total: '75/88 days', pct: '85.2%', grade: 'GOOD', result: 'ELIGIBLE' },
  },
  'scholarship': {
    title: 'NAMO LAXMI SCHOLARSHIP LETTER',
    header: { school: 'GPS Mehsana', student: 'Ravi Patel', class: '6-B', roll: '01', year: '2024-25' },
    rows: [
      { subject: 'Attendance',      marks: '74%',  grade: '< 80%', remarks: '🔴 At Risk' },
      { subject: 'Required',        marks: '80%',  grade: 'Threshold', remarks: 'Mandatory' },
      { subject: 'Balance Days',    marks: '4',    grade: 'Days Left', remarks: 'March' },
      { subject: 'Bank Account',    marks: 'SBI',  grade: 'Verified', remarks: '🟢 Active' },
    ],
    footer: { total: 'Status', pct: 'AT RISK', grade: 'PENDING', result: 'CONDITIONAL' },
  },
}

function getPreview(docType) {
  return PREVIEWS[docType] || PREVIEWS['report-card']
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DocumentPreview({ docType }) {
  const preview = getPreview(docType)
  return (
    <div className="bg-white rounded-2xl border border-bdr-light shadow-card overflow-hidden mx-3.5 my-3">
      {/* Doc header */}
      <div className="bg-primary px-4 py-3 text-white">
        <div className="text-[9px] font-bold tracking-widest opacity-75">GOVERNMENT OF GUJARAT — VSK</div>
        <div className="text-[14px] font-bold mt-0.5">{preview.title}</div>
      </div>

      {/* Student info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 bg-primary-light border-b border-bdr-light text-[11px]">
        <div><span className="text-txt-tertiary">School: </span><span className="font-semibold text-txt-primary">{preview.header.school}</span></div>
        <div><span className="text-txt-tertiary">Student: </span><span className="font-semibold text-txt-primary">{preview.header.student}</span></div>
        <div><span className="text-txt-tertiary">Class: </span><span className="font-semibold text-txt-primary">{preview.header.class}</span></div>
        <div><span className="text-txt-tertiary">Roll: </span><span className="font-semibold text-txt-primary">{preview.header.roll}</span></div>
        <div><span className="text-txt-tertiary">Year: </span><span className="font-semibold text-txt-primary">{preview.header.year}</span></div>
      </div>

      {/* Data table */}
      <table className="w-full text-left">
        <thead>
          <tr className="bg-surface-secondary">
            <th className="px-3 py-2 text-[9.5px] font-bold text-txt-tertiary uppercase tracking-wide">Subject / Month</th>
            <th className="px-3 py-2 text-[9.5px] font-bold text-txt-tertiary uppercase tracking-wide">Marks / Days</th>
            <th className="px-3 py-2 text-[9.5px] font-bold text-txt-tertiary uppercase tracking-wide">Grade / %</th>
            <th className="px-3 py-2 text-[9.5px] font-bold text-txt-tertiary uppercase tracking-wide">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row, i) => (
            <tr key={i} className="border-t border-bdr-light">
              <td className="px-3 py-2 text-[11px] font-bold text-txt-primary">{row.subject}</td>
              <td className="px-3 py-2 text-[11px] text-txt-secondary">{row.marks}</td>
              <td className="px-3 py-2 text-[11px] text-txt-secondary">{row.grade}</td>
              <td className="px-3 py-2 text-[11px] text-txt-secondary">{row.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary border-t border-bdr-light">
        <div className="text-[11px]"><span className="text-txt-tertiary">Total: </span><span className="font-bold text-txt-primary">{preview.footer.total}</span></div>
        <div className="text-[11px]"><span className="text-txt-tertiary">% </span><span className="font-bold text-txt-primary">{preview.footer.pct}</span></div>
        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${preview.footer.result === 'PASS' || preview.footer.result === 'ELIGIBLE' ? 'bg-ok-light text-ok' : 'bg-warn-light text-warn'}`}>
          {preview.footer.result}
        </div>
      </div>

      {/* Signature area */}
      <div className="flex justify-between px-4 py-3 border-t border-bdr-light">
        {['Class Teacher', 'Principal', 'Seal'].map((s, i) => (
          <div key={i} className="text-center">
            <div className="w-16 h-8 border-b border-dashed border-txt-tertiary mb-1" />
            <div className="text-[9px] text-txt-tertiary">{s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneratingAnimation() {
  const [step, setStep] = useState(0)
  const steps = ['Fetching student data…', 'Calculating grades…', 'Applying template…', 'Generating PDF…', 'Finalizing…']
  useEffect(() => {
    const t = setInterval(() => setStep(p => Math.min(p + 1, steps.length - 1)), 500)
    return () => clearInterval(t)
  }, [])
  const pct = Math.round(((step + 1) / steps.length) * 100)
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-3xl mb-4 animate-pulse-ring">
        📄
      </div>
      <div className="text-[16px] font-bold text-txt-primary mb-1">Generating PDF…</div>
      <div className="text-[13px] text-txt-secondary mb-4">{steps[step]}</div>
      <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[12px] text-txt-tertiary">{pct}% complete</div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PDFCanvas({ context }) {
  const { showToast, closeCanvas } = useApp()
  const [selectedDoc, setSelectedDoc] = useState(context.docType || 'report-card')
  const [state, setState] = useState('select') // select | generating | preview | downloaded

  const handleGenerate = () => {
    setState('generating')
    setTimeout(() => setState('preview'), 2800)
  }

  const handleDownload = () => {
    setState('downloaded')
    showToast('PDF downloaded to your device ✓', 'ok')
  }

  // ── Downloaded state ──
  if (state === 'downloaded') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-ok-light flex items-center justify-center text-4xl mb-4 shadow-card">
          ✅
        </div>
        <div className="text-[20px] font-bold text-txt-primary mb-1">PDF Downloaded!</div>
        <div className="text-[14px] text-txt-secondary mb-6 leading-relaxed">
          {DOC_TYPES.find(d => d.id === selectedDoc)?.label || 'Document'} saved to your device
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setState('select')}
            className="flex-1 h-11 rounded-2xl border-[1.5px] border-primary text-primary font-bold text-[14px] active:bg-primary-light"
          >
            Generate Another
          </button>
          <button
            onClick={closeCanvas}
            className="flex-1 h-11 rounded-2xl bg-primary text-white font-bold text-[14px] active:opacity-80"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Generating state ──
  if (state === 'generating') {
    return <GeneratingAnimation />
  }

  // ── Preview state ──
  if (state === 'preview') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="px-3.5 py-2.5 bg-ok-light border-b border-[#A5D6A7] flex items-center gap-2">
            <CheckCircle size={15} className="text-ok" />
            <span className="text-[12px] font-bold text-ok">PDF ready · Tap Download to save</span>
          </div>
          <DocumentPreview docType={selectedDoc} />
        </div>

        <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex gap-2 flex-shrink-0">
          <button
            onClick={() => setState('select')}
            className="w-11 h-12 flex items-center justify-center rounded-2xl border border-bdr text-txt-secondary active:bg-surface-secondary"
          >
            ‹
          </button>
          <button
            onClick={() => showToast('Shared via WhatsApp ✓', 'ok')}
            className="flex-1 h-12 rounded-2xl bg-surface-secondary text-txt-primary border border-bdr font-bold text-[13px] flex items-center justify-center gap-1.5 active:bg-primary-light"
          >
            <Share2 size={15} /> Share
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold text-[14px] flex items-center justify-center gap-1.5 active:opacity-80"
          >
            <Download size={15} /> Download
          </button>
        </div>
      </div>
    )
  }

  // ── Select state ──
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-surface-secondary space-y-3">
        <div className="text-[13px] font-bold text-txt-primary">Select Document Type</div>

        {DOC_TYPES.map(doc => (
          <button
            key={doc.id}
            onClick={() => setSelectedDoc(doc.id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] text-left transition-all active:scale-[0.98] ${
              selectedDoc === doc.id
                ? 'border-primary bg-primary-light shadow-[0_0_0_3px_rgba(56,106,246,0.08)]'
                : 'border-bdr bg-white shadow-card'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${selectedDoc === doc.id ? 'bg-primary text-white' : 'bg-surface-secondary'}`}>
              {selectedDoc === doc.id ? '✓' : doc.icon}
            </div>
            <div className="flex-1">
              <div className={`text-[13px] font-bold ${selectedDoc === doc.id ? 'text-primary' : 'text-txt-primary'}`}>
                {doc.label}
              </div>
              <div className="text-[11px] text-txt-secondary mt-0.5">{doc.sub}</div>
            </div>
            {selectedDoc === doc.id && (
              <CheckCircle size={16} className="text-primary flex-shrink-0" />
            )}
          </button>
        ))}

        <div className="h-2" />
      </div>

      <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex-shrink-0">
        <button
          onClick={handleGenerate}
          className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-[15px] active:opacity-80 flex items-center justify-center gap-2"
        >
          <FileText size={17} /> Generate PDF →
        </button>
      </div>
    </div>
  )
}
