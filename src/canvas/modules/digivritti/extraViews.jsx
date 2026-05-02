// Additional DigiVritti canvas views — sit alongside DigiVrittiCanvas.jsx
// dispatcher and handle the role-specific flows:
//   - StudentSelectView   (Teacher: pick a student before opening the form)
//   - OptOutView          (Teacher: mark student as Not Wanted with declaration PDF)
//   - ReviewView          (CRC: approve / reject / re-review pending applications)
//   - PaymentQueueView    (PFMS: payment queue + retry)
//   - AnalyticsView       (State Secretary: funnel + monsoon what-if)
import React, { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Send, RefreshCw, X, Search,
  TrendingUp, ArrowRight, FileText,
} from 'lucide-react'
import { useApp } from '../../../context/AppContext'
import {
  SCHEMES, APPLICATION_STATUS, DOC_DEFINITIONS, STUDENTS,
  getApplicationById, getApplications, statusBucket, applyResubmission,
} from '../../../data/digivritti/applications'
import {
  approveApplication, rejectApplication, retryPayment, processPayment,
  markOptOut, syncToPayment,
} from '../../../utils/digivrittiBackend'
import DocumentUpload from '../../../components/digivritti/DocumentUpload'
import {
  runAIQuery, runDeepDiveTurn, getAIRoleMeta, getDeepDiveScenario,
} from '../../../features/digivritti/ai/aiQueryEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Tokens / atoms (duplicated from DigiVrittiCanvas to keep this file standalone)
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

function StatusChip({ status }) {
  const meta = APPLICATION_STATUS[status] || { label: status, tone: 'neutral', icon: '•' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: TONE_BG[meta.tone], color: TONE_FG[meta.tone],
      padding: '4px 10px', borderRadius: 999, fontFamily: FONT,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', whiteSpace: 'nowrap',
    }}>{meta.icon} {meta.label}</span>
  )
}

function pill({ tone = 'neutral', children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: TONE_BG[tone], color: TONE_FG[tone],
      padding: '3px 9px', borderRadius: 999,
      fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
    }}>{children}</span>
  )
}
function Pill({ tone, children }) { return pill({ tone, children }) }

function PrimaryBtn({ tone = 'primary', flex = 1, onClick, disabled, children }) {
  const palette = tone === 'success' ? { bg: C.success, fg: C.surface }
    : tone === 'danger' ? { bg: C.error, fg: C.surface }
    : tone === 'ghost'  ? { bg: C.surface, fg: C.textSecondary, border: C.borderDefault }
    : { bg: C.brand, fg: C.surface }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex, padding: '12px 16px', borderRadius: 999,
      border: palette.border ? `1.5px solid ${palette.border}` : 'none',
      background: disabled ? '#C3D2FC' : palette.bg,
      color: disabled ? C.textSecondary : palette.fg,
      fontSize: 14, fontWeight: 600, letterSpacing: '0.1px',
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: FONT,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>{children}</button>
  )
}

function SectionHeader({ icon, eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 16, fontFamily: FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', color: C.brand, textTransform: 'uppercase' }}>{eyebrow}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px', color: C.textPrimary }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENT_SELECTION — separate step before NEW_APPLICATION
// ─────────────────────────────────────────────────────────────────────────────
export function StudentSelectView({ context }) {
  const { openCanvas, closeCanvas } = useApp()
  const scheme = context.scheme === 'namo_saraswati' ? 'namo_saraswati' : 'namo_lakshmi'
  const meta = SCHEMES[scheme]
  const [query, setQuery] = useState('')

  // Eligibility filter — per scheme rules.
  const eligible = useMemo(() => STUDENTS.filter(s => {
    const inGrade = meta.grades.includes(s.grade)
    const isFemale = s.gender === 'F'
    if (scheme === 'namo_lakshmi') return inGrade && isFemale
    // Namo Saraswati: Class 11/12 Science (per spec, both girls and boys allowed
    // when scheme rules permit; we keep the seed dataset all-female so the
    // result is essentially the same).
    return inGrade && s.stream === 'Science'
  }), [scheme])

  const filtered = query
    ? eligible.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase()))
    : eligible

  // Pre-existing applications keyed by student to surface "already applied".
  const existing = useMemo(() => {
    const map = {}
    for (const a of getApplications({ scheme })) {
      map[a.studentId] = a
    }
    return map
  }, [scheme])

  const handleSelect = (student) => {
    const prior = existing[student.id]
    // For students already on file, jump straight to edit/view to avoid duplicates.
    if (prior) {
      openCanvas({
        type: 'digivritti', view: 'edit',
        appId: prior.appId, scheme,
        readOnly: prior.status === 'APPROVED',
        onComplete: context.onComplete,
      })
      return
    }
    // Acknowledge selection in chat then open new-application form.
    context.onSelect?.(student, scheme)
    openCanvas({
      type: 'digivritti', view: 'apply',
      scheme, studentId: student.id,
      onComplete: context.onComplete,
    })
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<FileText size={14} color={C.brand} />}
        eyebrow="Student selection"
        title={`Select a student for ${meta.short}`}
        sub={`${meta.eligibility}. ${eligible.length} student${eligible.length === 1 ? '' : 's'} match for your school.`}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        border: `1.5px solid ${C.borderDefault}`, borderRadius: 999,
        background: C.surface, marginBottom: 12,
      }}>
        <Search size={14} color={C.textTertiary} />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search student name or ID…"
          style={{
            flex: 1, border: 'none', outline: 'none', fontFamily: FONT,
            fontSize: 13, color: C.textPrimary, background: 'transparent',
          }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', borderRadius: 12,
            background: C.surface, border: `1px solid ${C.borderSubtle}`,
            color: C.textTertiary, fontSize: 13,
          }}>
            No eligible students match this filter.
          </div>
        )}
        {filtered.map(s => {
          const prior = existing[s.id]
          return (
            <button key={s.id} onClick={() => handleSelect(s)} style={{
              padding: '12px 14px', borderRadius: 12, textAlign: 'left',
              border: `1.5px solid ${C.borderDefault}`, background: C.surface,
              cursor: 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: C.brandSubtle, color: C.brand,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {s.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>
                  Class {s.grade}-{s.section} · {s.gender === 'F' ? 'Female' : 'Male'} · {s.id}
                  {s.stream ? ` · ${s.stream}` : ''}
                </div>
                {prior && (
                  <div style={{ marginTop: 4 }}>
                    <Pill tone={APPLICATION_STATUS[prior.status]?.tone || 'neutral'}>
                      {APPLICATION_STATUS[prior.status]?.icon} Existing · {APPLICATION_STATUS[prior.status]?.label} · {prior.appId}
                    </Pill>
                  </div>
                )}
              </div>
              <ArrowRight size={16} color={C.brand} style={{ flexShrink: 0 }} />
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Cancel</PrimaryBtn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OPT_OUT — student declines + declaration PDF upload
// ─────────────────────────────────────────────────────────────────────────────
const OPT_OUT_REASONS = [
  'Student not interested',
  'Already receiving other scholarship',
  'Guardian declined',
  'Incorrect student record',
  'Other',
]

export function OptOutView({ context }) {
  const { closeCanvas } = useApp()
  const [scheme, setScheme] = useState(context.scheme || 'namo_lakshmi')
  const [studentId, setStudentId] = useState(context.studentId || '')
  const [reason, setReason] = useState(OPT_OUT_REASONS[0])
  const [notes, setNotes] = useState('')
  const [declarationFile, setDeclarationFile] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const eligible = useMemo(() => STUDENTS.filter(s => {
    if (scheme === 'namo_saraswati') return s.grade >= 11 && s.stream === 'Science'
    return [9, 10, 11, 12].includes(s.grade)
  }), [scheme])

  const student = STUDENTS.find(s => s.id === studentId)

  const canSubmit = !!student && !!reason && !!declarationFile

  const handleSubmit = () => {
    if (!canSubmit) return
    const result = markOptOut({
      studentName: student.name,
      studentId: student.id,
      grade: student.grade, section: student.section,
      schoolCode: student.schoolCode, school: student.school,
      cluster: student.cluster, block: student.block, district: student.district,
      scheme, reason, declarationFile,
    })
    context.onComplete?.({
      kind: 'optout',
      appId: result.appId,
      studentName: student.name,
      scheme,
      reason,
      declarationFile,
    })
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ padding: 24, fontFamily: FONT, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 999, background: C.borderSubtle, color: C.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={36} /></div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Marked as Not Wanted</div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: '20px' }}>
          {student.name} · {SCHEMES[scheme].short}<br />
          You can reopen this later if the student changes their mind.
        </div>
        <PrimaryBtn flex={'none'} onClick={closeCanvas}>Back to chat</PrimaryBtn>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<X size={14} color={C.brand} />}
        eyebrow="Opt-out"
        title="Mark a student as Not Wanted"
        sub="Use this only when the student or guardian explicitly declines the scholarship."
      />

      {/* Scheme picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'namo_lakshmi',   label: 'Namo Lakshmi' },
          { id: 'namo_saraswati', label: 'Namo Saraswati' },
        ].map(s => (
          <button key={s.id} onClick={() => { setScheme(s.id); setStudentId('') }} style={{
            padding: '6px 12px', borderRadius: 999,
            border: `1.5px solid ${scheme === s.id ? C.brand : C.borderDefault}`,
            background: scheme === s.id ? C.brandSubtle : C.surface,
            color: scheme === s.id ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', cursor: 'pointer',
            fontFamily: FONT,
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 6 }}>
          Select student ({eligible.length} eligible)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {eligible.slice(0, 8).map(s => {
            const selected = s.id === studentId
            return (
              <button key={s.id} onClick={() => setStudentId(s.id)} style={{
                padding: '10px 14px', borderRadius: 12, textAlign: 'left',
                border: `1.5px solid ${selected ? C.brand : C.borderDefault}`,
                background: selected ? C.brandSubtle : C.surface,
                cursor: 'pointer', fontFamily: FONT,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>
                  Class {s.grade}-{s.section} · {s.id}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 4 }}>Reason</div>
        <select value={reason} onChange={e => setReason(e.target.value)} style={{
          width: '100%', padding: '10px 14px',
          border: `1.5px solid ${C.borderDefault}`, borderRadius: 999,
          fontSize: 14, fontFamily: FONT, color: C.textPrimary, background: C.surface, outline: 'none',
        }}>
          {OPT_OUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 4 }}>Notes (optional)</div>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{
          width: '100%', padding: '10px 14px',
          border: `1.5px solid ${C.borderDefault}`, borderRadius: 12,
          fontSize: 14, fontFamily: FONT, color: C.textPrimary, background: C.surface, outline: 'none', resize: 'vertical',
        }} placeholder="Anything the approver should know…" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 6 }}>Declaration PDF</div>
        <DocumentUpload
          label="Student / guardian declaration"
          state={declarationFile ? 'uploaded' : 'required'}
          file={declarationFile}
          onUpload={setDeclarationFile}
          onError={setError}
        />
        {error && (
          <div style={{
            marginTop: 6, padding: '8px 12px', borderRadius: 8,
            background: C.errorBg, color: C.errorText,
            fontSize: 12, fontFamily: FONT,
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Cancel</PrimaryBtn>
        <PrimaryBtn tone="danger" flex={2} disabled={!canSubmit} onClick={handleSubmit}>
          Mark as Not Wanted
        </PrimaryBtn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REVIEW_APPLICATION — CRC approver flow
// ─────────────────────────────────────────────────────────────────────────────
const REJECT_REASONS = [
  'Mother name mismatch',
  'Aadhaar image blurry',
  'Income certificate missing',
  'Seat number mismatch',
  'Bank details invalid',
  'Duplicate application',
  'Other',
]

export function ReviewView({ context }) {
  const { closeCanvas, openCanvas } = useApp()
  const [appId, setAppId] = useState(context.appId || null)
  const [confirming, setConfirming] = useState(null) // 'approve' | 'reject' | null
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [, force] = useState(0)

  // Default queue when no appId — showcase pending + resubmitted in cluster.
  const queue = useMemo(() => {
    return getApplications({ scheme: null })
      .filter(a => ['APPROVER_PENDING', 'RESUBMITTED', 'SUBMITTED'].includes(a.status))
      .filter(a => !context.cluster || a.cluster === context.cluster)
      .slice(0, 12)
  }, [context.cluster, appId])

  if (!appId) {
    // Queue mode — pick which application to review.
    return (
      <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
        <SectionHeader
          icon={<FileText size={14} color={C.brand} />}
          eyebrow={`Cluster · ${context.cluster || 'MADHAPAR'}`}
          title={`${queue.length} applications awaiting your review`}
          sub="Tap a row to inspect documents and decide."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {queue.map(a => (
            <button key={a.appId} onClick={() => setAppId(a.appId)} style={{
              padding: '12px 14px', borderRadius: 12, textAlign: 'left',
              border: `1.5px solid ${C.borderDefault}`, background: C.surface,
              cursor: 'pointer', fontFamily: FONT,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{a.studentName}</div>
                <div style={{ fontSize: 11, color: C.textSecondary }}>
                  {SCHEMES[a.schemeId]?.short} · Class {a.grade}-{a.section} · {a.appId}
                </div>
              </div>
              <StatusChip status={a.status} />
              <ArrowRight size={16} color={C.brand} />
            </button>
          ))}
          {queue.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', borderRadius: 12, background: C.surface, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary, fontSize: 13 }}>
              Inbox is clear. Nothing pending.
            </div>
          )}
        </div>
      </div>
    )
  }

  const app = getApplicationById(appId)
  if (!app) {
    return (
      <div style={{ padding: 16, fontFamily: FONT }}>
        <div style={{ background: C.warningBanner, color: C.warningText, padding: 12, borderRadius: 12 }}>
          Application {appId} could not be loaded.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <PrimaryBtn onClick={() => setAppId(null)}>Back to queue</PrimaryBtn>
        </div>
      </div>
    )
  }

  const docDefs = DOC_DEFINITIONS[app.schemeId] || []

  const handleApprove = () => {
    const r = approveApplication(app.appId)
    if (!r.ok) return
    syncToPayment(app.appId)
    context.onComplete?.({
      kind: 'approve', appId: app.appId, studentName: app.studentName, scheme: app.schemeId,
    })
    closeCanvas()
  }

  const handleReject = () => {
    const r = rejectApplication(app.appId, reason)
    if (!r.ok) return
    context.onComplete?.({
      kind: 'reject', appId: app.appId, studentName: app.studentName, scheme: app.schemeId, reason,
    })
    closeCanvas()
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <button onClick={() => setAppId(null)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 999,
        border: `1px solid ${C.borderDefault}`, background: C.surface,
        color: C.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
        cursor: 'pointer', fontFamily: FONT, marginBottom: 12,
      }}>← Back to queue</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <StatusChip status={app.status} />
        {app.resubmissionCount > 1 && <Pill tone="info">Resubmission #{app.resubmissionCount}</Pill>}
        <span style={{ fontSize: 11, color: C.textSecondary }}>
          {SCHEMES[app.schemeId]?.short} · {app.appId} · Class {app.grade}-{app.section}
        </span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px' }}>{app.studentName}</div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16 }}>
        {app.school} · {app.district} · Submitted {app.submittedAt}
      </div>

      {app.rejectionReason && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 8,
          background: C.errorBg, color: C.errorText,
          fontSize: 12, fontWeight: 500, letterSpacing: '0.25px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Previous rejection:</strong> {app.rejectionReason}</span>
        </div>
      )}

      {/* Detail grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
        fontSize: 11, color: C.textPrimary, marginBottom: 12,
        background: C.surfaceTint, padding: 12, borderRadius: 8,
      }}>
        <div><span style={{ color: C.textTertiary }}>Father:</span> <strong>{app.fatherName}</strong></div>
        <div><span style={{ color: C.textTertiary }}>Mother:</span> <strong>{app.motherName}</strong></div>
        <div><span style={{ color: C.textTertiary }}>Mother (bank):</span> <strong>{app.motherNameInBank}</strong></div>
        <div><span style={{ color: C.textTertiary }}>Phone:</span> {app.phone}</div>
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
        fontSize: 11, fontWeight: 500, letterSpacing: '0.2px',
        color: C.textSecondary, textTransform: 'uppercase', marginBottom: 6,
      }}>Documents</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {docDefs.map(({ key, label }) => {
          const state = app.docs?.[key] || 'missing'
          const tone = ['verified', 'uploaded'].includes(state) ? 'success' : state === 'blurry' ? 'warning' : 'error'
          return <Pill key={key} tone={tone}>{label} · {state}</Pill>
        })}
      </div>

      {confirming === 'approve' && (
        <div style={{
          marginBottom: 16, padding: 12, borderRadius: 8,
          background: C.successBanner, color: C.successText, fontSize: 12, fontFamily: FONT,
        }}>
          ⚠️ Approving this application is <strong>irreversible</strong>. The application will sync to the IPMS payment system.
        </div>
      )}

      {confirming === 'reject' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '0.2px', marginBottom: 4 }}>Rejection reason</div>
          <select value={reason} onChange={e => setReason(e.target.value)} style={{
            width: '100%', padding: '10px 14px',
            border: `1.5px solid ${C.borderDefault}`, borderRadius: 999,
            fontSize: 14, fontFamily: FONT, color: C.textPrimary, background: C.surface, outline: 'none',
          }}>
            {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {confirming === null && <>
          <PrimaryBtn tone="success" onClick={() => setConfirming('approve')}>
            <CheckCircle2 size={14} /> Approve
          </PrimaryBtn>
          <PrimaryBtn tone="danger" onClick={() => setConfirming('reject')}>
            <X size={14} /> Reject
          </PrimaryBtn>
        </>}
        {confirming === 'approve' && <>
          <PrimaryBtn tone="ghost" onClick={() => setConfirming(null)}>Cancel</PrimaryBtn>
          <PrimaryBtn tone="success" flex={2} onClick={handleApprove}>Confirm approve</PrimaryBtn>
        </>}
        {confirming === 'reject' && <>
          <PrimaryBtn tone="ghost" onClick={() => setConfirming(null)}>Cancel</PrimaryBtn>
          <PrimaryBtn tone="danger" flex={2} onClick={handleReject}>Confirm reject</PrimaryBtn>
        </>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYMENT_QUEUE — PFMS payment officer flow
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_FILTERS = [
  { id: 'pending',  label: 'Pending'  },
  { id: 'failed',   label: 'Failed'   },
  { id: 'success',  label: 'Success'  },
  { id: 'all',      label: 'All'      },
]

export function PaymentQueueView({ context }) {
  const { closeCanvas } = useApp()
  const [filter, setFilter] = useState(context.filter || 'pending')
  const [, force] = useState(0)

  const apps = useMemo(() => {
    const all = getApplications({})
      .filter(a => ['PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'APPROVED'].includes(a.status))
    if (filter === 'pending') return all.filter(a => ['PAYMENT_PENDING', 'APPROVED'].includes(a.status))
    if (filter === 'failed')  return all.filter(a => a.status === 'PAYMENT_FAILED')
    if (filter === 'success') return all.filter(a => a.status === 'PAYMENT_SUCCESS')
    return all
  }, [filter, force])

  const summary = useMemo(() => {
    const all = getApplications({})
    return {
      pending: all.filter(a => ['PAYMENT_PENDING', 'APPROVED'].includes(a.status)).length,
      success: all.filter(a => a.status === 'PAYMENT_SUCCESS').length,
      failed:  all.filter(a => a.status === 'PAYMENT_FAILED').length,
    }
  }, [force])

  const handleProcess = (app) => {
    processPayment(app.appId)
    context.onComplete?.({
      kind: 'paymentSuccess', appId: app.appId, studentName: app.studentName,
      scheme: app.schemeId, utr: app.payment?.utr,
    })
    force(t => t + 1)
  }
  const handleRetry = (app) => {
    retryPayment(app.appId)
    context.onComplete?.({
      kind: 'paymentRetry', appId: app.appId, studentName: app.studentName,
      scheme: app.schemeId,
    })
    force(t => t + 1)
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<TrendingUp size={14} color={C.brand} />}
        eyebrow="PFMS · Payment Officer"
        title="Payment queue"
        sub="Process pending payments, retry failures, record UTRs."
      />

      {/* Summary tiles */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.warningBg, color: C.warningText, fontFamily: FONT }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.pending}</div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Pending</div>
        </div>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.successBg, color: C.successText }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.success}</div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Success</div>
        </div>
        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.errorBg, color: C.errorText }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.failed}</div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Failed · retry eligible</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {PAYMENT_FILTERS.map(f => (
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

      {/* Queue list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {apps.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', borderRadius: 12, background: C.surface, border: `1px solid ${C.borderSubtle}`, color: C.textTertiary, fontSize: 13 }}>
            No payments match this filter.
          </div>
        )}
        {apps.slice(0, 18).map(a => {
          const isFailed = a.status === 'PAYMENT_FAILED'
          const isSuccess = a.status === 'PAYMENT_SUCCESS'
          const utr = a.payment?.utr
          const failureReason = a.payment?.failureReason
          return (
            <div key={a.appId} style={{
              border: `1px solid ${C.borderDefault}`, borderRadius: 12,
              background: C.surface, padding: 12, fontFamily: FONT,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.studentName}</div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>
                    {SCHEMES[a.schemeId]?.short} · {a.appId} · {a.district || a.school}
                  </div>
                </div>
                <StatusChip status={a.status} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <Pill tone="neutral">₹{a.monthlyAmount}/month</Pill>
                {utr && <Pill tone="success">UTR · {utr}</Pill>}
                {failureReason && <Pill tone="error">{failureReason}</Pill>}
                {a.payment?.isRetry && <Pill tone="info">Retry #{a.payment.retryCount}</Pill>}
              </div>
              {!isSuccess && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {isFailed ? (
                    <PrimaryBtn tone="primary" onClick={() => handleRetry(a)}>
                      <RefreshCw size={13} /> Retry payment
                    </PrimaryBtn>
                  ) : (
                    <PrimaryBtn tone="success" onClick={() => handleProcess(a)}>
                      <Send size={13} /> Push to PFMS
                    </PrimaryBtn>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI_ANALYTICS — State Secretary insight cards
// ─────────────────────────────────────────────────────────────────────────────
const ANALYTICS_QUERIES = [
  {
    id: 'backlog',
    title: 'Approval backlog by district',
    body: '25,550 students stuck across top 8 districts. BANASKANTHA leads with 5,790 students waiting — 4,820 pending cluster approver. ₹2.93 Cr per month is blocked.',
    rows: [
      ['BANASKANTHA', 5790], ['KACHCHH', 4780], ['PATAN', 3405], ['SABARKANTHA', 3095],
      ['DAHOD', 2600], ['MAHESANA', 2195], ['JUNAGADH', 1920], ['RAJKOT', 1765],
    ],
    label: 'Stuck',
    tone: 'warning',
  },
  {
    id: 'monsoon',
    title: 'Monsoon what-if · drop attendance threshold 80% → 70%',
    body: 'Across DANG, TAPI, NAVSARI, VALSAD, SURAT, manual approval workload would drop 46–55% during Jul–Sep. ~46,860 students shift to auto-approval.',
    rows: [
      ['DANG', '60% → 14%'], ['TAPI', '55% → 12%'], ['NAVSARI', '50% → 11%'],
      ['VALSAD', '45% → 11%'], ['SURAT', '40% → 9%'],
    ],
    label: 'Manual rate · monsoon vs baseline',
    tone: 'success',
  },
  {
    id: 'payments',
    title: 'Payment success rate · bottom 5 districts',
    body: 'DAHOD lowest at 90.9%. Most districts above 94%. Aadhaar–bank linking is the #1 cause of failures — consider an Aadhaar correction campaign.',
    rows: [
      ['DAHOD', '90.9%'], ['PANCHMAHALS', '92.2%'], ['NARMADA', '92.9%'],
      ['SABARKANTHA', '94.4%'], ['BANASKANTHA', '95.1%'],
    ],
    label: 'Success rate',
    tone: 'info',
  },
]

export function AnalyticsView({ context }) {
  const { closeCanvas } = useApp()
  const [active, setActive] = useState(context.queryId || 'backlog')
  const q = ANALYTICS_QUERIES.find(x => x.id === active) || ANALYTICS_QUERIES[0]
  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<TrendingUp size={14} color={C.brand} />}
        eyebrow="State command · DigiVritti AI"
        title={q.title}
        sub={q.body}
      />
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {ANALYTICS_QUERIES.map(qq => (
          <button key={qq.id} onClick={() => setActive(qq.id)} style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${active === qq.id ? C.brand : C.borderDefault}`,
            background: active === qq.id ? C.brandSubtle : C.surface,
            color: active === qq.id ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', cursor: 'pointer',
            fontFamily: FONT,
          }}>{qq.title.split(' · ')[0]}</button>
        ))}
      </div>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderDefault}`, borderRadius: 12,
        overflow: 'hidden', marginBottom: 12,
      }}>
        {q.rows.map(([k, v], i) => (
          <div key={k} style={{
            display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
            borderBottom: i < q.rows.length - 1 ? `1px solid ${C.borderSubtle}` : 'none',
            fontFamily: FONT, fontSize: 13, color: C.textPrimary,
          }}>
            <span>{k}</span>
            <strong style={{ color: TONE_FG[q.tone] }}>{v}</strong>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYTICS CANVAS — full result table, SQL toggle, AI insight.
// Used when an AI chat reply has a long table the user wants to scan in full.
// ─────────────────────────────────────────────────────────────────────────────
function AIResultsTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        padding: 24, fontFamily: FONT, color: C.textTertiary,
        background: C.surface, border: `1px solid ${C.borderDefault}`,
        borderRadius: 12, textAlign: 'center', fontSize: 13,
      }}>No data.</div>
    )
  }
  const keys = Object.keys(rows[0])
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.borderDefault}`,
      borderRadius: 12, overflow: 'hidden',
      maxWidth: '100%', minWidth: 0, boxSizing: 'border-box',
    }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
        <table style={{ minWidth: 'max-content', width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
          <thead style={{ background: C.surfaceTint }}>
            <tr>
              {keys.map(k => (
                <th key={k} style={{
                  textAlign: 'left', padding: '10px 14px',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.4px',
                  color: C.textSecondary, textTransform: 'uppercase',
                  borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: 'nowrap',
                }}>{k.replace(/_/g, ' ').toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {keys.map(k => {
                  const v = r[k]
                  const important = typeof v === 'number' || /%|₹|\bCr\b|\bL\b/.test(String(v))
                  return (
                    <td key={k} style={{
                      padding: '10px 14px', fontSize: 13,
                      color: important ? C.textPrimary : C.textSecondary,
                      fontWeight: important ? 600 : 500,
                      borderBottom: `1px solid ${C.borderSubtle}`, whiteSpace: 'nowrap',
                    }}>{v == null ? '' : String(v)}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AISqlPanel({ sql }) {
  return (
    <div style={{
      background: '#0E0E0E', borderRadius: 12, overflow: 'hidden',
      fontFamily: 'SFMono-Regular,Menlo,Consolas,monospace',
      maxWidth: '100%', minWidth: 0, boxSizing: 'border-box',
    }}>
      <div style={{
        padding: '8px 14px', borderBottom: '1px solid #1F2233',
        fontFamily: FONT, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.3px', color: '#A5C8FF', textTransform: 'uppercase',
      }}>🔄 NL → SQL Engine</div>
      <pre style={{
        margin: 0, padding: '12px 14px', color: '#E2EAFF',
        fontSize: 12, lineHeight: '20px',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        overflowWrap: 'anywhere', maxWidth: '100%',
      }}>{sql}</pre>
    </div>
  )
}

function AIInsightPanel({ text }) {
  if (!text) return null
  return (
    <div style={{
      background: C.successBanner, border: `1px solid ${C.success}`,
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      maxWidth: '100%', minWidth: 0, boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: 18, lineHeight: '18px', flexShrink: 0 }}>💡</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
          color: C.successText, textTransform: 'uppercase', marginBottom: 2,
          fontFamily: FONT,
        }}>AI Insight</div>
        <div style={{
          fontSize: 13, lineHeight: 1.5, color: C.successText,
          fontWeight: 500, fontFamily: FONT,
          overflowWrap: 'anywhere', wordBreak: 'break-word',
        }}>{text}</div>
      </div>
    </div>
  )
}

export function AIResultCanvas({ context }) {
  const { closeCanvas } = useApp()
  const [showSql, setShowSql] = useState(false)
  const out = useMemo(
    () => runAIQuery(context.role, context.queryId),
    [context.role, context.queryId]
  )
  const meta = getAIRoleMeta(context.role)

  if (!out) {
    return (
      <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
        <SectionHeader
          icon={<TrendingUp size={14} color={C.brand} />}
          eyebrow="DigiVritti AI"
          title="Query not available"
          sub="This AI query is not available for your role."
        />
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<TrendingUp size={14} color={C.brand} />}
        eyebrow={`DigiVritti AI · ${meta.shortRole}`}
        title={out.question}
        sub={out.category ? `Category · ${out.category}` : undefined}
      />

      <div style={{
        display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setShowSql(false)}
          style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${!showSql ? C.brand : C.borderDefault}`,
            background: !showSql ? C.brandSubtle : C.surface,
            color: !showSql ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >📊 Results</button>
        <button
          onClick={() => setShowSql(true)}
          style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${showSql ? C.brand : C.borderDefault}`,
            background: showSql ? C.brandSubtle : C.surface,
            color: showSql ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >🔄 NL → SQL</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {showSql
          ? <AISqlPanel sql={out.sql} />
          : <AIResultsTable rows={out.result} />}
        <AIInsightPanel text={out.insight} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
      </div>
    </div>
  )
}

export function AIDeepDiveCanvas({ context }) {
  const { closeCanvas } = useApp()
  const [turnIndex, setTurnIndex] = useState(context.turnIndex || 0)
  const [showSql, setShowSql] = useState(false)
  const scenario = getDeepDiveScenario(context.scenarioId)
  const turn = useMemo(
    () => runDeepDiveTurn(context.scenarioId, turnIndex),
    [context.scenarioId, turnIndex]
  )

  if (!scenario || !turn) {
    return (
      <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
        <SectionHeader
          icon={<TrendingUp size={14} color={C.brand} />}
          eyebrow="Deep dive"
          title="Scenario not available"
        />
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
      </div>
    )
  }

  const dotRow = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
      {Array.from({ length: turn.totalTurns }).map((_, i) => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: 999,
          background: i <= turnIndex ? C.brand : C.borderDefault,
          display: 'inline-block',
        }} />
      ))}
      <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: C.textPrimary }}>
        Q{turnIndex + 1}/{turn.totalTurns}
      </span>
    </div>
  )

  return (
    <div style={{ padding: 16, fontFamily: FONT, color: C.textPrimary }}>
      <SectionHeader
        icon={<TrendingUp size={14} color={C.brand} />}
        eyebrow={`Deep dive · ${scenario.persona}`}
        title={scenario.title}
        sub={scenario.description}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        fontSize: 11, color: C.textSecondary, fontFamily: FONT,
      }}>
        <span style={{ fontWeight: 600, color: C.textPrimary }}>{turn.question}</span>
        {dotRow}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowSql(false)}
          style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${!showSql ? C.brand : C.borderDefault}`,
            background: !showSql ? C.brandSubtle : C.surface,
            color: !showSql ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >📊 Results</button>
        <button
          onClick={() => setShowSql(true)}
          style={{
            padding: '4px 12px', borderRadius: 999,
            border: `1px solid ${showSql ? C.brand : C.borderDefault}`,
            background: showSql ? C.brandSubtle : C.surface,
            color: showSql ? C.brand : C.textSecondary,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.2px',
            cursor: 'pointer', fontFamily: FONT,
          }}
        >🔄 NL → SQL</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {showSql
          ? <AISqlPanel sql={turn.sql} />
          : <AIResultsTable rows={turn.result} />}
        <AIInsightPanel text={turn.insight} />
      </div>

      {turn.isLastTurn && (
        <div style={{
          background: C.successBg, color: C.successText,
          border: `1px solid ${C.success}`, borderRadius: 10,
          padding: '10px 12px', marginBottom: 12,
          fontFamily: FONT, fontSize: 12, fontWeight: 600, letterSpacing: '0.2px',
        }}>{turn.completion || '✅ Analysis Complete'}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <PrimaryBtn tone="ghost" onClick={closeCanvas}>Close</PrimaryBtn>
        {turnIndex > 0 && (
          <PrimaryBtn tone="primary" onClick={() => { setTurnIndex(turnIndex - 1); setShowSql(false) }}>
            ← Previous
          </PrimaryBtn>
        )}
        {!turn.isLastTurn && (
          <PrimaryBtn tone="primary" onClick={() => { setTurnIndex(turnIndex + 1); setShowSql(false) }}>
            Next follow-up <ArrowRight size={14} />
          </PrimaryBtn>
        )}
      </div>
    </div>
  )
}
