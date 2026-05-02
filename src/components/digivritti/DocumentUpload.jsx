import React, { useRef, useState } from 'react'
import { FileText, CheckCircle2, AlertTriangle, Replace } from 'lucide-react'

// SwiftChat semantic colour tokens used here.
const C = {
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', successBg: '#CCEFBF', successText: '#007B22', successBanner: '#D4F5DC',
  errorBg: '#FDEAEA', errorText: '#C0392B',
  warningBg: '#FDE1AC', warningText: '#9A6500',
  brand: '#386AF6',
}
const FONT = 'Montserrat, sans-serif'

const STATE_STYLES = {
  required: { bg: C.surface,       fg: C.textSecondary, border: C.borderDefault, dashed: true,  label: 'Required' },
  selected: { bg: C.successBanner, fg: C.successText,   border: C.brand,         dashed: false, label: 'Selected' },
  uploaded: { bg: C.successBanner, fg: C.successText,   border: '#00BA34',       dashed: false, label: 'Uploaded' },
  verified: { bg: C.successBg,     fg: C.successText,   border: '#00BA34',       dashed: false, label: 'Verified' },
  missing:  { bg: C.errorBg,       fg: C.errorText,     border: '#EB5757',       dashed: true,  label: 'Missing' },
  rejected: { bg: C.errorBg,       fg: C.errorText,     border: '#EB5757',       dashed: false, label: 'Rejected' },
  blurry:   { bg: C.warningBg,     fg: C.warningText,   border: '#F8B200',       dashed: false, label: 'Blurry — please re-upload' },
  mismatch: { bg: C.errorBg,       fg: C.errorText,     border: '#EB5757',       dashed: false, label: 'Mismatch — please re-upload' },
}

// Reusable native PDF picker with selected-filename feedback.
//   onUpload(meta) — meta is { name, size, type } (no real upload backend).
export default function DocumentUpload({ label, state = 'required', file, onUpload, onError }) {
  const ref = useRef(null)
  const [localState, setLocalState] = useState(state)
  const [localFile, setLocalFile] = useState(file || null)
  const style = STATE_STYLES[localState] || STATE_STYLES.required

  const handlePick = () => ref.current?.click()

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    if (!isPdf) {
      const msg = 'Only PDF files are supported for this document.'
      onError?.(msg)
      // Reset so user can retry the same file later.
      if (ref.current) ref.current.value = ''
      return
    }
    const meta = { name: f.name, size: f.size, type: f.type, pickedAt: new Date().toISOString() }
    setLocalFile(meta)
    setLocalState('uploaded')
    onUpload?.(meta)
    if (ref.current) ref.current.value = ''
  }

  const isDone = localState === 'uploaded' || localState === 'verified' || localState === 'selected'
  const Icon = isDone ? CheckCircle2 : (localState === 'blurry' || localState === 'mismatch') ? AlertTriangle : FileText

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 10,
      background: style.bg,
      border: `1.5px ${style.dashed ? 'dashed' : 'solid'} ${style.border}`,
      fontFamily: FONT,
    }}>
      <input ref={ref} type="file" accept=".pdf,application/pdf"
        style={{ display: 'none' }} onChange={handleFile} />
      <Icon size={18} color={style.fg} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, lineHeight: '18px' }}>{label}</div>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
          color: style.fg, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {localFile ? `${localFile.name} · ${style.label}` : style.label}
        </div>
      </div>
      <button onClick={handlePick} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', borderRadius: 999,
        border: `1.5px solid ${C.brand}`,
        background: isDone ? C.surface : C.brand,
        color: isDone ? C.brand : C.surface,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.25px',
        cursor: 'pointer', fontFamily: FONT, flexShrink: 0,
      }}>
        {isDone ? <><Replace size={11} /> Replace</> : 'Choose PDF'}
      </button>
    </div>
  )
}

export { STATE_STYLES }
