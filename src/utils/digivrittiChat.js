// DigiVritti — chat dispatcher.
// Returns { text, html, actions, options, progress } shaped for SuperHomePage.addBot.
// Triggers all start with `dv:` so handleSend() can recognise and route them.

import {
  TEACHER_AI_QUERIES,
} from '../data/digivritti/teacherFlows'
import {
  APPROVER_PENDING, APPROVER_DECIDED, APPROVER_METRICS, APPROVER_AI_QUERIES,
} from '../data/digivritti/approverFlows'
import {
  DISTRICT_METRICS, DISTRICT_FAILED_PAYMENTS, DISTRICT_BELOW_ATTENDANCE,
  DISTRICT_FIRST_MONTH_PENDING, DISTRICT_AADHAAR_FREEZE, DISTRICT_AI_QUERIES,
} from '../data/digivritti/districtFlows'
import {
  STATE_METRICS, STATE_FUNNEL, STATE_DISTRICT_PAYMENT,
  STATE_BULK_QUEUES, STATE_MONSOON_SCENARIOS, STATE_AI_QUERIES,
} from '../data/digivritti/stateFlows'
import { SYSTEM_STATUS } from '../data/digivritti/systemStates'
import { getApplications, statusBucket, SCHEMES } from '../data/digivritti/applications'
import {
  getAIQueriesForRole, runAIQuery, runCustomAIQuery,
  getDeepDivesForRole, runDeepDiveTurn, getAIRoleMeta, normalizeRole,
} from '../features/digivritti/ai/aiQueryEngine'
import {
  aiResultCardHtml, aiDeepDiveMenuHtml,
} from '../features/digivritti/ai/aiCardHtml'

// Local design tokens (mirror swiftchat-design-system.md semantic palette).
const C = {
  font: 'Montserrat, sans-serif',
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC',
  surface: '#FFFFFF', surfaceTint: '#ECECEC', brandSubtle: '#EEF2FF',
  brand: '#386AF6', brandSubdued: '#345CCC',
  success: '#00BA34', successText: '#007B22', successBg: '#CCEFBF',
  warning: '#F8B200', warningText: '#9A6500', warningBg: '#FDE1AC',
  error: '#EB5757', errorText: '#C0392B', errorBg: '#FDEAEA',
  info: '#84A2F4', infoText: '#345CCC', infoBg: '#C3D2FC',
  rLg: 12, rMd: 8, rFull: 999,
  s8: 8, s12: 12, s16: 16,
}

const TONE = {
  success: { bg: C.successBg, fg: C.successText },
  warning: { bg: C.warningBg, fg: C.warningText },
  error:   { bg: C.errorBg,   fg: C.errorText },
  info:    { bg: C.infoBg,    fg: C.infoText },
  neutral: { bg: C.borderSubtle, fg: C.textSecondary },
}

// ── HTML helpers ─────────────────────────────────────────────────────────────
function chip(label, tone = 'neutral', icon) {
  const { bg, fg } = TONE[tone] || TONE.neutral
  return `<span style="display:inline-flex;align-items:center;gap:4px;background:${bg};color:${fg};padding:4px 10px;border-radius:${C.rFull}px;font-size:11px;font-weight:600;letter-spacing:0.2px;font-family:${C.font}">${icon ? `<span>${icon}</span>` : ''}${label}</span>`
}

function statusChip(code) {
  const cfg = SYSTEM_STATUS[code]
  if (!cfg) return chip(code, 'neutral')
  return chip(cfg.label, cfg.tone === 'neutral' ? 'neutral' : cfg.tone, cfg.icon)
}

function metric({ value, label, sub, tone = 'neutral' }) {
  const accent = TONE[tone]?.fg || C.textPrimary
  return `<div style="background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s16}px;font-family:${C.font}">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${C.textSecondary};text-transform:uppercase;margin-bottom:6px">${label}</div>
    <div style="font-size:20px;font-weight:600;line-height:28px;color:${accent}">${value}</div>
    ${sub ? `<div style="font-size:10px;font-weight:400;letter-spacing:0.2px;color:${C.textTertiary};margin-top:4px">${sub}</div>` : ''}
  </div>`
}

function metricsRow(items) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${C.s12}px;margin-top:${C.s8}px">
    ${items.map(metric).join('')}
  </div>`
}

function formCard({ title, fields }) {
  const rows = fields.map((f, i) => {
    const fg = TONE[f.state]?.fg || C.textPrimary
    return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:${C.s12}px;padding:${C.s8}px 0;${i < fields.length - 1 ? `border-bottom:1px solid ${C.borderSubtle};` : ''}font-family:${C.font}">
      <span style="font-size:13px;font-weight:400;letter-spacing:0.25px;color:${C.textSecondary};flex:0 0 45%">${f.label}</span>
      <span style="font-size:13px;font-weight:500;letter-spacing:0.1px;color:${fg};text-align:right;flex:1 1 auto;word-break:break-word">${f.value}</span>
    </div>`
  }).join('')
  return `<div style="margin-top:${C.s8}px;background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;overflow:hidden;font-family:${C.font}">
    <div style="padding:${C.s12}px ${C.s16}px;background:${C.brandSubtle};color:${C.brand};font-size:14px;font-weight:600;letter-spacing:-0.2px;border-bottom:1px solid ${C.borderSubtle}">${title}</div>
    <div style="padding:${C.s12}px ${C.s16}px">${rows}</div>
  </div>`
}

function tableCard({ title, columns, rows, empty = 'No records' }) {
  const head = `<tr>${columns.map(c => `<th style="text-align:${c.align || 'left'};padding:${C.s8}px ${C.s12}px;font-size:10px;font-weight:600;color:${C.textSecondary};text-transform:uppercase;letter-spacing:0.4px;border-bottom:1px solid ${C.borderSubtle};font-family:${C.font}">${c.header}</th>`).join('')}</tr>`
  const body = rows.length === 0
    ? `<tr><td colspan="${columns.length}" style="padding:${C.s16}px;text-align:center;color:${C.textTertiary};font-size:13px;font-family:${C.font}">${empty}</td></tr>`
    : rows.map(r => `<tr>${columns.map(c => `<td style="text-align:${c.align || 'left'};padding:${C.s12}px;font-size:13px;color:${C.textPrimary};border-bottom:1px solid ${C.borderSubtle};font-family:${C.font}">${c.render ? c.render(r) : (r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')
  return `<div style="margin-top:${C.s8}px;background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;overflow:hidden;font-family:${C.font}">
    ${title ? `<div style="padding:${C.s12}px ${C.s16}px;font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${C.textPrimary};border-bottom:1px solid ${C.borderSubtle}">${title}</div>` : ''}
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead style="background:${C.surfaceTint}">${head}</thead>
      <tbody>${body}</tbody>
    </table></div>
  </div>`
}

function progressBars(items) {
  return items.map(it => {
    const palette = TONE[it.tone || 'error']
    return `<div style="margin-bottom:${C.s8}px;font-family:${C.font}">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.textPrimary};margin-bottom:4px">
        <span>${it.label}</span>
        <span style="color:${C.textSecondary}">${it.value}</span>
      </div>
      <div style="height:6px;background:${C.borderSubtle};border-radius:${C.rFull}px;overflow:hidden">
        <div style="width:${it.share}%;height:100%;background:${palette.fg};border-radius:${C.rFull}px"></div>
      </div>
    </div>`
  }).join('')
}

function funnelBars(stages) {
  // Heuristic widths based on stage name.
  const widthMap = { 'Initiated': 100, 'Submitted': 95, 'Auto-rejected': 6, 'Approved': 86, 'Paid': 82 }
  return stages.map(s => `
    <div style="display:flex;align-items:center;gap:${C.s12}px;margin-bottom:${C.s8}px;font-family:${C.font}">
      <div style="flex:0 0 110px;font-size:12px;color:${C.textPrimary}">${s.stage}</div>
      <div style="flex:1;height:18px;background:${C.borderSubtle};border-radius:${C.rFull}px;overflow:hidden">
        <div style="width:${widthMap[s.stage] || 80}%;height:100%;background:${s.color};border-radius:${C.rFull}px"></div>
      </div>
      <div style="flex:0 0 90px;text-align:right;font-size:13px;font-weight:500;color:${C.textPrimary}">${s.count}</div>
    </div>`).join('')
}

// ── Teacher canned student & flow data ───────────────────────────────────────
const PRE_STUDENT_NL = {
  name: 'Vaghela Jaydeviba Ajitsinh', cls: 'Class 9 · Section B',
  gender: 'Female', mother: 'Gayatri', father: 'Ajitsinh',
  appId: 'NL2025GJ0042', scheme: 'Namo Lakshmi Yojana',
}
const PRE_STUDENT_NS = {
  name: 'Prajapati Princy Jitendrabhai', cls: 'Class 11 · Section A',
  gender: 'Female', stream: 'Science', tenth: 92.17,
  appId: 'NS2025GJ0011', scheme: 'Namo Saraswati Vigyan Sadhana',
}

// ── ROLE → Welcome ───────────────────────────────────────────────────────────
function welcome(role, profile) {
  const firstName = profile?.name?.split(' ')[0] || 'there'
  if (role === 'principal') {
    return {
      text: `🌸 DigiVritti — Cluster Approver\n\nNamaste ${firstName}! ${APPROVER_METRICS.pending} applications are awaiting your review.`,
      actions: [
        { label: '📋 View pending queue', trigger: 'dv:a:queue', variant: 'primary' },
        { label: '📊 Approver metrics',   trigger: 'dv:a:metrics', variant: 'primary' },
        { label: '✨ Ask DigiVritti AI',  trigger: 'dv:a:ai', variant: 'primary' },
      ],
    }
  }
  if (role === 'deo') {
    return {
      text: `🌸 DigiVritti — District Operations\n\nNamaste ${firstName}! Here's the district status at a glance.`,
      actions: [
        { label: '📊 District metrics',     trigger: 'dv:d:metrics', variant: 'primary' },
        { label: '🔻 Failed payments',      trigger: 'dv:d:failed', variant: 'err' },
        { label: '📅 Below 80% attendance', trigger: 'dv:d:below', variant: 'warn' },
        { label: '🏦 First-month bulk',     trigger: 'dv:d:firstmonth', variant: 'primary' },
        { label: '🔓 Aadhaar correction',   trigger: 'dv:d:aadhaar', variant: 'warn' },
        { label: '✨ Ask DigiVritti AI',    trigger: 'dv:d:ai', variant: 'primary' },
      ],
    }
  }
  if (role === 'state_secretary') {
    return {
      text: `🌸 DigiVritti — State Command\n\nNamaste ${firstName}! State-wide funnel and bulk levers below.`,
      actions: [
        { label: '📊 State metrics',     trigger: 'dv:s:metrics', variant: 'primary' },
        { label: '🌀 Application funnel', trigger: 'dv:s:funnel', variant: 'primary' },
        { label: '💰 Payment by district', trigger: 'dv:s:districts', variant: 'primary' },
        { label: '🏛️ Bulk approval',      trigger: 'dv:s:bulk', variant: 'primary' },
        { label: '🌧️ Monsoon what-if',   trigger: 'dv:s:monsoon', variant: 'warn' },
        { label: '✨ Ask DigiVritti AI',  trigger: 'dv:s:ai', variant: 'primary' },
      ],
    }
  }
  // CRC · Cluster approver
  if (role === 'crc') {
    return {
      text: `🌸 DigiVritti — CRC · Cluster Approver\n\nNamaste ${firstName}! Your cluster MADHAPAR has applications waiting for review.`,
      actions: [
        { label: '📋 Pending reviews',         trigger: 'dv:canvas:review',           variant: 'primary' },
        { label: '🔄 Resubmitted to re-review', trigger: 'dv:canvas:review:resub',     variant: 'primary' },
        { label: '✅ Rejected by me',          trigger: 'dv:a:decided',                variant: 'primary' },
        { label: '📊 Approval summary',         trigger: 'dv:a:metrics',                variant: 'primary' },
        { label: '✨ Ask DigiVritti AI',       trigger: 'dv:a:ai',                     variant: 'primary' },
      ],
    }
  }

  // PFMS · Payment officer
  if (role === 'pfms') {
    return {
      text: `🌸 DigiVritti — PFMS · Payment Officer\n\nNamaste ${firstName}! Here's the payment workspace. You'll only see payment-related actions.`,
      actions: [
        { label: '🏦 Payment queue',          trigger: 'dv:canvas:payment-queue',         variant: 'primary' },
        { label: '🔻 Failed payments',        trigger: 'dv:canvas:payment-queue:failed',  variant: 'err'     },
        { label: '✅ UTR / Success records',  trigger: 'dv:canvas:payment-queue:success', variant: 'primary' },
        { label: '📊 District success rate',  trigger: 'dv:s:districts',                  variant: 'primary' },
        { label: '💰 Sanctioned vs disbursed', trigger: 'dv:s:metrics',                    variant: 'primary' },
        { label: '✨ Ask Payment AI',          trigger: 'dv:p:ai',                         variant: 'primary' },
      ],
    }
  }

  // Teacher (and parent/default) — DigiVritti hub.
  // Lists schemes (NL + NS) as parent module, with action buttons that route
  // either further into chat or directly into the embedded canvas.
  return {
    text: `🌸 Namaste ${firstName}! I'm DigiVritti — your scholarship assistant for Namo Lakshmi and Namo Saraswati. What would you like to do?`,
    html: `<div style="font-family:${C.font};display:grid;grid-template-columns:1fr 1fr;gap:${C.s8}px;margin-top:${C.s8}px">
      <div style="background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s12}px">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.2px;color:${C.brand};text-transform:uppercase;margin-bottom:4px">Scheme · NL</div>
        <div style="font-size:14px;font-weight:600;color:${C.textPrimary};margin-bottom:2px">Namo Lakshmi</div>
        <div style="font-size:11px;color:${C.textSecondary}">₹50,000 over 4 years · girls, Class 9–12</div>
      </div>
      <div style="background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s12}px">
        <div style="font-size:11px;font-weight:600;letter-spacing:0.2px;color:${C.brand};text-transform:uppercase;margin-bottom:4px">Scheme · NS</div>
        <div style="font-size:14px;font-weight:600;color:${C.textPrimary};margin-bottom:2px">Namo Saraswati</div>
        <div style="font-size:11px;color:${C.textSecondary}">₹25,000 over 2 years · Science, Class 11–12</div>
      </div>
    </div>`,
    actions: [
      { label: '👧 New — Namo Lakshmi',       trigger: 'dv:canvas:student-select:nl', variant: 'primary' },
      { label: '🧪 New — Namo Saraswati',     trigger: 'dv:canvas:student-select:ns', variant: 'primary' },
      { label: '💾 Continue Draft',            trigger: 'dv:t:draft',                  variant: 'warn'    },
      { label: '🔁 Track Applications',        trigger: 'dv:canvas:list',              variant: 'primary' },
      { label: '🔄 Correct Rejected',          trigger: 'dv:t:correct',                variant: 'err'     },
      { label: '🔂 Returning Student',         trigger: 'dv:t:returning',              variant: 'primary' },
      { label: '🚫 Opt Out Student',           trigger: 'dv:canvas:opt-out',           variant: 'warn'    },
      { label: '📋 Application List',          trigger: 'dv:canvas:list',              variant: 'primary' },
      { label: '✨ Ask DigiVritti AI',         trigger: 'dv:t:ai',                     variant: 'primary' },
    ],
  }
}

// Scheme-specific hub (entered from the existing Namo Laxmi tile etc.).
function teacherSchemeHome(scheme, profile) {
  const firstName = profile?.name?.split(' ')[0] || 'there'
  const isNS = scheme === 'namo_saraswati'
  return {
    text: `🌸 ${isNS ? 'Namo Saraswati' : 'Namo Lakshmi'} — ${firstName}\n\n${isNS
      ? '₹25,000 over 2 years for Class 11–12 Science girls. What would you like to do?'
      : '₹50,000 over 4 years for Class 9–12 girls. What would you like to do?'}`,
    actions: [
      { label: `➕ New ${isNS ? 'NS' : 'NL'} application`, trigger: `dv:canvas:apply:${isNS ? 'ns' : 'nl'}`, variant: 'primary' },
      { label: `📋 ${isNS ? 'NS' : 'NL'} application list`, trigger: `dv:canvas:list:${isNS ? 'ns' : 'nl'}`, variant: 'primary' },
      { label: '🔄 Correct rejected',                       trigger: 'dv:t:correct',                        variant: 'err' },
      { label: '🏠 DigiVritti home',                        trigger: 'dv:start',                            variant: 'primary' },
    ],
  }
}

// ── TEACHER — Namo Lakshmi multi-step ────────────────────────────────────────
function teacherNL(step) {
  const s = PRE_STUDENT_NL
  if (step === 'start') return {
    text: `Searching the State Registry for your students…`,
    progress: ['Connecting to Gujarat State Registry…', 'Fetching eligible class roster…'],
    html: `<div style="font-family:${C.font};color:${C.textPrimary}">
      <div style="font-size:13px;color:${C.textSecondary};margin-bottom:${C.s8}px">Pick a student to register for Namo Lakshmi:</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s12}px"><strong>${s.name}</strong><div style="font-size:11px;color:${C.textSecondary}">${s.cls} · ${s.gender}</div></div>
        <div style="border:1px solid ${C.borderSubtle};border-radius:${C.rLg}px;padding:${C.s12}px;color:${C.textTertiary}">Solanki Hetal · Class 9 · Section C</div>
        <div style="border:1px solid ${C.borderSubtle};border-radius:${C.rLg}px;padding:${C.s12}px;color:${C.textTertiary}">Trivedi Mira · Class 9 · Section A</div>
      </div>
    </div>`,
    actions: [
      { label: `Select ${s.name.split(' ')[0]} ${s.name.split(' ')[1]}`, trigger: 'dv:t:nl:eligibility', variant: 'primary' },
    ],
  }
  if (step === 'eligibility') return {
    text: `✓ Found in State Registry.\n\nName: ${s.name}\n${s.cls}\nMother: ${s.mother} · Father: ${s.father}\n\nEligible scheme: ${s.scheme} (auto-selected).\n\nDoes the student want the scholarship?`,
    actions: [
      { label: '✅ Yes, opt in',  trigger: 'dv:t:nl:aadhaar', variant: 'ok' },
      { label: '🚫 No, opt out',  trigger: 'dv:t:opt_out',   variant: 'err' },
    ],
  }
  if (step === 'aadhaar') return {
    text: `Step 1 of 4 — Aadhaar details`,
    html: formCard({
      title: 'Student Aadhaar',
      fields: [
        { label: 'Aadhaar name',  value: s.name },
        { label: 'Aadhaar no.',   value: 'XXXX XXXX 1234' },
        { label: 'Aadhaar front', value: 'Uploaded', state: 'success' },
        { label: 'Aadhaar back',  value: 'Uploaded', state: 'success' },
      ],
    }),
    actions: [
      { label: '➡️ Next — Income',  trigger: 'dv:t:nl:income', variant: 'primary' },
      { label: '💾 Save as draft',  trigger: 'dv:t:nl:savedraft', variant: 'warn' },
    ],
  }
  if (step === 'income') return {
    text: `Step 2 of 4 — Income & guardian`,
    html: formCard({
      title: 'Income & guardian',
      fields: [
        { label: 'Family annual income', value: '₹4,50,000' },
        { label: 'Income certificate',   value: 'Not required (below threshold)', state: 'success' },
        { label: 'Guardian mobile',      value: '98765 43210' },
      ],
    }),
    actions: [
      { label: '➡️ Next — Bank',     trigger: 'dv:t:nl:bank', variant: 'primary' },
      { label: '💾 Save as draft',   trigger: 'dv:t:nl:savedraft', variant: 'warn' },
    ],
  }
  if (step === 'bank') return {
    text: `Step 3 of 4 — Mother's account (DBT primary)`,
    html: formCard({
      title: "Mother's bank — DBT",
      fields: [
        { label: 'Mother name',     value: s.mother },
        { label: 'Mother Aadhaar',  value: 'XXXX XXXX 5678' },
        { label: 'Bank',            value: 'Baroda Gujarat Gramin Bank' },
        { label: 'Account',         value: 'XXXXX789' },
        { label: 'IFSC',            value: 'BARB0BGGBXX' },
        { label: 'Name in bank',    value: 'Vaghela Gaytriba', state: 'success' },
        { label: 'Cancelled cheque', value: 'Uploaded', state: 'success' },
      ],
    }),
    actions: [
      { label: '➡️ Next — Documents', trigger: 'dv:t:nl:docs', variant: 'primary' },
      { label: '💾 Save as draft',    trigger: 'dv:t:nl:savedraft', variant: 'warn' },
    ],
  }
  if (step === 'docs') return {
    text: `Step 4 of 4 — Final document upload`,
    html: formCard({
      title: 'Documents',
      fields: [
        { label: 'LCR / birth certificate', value: 'Uploaded', state: 'success' },
        { label: 'Student photo',           value: 'Uploaded', state: 'success' },
        { label: 'Auto-validation',         value: 'All checks passed', state: 'success' },
      ],
    }),
    actions: [
      { label: '✅ Submit application', trigger: 'dv:t:nl:submit', variant: 'ok' },
      { label: '💾 Save as draft',      trigger: 'dv:t:nl:savedraft', variant: 'warn' },
    ],
  }
  if (step === 'submit') return {
    text: `🎉 Submitted!\n\nApp ID: ${s.appId}\nStatus: Submitted · auto-checks running.`,
    progress: ['Saving application…', 'Running eligibility checks…', 'Routing to cluster approver…'],
    html: `<div style="font-family:${C.font}">
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${C.s8}px">${statusChip('SUBMITTED')} ${chip('Approver pending', 'warning', '⏳')} ${chip('Sync → IPMS', 'info', '🏦')}</div>
      <div style="font-size:12px;color:${C.textSecondary}">You'll be notified the moment the cluster approver reviews this application.</div>
    </div>`,
    actions: [
      { label: '🔁 Track this application', trigger: 'dv:t:track', variant: 'primary' },
      { label: '👧 Register another',       trigger: 'dv:t:nl:start', variant: 'primary' },
      { label: '🏠 DigiVritti home',        trigger: 'dv:start',      variant: 'primary' },
    ],
  }
  if (step === 'savedraft') return {
    text: `💾 Saved as DRAFT for ${s.name}. You can return any time to complete it.`,
    html: `<div style="font-family:${C.font}">${statusChip('DRAFT')}</div>`,
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  return null
}

// ── TEACHER — Namo Saraswati ─────────────────────────────────────────────────
function teacherNS(step) {
  const s = PRE_STUDENT_NS
  if (step === 'start') return {
    text: `Selected: ${s.name} · ${s.cls}.\n\n⚡ Dual-eligible: Namo Lakshmi + Namo Saraswati. Pick the scheme to file:`,
    actions: [
      { label: '🧪 Namo Saraswati', trigger: 'dv:t:ns:academic', variant: 'primary' },
      { label: '👧 Namo Lakshmi',    trigger: 'dv:t:nl:aadhaar',  variant: 'primary' },
    ],
  }
  if (step === 'academic') return {
    text: `Step 1 of 2 — Academic verification (NS)`,
    progress: ['Querying Exam Board API…', 'Verifying seat number…'],
    html: formCard({
      title: 'Academic verification',
      fields: [
        { label: 'Stream',         value: 'Science', state: 'success' },
        { label: 'Seat number',    value: 'A12345' },
        { label: 'Seat verified',  value: 'Verified via Exam Board API', state: 'success' },
        { label: 'Class 10 %',     value: `${s.tenth}%`, state: 'success' },
        { label: 'Marksheet',      value: 'Uploaded', state: 'success' },
      ],
    }),
    actions: [
      { label: '➡️ Next — Bank/Aadhaar', trigger: 'dv:t:ns:dbt', variant: 'primary' },
    ],
  }
  if (step === 'dbt') return {
    text: `Step 2 of 2 — Mother's bank (DBT)`,
    html: formCard({
      title: "Mother's bank — DBT",
      fields: [
        { label: 'Mother Aadhaar', value: 'XXXX XXXX 9911' },
        { label: 'Bank',           value: 'State Bank of India' },
        { label: 'IFSC',           value: 'SBIN0001234' },
        { label: 'Name in bank',   value: 'Prajapati Geeta', state: 'success' },
      ],
    }),
    actions: [
      { label: '✅ Submit', trigger: 'dv:t:ns:submit', variant: 'ok' },
    ],
  }
  if (step === 'submit') return {
    text: `🎉 Namo Saraswati application submitted!\n\nApp ID: ${s.appId}\nClass 10: ${s.tenth}% · Seat verified.`,
    progress: ['Saving NS application…', 'Auto-eligibility checks…'],
    html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${statusChip('SUBMITTED')} ${chip('Auto-approved · ≥50%', 'success', '✓')}</div>`,
    actions: [
      { label: '🔁 Track', trigger: 'dv:t:track', variant: 'primary' },
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  return null
}

// ── TEACHER — opt-out, draft, returning, correct, track, ai ──────────────────
function teacherSimple(step) {
  if (step === 'opt_out') return {
    text: `Please upload a declaration letter from the student's guardian. Once uploaded, the application will be marked as Not Wanted.`,
    actions: [
      { label: '📎 Upload declaration', trigger: 'dv:t:opt_out_done', variant: 'primary' },
    ],
  }
  if (step === 'opt_out_done') return {
    text: `Marked as Not Wanted. You can reopen it later if the student changes their mind.`,
    html: `<div style="font-family:${C.font}">${statusChip('NOT_WANTED')}</div>`,
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'returning') {
    // Pull the curated returning-student app (Princy, Class 11 → 12).
    const returning = (getApplications({}) || []).find(a => a.returning === true)
      || (getApplications({}) || []).find(a => a.appId === 'NS2025GJ0050')
    if (!returning) {
      return {
        text: `🔁 No returning students on file yet. Once a student renews next year, they'll appear here with last year's data pre-filled.`,
        actions: [
          { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
        ],
      }
    }
    return {
      text: `✅ Returning student verified:\n\n• Previous grade: Class ${returning.previousGrade || returning.grade - 1}\n• Previous status: ${returning.previousStatus || 'APPROVED'}\n• Same school: ${returning.school}\n• Auto-progressed to Class ${returning.grade}-${returning.section}\n\nAll details are pre-filled. Confirm to submit?`,
      html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${chip('Grade progressed', 'success', '✓')} ${chip('Same school', 'success', '✓')} ${chip('Previous: ' + (returning.previousStatus || 'APPROVED'), 'info', '🗂')}</div>`,
      actions: [
        { label: `📝 Open & confirm — ${returning.studentName}`, trigger: `dv:canvas:edit:${returning.appId}`, variant: 'primary' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  if (step === 'draft') return {
    text: `📂 You have 1 draft pending:`,
    html: `<div style="font-family:${C.font};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s12}px ${C.s16}px;background:${C.surface}">
      <div style="font-size:14px;font-weight:600;color:${C.textPrimary};margin-bottom:4px">Vaghela Jaydeviba</div>
      <div style="font-size:11px;color:${C.textSecondary};margin-bottom:${C.s8}px">Namo Lakshmi · saved 2 days ago</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${chip('Aadhaar ✓', 'success')} ${chip('Income ✓', 'success')} ${chip('Bank pending', 'warning', '⏳')} ${chip('LCR pending', 'warning', '⏳')}</div>
    </div>`,
    actions: [
      { label: '▶️ Resume draft', trigger: 'dv:t:nl:bank', variant: 'primary' },
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'track') {
    const trackRows = [
      { name: 'Vaghela Jaydeviba', scheme: 'Namo Lakshmi',  status: 'APPROVED',         updated: '17/07' },
      { name: 'Shah Riya',         scheme: 'Namo Lakshmi',  status: 'RESUBMITTED',      updated: '20/07' },
      { name: 'Patel Kavya',       scheme: 'Namo Saraswati', status: 'REJECTED',         updated: '12/07' },
      { name: 'Solanki Hetal',     scheme: 'Namo Lakshmi',  status: 'APPROVER_PENDING', updated: '21/07' },
      { name: 'Mehta Aastha',      scheme: 'Namo Lakshmi',  status: 'PAYMENT_SUCCESS',  updated: '22/07' },
    ]
    return {
      text: `📋 Your recent applications (${trackRows.length}):`,
      html: tableCard({
        columns: [
          { key: 'name',   header: 'Student' },
          { key: 'scheme', header: 'Scheme' },
          { key: 'status', header: 'Status', render: r => statusChip(r.status) },
          { key: 'updated',header: 'Updated', align: 'right' },
        ],
        rows: trackRows,
      }),
      actions: [
        { label: '🔄 Open rejected', trigger: 'dv:t:correct', variant: 'err' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  if (step === 'correct') {
    // Pull every rejected / auto-rejected application so the teacher can pick
    // which one to fix. List preview is summarised in the chat bubble; the
    // canvas opens with the rejected filter pre-applied so each card already
    // exposes an Edit Form button per student.
    const rejected = getApplications({}).filter(a => statusBucket(a.status) === 'rejected')
    const previewRows = rejected.slice(0, 6).map(a => `
      <div style="display:flex;align-items:center;gap:${C.s8}px;padding:${C.s8}px ${C.s12}px;border:1px solid ${C.borderDefault};border-radius:${C.rMd}px;background:${C.surface};margin-bottom:6px">
        <div style="width:28px;height:28px;border-radius:${C.rFull}px;background:${C.errorBg};color:${C.errorText};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">⚠️</div>
        <div style="flex:1;min-width:0;font-family:${C.font}">
          <div style="font-size:13px;font-weight:600;color:${C.textPrimary}">${a.studentName}</div>
          <div style="font-size:11px;color:${C.textSecondary}">${SCHEMES[a.schemeId]?.short || a.schemeId} · Class ${a.grade}-${a.section} · ${a.appId}</div>
          ${a.rejectionReason ? `<div style="font-size:11px;color:${C.errorText};margin-top:2px">${a.rejectionReason}</div>` : ''}
        </div>
      </div>`).join('')
    const more = rejected.length > 6
      ? `<div style="font-size:11px;color:${C.textTertiary};margin-top:4px;font-family:${C.font}">+ ${rejected.length - 6} more in the canvas…</div>`
      : ''
    return {
      text: `⚠️ ${rejected.length} application${rejected.length === 1 ? '' : 's'} need${rejected.length === 1 ? 's' : ''} correction. Pick the student you want to fix:`,
      html: rejected.length === 0
        ? `<div style="font-family:${C.font};color:${C.textSecondary};font-size:13px">Nothing to correct — your inbox is clear. 🎉</div>`
        : `<div style="font-family:${C.font};margin-top:${C.s8}px">${previewRows}${more}</div>`,
      openCanvas: rejected.length > 0
        ? { type: 'digivritti', view: 'list', scheme: 'all', filter: 'rejected' }
        : null,
      actions: rejected.length > 0
        ? [
            { label: '📋 Open correction list', trigger: 'dv:canvas:list:rejected', variant: 'primary' },
            { label: '🏠 DigiVritti home',      trigger: 'dv:start',                variant: 'primary' },
          ]
        : [
            { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
          ],
    }
  }
  if (step === 'correct_done') return {
    text: `✓ Updated mother name to match bank.\nResubmission #2 sent for review.`,
    progress: ['Updating record…', 'Re-routing to cluster approver…'],
    html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${statusChip('RESUBMITTED')} ${chip('Approver re-review', 'warning', '⏳')}</div>`,
    actions: [
      { label: '🔁 Track applications', trigger: 'dv:t:track', variant: 'primary' },
    ],
  }
  if (step === 'ai') {
    const tiles = TEACHER_AI_QUERIES.map(q => metric({ value: q.metric.value, label: q.metric.label, tone: q.metric.tone })).join('')
    return {
      text: `✨ DigiVritti AI — your scholarship snapshot:`,
      html: `<div style="font-family:${C.font};display:grid;grid-template-columns:1fr 1fr;gap:${C.s12}px">${tiles}</div>`,
      actions: TEACHER_AI_QUERIES.map((q, i) => ({ label: `❓ ${q.q}`, trigger: `dv:t:ai:${i}`, variant: 'primary' })),
    }
  }
  if (step?.startsWith('ai:')) {
    const idx = Number(step.slice(3))
    const q = TEACHER_AI_QUERIES[idx]
    if (!q) return null
    return {
      text: `${q.q}\n\n${q.answer}`,
      html: `<div style="font-family:${C.font}">${metric(q.metric)}</div>`,
      actions: [
        { label: '✨ More AI queries', trigger: 'dv:t:ai', variant: 'primary' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  return null
}

// ── APPROVER ────────────────────────────────────────────────────────────────
function approver(step) {
  if (step === 'metrics') return {
    text: `📊 Cluster approver — current load:`,
    html: metricsRow([
      { value: APPROVER_METRICS.pending,             label: 'Pending',         tone: 'warning' },
      { value: APPROVER_METRICS.approvedThisMonth,   label: 'Approved · month', tone: 'success' },
      { value: APPROVER_METRICS.rejectedThisMonth,   label: 'Rejected · month', tone: 'error' },
      { value: `${APPROVER_METRICS.approvalRate}%`,  label: 'Approval rate',    tone: 'info', sub: `Oldest pending · ${APPROVER_METRICS.oldestWaitingDays} d` },
    ]),
    actions: [
      { label: '📋 Open queue',        trigger: 'dv:a:queue', variant: 'primary' },
      { label: '✨ Ask DigiVritti AI', trigger: 'dv:a:ai',    variant: 'primary' },
    ],
  }
  if (step === 'queue') return {
    text: `📋 ${APPROVER_PENDING.length} applications awaiting review:`,
    html: tableCard({
      columns: [
        { key: 'studentName', header: 'Student' },
        { key: 'scheme',      header: 'Scheme' },
        { key: 'grade',       header: 'Grade' },
        { key: 'status',      header: 'Status', render: r => statusChip(r.status) },
      ],
      rows: APPROVER_PENDING,
    }),
    actions: APPROVER_PENDING.slice(0, 3).map(p => ({
      label: `🔍 Open ${p.studentName.split(' ').slice(-1)[0]}`,
      trigger: `dv:a:open:${p.appId}`,
      variant: 'primary',
    })),
  }
  if (step?.startsWith('open:')) {
    const appId = step.slice(5)
    const app = APPROVER_PENDING.find(a => a.appId === appId)
    if (!app) return null
    return {
      text: `🔍 ${app.studentName} · ${app.scheme}\nApp: ${app.appId} · School ${app.school} · waiting ${app.daysWaiting} days.`,
      html: formCard({
        title: 'Document & name-match review',
        fields: [
          { label: 'Student Aadhaar',  value: app.docs.aadhaar === 'ok' ? 'Verified' : 'Issue', state: app.docs.aadhaar === 'ok' ? 'success' : 'warning' },
          { label: 'Mother Aadhaar',   value: app.docs.motherAadhaar === 'ok' ? 'Verified' : 'Issue', state: app.docs.motherAadhaar === 'ok' ? 'success' : 'warning' },
          { label: 'Income',           value: app.docs.income === 'ok' ? 'Verified' : 'Missing', state: app.docs.income === 'ok' ? 'success' : 'error' },
          { label: 'LCR',              value: app.docs.lcr === 'ok' ? 'Verified' : 'Missing', state: app.docs.lcr === 'ok' ? 'success' : 'error' },
          { label: 'Bank',             value: app.docs.bank === 'ok' ? 'Verified' : 'Needs review', state: app.docs.bank === 'ok' ? 'success' : 'warning' },
          { label: 'Mother (Aadhaar)', value: app.mother?.aadhaarName || '—' },
          { label: 'Mother (Bank)',    value: app.mother?.bankName || '—', state: app.nameMatch ? 'success' : 'error' },
          { label: 'Name match',       value: app.nameMatch ? 'Match' : 'Mismatch', state: app.nameMatch ? 'success' : 'error' },
        ],
      }) + (app.mismatchReason ? `<div style="margin-top:${C.s8}px;background:${C.errorBg};color:${C.errorText};padding:${C.s12}px;border-radius:${C.rMd}px;font-size:12px;font-family:${C.font}">⚠️ ${app.mismatchReason}</div>` : ''),
      actions: [
        { label: '✅ Approve (irreversible)', trigger: `dv:a:approve:${appId}`, variant: 'ok' },
        { label: '❌ Reject',                 trigger: `dv:a:reject:${appId}`,  variant: 'err' },
      ],
    }
  }
  if (step?.startsWith('approve:')) {
    const appId = step.slice(8)
    const app = APPROVER_PENDING.find(a => a.appId === appId)
    return {
      text: `✅ Approved — ${app?.studentName || appId}.\n\nThis is irreversible. The application now enters the IPMS payment system.`,
      progress: ['Recording decision…', 'Syncing to IPMS PostgreSQL…'],
      html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${statusChip('APPROVED')} ${chip('IPMS sync ✓', 'success')}</div>`,
      actions: [
        { label: '📋 Back to queue', trigger: 'dv:a:queue', variant: 'primary' },
      ],
    }
  }
  if (step?.startsWith('reject:')) {
    const appId = step.slice(7)
    const app = APPROVER_PENDING.find(a => a.appId === appId)
    return {
      text: `❌ Rejected — ${app?.studentName || appId}.\n\nReason recorded. The teacher has been notified to correct and resubmit.`,
      html: `<div style="font-family:${C.font}">${statusChip('REJECTED')}</div>`,
      actions: [
        { label: '📋 Back to queue', trigger: 'dv:a:queue', variant: 'primary' },
      ],
    }
  }
  if (step === 'ai') return {
    text: `✨ Approver assistant — common questions:`,
    actions: APPROVER_AI_QUERIES.map((q, i) => ({ label: `❓ ${q.q}`, trigger: `dv:a:ai:${i}`, variant: 'primary' })),
  }
  if (step?.startsWith('ai:')) {
    const q = APPROVER_AI_QUERIES[Number(step.slice(3))]
    if (!q) return null
    return {
      text: `${q.q}\n\n${q.answer}`,
      html: `<div style="font-family:${C.font}">${metric(q.metric)}</div>`,
      actions: [
        { label: '✨ More queries', trigger: 'dv:a:ai',     variant: 'primary' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  return null
}

// ── DISTRICT ────────────────────────────────────────────────────────────────
function district(step) {
  if (step === 'metrics') return {
    text: `📊 District — Kachchh snapshot:`,
    html: metricsRow([
      { value: `${DISTRICT_METRICS.approvalRate}%`,        label: 'Approval rate',    tone: 'success', sub: `${DISTRICT_METRICS.beneficiaries} beneficiaries` },
      { value: `${DISTRICT_METRICS.paymentSuccessRate}%`,  label: 'Payment success',  tone: 'warning', sub: 'July 2025' },
      { value: DISTRICT_METRICS.pendingApprovalEscalations.toLocaleString('en-IN'), label: 'Stuck in approval', tone: 'warning' },
      { value: DISTRICT_METRICS.monthlyBlocked,            label: 'Blocked / month',  tone: 'error',   sub: `Disbursed ${DISTRICT_METRICS.monthlyDisbursed}` },
    ]),
    actions: [
      { label: '🔻 Failed payments',      trigger: 'dv:d:failed', variant: 'err' },
      { label: '📅 Below 80% attendance', trigger: 'dv:d:below', variant: 'warn' },
      { label: '🏦 First-month bulk',     trigger: 'dv:d:firstmonth', variant: 'primary' },
      { label: '🔓 Aadhaar correction',   trigger: 'dv:d:aadhaar', variant: 'warn' },
      { label: '✨ AI queries',           trigger: 'dv:d:ai', variant: 'primary' },
    ],
  }
  if (step === 'failed') return {
    text: `🔻 Failed payments — last month:`,
    html: `<div style="font-family:${C.font};background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s16}px">${progressBars(DISTRICT_FAILED_PAYMENTS.map(r => ({ label: r.reason, value: `${r.count} cases`, share: r.share, tone: 'error' })))}</div>`,
    actions: [
      { label: '🔓 Open Aadhaar window', trigger: 'dv:d:aadhaar', variant: 'warn' },
      { label: '🏠 DigiVritti home',     trigger: 'dv:start',     variant: 'primary' },
    ],
  }
  if (step === 'below') return {
    text: `📅 Students below 80% attendance — by block:`,
    html: tableCard({
      columns: [
        { key: 'block',   header: 'Block' },
        { key: 'below80', header: 'Below 80%', align: 'right' },
        { key: 'denied',  header: 'Denied',    align: 'right',
          render: r => chip(`${r.denied}`, r.denied > 15 ? 'error' : 'warning') },
      ],
      rows: DISTRICT_BELOW_ATTENDANCE,
    }),
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'firstmonth') return {
    text: `🏦 First-month approvals (no attendance check) — ${DISTRICT_FIRST_MONTH_PENDING.length} students.`,
    html: tableCard({
      columns: [
        { key: 'studentName', header: 'Student' },
        { key: 'school',      header: 'School' },
        { key: 'scheme',      header: 'Scheme' },
        { key: 'amount',      header: 'Amount', align: 'right', render: r => `₹${r.amount}` },
      ],
      rows: DISTRICT_FIRST_MONTH_PENDING,
    }),
    actions: [
      { label: '✅ Bulk approve all', trigger: 'dv:d:firstmonth_done', variant: 'ok' },
      { label: '🏠 DigiVritti home',  trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'firstmonth_done') {
    const total = DISTRICT_FIRST_MONTH_PENDING.reduce((s, r) => s + r.amount, 0)
    return {
      text: `✅ Bulk approved ${DISTRICT_FIRST_MONTH_PENDING.length} students · ₹${total.toLocaleString('en-IN')} queued for DBT.`,
      progress: ['Recording approvals…', 'Pushing to payment API…'],
      html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${statusChip('APPROVED')} ${chip('Payment queued', 'info', '🏦')}</div>`,
      actions: [
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  if (step === 'aadhaar') return {
    text: `🔓 Aadhaar correction — students whose payments failed for missing Aadhaar links:`,
    html: tableCard({
      columns: [
        { key: 'studentName',    header: 'Student' },
        { key: 'currentAadhaar', header: 'Aadhaar' },
        { key: 'issue',          header: 'Issue', render: r => chip(r.issue, 'error') },
      ],
      rows: DISTRICT_AADHAAR_FREEZE,
    }),
    actions: [
      { label: '🔓 Unfreeze edit window', trigger: 'dv:d:aadhaar_done', variant: 'warn' },
      { label: '🏠 DigiVritti home',      trigger: 'dv:start',          variant: 'primary' },
    ],
  }
  if (step === 'aadhaar_done') return {
    text: `🔓 Edit window opened for ${DISTRICT_AADHAAR_FREEZE.length} students. Teachers will be prompted to correct Aadhaar details, after which payments retry automatically.`,
    html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${chip('Edit window open', 'warning', '🔓')} ${chip('Audit logged', 'info', '🧾')}</div>`,
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'ai') return {
    text: `✨ District assistant — common questions:`,
    actions: DISTRICT_AI_QUERIES.map((q, i) => ({ label: `❓ ${q.q}`, trigger: `dv:d:ai:${i}`, variant: 'primary' })),
  }
  if (step?.startsWith('ai:')) {
    const q = DISTRICT_AI_QUERIES[Number(step.slice(3))]
    if (!q) return null
    return {
      text: `${q.q}\n\n${q.answer}`,
      html: `<div style="font-family:${C.font}">${metric(q.metric)}</div>`,
      actions: [
        { label: '✨ More queries', trigger: 'dv:d:ai', variant: 'primary' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  return null
}

// ── STATE ───────────────────────────────────────────────────────────────────
function state(step) {
  if (step === 'metrics') return {
    text: `🏛️ State command — DigiVritti snapshot:`,
    html: metricsRow([
      { value: STATE_METRICS.totalBeneficiaries,           label: 'Beneficiaries',     tone: 'success', sub: `${STATE_METRICS.namoLakshmi} NL · ${STATE_METRICS.namoSaraswati} NS` },
      { value: `${STATE_METRICS.approvalRate}%`,           label: 'Approval rate',     tone: 'info' },
      { value: STATE_METRICS.disbursed,                    label: 'Disbursed',         tone: 'success', sub: `Sanctioned ${STATE_METRICS.sanctioned}` },
      { value: STATE_METRICS.pending,                      label: 'Pending disbursal', tone: 'warning', sub: `Pay success ${STATE_METRICS.paymentSuccessRate}%` },
    ]),
    actions: [
      { label: '🌀 Application funnel', trigger: 'dv:s:funnel',    variant: 'primary' },
      { label: '💰 Payment by district', trigger: 'dv:s:districts', variant: 'primary' },
      { label: '🏛️ Bulk approval',      trigger: 'dv:s:bulk',      variant: 'primary' },
      { label: '🌧️ Monsoon what-if',   trigger: 'dv:s:monsoon',   variant: 'warn' },
      { label: '✨ AI queries',          trigger: 'dv:s:ai',        variant: 'primary' },
    ],
  }
  if (step === 'funnel') return {
    text: `🌀 Application funnel — 2025-26`,
    html: `<div style="font-family:${C.font};background:${C.surface};border:1px solid ${C.borderDefault};border-radius:${C.rLg}px;padding:${C.s16}px">${funnelBars(STATE_FUNNEL)}</div>`,
    actions: [
      { label: '💰 Payment by district', trigger: 'dv:s:districts', variant: 'primary' },
      { label: '🏠 DigiVritti home',     trigger: 'dv:start',       variant: 'primary' },
    ],
  }
  if (step === 'districts') return {
    text: `💰 Payment success — bottom 5 districts:`,
    html: tableCard({
      columns: [
        { key: 'district', header: 'District' },
        { key: 'success',  header: 'Paid',  align: 'right' },
        { key: 'total',    header: 'Total', align: 'right' },
        { key: 'rate',     header: 'Rate',  align: 'right',
          render: r => chip(`${r.rate}%`, r.rate < 92 ? 'error' : r.rate < 94 ? 'warning' : 'success') },
      ],
      rows: STATE_DISTRICT_PAYMENT,
    }),
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'bulk') return {
    text: `🏛️ Bulk-bypass queue — June 2025 first-month approvals:`,
    html: tableCard({
      columns: [
        { key: 'district', header: 'District' },
        { key: 'pending',  header: 'Pending', align: 'right',
          render: r => typeof r.pending === 'number' ? r.pending.toLocaleString('en-IN') : r.pending },
        { key: 'amount',   header: 'Amount',  align: 'right' },
      ],
      rows: STATE_BULK_QUEUES,
    }),
    actions: [
      { label: '✅ Bulk approve all', trigger: 'dv:s:bulk_done', variant: 'ok' },
      { label: '🏠 DigiVritti home',  trigger: 'dv:start',       variant: 'primary' },
    ],
  }
  if (step === 'bulk_done') return {
    text: `✅ Bulk bypass approved · 45,000 records · ₹22.5 Cr queued for payment push.`,
    progress: ['Recording approvals…', 'Batching for DBT API…', 'Done.'],
    html: `<div style="font-family:${C.font};display:flex;flex-wrap:wrap;gap:6px">${statusChip('APPROVED')} ${chip('Batch queued', 'info', '🏦')}</div>`,
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'monsoon') return {
    text: `🌧️ Monsoon impact — what if attendance threshold drops 80% → 70% during Jul–Sep?`,
    html: tableCard({
      columns: [
        { key: 'district',      header: 'District' },
        { key: 'monsoonManual', header: 'Manual @ 80%', align: 'right', render: r => `${r.monsoonManual}%` },
        { key: 'nonMonsoon',    header: 'Baseline',     align: 'right', render: r => `${r.nonMonsoon}%` },
        { key: 'increase',      header: 'Δ',            align: 'right', render: r => chip(r.increase, 'error') },
      ],
      rows: STATE_MONSOON_SCENARIOS,
    }) + `<div style="margin-top:${C.s12}px;background:${C.successBg};color:${C.successText};padding:${C.s12}px;border-radius:${C.rMd}px;font-size:12px;font-family:${C.font}">With a 70% monsoon threshold, manual workload in DANG/TAPI/NAVSARI/VALSAD drops 46–55% — 46,860 students shift from manual to auto-approval.</div>`,
    actions: [
      { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
    ],
  }
  if (step === 'ai') return {
    text: `✨ State assistant — common questions:`,
    actions: STATE_AI_QUERIES.map((q, i) => ({ label: `❓ ${q.q}`, trigger: `dv:s:ai:${i}`, variant: 'primary' })),
  }
  if (step?.startsWith('ai:')) {
    const q = STATE_AI_QUERIES[Number(step.slice(3))]
    if (!q) return null
    return {
      text: `${q.q}\n\n${q.answer}`,
      html: `<div style="font-family:${C.font}">${metric(q.metric)}</div>`,
      actions: [
        { label: '✨ More queries', trigger: 'dv:s:ai',     variant: 'primary' },
        { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' },
      ],
    }
  }
  return null
}

// ── AI assistant (role-scoped, multi-turn) ──────────────────────────────────
// `dv:ai:<sub>[:<args>]` — unified AI flow:
//   menu                       → list role's question chips + deep-dive entry
//   run:<queryId>              → execute query, append AI result card (with user bubble)
//   sql:<queryId>              → re-render same card with technical SQL block
//   full:<queryId>             → open full-table canvas
//   ask                        → free-text prompt (server side: composer captures it)
//   dives                      → list available deep-dive scenarios
//   dive:<scenarioId>          → start scenario at turn 0
//   dive:<scenarioId>:<turn>   → run that turn (0 / 1 / 2)
function aiDirective(rest, role, profile) {
  const r = normalizeRole(role)
  const meta = getAIRoleMeta(r)
  const parts = (rest || '').split(':')
  const sub = (parts[0] || 'menu').toLowerCase()
  const args = parts.slice(1)
  const firstName = profile?.name?.split(' ')[0] || 'there'

  // Build the user-bubble + bot reply for a single AI query.
  const buildQueryReply = (out, { showSql = false } = {}) => {
    const html = aiResultCardHtml({
      question: out.question,
      sql: out.sql,
      result: out.result,
      insight: out.insight,
      category: out.category,
      showSql,
      persona: meta.persona,
      fallbackNotice: out.fallbackNotice,
      preview: (out.result || []).length > 5,
    })
    const tooLarge = (out.result || []).length > 5
    const actions = [
      ...(showSql
        ? [{ label: '👁 Hide SQL',  trigger: `dv:ai:run:${out.queryId}`, variant: 'primary' }]
        : [{ label: '🔄 Show SQL',  trigger: `dv:ai:sql:${out.queryId}`, variant: 'primary' }]
      ),
      ...(tooLarge
        ? [{ label: '📋 Open full table', trigger: `dv:ai:full:${out.queryId}`, variant: 'primary' }]
        : []
      ),
      ...((out.followups || []).slice(0, 2).map(f => ({
        label: `❓ ${f.q.length > 48 ? f.q.slice(0, 46) + '…' : f.q}`,
        trigger: `dv:ai:run:${f.id}`,
        variant: 'primary',
      }))),
      { label: '✨ More AI queries',  trigger: 'dv:ai:menu', variant: 'primary' },
      { label: '🏠 DigiVritti home',  trigger: 'dv:start',   variant: 'primary' },
    ]
    return {
      // Empty bot text — the AI card carries everything.
      text: '',
      html,
      actions,
      progress: ['Analyzing DigiVritti data…'],
      userBubble: out.question,
    }
  }

  // ── Menu ──
  if (sub === 'menu' || sub === '' ) {
    const queries = getAIQueriesForRole(r)
    const dives = getDeepDivesForRole(r)
    if (queries.length === 0) {
      return {
        text: `${meta.label} is not available for your role yet.`,
        actions: [{ label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' }],
      }
    }
    const introHtml = `<div style="font-family:${C.font};margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;font-weight:600;letter-spacing:0.4px;color:${C.textSecondary};text-transform:uppercase;margin-bottom:8px">
        <span>💬 Natural Language</span>
        <span style="color:${C.textTertiary}">›</span>
        <span style="color:${C.brand}">⚡ AI Analytics Engine</span>
        <span style="color:${C.textTertiary}">›</span>
        <span>📊 Results + 💡 Insight</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:700;letter-spacing:0.4px;color:${C.brand};text-transform:uppercase">✨ DigiVritti AI · ${meta.shortRole}</span>
        <span style="background:${C.brandSubtle};color:${C.brand};font-size:10px;font-weight:600;letter-spacing:0.3px;padding:2px 8px;border-radius:999px">${queries.length} questions${dives.length ? ` · ${dives.length} deep dives` : ''}</span>
      </div>
      <div style="font-size:12px;color:${C.textSecondary};line-height:18px">I can analyze DigiVritti data for your role. Choose a question below or type your own.</div>
    </div>${dives.length ? aiDeepDiveMenuHtml(dives) : ''}`

    const queryActions = queries.map(q => ({
      label: `❓ ${q.q.length > 60 ? q.q.slice(0, 58) + '…' : q.q}`,
      trigger: `dv:ai:run:${q.id}`,
      variant: 'primary',
    }))
    const diveActions = dives.map(s => ({
      label: s.entryLabel || `🧠 ${s.title}`,
      trigger: `dv:ai:dive:${s.id}:0`,
      variant: 'primary',
    }))
    return {
      text: `Namaste ${firstName}! ${meta.label} ready.`,
      html: introHtml,
      actions: [...queryActions, ...diveActions, { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' }],
    }
  }

  // ── Run / SQL toggle ──
  if (sub === 'run' || sub === 'sql') {
    const id = args.join(':')
    const out = runAIQuery(r, id)
    if (!out) {
      return {
        text: `That query is not available for your role.`,
        actions: [{ label: '✨ More AI queries', trigger: 'dv:ai:menu', variant: 'primary' }],
      }
    }
    return buildQueryReply(out, { showSql: sub === 'sql' })
  }

  // ── Open full table in canvas ──
  if (sub === 'full') {
    const id = args.join(':')
    const out = runAIQuery(r, id)
    if (!out) return null
    return {
      text: `📋 Opening the full table for "${out.question}"…`,
      openCanvas: {
        type: 'digivritti',
        view: 'ai-result',
        role: r,
        queryId: out.queryId,
      },
    }
  }

  // ── Custom typed question — composer side will dispatch dv:ai:ask:<text> ──
  if (sub === 'ask') {
    const question = args.join(':')
    const out = runCustomAIQuery(r, question)
    if (!out) return null
    if (out.kind === 'scenario') {
      return aiDirective(`dive:${out.scenarioId}:0`, role, profile)
    }
    return buildQueryReply(out)
  }

  // ── Deep-dive scenario list ──
  if (sub === 'dives') {
    const dives = getDeepDivesForRole(r)
    if (dives.length === 0) {
      return {
        text: `No deep-dive scenarios available for your role.`,
        actions: [{ label: '✨ More AI queries', trigger: 'dv:ai:menu', variant: 'primary' }],
      }
    }
    return {
      text: `🧠 Deep-dive scenarios — multi-turn investigations:`,
      html: aiDeepDiveMenuHtml(dives),
      actions: [
        ...dives.map(s => ({ label: s.entryLabel || `▶️ ${s.title}`, trigger: `dv:ai:dive:${s.id}:0`, variant: 'primary' })),
        { label: '✨ More AI queries', trigger: 'dv:ai:menu', variant: 'primary' },
      ],
    }
  }

  // ── Deep-dive turn ──
  if (sub === 'dive') {
    const scenarioId = args[0]
    const turnIndex = Number(args[1] || 0) || 0
    const turn = runDeepDiveTurn(scenarioId, turnIndex)
    if (!turn) {
      return {
        text: `That scenario is not available.`,
        actions: [{ label: '🧠 Deep-dive list', trigger: 'dv:ai:dives', variant: 'primary' }],
      }
    }
    const html = aiResultCardHtml({
      question: turn.question,
      sql: turn.sql,
      result: turn.result,
      insight: turn.insight,
      persona: turn.persona,
      preview: (turn.result || []).length > 5,
      deepDive: { turnIndex: turn.turnIndex, totalTurns: turn.totalTurns, title: turn.title },
    })

    const actions = []
    if (!turn.isLastTurn && turn.followup) {
      actions.push({
        label: `❓ ${turn.followup.length > 56 ? turn.followup.slice(0, 54) + '…' : turn.followup}`,
        trigger: `dv:ai:dive:${scenarioId}:${turnIndex + 1}`,
        variant: 'primary',
      })
    }
    actions.push({ label: '🔄 Show SQL',         trigger: `dv:ai:dive_sql:${scenarioId}:${turnIndex}`, variant: 'primary' })
    if ((turn.result || []).length > 5) {
      actions.push({ label: '📋 Open full table', trigger: `dv:ai:dive_full:${scenarioId}:${turnIndex}`, variant: 'primary' })
    }
    if (turn.isLastTurn) {
      actions.push({ label: '✨ More AI queries', trigger: 'dv:ai:menu', variant: 'primary' })
      actions.push({ label: '🏠 DigiVritti home', trigger: 'dv:start',  variant: 'primary' })
    }

    const completionBanner = turn.isLastTurn
      ? `<div style="margin-top:8px;background:${C.successBg};color:${C.successText};border:1px solid ${C.success};border-radius:10px;padding:10px 12px;font-family:${C.font};font-size:12px;font-weight:600;letter-spacing:0.2px">${turn.completion || '✅ Analysis Complete'}</div>`
      : ''

    return {
      text: '',
      html: html + completionBanner,
      actions,
      progress: ['Continuing the analysis…'],
      userBubble: turn.question,
    }
  }

  // ── Deep-dive SQL toggle ──
  if (sub === 'dive_sql') {
    const scenarioId = args[0]
    const turnIndex = Number(args[1] || 0) || 0
    const turn = runDeepDiveTurn(scenarioId, turnIndex)
    if (!turn) return null
    const html = aiResultCardHtml({
      question: turn.question,
      sql: turn.sql,
      result: turn.result,
      insight: turn.insight,
      persona: turn.persona,
      showSql: true,
      preview: (turn.result || []).length > 5,
      deepDive: { turnIndex: turn.turnIndex, totalTurns: turn.totalTurns, title: turn.title },
    })
    return {
      text: '',
      html,
      actions: [
        { label: '👁 Hide SQL', trigger: `dv:ai:dive:${scenarioId}:${turnIndex}`, variant: 'primary' },
        { label: '🧠 Deep-dive list', trigger: 'dv:ai:dives', variant: 'primary' },
      ],
    }
  }

  // ── Deep-dive full table in canvas ──
  if (sub === 'dive_full') {
    const scenarioId = args[0]
    const turnIndex = Number(args[1] || 0) || 0
    return {
      text: `📋 Opening the full deep-dive table…`,
      openCanvas: {
        type: 'digivritti',
        view: 'ai-deep-dive',
        scenarioId,
        turnIndex,
      },
    }
  }

  return null
}

// ── Canvas directives ───────────────────────────────────────────────────────
// `dv:canvas:<view>[:<arg>]` opens an embedded canvas inside SwiftChat.
//   list[:nl|ns]      → application list, optional scheme filter
//   apply:nl|ns       → new application form for selected scheme
//   edit:<appId>      → fix-and-resubmit form pre-filled with the rejected app
function canvasDirective(rest) {
  // `rest` preserves original case (passed in from dispatchDigiVritti) so
  // application IDs like NS2025GJ0011 reach the canvas un-mangled.
  const parts = rest.split(':')
  const view = (parts[0] || '').toLowerCase()
  const arg  = parts.slice(1).join(':') || ''

  if (view === 'list') {
    const argLower = arg.toLowerCase()
    // Status-bucket filter: list:rejected, list:pending, list:approved,
    // list:resubmitted, list:draft. Otherwise treat the arg as a scheme code.
    const STATUS_FILTERS = ['rejected', 'pending', 'approved', 'resubmitted', 'draft']
    const filter = STATUS_FILTERS.includes(argLower) ? argLower : 'all'
    const scheme = argLower === 'nl' ? 'namo_lakshmi'
      : argLower === 'ns' ? 'namo_saraswati'
      : 'all'
    const filterLabel = filter !== 'all' ? ` · ${filter}` : ''
    return {
      text: `📋 Opening your DigiVritti application list${filterLabel}…`,
      openCanvas: { type: 'digivritti', view: 'list', scheme, filter },
    }
  }
  if (view === 'apply') {
    const scheme = arg.toLowerCase() === 'ns' ? 'namo_saraswati' : 'namo_lakshmi'
    return {
      text: `📝 Opening the ${scheme === 'namo_saraswati' ? 'Namo Saraswati' : 'Namo Lakshmi'} application form…`,
      openCanvas: { type: 'digivritti', view: 'apply', scheme },
    }
  }
  if (view === 'edit') {
    // Display ID in canonical upper-case but pass through unchanged for lookup.
    return {
      text: `✏️ Opening edit form for ${arg.toUpperCase()}…`,
      openCanvas: { type: 'digivritti', view: 'edit', appId: arg },
    }
  }
  if (view === 'student-select') {
    const scheme = arg.toLowerCase() === 'ns' ? 'namo_saraswati' : 'namo_lakshmi'
    const schemeShort = scheme === 'namo_saraswati' ? 'Namo Saraswati' : 'Namo Lakshmi'
    return {
      text: `Sure. I'll help you create a ${schemeShort} application. Please select a student.`,
      openCanvas: { type: 'digivritti', view: 'student-select', scheme },
    }
  }
  if (view === 'opt-out') {
    return {
      text: `Select the student who does not want to apply for the scholarship. You'll need a declaration PDF.`,
      openCanvas: { type: 'digivritti', view: 'opt-out' },
    }
  }
  if (view === 'review') {
    if (arg && arg.match(/^[A-Z]{2}\d{4}/i)) {
      return {
        text: `🔍 Opening application ${arg.toUpperCase()} for review…`,
        openCanvas: { type: 'digivritti', view: 'review', appId: arg, cluster: 'MADHAPAR' },
      }
    }
    const filter = arg.toLowerCase() === 'resub' ? 'resubmitted' : null
    return {
      text: `📋 Opening your cluster review queue…`,
      openCanvas: { type: 'digivritti', view: 'review', cluster: 'MADHAPAR', filter },
    }
  }
  if (view === 'payment-queue') {
    const filter = ['pending', 'failed', 'success', 'all'].includes(arg.toLowerCase()) ? arg.toLowerCase() : 'pending'
    return {
      text: `🏦 Opening payment queue (${filter})…`,
      openCanvas: { type: 'digivritti', view: 'payment-queue', filter },
    }
  }
  if (view === 'analytics') {
    return {
      text: `🧠 Opening DigiVritti analytics…`,
      openCanvas: { type: 'digivritti', view: 'analytics', queryId: arg || 'backlog' },
    }
  }
  return null
}

// ── Top-level dispatcher ────────────────────────────────────────────────────
export function isDigiVrittiTrigger(text) {
  if (!text) return false
  const q = text.toLowerCase().trim()
  if (q.startsWith('dv:')) return true
  if (q === 'task: digivritti' || q === 'task:digivritti' || q === 'digivritti' || q === 'digi vritti' || q === 'scholarships') return true
  // Namo Laxmi (parent module: DigiVritti) — re-route via DigiVritti hub.
  if (q === 'task: namo_laxmi' || q === 'task:namo_laxmi') return true
  return false
}

export function dispatchDigiVritti(text, role, profile) {
  const original = (text || '').trim()
  const q = original.toLowerCase()

  // Entry — open DigiVritti based on role.
  if (q === 'task: digivritti' || q === 'task:digivritti' || q === 'digivritti' || q === 'digi vritti' || q === 'scholarships' || q === 'dv:start') {
    return welcome(role, profile)
  }
  // Scheme home — used by the Namo Laxmi quick-action tile.
  if (q === 'dv:nl:home' || q === 'task: namo_laxmi' || q === 'task:namo_laxmi') {
    return teacherSchemeHome('namo_lakshmi', profile)
  }
  if (q === 'dv:ns:home') {
    return teacherSchemeHome('namo_saraswati', profile)
  }
  if (!q.startsWith('dv:')) return null

  // Use lowercase for the routing prefix, but preserve the original-case `rest`
  // so downstream args (notably appIds like NS2025GJ0011) survive intact.
  const lowerParts = q.split(':')
  const origParts  = original.split(':')
  const arena = lowerParts[1]
  const rest  = origParts.slice(2).join(':')
  const restLower = lowerParts.slice(2).join(':')

  // Canvas directives — common to all teacher-style flows.
  if (arena === 'canvas') return canvasDirective(rest)

  // Unified AI assistant.
  if (arena === 'ai') return aiDirective(rest, role, profile)

  // Legacy AI entry points → redirect to the role-aware unified flow.
  // - dv:t:ai      → Teacher AI menu
  // - dv:a:ai      → CRC / Cluster Approver AI menu
  // - dv:d:ai      → DEO AI menu
  // - dv:s:ai      → State / PFMS AI menu (handled per role)
  // - dv:p:ai      → PFMS AI menu (alias)
  // - dv:pr:ai     → Principal AI menu (alias)
  if (restLower === 'ai') {
    if (arena === 't')  return aiDirective('menu', 'teacher',         profile)
    if (arena === 'a')  return aiDirective('menu', role === 'principal' ? 'principal' : 'crc', profile)
    if (arena === 'd')  return aiDirective('menu', 'deo',             profile)
    if (arena === 's')  return aiDirective('menu', role === 'pfms' ? 'pfms' : 'state_secretary', profile)
    if (arena === 'p')  return aiDirective('menu', 'pfms',            profile)
    if (arena === 'pr') return aiDirective('menu', 'principal',       profile)
  }

  // Teacher
  if (arena === 't') {
    if (restLower.startsWith('nl:')) return teacherNL(restLower.slice(3))
    if (restLower.startsWith('ns:')) return teacherNS(restLower.slice(3))
    return teacherSimple(restLower)
  }
  if (arena === 'a') return approver(restLower)
  if (arena === 'd') return district(restLower)
  if (arena === 's') return state(restLower)
  return null
}
