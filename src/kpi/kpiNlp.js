// ─────────────────────────────────────────────────────────────────────────────
// KPI NLP — registers KPI-specific intents with the action registry,
// local-pattern table, and module registry.
// Imported by aiBootstrap so registrations happen at app boot.
//
// Registration strategy (adapted to the project's conventions):
//   • actionRegistry.js exports ACTIONS (plain mutable object keyed by id).
//     No registerAction() helper exists — we inject entries directly.
//   • localPatterns.js exports PATTERNS (mutable array).
//     We push KPI pattern rows so matchLocalIntent() picks them up.
//   • moduleRegistry.js exports MODULES (array) and MODULE_BY_ID (object).
//     permissionGuard.canRoleUseAction checks action.module → must exist.
//     We push the 'kpi' module entry so the guard resolves correctly.
//
// run() return shapes used here (matching existing project conventions):
//   { reply:  { html } }                          — inline bot bubble
//   { canvas: { type, context? } }                — open a canvas
//   { trigger: '<chat-id>' }                      — route to a chat
// ─────────────────────────────────────────────────────────────────────────────
import { ACTIONS } from '../nlp/actionRegistry.js'
import { PATTERNS } from '../nlp/localPatterns.js'
import { MODULES, MODULE_BY_ID } from '../nlp/moduleRegistry.js'
import {
  prioritise, pickHero, computeOverallScore, getComputedKpis,
} from './kpiEngine.js'
import { resolveDrilldown } from './kpiActions.js'

const ALL_KPI_ROLES = ['teacher', 'principal', 'crc', 'beo', 'state_secretary', 'parent', 'pfms']

// ─── Register the 'kpi' module so permissionGuard resolves correctly ─────────
const KPI_MODULE = {
  id: 'kpi',
  label: 'KPI Report Card',
  aliases: [
    'kpi', 'report card', 'my report card', 'kpi score', 'kpi summary',
    'worst kpi', 'bottom kpi', 'kpi rank', 'overall score',
  ],
  allowedRoles: ALL_KPI_ROLES,
  actions: [
    'KPI_RANK_WORST', 'KPI_COMPARE_PEER', 'KPI_FIX_FIRST',
    'KPI_OPEN_REPORT_CARD', 'KPI_SUMMARY',
  ],
  canvasView: { type: 'report_card' },
  fallbackPrompt: 'Would you like your KPI summary, worst KPIs, or to open your report card?',
}

if (!MODULE_BY_ID.kpi) {
  MODULES.push(KPI_MODULE)
  MODULE_BY_ID.kpi = KPI_MODULE
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

function pillColor(status) {
  if (status === 'red') return '#b91c1c'
  if (status === 'yellow') return '#92400e'
  return '#065f46'
}

function unitSuffix(kpi) {
  if (kpi.unit === '%') return '%'
  if (kpi.unit === 'hours') return ' hrs'
  return ''
}

function rankCardHtml(title, items) {
  const rows = items.map(c => `
    <li style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #eef2f7">
      <div style="min-width:0">
        <div style="font-weight:700;font-size:12px;color:#0f172a">${escapeHtml(c.kpi.shortName)}</div>
        <div style="font-size:11px;color:#64748b">${escapeHtml(c.reason)}</div>
      </div>
      <div style="font-weight:800;font-size:12px;color:${pillColor(c.status)};white-space:nowrap">${c.value}${unitSuffix(c.kpi)}</div>
    </li>
  `).join('')
  return `
    <div style="border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;background:#fff">
      <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#475569">${escapeHtml(title)}</div>
      <ul style="margin:8px 0 0;padding:0;list-style:none">${rows}</ul>
    </div>`
}

// ─── Action definitions ───────────────────────────────────────────────────────

const KPI_ACTIONS = {
  KPI_RANK_WORST: {
    id: 'KPI_RANK_WORST',
    module: 'kpi',
    label: 'Show worst KPIs',
    allowedRoles: ALL_KPI_ROLES,
    requiredEntities: [],
    requiresConfirmation: false,
    run({ role, profile }) {
      const top = prioritise(role, profile, 5)
      return {
        reply: { html: rankCardHtml('Top 5 pulling your score down', top) },
      }
    },
  },

  KPI_COMPARE_PEER: {
    id: 'KPI_COMPARE_PEER',
    module: 'kpi',
    label: 'Compare KPIs to benchmark',
    allowedRoles: ALL_KPI_ROLES,
    requiredEntities: [],
    requiresConfirmation: false,
    run({ role, profile }) {
      const items = getComputedKpis(role, profile)
        .filter(c => c.benchmark != null)
        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
        .slice(0, 6)
      return {
        reply: { html: rankCardHtml('You vs benchmark — biggest gaps first', items) },
      }
    },
  },

  KPI_FIX_FIRST: {
    id: 'KPI_FIX_FIRST',
    module: 'kpi',
    label: 'First KPI action',
    allowedRoles: ALL_KPI_ROLES,
    requiredEntities: [],
    requiresConfirmation: false,
    run({ role, profile }) {
      const hero = pickHero(role, profile)
      if (!hero) {
        return { reply: { html: 'You have no KPIs to act on right now.' } }
      }
      const dd = resolveDrilldown(hero.kpi.id, role, profile)
      if (!dd) {
        return { reply: { html: `Focus on: <strong>${escapeHtml(hero.kpi.shortName)}</strong>` } }
      }
      if (dd.kind === 'canvas') {
        return { canvas: { type: dd.canvasType, ...dd.canvasContext } }
      }
      // dd.kind === 'chat'
      return { trigger: dd.chatId }
    },
  },

  KPI_OPEN_REPORT_CARD: {
    id: 'KPI_OPEN_REPORT_CARD',
    module: 'kpi',
    label: 'Open KPI report card',
    allowedRoles: ALL_KPI_ROLES,
    requiredEntities: [],
    requiresConfirmation: false,
    run() {
      return { canvas: { type: 'report_card' } }
    },
  },

  KPI_SUMMARY: {
    id: 'KPI_SUMMARY',
    module: 'kpi',
    label: 'KPI summary',
    allowedRoles: ALL_KPI_ROLES,
    requiredEntities: [],
    requiresConfirmation: false,
    run({ role, profile }) {
      const s = computeOverallScore(role, profile)
      const html = `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;background:#fff">
          <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#475569">Report card summary</div>
          <div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:6px">${s.score ?? '—'} <span style="font-size:12px;color:#64748b;font-weight:600">/ 100</span></div>
          <div style="font-size:12px;color:#475569;margin-top:4px">
            <span style="color:#b91c1c;font-weight:700">${s.counts.red} red</span> ·
            <span style="color:#92400e;font-weight:700">${s.counts.yellow} yellow</span> ·
            <span style="color:#065f46;font-weight:700">${s.counts.green} green</span>
          </div>
        </div>`
      return { reply: { html } }
    },
  },
}

// Inject into the global ACTIONS map (side-effect — happens once at import).
for (const [id, action] of Object.entries(KPI_ACTIONS)) {
  if (!ACTIONS[id]) {
    ACTIONS[id] = action
  }
}

// ─── Inject KPI patterns into the global PATTERNS array ──────────────────────
// Prepended so they are checked before the generic 'report card' / 'dashboard'
// patterns that already exist further down the list.
const KPI_PATTERNS = [
  // KPI_RANK_WORST
  { match: /which kpi.*(drag|pull|drop).*(me|score)? down/i,        action: 'KPI_RANK_WORST' },
  { match: /what.*(pulling|dragging).*(me|score) down/i,            action: 'KPI_RANK_WORST' },
  { match: /\bworst kpi\b/i,                                        action: 'KPI_RANK_WORST' },
  { match: /\bbottom (3|five|three|5)\b/i,                          action: 'KPI_RANK_WORST' },

  // KPI_COMPARE_PEER
  { match: /compare.*(state|school|cluster|block)/i,                action: 'KPI_COMPARE_PEER' },
  { match: /how (do|am) i compar/i,                                 action: 'KPI_COMPARE_PEER' },
  { match: /vs (state|school|cluster|block)/i,                      action: 'KPI_COMPARE_PEER' },

  // KPI_FIX_FIRST
  { match: /(what.*(fix|do) first)|where.*start/i,                  action: 'KPI_FIX_FIRST' },
  { match: /first action/i,                                         action: 'KPI_FIX_FIRST' },
  { match: /priority action/i,                                      action: 'KPI_FIX_FIRST' },

  // KPI_OPEN_REPORT_CARD (more specific than the existing OPEN_REPORT_CARD row)
  { match: /(open|show).*(full kpi|all kpi)/i,                      action: 'KPI_OPEN_REPORT_CARD' },
  { match: /\bmy report card\b/i,                                   action: 'KPI_OPEN_REPORT_CARD' },

  // KPI_SUMMARY
  { match: /\b(summari[sz]e|overview).*(report card|kpi|score)/i,   action: 'KPI_SUMMARY' },
  { match: /how.*(am|is).*(my|the) (score|report card)/i,           action: 'KPI_SUMMARY' },
  { match: /\bkpi (score|summary|overview)\b/i,                     action: 'KPI_SUMMARY' },
]

// Prepend so KPI patterns take priority over existing generic patterns.
PATTERNS.unshift(...KPI_PATTERNS)
