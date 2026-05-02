import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, XCircle, Clock, ChevronDown, Pencil, Send, Eye, AlertTriangle,
  Sparkles, FileText, RefreshCw,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  SCHEMES, APPLICATION_STATUS, DOC_DEFINITIONS, DOC_STATE,
  getApplicationById, getApplications, appCounts, statusBucket,
  applyResubmission, addApplication, STUDENTS,
} from '../../data/digivritti/applications'
import DocumentUpload from '../../components/digivritti/DocumentUpload'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (mirror swiftchat-design-system.md semantic palette)
// ─────────────────────────────────────────────────────────────────────────────
const FONT = 'Montserrat, sans-serif'
const C = {
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', surfaceTint: '#ECECEC', brandSubtle: '#EEF2FF',
  brand: '#386AF6', brandSubdued: '#345CCC',
  success: '#00BA34', successText: '#007B22', successBg: '#CCEFBF', successBanner: '#D4F5DC',
  warning: '#F8B200', warningText: '#9A6500', warningBg: '#FDE1AC', warningBanner: '#FFF3CC',
  error: '#EB5757', errorText: '#C0392B', errorBg: '#FDEAEA',
  info: '#84A2F4', infoText: '#345CCC', infoBg: '#C3D2FC',
}

const TONE_BG = { success: C.successBg, warning: C.warningBg, error: C.errorBg, info: C.infoBg, neutral: C.borderSubtle }
const TONE_FG = { success: C.successText, warning: C.warningText, error: C.errorText, info: C.infoText, neutral: C.textSecondary }

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const meta = APPLICATION_STATUS[status] || { label: status, tone: 'neutral', icon: '•' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: TONE_BG[meta.tone], color: TONE_FG[meta.tone],
      padding: '4px 10px', borderRadius: 999,
      fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
    }}>{meta.icon} {meta.label}</span>
  )
}

function DocChip({ state, label }) {
  const meta = DOC_STATE[state] || DOC_STATE.uploaded
  return (
    <span style={{
      background: TONE_BG[meta.tone], color: TONE_FG[meta.tone],
      fontFamily: FONT, fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
      padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
    }}>{state === 'verified' || state === 'uploaded' ? '✅' : state === 'blurry' ? '⚠️' : '❌'} {label}</span>
  )
}

function StatTile({ count, label, tone }) {
  return (
    <div style={{
      flex: 1, background: TONE_BG[tone], color: TONE_FG[tone],
      borderRadius: 8, padding: '12px 8px', textAlign: 'center', fontFamily: FONT,
      minWidth: 64,
    }}>
      <div style={{ fontSize: 20, fontWeight: 600, lineHeight: '24px', marginBottom: 2 }}>{count}</div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2px' }}>{label}</div>
    </div>
  )
}

function primaryBtn(opts = {}) {
  const { tone = 'primary', flex = 1 } = opts
  const palette = tone === 'success' ? { bg: C.success, fg: C.surface }
    : tone === 'danger' ? { bg: C.error, fg: C.surface }
    : tone === 'ghost'  ? { bg: C.surface, fg: C.textSecondary, border: C.borderDefault }
    : { bg: C.brand, fg: C.surface }
  return {
    flex, padding: '12px 16px', borderRadius: 999,
    border: palette.border ? `1.5px solid ${palette.border}` : 'none',
    background: palette.bg, color: palette.fg,
    fontSize: 14, fontWeight: 600, letterSpacing: '0.1px',
    cursor: 'pointer', fontFamily: FONT,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}

function outlineBtn(borderColor = C.brand, textColor = C.brand) {
  return {
    flex: 1, padding: '8px 12px',
    border: `1.5px solid ${borderColor}`, color: textColor,
    background: C.surface, borderRadius: 999,
    fontSize: 12, fontWeight: 600, letterSpacing: '0.25px', cursor: 'pointer',
    fontFamily: FONT,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline NOT-FOUND fallback (auto-routes to list after a moment)
// ─────────────────────────────────────────────────────────────────────────────
function NotFoundCard({ appId, onSeeList }) {
  useEffect(() => {
    const t = setTimeout(() => onSeeList?.(), 1600)
    return () => clearTimeout(t)
  }, [onSeeList])
  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <div style={{
        background: C.warningBanner, border: `1px solid ${C.warning}`,
        borderRadius: 12, padding: 16,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={18} color={C.warningText} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.warningText, marginBottom: 4 }}>
            We couldn't find application {appId}.
          </div>
          <div style={{ fontSize: 12, color: C.warningText, lineHeight: '18px' }}>
            Showing the application list instead…
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
const FILTER_BUCKETS = [
  { id: 'all',         label: 'All' },
  { id: 'pending',     label: 'Pending' },
  { id: 'approved',    label: 'Approved' },
  { id: 'rejected',    label: 'Rejected' },
  { id: 'resubmitted', label: 'Resubmitted' },
  { id: 'draft',       label: 'Draft' },
]

function ApplicationCard({ app, expanded, onToggle, onAction }) {
  const docDefs = DOC_DEFINITIONS[app.schemeId] || []
  const hasIssues = !!app.rejectionReason
  const bucket = statusBucket(app.status)

  return (
    <div style={{
      border: `1px solid ${C.borderDefault}`, borderRadius: 12, marginBottom: 8,
      background: C.surface, overflow: 'hidden', fontFamily: FONT,
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: 12, width: '100%', border: 'none',
          background: C.surface, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 999,
          background: TONE_BG[APPLICATION_STATUS[app.status]?.tone || 'neutral'],
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontSize: 14,
        }}>
          {APPLICATION_STATUS[app.status]?.icon || '•'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.2px', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {app.studentName}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2px', color: C.textTertiary }}>
            Class {app.grade}{app.section ? `-${app.section}` : ''} · {SCHEMES[app.schemeId]?.short} · {app.appId}
          </div>
        </div>
        <StatusChip status={app.status} />
        <ChevronDown size={16} color={C.textTertiary}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 160ms', flexShrink: 0 }} />
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${C.borderSubtle}` }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
            fontSize: 11, color: C.textPrimary, marginTop: 12,
          }}>
            <div><span style={{ color: C.textTertiary }}>Father:</span> <strong>{app.fatherName}</strong></div>
            <div><span style={{ color: C.textTertiary }}>Mother:</span> <strong>{app.motherName}</strong></div>
            <div><span style={{ color: C.textTertiary }}>School:</span> {app.school}</div>
            <div><span style={{ color: C.textTertiary }}>District:</span> {app.district}</div>
            <div><span style={{ color: C.textTertiary }}>Phone:</span> {app.phone}</div>
            <div><span style={{ color: C.textTertiary }}>Submitted:</span> {app.submittedAt}</div>
            <div><span style={{ color: C.textTertiary }}>Student Aadhaar:</span> {app.studentAadhaar}</div>
            <div><span style={{ color: C.textTertiary }}>Mother Aadhaar:</span> {app.motherAadhaar}</div>
            <div><span style={{ color: C.textTertiary }}>Bank A/C:</span> {app.bankAcc}</div>
            <div><span style={{ color: C.textTertiary }}>IFSC:</span> {app.ifsc}</div>
            {app.schemeId === 'namo_saraswati' && <>
              <div><span style={{ color: C.textTertiary }}>Stream:</span> {app.stream}</div>
              <div><span style={{ color: C.textTertiary }}>Seat #:</span> {app.seatNumber}</div>
              <div><span style={{ color: C.textTertiary }}>Class 10:</span> {app.tenthPct}%</div>
            </>}
          </div>

          <div style={{
            marginTop: 12, fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
            color: C.textSecondary, textTransform: 'uppercase',
          }}>Documents</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {docDefs.map(({ key, label }) => <DocChip key={key} state={app.docs?.[key] || 'missing'} label={label} />)}
          </div>

          {hasIssues && (
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              background: C.errorBg, color: C.errorText,
              fontSize: 11, fontWeight: 500, letterSpacing: '0.25px',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{app.rejectionReason}</span>
            </div>
          )}

          {app.payment && (
            <div style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              background: app.payment.utr ? C.successBanner : C.errorBg,
              color: app.payment.utr ? C.successText : C.errorText,
              fontSize: 11, fontWeight: 500, letterSpacing: '0.25px',
            }}>
              {app.payment.utr
                ? `💰 ₹${app.payment.amount} credited · UTR ${app.payment.utr}`
                : `🔻 ₹${app.payment.amount} payment failed · ${app.payment.failureReason}`}
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {bucket === 'rejected' && <>
              <button onClick={() => onAction('edit', app)} style={outlineBtn()}>
                <Pencil size={13} /> Edit Form
              </button>
              <button onClick={() => onAction('resubmit', app)} style={outlineBtn(C.success, C.successText)}>
                <Send size={13} /> Re-submit
              </button>
            </>}
            {bucket === 'pending' && (
              <button onClick={() => onAction('view', app)} style={{ ...outlineBtn(), flex: 1 }}>
                <Eye size={13} /> Track / View
              </button>
            )}
            {bucket === 'approved' && (
              <button onClick={() => onAction('view', app)} style={{ ...outlineBtn(), flex: 1 }}>
                <Eye size={13} /> View Form
              </button>
            )}
            {bucket === 'draft' && (
              <button onClick={() => onAction('edit', app)} style={{ ...outlineBtn(), flex: 1 }}>
                <FileText size={13} /> Continue Form
              </button>
            )}
            {bucket === 'resubmitted' && (
              <button onClick={() => onAction('view', app)} style={{ ...outlineBtn(), flex: 1 }}>
                <RefreshCw size={13} /> Track re-review
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ListView({ context }) {
  const { closeCanvas, openCanvas } = useApp()
  const [scheme, setScheme] = useState(context.scheme || 'all')
  const [filter, setFilter] = useState(context.filter || 'all')
  const [openId, setOpenId] = useState(context.highlightAppId || null)
  // Force re-render after canvas mutates underlying APPLICATIONS array.
  const [, setTick] = useState(0)

  const applications = useMemo(
    () => getApplications({ scheme: scheme === 'all' ? null : scheme }),
    [scheme]
  )
  const filtered = filter === 'all' ? applications : applications.filter(a => statusBucket(a.status) === filter)

  const counts = useMemo(() => appCounts(scheme === 'all' ? null : scheme), [scheme, applications.length])

  const handleAction = (action, app) => {
    if (action === 'edit') {
      openCanvas({
        type: 'digivritti', view: 'edit', appId: app.appId, scheme: app.schemeId,
        onComplete: context.onComplete,
      })
      return
    }
    if (action === 'resubmit') {
      applyResubmission(app.appId, { rejectionReason: null })
      setTick(t => t + 1)
      context.onComplete?.({
        kind: 'resubmit',
        appId: app.appId,
        studentName: app.studentName,
        scheme: app.schemeId,
        correction: 'Application re-submitted as-is for re-review.',
      })
      closeCanvas()
      return
    }
    if (action === 'view') {
      openCanvas({
        type: 'digivritti', view: 'edit', appId: app.appId, scheme: app.schemeId,
        readOnly: true, onComplete: context.onComplete,
      })
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      {/* Scheme picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'all',            label: 'All schemes' },
          { id: 'namo_lakshmi',   label: 'Namo Lakshmi' },
          { id: 'namo_saraswati', label: 'Namo Saraswati' },
        ].map(s => (
          <button key={s.id} onClick={() => { setScheme(s.id); setOpenId(null) }} style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1.5px solid ${scheme === s.id ? C.brandSubdued : C.borderDefault}`,
            background: scheme === s.id ? C.brandSubtle : C.surface,
            color: scheme === s.id ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', cursor: 'pointer',
            fontFamily: FONT,
          }}>{s.label}</button>
        ))}
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <StatTile count={counts.approved || 0}    label="Approved"    tone="success" />
        <StatTile count={counts.pending || 0}     label="Pending"     tone="warning" />
        <StatTile count={counts.rejected || 0}    label="Rejected"    tone="error" />
        <StatTile count={counts.resubmitted || 0} label="Resubmitted" tone="info" />
        <StatTile count={counts.draft || 0}       label="Draft"       tone="neutral" />
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {FILTER_BUCKETS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${filter === f.id ? C.brand : C.borderDefault}`,
            background: filter === f.id ? C.brand : C.surface,
            color: filter === f.id ? C.surface : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', cursor: 'pointer',
            fontFamily: FONT,
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 8 }}>
        Showing {filtered.length} of {applications.length} {scheme === 'all' ? '' : SCHEMES[scheme]?.short + ' '}application{filtered.length === 1 ? '' : 's'}.
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: 24, textAlign: 'center', borderRadius: 12,
          background: C.surface, border: `1px solid ${C.borderSubtle}`,
          color: C.textTertiary, fontSize: 13,
        }}>No applications match this filter.</div>
      ) : filtered.map(app => (
        <ApplicationCard
          key={app.appId}
          app={app}
          expanded={openId === app.appId}
          onToggle={() => setOpenId(openId === app.appId ? null : app.appId)}
          onAction={handleAction}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT VIEW (also serves as read-only "View" via context.readOnly)
// ─────────────────────────────────────────────────────────────────────────────
function fieldStyle(disabled, error) {
  return {
    width: '100%', padding: '10px 14px',
    border: `1.5px solid ${error ? C.error : C.borderDefault}`,
    borderRadius: 999,
    fontSize: 14, fontWeight: 500, letterSpacing: '0.1px',
    fontFamily: FONT, color: C.textPrimary,
    background: disabled ? C.surfaceTint : C.surface,
    outline: 'none',
  }
}

function Field({ label, value, onChange, disabled, error, helper, type = 'text' }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
        color: error ? C.errorText : C.textSecondary, textTransform: 'uppercase',
        marginBottom: 4, fontFamily: FONT,
      }}>{label}{error && ' · needs correction'}</div>
      <input type={type} value={value} disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        style={fieldStyle(disabled, error)} />
      {helper && <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 4, fontFamily: FONT }}>{helper}</div>}
    </label>
  )
}

function inferReasonFlags(reason) {
  if (!reason) return {}
  const r = reason.toLowerCase()
  return {
    motherName: /mother name|name mismatch.*bank|aadhaar.*bank/i.test(r),
    aadhaar:    /aadhaar.*(blurry|unclear|image)/i.test(r),
    income:     /income/i.test(r),
    ifsc:       /ifsc|bank account/i.test(r),
    seat:       /seat/i.test(r),
    lcr:        /lcr|birth certificate/i.test(r),
  }
}

function EditView({ context, onMissing }) {
  const { closeCanvas } = useApp()
  const readOnly = !!context.readOnly
  const app = getApplicationById(context.appId)

  if (!app) {
    return <NotFoundCard appId={context.appId} onSeeList={onMissing} />
  }

  const flags = inferReasonFlags(app.rejectionReason)
  const docDefs = DOC_DEFINITIONS[app.schemeId] || []

  const [studentName, setStudentName]   = useState(app.studentName)
  const [fatherName, setFatherName]     = useState(app.fatherName)
  // For mother-name-mismatch cases pre-fill with the *bank* spelling so the
  // teacher can fix it to match the Aadhaar copy.
  const [motherName, setMotherName]     = useState(flags.motherName ? app.motherNameInBank : app.motherName)
  const [studentAadhaar, setStudentAadhaar] = useState(app.studentAadhaar)
  const [motherAadhaar, setMotherAadhaar]   = useState(app.motherAadhaar)
  const [bankAcc, setBankAcc]   = useState(app.bankAcc)
  const [ifsc, setIfsc]         = useState(app.ifsc)
  const [seatNumber, setSeatNumber] = useState(app.seatNumber || '')
  const [tenthPct, setTenthPct]     = useState(app.tenthPct || '')
  const [docs, setDocs]         = useState({ ...app.docs })
  const [saving, setSaving]     = useState(false)

  const correctionDocs = docDefs.filter(d => ['blurry','missing','mismatch'].includes(docs[d.key]))

  const reupload = (key) => setDocs(d => ({ ...d, [key]: 'verified' }))

  const handleSubmit = () => {
    if (readOnly) { closeCanvas(); return }
    setSaving(true)
    setTimeout(() => {
      const correction =
        flags.motherName ? `Updated mother name to match bank ("${motherName}").`
        : flags.aadhaar  ? 'Re-uploaded clearer Aadhaar image.'
        : flags.income   ? 'Uploaded fresh income certificate.'
        : flags.ifsc     ? 'Corrected IFSC code.'
        : flags.seat     ? `Updated seat number to ${seatNumber}.`
        : flags.lcr      ? 'Uploaded LCR / birth certificate.'
        : 'Application updated.'

      applyResubmission(app.appId, {
        motherName,
        fatherName,
        studentName,
        studentAadhaar,
        motherAadhaar,
        bankAcc,
        ifsc,
        seatNumber: seatNumber || app.seatNumber,
        tenthPct: tenthPct || app.tenthPct,
        docs,
        motherNameInBank: motherName,
      })

      context.onComplete?.({
        kind: 'resubmit',
        appId: app.appId,
        studentName: app.studentName,
        scheme: app.schemeId,
        correction,
      })
      closeCanvas()
    }, 500)
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <StatusChip status={app.status} />
        <span style={{ fontSize: 11, color: C.textSecondary }}>
          {SCHEMES[app.schemeId]?.short} · {app.appId} · Class {app.grade}-{app.section}
        </span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px', marginBottom: 4 }}>
        {readOnly ? '👁️ View' : '✏️ Edit'} — {app.studentName}
      </div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>
        {app.school} · {app.district} · Submitted {app.submittedAt}
      </div>

      {!readOnly && app.rejectionReason && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 8,
          background: C.errorBg, color: C.errorText,
          fontSize: 12, fontWeight: 500, letterSpacing: '0.25px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Why this was rejected:</strong> {app.rejectionReason}</span>
        </div>
      )}

      {flags.motherName && !readOnly && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 8,
          background: C.warningBanner, color: C.warningText,
          fontSize: 12, fontWeight: 500, letterSpacing: '0.25px',
          fontFamily: FONT,
        }}>
          <strong>Bank says:</strong> "{app.motherNameInBank}"<br />
          <strong>Aadhaar says:</strong> "{app.motherName}"<br />
          Update either field so they match exactly.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Student name" value={studentName} onChange={setStudentName} disabled={readOnly} />
        <Field label="Father's name" value={fatherName} onChange={setFatherName} disabled={readOnly} />
        <Field label="Mother's name (must match bank)" value={motherName} onChange={setMotherName} disabled={readOnly}
          error={!readOnly && flags.motherName} />
        <Field label="Student Aadhaar" value={studentAadhaar} onChange={setStudentAadhaar} disabled={readOnly}
          error={!readOnly && flags.aadhaar} />
        <Field label="Mother Aadhaar" value={motherAadhaar} onChange={setMotherAadhaar} disabled={readOnly} />
        <Field label="Bank account" value={bankAcc} onChange={setBankAcc} disabled={readOnly} />
        <Field label="IFSC" value={ifsc} onChange={setIfsc} disabled={readOnly}
          error={!readOnly && flags.ifsc} />

        {app.schemeId === 'namo_saraswati' && <>
          <Field label="Seat number (Class 10 board)" value={seatNumber} onChange={setSeatNumber} disabled={readOnly}
            error={!readOnly && flags.seat} />
          <Field label="Class 10 percentage" value={tenthPct} onChange={setTenthPct} disabled={readOnly} type="number" />
        </>}

        {/* Document re-upload tiles */}
        {!readOnly && correctionDocs.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
              color: C.errorText, textTransform: 'uppercase', marginBottom: 6,
            }}>Documents needing re-upload</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {correctionDocs.map(d => (
                <button key={d.key} onClick={() => reupload(d.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 8,
                  border: `1.5px dashed ${docs[d.key] === 'verified' ? C.success : C.error}`,
                  background: docs[d.key] === 'verified' ? C.successBanner : C.errorBg,
                  color: docs[d.key] === 'verified' ? C.successText : C.errorText,
                  fontFamily: FONT, fontSize: 13, fontWeight: 500, letterSpacing: '0.1px',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 16 }}>{docs[d.key] === 'verified' ? '✅' : '📎'}</span>
                  <span style={{ flex: 1 }}>{d.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {docs[d.key] === 'verified' ? 'Re-uploaded' : `Tap to fix · ${docs[d.key]}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All docs as chips */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
            color: C.textSecondary, textTransform: 'uppercase', marginBottom: 4,
          }}>All documents</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {docDefs.map(d => <DocChip key={d.key} state={docs[d.key] || 'missing'} label={d.label} />)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button onClick={closeCanvas} style={primaryBtn({ tone: 'ghost' })}>
          {readOnly ? 'Close' : 'Cancel'}
        </button>
        {!readOnly && (
          <button onClick={handleSubmit} disabled={saving} style={{
            ...primaryBtn({ flex: 2 }),
            background: saving ? C.brandSubtle : C.brand,
            color: saving ? C.textSecondary : C.surface,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Submitting…' : <><Send size={14} /> Save & Re-submit</>}
          </button>
        )}
      </div>

      {app.resubmissionCount > 1 && (
        <div style={{ marginTop: 12, fontSize: 11, color: C.textTertiary, textAlign: 'center', fontFamily: FONT }}>
          Resubmission #{app.resubmissionCount} · {app.nextStep || 'Approver re-review'}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY VIEW (new application)
// ─────────────────────────────────────────────────────────────────────────────
function ApplyView({ context }) {
  const { closeCanvas } = useApp()
  const scheme = context.scheme === 'namo_saraswati' ? 'namo_saraswati' : 'namo_lakshmi'
  const schemeMeta = SCHEMES[scheme]
  const eligibleStudents = STUDENTS.filter(s =>
    schemeMeta.grades.includes(s.grade) &&
    (scheme !== 'namo_saraswati' || s.stream === 'Science')
  ).slice(0, 8)

  const [studentId, setStudentId] = useState(context.studentId || eligibleStudents[0]?.id || STUDENTS[0].id)
  const student = STUDENTS.find(s => s.id === studentId) || STUDENTS[0]

  const [income, setIncome]                 = useState('4,50,000')
  const [guardianMobile, setGuardianMobile] = useState('98765 43210')
  const [motherAadhaar, setMotherAadhaar]   = useState(student.motherAadhaar)
  const [bank, setBank]                     = useState(student.bankName)
  const [bankAcc, setBankAcc]               = useState(student.bankAcc)
  const [ifsc, setIfsc]                     = useState(student.ifsc)
  const [seat, setSeat]                     = useState(student.seatNumber || '')
  const [tenthPct, setTenthPct]             = useState(student.tenthPct ? String(student.tenthPct) : '')
  const [stream, setStream]                 = useState(student.stream || 'Science')
  const [docs, setDocs] = useState(() => Object.fromEntries((DOC_DEFINITIONS[scheme] || []).map(d => [d.key, false])))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving]       = useState(false)

  // Reset form when student changes (important for stream/seat).
  useEffect(() => {
    setMotherAadhaar(student.motherAadhaar)
    setBank(student.bankName); setBankAcc(student.bankAcc); setIfsc(student.ifsc)
    setSeat(student.seatNumber || '')
    setTenthPct(student.tenthPct ? String(student.tenthPct) : '')
    setStream(student.stream || 'Science')
  }, [student])

  const allDocsUploaded = Object.values(docs).every(Boolean)
  const requiredFilled = scheme === 'namo_saraswati'
    ? !!(seat && tenthPct && stream && motherAadhaar && bankAcc && ifsc)
    : !!(income && guardianMobile && motherAadhaar && bankAcc && ifsc)

  const [docFiles, setDocFiles] = useState({})
  const [docError, setDocError] = useState(null)
  const onDocUpload = (key, meta) => {
    setDocs(d => ({ ...d, [key]: true }))
    setDocFiles(f => ({ ...f, [key]: meta }))
    setDocError(null)
  }

  const handleSubmit = () => {
    if (!requiredFilled || !allDocsUploaded) return
    setSaving(true)
    setTimeout(() => {
      const code = SCHEMES[scheme].code
      const newAppId = `${code}2025GJ${String(900 + Math.floor(Math.random() * 99)).padStart(4, '0')}`
      const docState = Object.fromEntries(Object.keys(docs).map(k => [k, 'verified']))
      const newApp = {
        appId: newAppId,
        schemeId: scheme,
        studentId: student.id,
        studentName: student.name,
        fatherName: student.fatherName,
        motherName: student.motherName,
        motherNameInBank: student.motherName,
        grade: student.grade, section: student.section,
        dob: student.dob, phone: student.phone,
        studentAadhaar: student.studentAadhaar, motherAadhaar,
        bankAcc, ifsc, bankName: bank,
        schoolCode: student.schoolCode, school: student.school,
        cluster: student.cluster, block: student.block, district: student.district,
        stream: scheme === 'namo_saraswati' ? stream : null,
        tenthPct: scheme === 'namo_saraswati' ? Number(tenthPct) : null,
        seatNumber: scheme === 'namo_saraswati' ? seat : null,
        docs: docState,
        status: 'SUBMITTED',
        rejectionReason: null,
        submittedAt: new Date().toISOString().slice(0, 10),
        submittedDate: new Date().toLocaleDateString('en-GB'),
        resubmissionCount: 1,
        nextStep: 'Auto-eligibility checks running',
        monthlyAmount: SCHEMES[scheme].monthlyAmount[student.grade] || 500,
        payment: null,
      }
      addApplication(newApp)
      context.onComplete?.({
        kind: 'submit',
        scheme, appId: newApp.appId, studentName: student.name,
      })
      setSubmitted(true)
      setSaving(false)
    }, 700)
  }

  if (submitted) {
    return (
      <div style={{
        padding: 24, fontFamily: FONT, color: C.textPrimary,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999,
          background: C.successBg, color: C.successText,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><CheckCircle2 size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Application submitted!</div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: '20px' }}>
          {schemeMeta.short} · {student.name}<br />
          Status synced back to your chat thread.
        </div>
        <button onClick={closeCanvas} style={primaryBtn({ flex: 'none' })}>Back to chat</button>
      </div>
    )
  }

  const docFields = DOC_DEFINITIONS[scheme] || []

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Sparkles size={14} color={C.brand} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', color: C.brand, textTransform: 'uppercase' }}>
          New application
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px' }}>
        {schemeMeta.name}
      </div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>
        {schemeMeta.description} · {schemeMeta.eligibility}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.2px', color: C.textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>
          Select student ({eligibleStudents.length} eligible)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {eligibleStudents.map(r => {
            const selected = r.id === studentId
            return (
              <button key={r.id} onClick={() => setStudentId(r.id)} style={{
                padding: '10px 14px', borderRadius: 12, textAlign: 'left',
                border: `1.5px solid ${selected ? C.brand : C.borderDefault}`,
                background: selected ? C.brandSubtle : C.surface,
                cursor: 'pointer', fontFamily: FONT,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>
                  Class {r.grade}-{r.section} · Mother {r.motherName.split(' ')[0]}
                  {r.stream ? ` · ${r.stream}` : ''}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        background: C.infoBg, color: C.infoText,
        padding: 10, borderRadius: 8, marginBottom: 16,
        fontSize: 12, fontWeight: 500, letterSpacing: '0.25px',
        display: 'flex', gap: 6, alignItems: 'flex-start',
      }}>
        <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>State Registry confirms <strong>{student.name}</strong> is eligible for {schemeMeta.short}.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {scheme === 'namo_saraswati' ? <>
          <Field label="Stream" value={stream} onChange={setStream} />
          <Field label="Seat number (Class 10 board)" value={seat} onChange={setSeat}
            helper={seat ? '✓ Verified via Exam Board API' : null} />
          <Field label="Class 10 percentage" value={tenthPct} onChange={setTenthPct} type="number"
            helper="Must be ≥ 50% to qualify" />
        </> : <>
          <Field label="Family annual income (₹)" value={income} onChange={setIncome}
            helper="Must be ≤ ₹6,00,000" />
          <Field label="Guardian mobile" value={guardianMobile} onChange={setGuardianMobile} />
        </>}
        <Field label="Mother's Aadhaar" value={motherAadhaar} onChange={setMotherAadhaar} />
        <Field label="Bank name" value={bank} onChange={setBank} />
        <Field label="Account number" value={bankAcc} onChange={setBankAcc} />
        <Field label="IFSC" value={ifsc} onChange={setIfsc} />

        <div>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
            color: C.textSecondary, textTransform: 'uppercase', marginBottom: 6,
          }}>Document upload (PDF only)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docFields.map(({ key, label }) => (
              <DocumentUpload
                key={key}
                label={label}
                state={docs[key] ? 'uploaded' : 'required'}
                file={docFiles[key]}
                onUpload={(meta) => onDocUpload(key, meta)}
                onError={setDocError}
              />
            ))}
          </div>
          {docError && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8,
              background: C.errorBg, color: C.errorText,
              fontSize: 12, fontFamily: FONT,
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{docError}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button onClick={closeCanvas} style={primaryBtn({ tone: 'ghost' })}>Save draft</button>
        <button onClick={handleSubmit}
          disabled={!requiredFilled || !allDocsUploaded || saving}
          style={{
            ...primaryBtn({ flex: 2 }),
            background: (requiredFilled && allDocsUploaded && !saving) ? C.brand : C.brandSubtle,
            color: (requiredFilled && allDocsUploaded && !saving) ? C.surface : C.textSecondary,
            cursor: (requiredFilled && allDocsUploaded && !saving) ? 'pointer' : 'not-allowed',
          }}>
          {saving ? 'Submitting…' : <><Send size={14} /> Submit application</>}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level dispatcher — switches view based on context.
// ─────────────────────────────────────────────────────────────────────────────
import {
  StudentSelectView, OptOutView, ReviewView, PaymentQueueView, AnalyticsView,
  AIResultCanvas, AIDeepDiveCanvas,
} from './digivritti/extraViews'

export default function DigiVrittiCanvas({ context = {} }) {
  const { openCanvas } = useApp()
  const view = context.view || 'list'

  if (view === 'apply')           return <ApplyView         context={context} />
  if (view === 'student-select')  return <StudentSelectView context={context} />
  if (view === 'opt-out')         return <OptOutView        context={context} />
  if (view === 'review')          return <ReviewView        context={context} />
  if (view === 'payment-queue')   return <PaymentQueueView  context={context} />
  if (view === 'analytics')       return <AnalyticsView     context={context} />
  if (view === 'ai-result')       return <AIResultCanvas    context={context} />
  if (view === 'ai-deep-dive')    return <AIDeepDiveCanvas  context={context} />
  if (view === 'edit') {
    return <EditView
      context={context}
      onMissing={() => openCanvas({
        type: 'digivritti', view: 'list', scheme: 'all',
        onComplete: context.onComplete,
      })}
    />
  }
  return <ListView context={context} />
}
