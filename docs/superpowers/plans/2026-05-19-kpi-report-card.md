# KPI Report Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bot-tile home with a role-aware KPI report card (top-priority hero + 3 compact tiles + slim Apps strip), full-domain canvas, and per-KPI drill-down chat flow.

**Architecture:** A new `src/kpi/` subsystem (catalog + engine + data + actions + nlp) feeds new components (`KpiTile`, `KpiInsightCard`, `ReportCardSection`, `KpiBotStrip`, `ReportCardCanvas`). Existing canvases pick up an optional `filter`/`view` prop. SuperHomePage swaps its bot-tile block for `<ReportCardSection /> + <KpiBotStrip />`. DEO keeps the legacy home unchanged.

**Tech Stack:** React 18, Vite, Tailwind, `lucide-react`. No new deps. Pure-function tests via Node `.test.mjs` scripts (existing harness pattern); UI verified manually via `npm run dev`.

**Spec:** [docs/superpowers/specs/2026-05-19-kpi-report-card-design.md](../specs/2026-05-19-kpi-report-card-design.md)

**Source of truth for KPIs:** `Gujarat VSK 6A KPI Framework Enhanced.xlsx` (35 KPIs across A1–A6 + District) + 5 parent-scoped KPIs we define.

---

## File map

### New files
| Path | Responsibility |
|---|---|
| `src/kpi/kpiCatalog.js` | All 35 doc KPIs + 5 parent KPIs as declarative entries with `roles[]`, `domain`, `benchmarkSource`, `statusBands`, `drilldown`, `reasonBuilder`, etc. |
| `src/kpi/kpiData.js` | `KPI_VALUES[role]` and `BENCHMARKS.{state_avg,cluster_avg,school_avg,fixed_target}` mock fixtures. |
| `src/kpi/kpiEngine.js` | `getKpisForRole`, `computeStatus`, `computeKpi`, `prioritise`, `computeOverallScore`. |
| `src/kpi/kpiActions.js` | `resolveDrilldown(kpiId, role, profile)` → discriminated union `{kind:'canvas',...}` ∣ `{kind:'chat',...}`. |
| `src/kpi/kpiNlp.js` | Registers 5 KPI intents with `actionRegistry`. |
| `src/kpi/__tests__/kpiEngine.test.mjs` | Engine unit tests. |
| `src/kpi/__tests__/kpiCatalog.test.mjs` | Catalog schema/count tests. |
| `src/components/kpi/KpiTile.jsx` | `variant='hero' | 'compact'` tile. |
| `src/components/kpi/KpiInsightCard.jsx` | Chat-thread KPI breakdown card. |
| `src/components/kpi/KpiBotStrip.jsx` | Slim 5-bot "Apps" strip. |
| `src/components/kpi/ReportCardSection.jsx` | Home section: hero + 3 compact + "See all N ›". |
| `src/canvas/modules/ReportCardCanvas.jsx` | Full canvas grouped by 6A domain + overall score. |

### Modified files
| Path | Change |
|---|---|
| `src/roles/roleConfig.js` | Add `beo` role to LABELS/SCOPES/BOTS/SUGGESTIONS/CANVASES/NOTIFICATION_PERMISSIONS/ROLE_PERMISSIONS; add `report_card` to all ROLE_CANVASES except DEO. |
| `src/data/mockData.js` | Add `USER_PROFILES.beo` and a `DEMO_SSO_USERS` BEO entry. |
| `src/App.jsx` | Add `'kpi'` to `CHAT_IDS`. |
| `src/pages/ChatPage.jsx` | If `chatId === 'kpi'` and chat is empty, seed an initial `kpi_insight` message from the active chat's `toolState.kpiId`. |
| `src/components/ChatBubble.jsx` | Add `message.kind === 'kpi_insight'` branch → render `<KpiInsightCard />`. |
| `src/canvas/CanvasPanel.jsx` | Register `report_card → ReportCardCanvas` + a MODULE_META entry. |
| `src/canvas/modules/AttendanceCanvas.jsx` | Accept optional `filter` from `canvasContext`; layer over existing defaults (~5 lines). |
| `src/canvas/modules/AtRiskStudentsCanvas.jsx` | Same — `filter` prop (~5 lines). |
| `src/canvas/modules/DigiVrittiCanvas.jsx` | Accept optional `view`/`status` prefilter (~10 lines). |
| `src/canvas/modules/ReportCanvas.jsx` | Accept optional `filter`/`view` prop (~5 lines). |
| `src/pages/SuperHomePage.jsx` | Replace the `ROLE_BOTS[role]`-driven tile block with `<ReportCardSection />` + `<KpiBotStrip />`. DEO short-circuits to keep existing layout. |
| `src/nlp/aiBootstrap.js` | Import `./kpi/kpiNlp` so its intents register on app boot. |

---

## Test strategy

- **Pure logic** (catalog, engine, actions): Node `.test.mjs` scripts following the existing `src/nlp/__tests__/intentRouter.test.mjs` pattern.
- **UI components** (KpiTile, KpiInsightCard, ReportCardSection, etc.): manual verification through `npm run dev`. Each UI task ends with explicit steps to switch role and visually confirm.
- **Integration** (drill-down click → chat → canvas): manual end-to-end at Task 25.

All `.test.mjs` files are run via `node` directly — no test runner setup. The plan never asks you to run a runner that isn't installed.

---

## Task 1: Add BEO role (Block Education Officer)

**Files:**
- Modify: `src/roles/roleConfig.js` — add `beo` to all role-keyed exports.
- Modify: `src/data/mockData.js` — add `USER_PROFILES.beo` + a `DEMO_SSO_USERS` entry.

- [ ] **Step 1: Add `beo` to `ROLE_LABELS`, `ROLE_SCOPES`, `ROLE_BOTS`, `ROLE_SUGGESTIONS`, `ROLE_CANVASES`, `NOTIFICATION_PERMISSIONS`, `ROLE_PERMISSIONS`.**

Open `src/roles/roleConfig.js`. After each existing role-keyed object, insert a `beo:` entry. Concrete content:

```js
// In ROLE_LABELS (after pfms):
  beo: 'BEO · Block Education Officer',

// In ROLE_SCOPES (after pfms):
  beo: 'Block',

// In ROLE_BOTS (after pfms):
  beo: [
    'VSK Gujarat',
    'Block Analyst',
    'School Monitor',
    'Intervention Bot',
    'Compliance Bot',
  ],

// In ROLE_SUGGESTIONS (after pfms):
  beo: [
    'Block attendance summary',
    'Schools below benchmark',
    'Compare clusters in my block',
    'Pending grievances in block',
    'GSQAC scores — block view',
    'Open my full report card',
    'What should I fix first?',
  ],

// In ROLE_CANVASES (after parent):
  beo: [
    'attendance', 'school_dashboard', 'at_risk', 'parent_notify',
    'report_card', 'scholarship', 'learning_outcomes', 'war_room',
    'block_analysis',
  ],

// In NOTIFICATION_PERMISSIONS (after pfms):
  beo: { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true },

// In ROLE_PERMISSIONS (after pfms):
  beo: {
    canMarkAttendance: false,
    canViewAllStudents: true,
    canCreateContent: false,
    canViewDistrict: false,
    canViewState: false,
    canApproveScholarship: true,
    canViewTeacherData: true,
  },
```

- [ ] **Step 2: Add BEO profile + SSO entry to mockData.**

Open `src/data/mockData.js`.

In `DEMO_SSO_USERS` (around line 27), insert before the closing `]`:

```js
  { stateId: 'BEO5001', password: 'Demo@123', name: 'Hetal Vyas',   role: 'beo',             badge: 'BEO',             org: 'Mehsana Block Education Office', school: null,    district: 'Mehsana',   initials: 'HV', color: '#0F766E', emoji: '🏢', block: 'Mehsana' },
```

In `USER_PROFILES` (around line 378), after the `pfms:` entry's closing `},`, add:

```js
  beo: {
    name: 'Hetal Vyas', stateId: 'BEO5001', role: 'beo', badge: 'BEO',
    org: 'Mehsana Block Education Office', school: null,
    district: 'Mehsana', scope: 'Block — Mehsana', employeeId: 'EMP-GJ-BEO-001',
    phone: '9876547001', email: 'hetal.vyas@deo.gujarat.gov.in',
    dpdpaTier: 'Tier 3 — Official', sessionTTL: '12 hrs', lastLogin: '08/04/2026, 8:25 AM',
    tokenOrigin: 'Gujarat SSO (OIDC)', initials: 'HV', color: '#0F766E',
    block: 'Mehsana',
  },
```

- [ ] **Step 3: Manually verify BEO appears on the SSO screen.**

Run: `npm run dev`. Open the URL, go through login → SSO → Select State (Gujarat) → SSO Success. You should see Hetal Vyas / BEO in the picker, and tapping it should land on the home screen with the BEO bot list (VSK Gujarat / Block Analyst / etc.).

Expected: BEO is selectable; home renders without errors; ROLE_BOTS["beo"] is read without crashing.

- [ ] **Step 4: Commit.**

```bash
git add src/roles/roleConfig.js src/data/mockData.js
git commit -m "feat(roles): add BEO (Block Education Officer) role + profile"
```

---

## Task 2: KPI catalog — skeleton + A1 + A2

**Files:**
- Create: `src/kpi/kpiCatalog.js`

- [ ] **Step 1: Write the catalog file with the header, helpers, and A1 + A2 entries.**

Create `src/kpi/kpiCatalog.js`:

```js
// ─────────────────────────────────────────────────────────────────────────────
// KPI Catalog — declarative KPI definitions
//
// Source: Gujarat VSK 6A KPI Framework Enhanced (xlsx).
// Each entry is consumed by kpiEngine.js to compute status against benchmarks
// and by kpiActions.js to resolve the drill-down target.
//
// Entry shape (informal):
//   id:               'attendance_today'              // unique
//   framework:        'A1'                            // A1..A6 | District | Parent
//   domain:           'Attendance & Access'           // display group
//   shortName:        "Today's attendance"            // tile label
//   description:      '...'                           // full doc definition
//   roles:            ['teacher', 'principal', ...]   // who sees this KPI
//   unit:             '%' | 'count' | 'hours' | 'score' | 'currency'
//   direction:        'higher' | 'lower'              // higher-is-better (default) or lower-is-better
//   benchmarkSource:  'state_avg' | 'cluster_avg' | 'school_avg' | 'fixed_target' | 'absolute'
//   fixedTarget:      number | null                   // populated for fixed_target
//   statusBands:      { green, yellow }               // delta thresholds (vs benchmark)
//                       For benchmarkSource === 'absolute': interpreted as raw value bands.
//   dataSource:       'Smart Attendance System (OAS)'  // from xlsx
//   sourceDashboard:  'Attendance Live Dashboard (VSK)' // from xlsx
//   drilldown:        { kind: 'canvas', canvasType, canvasContext } |
//                     { kind: 'chat', botId }          // resolved by kpiActions
//   ctaLabel:         'Mark attendance now'           // CTA button label
//   reasonBuilder:    ({ value, benchmark, delta, meta }) => string
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DOC_ROLES = ['teacher', 'principal', 'crc', 'beo', 'state_secretary']
const FROM_PRINCIPAL = ['principal', 'crc', 'beo', 'state_secretary']
const BLOCK_AND_STATE = ['beo', 'state_secretary']
const PRINCIPAL_BLOCK_STATE = ['principal', 'beo', 'state_secretary']

export const KPI_CATALOG = [
  // ─── A1: Attendance & Access ───────────────────────────────────────────────
  {
    id: 'attendance_today',
    framework: 'A1', domain: 'Attendance & Access',
    shortName: "Today's attendance",
    description: 'Daily student attendance rate, calculated as students present ÷ students enrolled × 100. Class-level data rolled up to school/cluster/block/state averages.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Smart Attendance System (OAS)',
    sourceDashboard: 'Attendance Live Dashboard (VSK)',
    drilldown: { kind: 'canvas', canvasType: 'attendance', canvasContext: { filter: 'unmarked' } },
    ctaLabel: 'Mark attendance now',
    reasonBuilder: ({ delta, meta }) =>
      (meta?.unmarked ? `${meta.unmarked} students unmarked. ` : '') +
      `${Math.abs(delta).toFixed(0)} pts below state average.`,
  },
  {
    id: 'chronic_absentees',
    framework: 'A1', domain: 'Attendance & Access',
    shortName: 'Chronic absentees',
    description: 'Students absent >7 consecutive days or >30% of school days in a month. Used for early intervention and home-visit prioritisation.',
    roles: ALL_DOC_ROLES,
    unit: 'count', direction: 'lower',
    benchmarkSource: 'school_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -2 },
    dataSource: 'Child Tracking System (CTS) + EWS',
    sourceDashboard: 'EWS Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'chronic_absent', minDays: 7 } },
    ctaLabel: 'Open chronic absentees list',
    reasonBuilder: ({ value, meta }) =>
      `${value} students absent >7 days. ${meta?.priorityCount ? `${meta.priorityCount} require immediate home visits.` : ''}`,
  },
  {
    id: 'schools_below_attendance_benchmark',
    framework: 'A1', domain: 'Attendance & Access',
    shortName: 'Schools below benchmark',
    description: 'Count of schools where average student attendance falls below the defined state benchmark (e.g. <75% or <50%).',
    roles: FROM_PRINCIPAL,
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 5 },
    dataSource: 'Smart Attendance System (OAS)',
    sourceDashboard: 'Attendance Live Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'schools_below_benchmark' } },
    ctaLabel: 'Open school list',
    reasonBuilder: ({ value }) => `${value} schools currently below benchmark.`,
  },
  {
    id: 'attendance_reporting_compliance',
    framework: 'A1', domain: 'Attendance & Access',
    shortName: 'Reporting compliance',
    description: 'Percentage of schools that submitted attendance data on the current day by the defined cut-off.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -5 },
    dataSource: 'Smart Attendance System (OAS) — submission logs',
    sourceDashboard: 'Attendance Live Dashboard — Reporting Compliance View',
    drilldown: { kind: 'canvas', canvasType: 'attendance', canvasContext: { filter: 'non_submitting' } },
    ctaLabel: 'See non-reporting schools',
    reasonBuilder: ({ value, benchmark, delta }) =>
      delta < 0 ? `${Math.abs(delta).toFixed(0)} pts below state average (${benchmark}%).` : 'On par with state average.',
  },
  {
    id: 'ews_followup_completed',
    framework: 'A1', domain: 'Attendance & Access',
    shortName: 'EWS follow-up',
    description: 'Percentage of EWS-flagged at-risk students for whom a follow-up action (home visit, counsellor call) has been completed and logged.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'EWS — flagged list + action logs',
    sourceDashboard: 'EWS Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'ews_pending_followup' } },
    ctaLabel: 'Review pending follow-ups',
    reasonBuilder: ({ meta }) => `${meta?.pendingCount ?? 0} flagged students without follow-up.`,
  },

  // ─── A2: Assessment & Learning Outcomes ────────────────────────────────────
  {
    id: 'assessment_participation',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Participation %',
    description: 'Percentage of enrolled students who appeared in the scheduled PAT/SAT.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -5 },
    dataSource: 'Xamta App (PAT/SAT digitisation)',
    sourceDashboard: 'Xamta Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'assessment_absent' } },
    ctaLabel: 'See absent students',
    reasonBuilder: ({ meta }) => `${meta?.absentCount ?? 0} students missed the last assessment.`,
  },
  {
    id: 'proficiency',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Proficiency %',
    description: 'Percentage of students at or above the defined proficiency threshold in the most recent assessment cycle, aligned to PARAKH benchmarks.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Xamta App + PARAKH',
    sourceDashboard: 'Gyan Prabhav Reports',
    drilldown: { kind: 'canvas', canvasType: 'class-report', canvasContext: { view: 'proficiency_breakdown' } },
    ctaLabel: 'Open proficiency report',
    reasonBuilder: ({ delta }) => `${Math.abs(delta).toFixed(0)} pts below state average.`,
  },
  {
    id: 'students_below_proficiency',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Below proficiency',
    description: 'Percentage of assessed students scoring below the defined proficiency level (e.g., <40%). Segmented into score buckets for targeted intervention.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'lower',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Xamta App + Gyan Prabhav',
    sourceDashboard: 'Gyan Prabhav Analytics',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'below_proficiency', threshold: 40 } },
    ctaLabel: 'Plan intervention',
    reasonBuilder: ({ meta }) => `${meta?.studentCount ?? 0} students below proficiency. ${meta?.priorityCount ? `${meta.priorityCount} need urgent support.` : ''}`,
  },
  {
    id: 'student_improvement_delta',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Improvement (Δ)',
    description: 'Percentage-point change in average score between two consecutive PAT/SAT cycles.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -3 },
    dataSource: 'Xamta App + Gyan Prabhav',
    sourceDashboard: 'Gyan Prabhav (Phase 3 Progression View)',
    drilldown: { kind: 'canvas', canvasType: 'class-report', canvasContext: { view: 'progression' } },
    ctaLabel: 'Open progression view',
    reasonBuilder: ({ value }) => value >= 0 ? `+${value.toFixed(1)} pp improvement cycle-on-cycle.` : `${value.toFixed(1)} pp regression cycle-on-cycle.`,
  },
  {
    id: 'orf_fln_improvement',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'ORF / FLN improvement',
    description: 'Student-level improvement in Oral Reading Fluency (wpm) and Foundational Literacy & Numeracy levels across cycles.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -3 },
    dataSource: 'Vaachan Samiksha + Xamta',
    sourceDashboard: 'Vaachan Samiksha Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'class-report', canvasContext: { view: 'fln' } },
    ctaLabel: 'See FLN breakdown',
    reasonBuilder: ({ value }) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} pp vs last cycle.`,
  },
  {
    id: 'reports_generated_downloaded',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Reports downloaded',
    description: 'Percentage of schools where Gyan Prabhav student report cards have been generated and downloaded by the teacher/principal within the reporting window.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Gyan Prabhav — download logs',
    sourceDashboard: 'Gyan Prabhav Dashboard — Report Timeliness & Usage',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { filter: 'pending_downloads' } },
    ctaLabel: 'Open pending downloads',
    reasonBuilder: ({ meta }) => `${meta?.pendingSchools ?? 0} schools have not downloaded reports yet.`,
  },

  // (A3-A6 + District + Parent entries appended in Tasks 3 and 4.)
]

// Returns the catalog filtered to a single role.
export function getCatalogForRole(role) {
  return KPI_CATALOG.filter(k => k.roles.includes(role))
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiCatalog.js
git commit -m "feat(kpi): catalog skeleton + A1 (Attendance) + A2 (Assessment) entries"
```

---

## Task 3: KPI catalog — A3, A4, A5, A6

**Files:**
- Modify: `src/kpi/kpiCatalog.js`

- [ ] **Step 1: Append A3, A4, A5, A6 entries to the `KPI_CATALOG` array.**

In `src/kpi/kpiCatalog.js`, replace the comment line `// (A3-A6 + District + Parent entries appended in Tasks 3 and 4.)` with the following entries (still inside `KPI_CATALOG`):

```js
  // ─── A3: Adaptive Learning & Remediation ──────────────────────────────────
  {
    id: 'student_module_completion',
    framework: 'A3', domain: 'Adaptive Learning & Remediation',
    shortName: 'Module completion',
    description: 'Percentage of students assigned a remediation/adaptive module on Swamulyankan or G-SHALA who have completed it.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Swamulyankan / G-SHALA',
    sourceDashboard: 'VSK Platform Analytics',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'module_incomplete' } },
    ctaLabel: 'See incomplete cohort',
    reasonBuilder: ({ meta }) => `${meta?.pendingStudents ?? 0} students yet to finish.`,
  },
  {
    id: 'tpd_hours',
    framework: 'A3', domain: 'Adaptive Learning & Remediation',
    shortName: 'TPD hours',
    description: 'Percentage of teachers who have completed the minimum 50 hours of Teacher Professional Development in the academic year.',
    roles: ALL_DOC_ROLES,
    unit: 'hours', direction: 'higher',
    benchmarkSource: 'fixed_target', fixedTarget: 50,
    statusBands: { green: 0, yellow: -15 },
    dataSource: 'Prashikshak / Shikshak Sahayak 2.0',
    sourceDashboard: 'Prashikshak Dashboard',
    drilldown: { kind: 'chat', botId: 'tmsg' },
    ctaLabel: 'Resume training',
    reasonBuilder: ({ value }) => `${value} of 50 hours logged.`,
  },
  {
    id: 'students_identified_remediation',
    framework: 'A3', domain: 'Adaptive Learning & Remediation',
    shortName: 'Identified for remediation',
    description: 'Percentage of students identified as requiring remedial support based on Xamta/PARAKH proficiency gap analysis.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -5 },
    dataSource: 'Xamta + PARAKH + Gyan Prabhav',
    sourceDashboard: 'Gyan Prabhav (Phase 2 Diagnostics)',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'identified_remediation' } },
    ctaLabel: 'Open list',
    reasonBuilder: ({ meta }) => `${meta?.identifiedCount ?? 0} students flagged.`,
  },
  {
    id: 'students_receiving_remediation',
    framework: 'A3', domain: 'Adaptive Learning & Remediation',
    shortName: 'Receiving remediation',
    description: 'Percentage of identified students actively enrolled in a remediation program.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Swamulyankan / G-SHALA + PLC logs',
    sourceDashboard: 'Swamulyankan Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'remediation_not_started' } },
    ctaLabel: 'Enrol pending students',
    reasonBuilder: ({ meta }) => `${meta?.notStarted ?? 0} identified students not yet enrolled.`,
  },
  {
    id: 'improvement_after_intervention',
    framework: 'A3', domain: 'Adaptive Learning & Remediation',
    shortName: 'Improvement post-intervention',
    description: 'Percentage of students showing ≥5 pp improvement in post-intervention assessments compared to baseline.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Xamta + Gyan Prabhav',
    sourceDashboard: 'Gyan Prabhav Progression View',
    drilldown: { kind: 'canvas', canvasType: 'class-report', canvasContext: { view: 'intervention_impact' } },
    ctaLabel: 'See impact report',
    reasonBuilder: ({ value }) => `${value.toFixed(0)}% of students improved post-intervention.`,
  },

  // ─── A4: Administration & Service Delivery ────────────────────────────────
  {
    id: 'scheme_beneficiary_mapping',
    framework: 'A4', domain: 'Administration & Service Delivery',
    shortName: 'Scheme mapping',
    description: 'Percentage of eligible students mapped to government schemes (Namo Lakshmi, Namo Saraswati, DigiVrtti, etc.).',
    roles: [...FROM_PRINCIPAL, 'pfms'],
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'PFMS / IPMS + UDISE+',
    sourceDashboard: 'IPMS / Namo Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'pending_mapping' } },
    ctaLabel: 'Open mapping queue',
    reasonBuilder: ({ meta }) => `${meta?.unmapped ?? 0} eligible students not yet mapped.`,
  },
  {
    id: 'payment_completion',
    framework: 'A4', domain: 'Administration & Service Delivery',
    shortName: 'Payment completion',
    description: 'Percentage of mapped beneficiaries whose payment has been successfully disbursed (not just approved) in the current cycle.',
    roles: [...FROM_PRINCIPAL, 'pfms'],
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'PFMS — payment status',
    sourceDashboard: 'PFMS Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'payment-queue', status: 'pending' } },
    ctaLabel: 'Open payment queue',
    reasonBuilder: ({ meta }) => `${meta?.pendingPayments ?? 0} payments pending disbursal.`,
  },
  {
    id: 'pending_payments_grievances',
    framework: 'A4', domain: 'Administration & Service Delivery',
    shortName: 'Pending payments + grievances',
    description: 'Total unresolved cases: payments past SLA, grievances raised via CAL, and ICT/infra issues logged.',
    roles: [...FROM_PRINCIPAL, 'pfms'],
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 10 },
    dataSource: 'PFMS + IPMS + CAL + ICT Support',
    sourceDashboard: 'CAL Dashboard + PFMS Backlog Report',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'payment-queue', status: 'failed' } },
    ctaLabel: 'Open backlog',
    reasonBuilder: ({ value }) => `${value} unresolved cases past SLA.`,
  },
  {
    id: 'issue_resolution_sla',
    framework: 'A4', domain: 'Administration & Service Delivery',
    shortName: 'Issue resolution % (SLA)',
    description: 'Percentage of grievances and service issues resolved within the defined SLA timeline.',
    roles: [...FROM_PRINCIPAL, 'pfms'],
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'CAL — resolution timestamps',
    sourceDashboard: 'CAL Dashboard — Resolution Tracking',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'grievances', status: 'open' } },
    ctaLabel: 'Open grievance queue',
    reasonBuilder: ({ meta }) => `${meta?.openOverdue ?? 0} grievances past SLA.`,
  },
  {
    id: 'repeat_pending_cases',
    framework: 'A4', domain: 'Administration & Service Delivery',
    shortName: 'Repeat pending cases',
    description: 'Count of cases logged more than once or reopened due to inadequate resolution.',
    roles: [...FROM_PRINCIPAL, 'pfms'],
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 5 },
    dataSource: 'CAL + PFMS',
    sourceDashboard: 'CAL Dashboard — Repeat Issues View',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'grievances', filter: 'repeat' } },
    ctaLabel: 'Open repeat issues',
    reasonBuilder: ({ value }) => `${value} repeat / reopened issues this cycle.`,
  },

  // ─── A5: Accreditation & School Quality ───────────────────────────────────
  {
    id: 'gsqac_score',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'GSQAC score',
    description: 'Composite school quality score under Gujarat School Quality Assessment and Accreditation Council framework.',
    roles: ALL_DOC_ROLES,
    unit: 'score', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'GSQAC',
    sourceDashboard: 'GSQAC Portal + Saksham Shala',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'gsqac' } },
    ctaLabel: 'Open GSQAC report',
    reasonBuilder: ({ value, benchmark }) => `Current score ${value} (state avg ${benchmark}).`,
  },
  {
    id: 'schools_meeting_quality_benchmark',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'Quality benchmark %',
    description: 'Percentage of schools that achieved A or B grade under GSQAC in the most recent cycle.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'GSQAC',
    sourceDashboard: 'VSK School Quality Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'gsqac_distribution' } },
    ctaLabel: 'Open quality view',
    reasonBuilder: ({ value }) => `${value}% schools at A/B grade.`,
  },
  {
    id: 'low_performing_schools',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'Low-performing schools',
    description: 'Count of schools rated C or D under GSQAC. These need targeted support.',
    roles: FROM_PRINCIPAL,
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 5 },
    dataSource: 'GSQAC + Saksham Shala',
    sourceDashboard: 'GSQAC Portal',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'low_performing_schools' } },
    ctaLabel: 'Open improvement plans',
    reasonBuilder: ({ value }) => `${value} schools at C/D grade.`,
  },
  {
    id: 'gsqac_improvement_cycles',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'GSQAC Δ across cycles',
    description: 'Percentage-point change in a school\'s GSQAC score between consecutive cycles.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -3 },
    dataSource: 'GSQAC + Saksham Shala',
    sourceDashboard: 'GSQAC Portal — Historical',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'gsqac_history' } },
    ctaLabel: 'Open historical view',
    reasonBuilder: ({ value }) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} pp cycle-on-cycle.`,
  },
  {
    id: 'improvement_actions_completed',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'Improvement actions',
    description: 'Percentage of improvement action points (assigned post-GSQAC) that the school has completed within timeframe.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'SMA + Saksham Shala',
    sourceDashboard: 'Saksham Shala (SS) Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'improvement_actions' } },
    ctaLabel: 'Open action tracker',
    reasonBuilder: ({ meta }) => `${meta?.openActions ?? 0} actions not yet closed.`,
  },

  // ─── A6: Governance, Monitoring & AI Efficiency ───────────────────────────
  {
    id: 'same_day_reporting',
    framework: 'A6', domain: 'Governance, Monitoring & AI Efficiency',
    shortName: 'Same-day reporting',
    description: 'Percentage of schools that submitted all required data (attendance, assessment completion, admin updates) by the same-day cut-off.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'VSK Backend Logs + Pocket VSK',
    sourceDashboard: 'VSK Dashboards — Data Timeliness',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'data_timeliness' } },
    ctaLabel: 'See late submitters',
    reasonBuilder: ({ meta }) => `${meta?.lateSubmitters ?? 0} schools missed same-day cut-off.`,
  },
  {
    id: 'dashboard_data_lag',
    framework: 'A6', domain: 'Governance, Monitoring & AI Efficiency',
    shortName: 'Dashboard lag (hrs)',
    description: 'Average time in hours between data entry at school/teacher level and visibility on VSK dashboards. Target ≤2 hrs.',
    roles: ALL_DOC_ROLES,
    unit: 'hours', direction: 'lower',
    benchmarkSource: 'fixed_target', fixedTarget: 2,
    statusBands: { green: 0, yellow: -2 },
    dataSource: 'VSK Backend System Logs',
    sourceDashboard: 'VSK System Performance Monitor',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'data_lag' } },
    ctaLabel: 'Open system monitor',
    reasonBuilder: ({ value }) => `${value} hrs average lag (target ≤2 hrs).`,
  },
  {
    id: 'pending_issues_cross_system',
    framework: 'A6', domain: 'Governance, Monitoring & AI Efficiency',
    shortName: 'Pending issues',
    description: 'Aggregate unresolved issues across attendance, assessment, grievances, ICT, and scheme backlogs past SLA.',
    roles: FROM_PRINCIPAL,
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 20 },
    dataSource: 'CAL + ICT Support + PFMS + SMA',
    sourceDashboard: 'VSK Integrated Monitoring Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'grievances', status: 'open' } },
    ctaLabel: 'Open integrated view',
    reasonBuilder: ({ value }) => `${value} unresolved issues across systems.`,
  },
  {
    id: 'repeat_issues_pct',
    framework: 'A6', domain: 'Governance, Monitoring & AI Efficiency',
    shortName: 'Repeat issues %',
    description: 'Percentage of issues that recurred after initial closure. High rate indicates root-cause failures.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'lower',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -5 },
    dataSource: 'CAL + SMA',
    sourceDashboard: 'CAL Dashboard — Repeat Issues View',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'grievances', filter: 'repeat' } },
    ctaLabel: 'Open repeat issues',
    reasonBuilder: ({ value }) => `${value}% of cases recurred.`,
  },
  {
    id: 'action_on_ews_flagged',
    framework: 'A6', domain: 'Governance, Monitoring & AI Efficiency',
    shortName: 'EWS action %',
    description: 'Percentage of EWS-flagged cases on which a documented follow-up action has been completed within SLA.',
    roles: FROM_PRINCIPAL,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'EWS + Gyan Prabhav + SMA',
    sourceDashboard: 'EWS Dashboard + Swiftee',
    drilldown: { kind: 'canvas', canvasType: 'at-risk-students', canvasContext: { filter: 'ews_pending_followup' } },
    ctaLabel: 'Open EWS queue',
    reasonBuilder: ({ meta }) => `${meta?.pendingCount ?? 0} EWS cases without action.`,
  },
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiCatalog.js
git commit -m "feat(kpi): A3 Remediation + A4 Admin + A5 Quality + A6 Governance entries"
```

---

## Task 4: KPI catalog — District + Parent

**Files:**
- Modify: `src/kpi/kpiCatalog.js`

- [ ] **Step 1: Append District-level (block + state only) and parent-scoped entries.**

After the `action_on_ews_flagged` entry, append:

```js
  // ─── District Level Tracking (Block + State only) ─────────────────────────
  {
    id: 'dropout_reduction',
    framework: 'District', domain: 'District Level Tracking',
    shortName: 'Dropout reduction',
    description: 'Year-on-year reduction in % of students who dropped out (enrolled previous year but not re-enrolled current year).',
    roles: BLOCK_AND_STATE,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -1 },
    dataSource: 'UDISE+ + CTS / Vidya Track',
    sourceDashboard: 'UDISE+ Annual Report',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'dropout' } },
    ctaLabel: 'Open dropout view',
    reasonBuilder: ({ value }) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} pp YoY change.`,
  },
  {
    id: 'reenrollment_vs_target',
    framework: 'District', domain: 'District Level Tracking',
    shortName: 'Re-enrollment vs target',
    description: 'Count of out-of-school children re-enrolled this year vs the block/state target.',
    roles: BLOCK_AND_STATE,
    unit: 'count', direction: 'higher',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: -50 },
    dataSource: 'CTS / Vidya Track',
    sourceDashboard: 'Vidya Track Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'reenrollment' } },
    ctaLabel: 'Open re-enrollment view',
    reasonBuilder: ({ value, meta }) => `${value} of ${meta?.target ?? '—'} target reached.`,
  },
  {
    id: 'samagra_shiksha_expenditure',
    framework: 'District', domain: 'District Level Tracking',
    shortName: 'Samagra Shiksha utilisation',
    description: 'Grant allocation received and actual expenditure incurred under Samagra Shiksha; includes fund utilisation %.',
    roles: BLOCK_AND_STATE,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'PRABANDH + PFMS',
    sourceDashboard: 'PRABANDH Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'samagra' } },
    ctaLabel: 'Open utilisation view',
    reasonBuilder: ({ value }) => `${value}% of grant utilised.`,
  },
  {
    id: 'pm_shri_performance',
    framework: 'District', domain: 'District Level Tracking',
    shortName: 'PM SHRI performance',
    description: 'Quality and outcome score for schools under the PM SHRI scheme.',
    roles: PRINCIPAL_BLOCK_STATE,
    unit: 'score', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'GSQAC + Xamta + SMA',
    sourceDashboard: 'PM SHRI School Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'pm_shri' } },
    ctaLabel: 'Open PM SHRI view',
    reasonBuilder: ({ value, benchmark }) => `Score ${value} (state avg ${benchmark}).`,
  },

  // ─── Parent-scoped KPIs (child level) ─────────────────────────────────────
  {
    id: 'child_attendance',
    framework: 'Parent', domain: "Your child",
    shortName: "Child's attendance",
    description: "Your child's attendance % this term.",
    roles: ['parent'],
    unit: '%', direction: 'higher',
    benchmarkSource: 'fixed_target', fixedTarget: 90,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Smart Attendance System (OAS)',
    sourceDashboard: 'Attendance Live Dashboard (Parent View)',
    drilldown: { kind: 'canvas', canvasType: 'attendance', canvasContext: { view: 'parent' } },
    ctaLabel: 'Open attendance record',
    reasonBuilder: ({ value }) => `${value}% so far this term.`,
  },
  {
    id: 'child_proficiency',
    framework: 'Parent', domain: "Your child",
    shortName: "Child's proficiency",
    description: "Your child's most recent proficiency level (PAT/SAT).",
    roles: ['parent'],
    unit: '%', direction: 'higher',
    benchmarkSource: 'fixed_target', fixedTarget: 70,
    statusBands: { green: 0, yellow: -15 },
    dataSource: 'Xamta + PARAKH',
    sourceDashboard: 'Gyan Prabhav (Parent View)',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'parent_proficiency' } },
    ctaLabel: 'Open assessment report',
    reasonBuilder: ({ value }) => `Last assessment score: ${value}%.`,
  },
  {
    id: 'child_chronic_absence_flag',
    framework: 'Parent', domain: "Your child",
    shortName: 'Chronic absence?',
    description: "Whether your child has crossed the chronic-absence threshold (>7 consecutive days or >30% of school days).",
    roles: ['parent'],
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 1 },
    dataSource: 'CTS + EWS',
    sourceDashboard: 'EWS Dashboard (Parent View)',
    drilldown: { kind: 'canvas', canvasType: 'attendance', canvasContext: { view: 'parent' } },
    ctaLabel: 'Open attendance record',
    reasonBuilder: ({ value }) => value === 0 ? 'Not flagged.' : 'Your child has been flagged. Please review.',
  },
  {
    id: 'child_scholarship_status',
    framework: 'Parent', domain: "Your child",
    shortName: 'Scholarship status',
    description: "Status of your child's Namo Lakshmi / Namo Saraswati scholarship application.",
    roles: ['parent'],
    unit: 'count', direction: 'higher',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 1, yellow: 0 },
    dataSource: 'IPMS + PFMS',
    sourceDashboard: 'IPMS Parent View',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'parent_status' } },
    ctaLabel: 'Open scholarship status',
    reasonBuilder: ({ meta }) => meta?.statusLabel || 'Status unavailable.',
  },
  {
    id: 'child_namo_docs_pending',
    framework: 'Parent', domain: "Your child",
    shortName: 'Namo Lakshmi documents',
    description: "Outstanding documents required to complete your child's Namo Lakshmi application.",
    roles: ['parent'],
    unit: 'count', direction: 'lower',
    benchmarkSource: 'absolute', fixedTarget: null,
    statusBands: { green: 0, yellow: 1 },
    dataSource: 'IPMS document checklist',
    sourceDashboard: 'IPMS Parent View',
    drilldown: { kind: 'canvas', canvasType: 'digivritti', canvasContext: { view: 'apply' } },
    ctaLabel: 'Upload documents',
    reasonBuilder: ({ value }) => value === 0 ? 'All documents uploaded.' : `${value} document(s) still needed.`,
  },
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiCatalog.js
git commit -m "feat(kpi): District + parent-scoped catalog entries"
```

---

## Task 5: KPI catalog tests

**Files:**
- Create: `src/kpi/__tests__/kpiCatalog.test.mjs`

- [ ] **Step 1: Write the test.**

Create `src/kpi/__tests__/kpiCatalog.test.mjs`:

```js
// node src/kpi/__tests__/kpiCatalog.test.mjs
import { KPI_CATALOG, getCatalogForRole } from '../kpiCatalog.js'

let pass = 0, fail = 0
function check(label, cond) {
  if (cond) { console.log('  ok  ', label); pass++ }
  else      { console.log('  FAIL', label); fail++ }
}

console.log('catalog: shape')
for (const k of KPI_CATALOG) {
  check(`${k.id} has roles[]`, Array.isArray(k.roles) && k.roles.length > 0)
  check(`${k.id} has framework`, typeof k.framework === 'string')
  check(`${k.id} has statusBands`, k.statusBands && 'green' in k.statusBands && 'yellow' in k.statusBands)
  check(`${k.id} has drilldown.kind`, k.drilldown && ['canvas', 'chat'].includes(k.drilldown.kind))
  check(`${k.id} has reasonBuilder`, typeof k.reasonBuilder === 'function')
}

console.log('catalog: per-role counts (matches doc)')
check('teacher = 17',         getCatalogForRole('teacher').length === 17)
check('principal = 32',       getCatalogForRole('principal').length === 32)
check('crc = 31',             getCatalogForRole('crc').length === 31)
check('beo = 35',             getCatalogForRole('beo').length === 35)
check('state_secretary = 35', getCatalogForRole('state_secretary').length === 35)
check('parent = 5',           getCatalogForRole('parent').length === 5)
check('pfms = 5',             getCatalogForRole('pfms').length === 5)
check('deo = 0',              getCatalogForRole('deo').length === 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
```

- [ ] **Step 2: Run the test.**

Run: `node src/kpi/__tests__/kpiCatalog.test.mjs`
Expected: All checks pass, exit 0. If a per-role count fails, you have a mismatched `roles[]` in the catalog — recount from the xlsx table in the spec §2.

- [ ] **Step 3: Commit.**

```bash
git add src/kpi/__tests__/kpiCatalog.test.mjs
git commit -m "test(kpi): catalog shape + per-role count assertions"
```

---

## Task 6: KPI mock data

**Files:**
- Create: `src/kpi/kpiData.js`

- [ ] **Step 1: Create the mock data file.**

Each role gets enough KPI values that at least one red and one yellow tile show up by default. Benchmarks are state-level mostly, with school/cluster overrides where catalog entries call for them.

Create `src/kpi/kpiData.js`:

```js
// ─────────────────────────────────────────────────────────────────────────────
// KPI mock data — values + benchmarks consumed by kpiEngine.
//
// Values are tuned so every role has a deterministic mix of red / yellow /
// green so the hero tile pattern is always meaningful. Benchmark deltas are
// in points (percentage points for % units; raw count for count units).
//
// `meta` carries display hints used by reasonBuilders — e.g. unmarked count.
// ─────────────────────────────────────────────────────────────────────────────

export const KPI_VALUES = {
  teacher: {
    attendance_today:               { value: 72,  meta: { unmarked: 9 } },
    chronic_absentees:              { value: 4,   meta: { priorityCount: 2 } },
    attendance_reporting_compliance:{ value: 100, meta: {} },
    ews_followup_completed:         { value: 60,  meta: { pendingCount: 4 } },
    assessment_participation:       { value: 91,  meta: { absentCount: 2 } },
    proficiency:                    { value: 64,  meta: {} },
    students_below_proficiency:     { value: 28,  meta: { studentCount: 11, priorityCount: 4 } },
    student_improvement_delta:      { value: 2.5, meta: {} },
    orf_fln_improvement:            { value: 6,   meta: {} },
    student_module_completion:      { value: 82,  meta: { pendingStudents: 5 } },
    tpd_hours:                      { value: 38,  meta: {} },
    students_identified_remediation:{ value: 22,  meta: { identifiedCount: 11 } },
    students_receiving_remediation: { value: 65,  meta: { notStarted: 4 } },
    improvement_after_intervention: { value: 58,  meta: {} },
    gsqac_score:                    { value: 78,  meta: {} },
    same_day_reporting:             { value: 88,  meta: { lateSubmitters: 0 } },
    dashboard_data_lag:             { value: 1.5, meta: {} },
  },
  principal: {
    attendance_today:               { value: 84,  meta: {} },
    chronic_absentees:              { value: 12,  meta: { priorityCount: 4 } },
    schools_below_attendance_benchmark: { value: 0, meta: {} },
    attendance_reporting_compliance:{ value: 96,  meta: {} },
    ews_followup_completed:         { value: 70,  meta: { pendingCount: 6 } },
    assessment_participation:       { value: 89,  meta: { absentCount: 14 } },
    proficiency:                    { value: 67,  meta: {} },
    students_below_proficiency:     { value: 26,  meta: { studentCount: 84, priorityCount: 18 } },
    student_improvement_delta:      { value: 3.2, meta: {} },
    orf_fln_improvement:            { value: 5,   meta: {} },
    reports_generated_downloaded:   { value: 92,  meta: { pendingSchools: 1 } },
    student_module_completion:      { value: 74,  meta: { pendingStudents: 38 } },
    tpd_hours:                      { value: 41,  meta: {} },
    students_identified_remediation:{ value: 21,  meta: { identifiedCount: 71 } },
    students_receiving_remediation: { value: 68,  meta: { notStarted: 17 } },
    improvement_after_intervention: { value: 55,  meta: {} },
    scheme_beneficiary_mapping:     { value: 88,  meta: { unmapped: 6 } },
    payment_completion:             { value: 78,  meta: { pendingPayments: 18 } },
    pending_payments_grievances:    { value: 12,  meta: {} },
    issue_resolution_sla:           { value: 71,  meta: { openOverdue: 5 } },
    repeat_pending_cases:           { value: 3,   meta: {} },
    gsqac_score:                    { value: 73,  meta: {} },
    schools_meeting_quality_benchmark: { value: 62, meta: {} },
    low_performing_schools:         { value: 0,   meta: {} },
    gsqac_improvement_cycles:       { value: 2.1, meta: {} },
    improvement_actions_completed:  { value: 78,  meta: { openActions: 5 } },
    same_day_reporting:             { value: 90,  meta: { lateSubmitters: 2 } },
    dashboard_data_lag:             { value: 1.8, meta: {} },
    pending_issues_cross_system:    { value: 24,  meta: {} },
    repeat_issues_pct:              { value: 11,  meta: {} },
    action_on_ews_flagged:          { value: 72,  meta: { pendingCount: 9 } },
    pm_shri_performance:            { value: 76,  meta: {} },
  },
  crc: {
    attendance_today:               { value: 86,  meta: {} },
    chronic_absentees:              { value: 38,  meta: { priorityCount: 12 } },
    schools_below_attendance_benchmark: { value: 2, meta: {} },
    attendance_reporting_compliance:{ value: 91,  meta: {} },
    ews_followup_completed:         { value: 64,  meta: { pendingCount: 22 } },
    assessment_participation:       { value: 88,  meta: { absentCount: 64 } },
    proficiency:                    { value: 69,  meta: {} },
    students_below_proficiency:     { value: 24,  meta: { studentCount: 312, priorityCount: 62 } },
    student_improvement_delta:      { value: 2.8, meta: {} },
    orf_fln_improvement:            { value: 4,   meta: {} },
    reports_generated_downloaded:   { value: 86,  meta: { pendingSchools: 4 } },
    student_module_completion:      { value: 71,  meta: { pendingStudents: 142 } },
    tpd_hours:                      { value: 39,  meta: {} },
    students_identified_remediation:{ value: 22,  meta: { identifiedCount: 264 } },
    students_receiving_remediation: { value: 63,  meta: { notStarted: 78 } },
    improvement_after_intervention: { value: 52,  meta: {} },
    scheme_beneficiary_mapping:     { value: 84,  meta: { unmapped: 41 } },
    payment_completion:             { value: 73,  meta: { pendingPayments: 88 } },
    pending_payments_grievances:    { value: 22,  meta: {} },
    issue_resolution_sla:           { value: 68,  meta: { openOverdue: 12 } },
    repeat_pending_cases:           { value: 7,   meta: {} },
    gsqac_score:                    { value: 71,  meta: {} },
    schools_meeting_quality_benchmark: { value: 58, meta: {} },
    low_performing_schools:         { value: 3,   meta: {} },
    gsqac_improvement_cycles:       { value: 1.4, meta: {} },
    improvement_actions_completed:  { value: 72,  meta: { openActions: 18 } },
    same_day_reporting:             { value: 86,  meta: { lateSubmitters: 9 } },
    dashboard_data_lag:             { value: 2.1, meta: {} },
    pending_issues_cross_system:    { value: 41,  meta: {} },
    repeat_issues_pct:              { value: 14,  meta: {} },
    action_on_ews_flagged:          { value: 66,  meta: { pendingCount: 31 } },
  },
  beo: {
    attendance_today:               { value: 81,  meta: {} },
    chronic_absentees:              { value: 184, meta: { priorityCount: 42 } },
    schools_below_attendance_benchmark: { value: 7, meta: {} },
    attendance_reporting_compliance:{ value: 84,  meta: {} },
    ews_followup_completed:         { value: 58,  meta: { pendingCount: 86 } },
    assessment_participation:       { value: 86,  meta: { absentCount: 312 } },
    proficiency:                    { value: 62,  meta: {} },
    students_below_proficiency:     { value: 31,  meta: { studentCount: 1820, priorityCount: 412 } },
    student_improvement_delta:      { value: 2.1, meta: {} },
    orf_fln_improvement:            { value: 3,   meta: {} },
    reports_generated_downloaded:   { value: 82,  meta: { pendingSchools: 19 } },
    student_module_completion:      { value: 68,  meta: { pendingStudents: 612 } },
    tpd_hours:                      { value: 36,  meta: {} },
    students_identified_remediation:{ value: 24,  meta: { identifiedCount: 1402 } },
    students_receiving_remediation: { value: 59,  meta: { notStarted: 412 } },
    improvement_after_intervention: { value: 49,  meta: {} },
    scheme_beneficiary_mapping:     { value: 79,  meta: { unmapped: 188 } },
    payment_completion:             { value: 68,  meta: { pendingPayments: 312 } },
    pending_payments_grievances:    { value: 78,  meta: {} },
    issue_resolution_sla:           { value: 63,  meta: { openOverdue: 41 } },
    repeat_pending_cases:           { value: 18,  meta: {} },
    gsqac_score:                    { value: 68,  meta: {} },
    schools_meeting_quality_benchmark: { value: 54, meta: {} },
    low_performing_schools:         { value: 9,   meta: {} },
    gsqac_improvement_cycles:       { value: 0.8, meta: {} },
    improvement_actions_completed:  { value: 64,  meta: { openActions: 88 } },
    same_day_reporting:             { value: 82,  meta: { lateSubmitters: 41 } },
    dashboard_data_lag:             { value: 2.6, meta: {} },
    pending_issues_cross_system:    { value: 142, meta: {} },
    repeat_issues_pct:              { value: 16,  meta: {} },
    action_on_ews_flagged:          { value: 61,  meta: { pendingCount: 122 } },
    dropout_reduction:              { value: 2.1, meta: {} },
    reenrollment_vs_target:         { value: 248, meta: { target: 320 } },
    samagra_shiksha_expenditure:    { value: 71,  meta: {} },
    pm_shri_performance:            { value: 74,  meta: {} },
  },
  state_secretary: {
    attendance_today:               { value: 88,  meta: {} },
    chronic_absentees:              { value: 4820, meta: { priorityCount: 1240 } },
    schools_below_attendance_benchmark: { value: 184, meta: {} },
    attendance_reporting_compliance:{ value: 92,  meta: {} },
    ews_followup_completed:         { value: 66,  meta: { pendingCount: 1840 } },
    assessment_participation:       { value: 91,  meta: { absentCount: 8420 } },
    proficiency:                    { value: 71,  meta: {} },
    students_below_proficiency:     { value: 22,  meta: { studentCount: 48200, priorityCount: 8200 } },
    student_improvement_delta:      { value: 3.4, meta: {} },
    orf_fln_improvement:            { value: 5,   meta: {} },
    reports_generated_downloaded:   { value: 89,  meta: { pendingSchools: 412 } },
    student_module_completion:      { value: 74,  meta: { pendingStudents: 14200 } },
    tpd_hours:                      { value: 42,  meta: {} },
    students_identified_remediation:{ value: 22,  meta: { identifiedCount: 38000 } },
    students_receiving_remediation: { value: 65,  meta: { notStarted: 9200 } },
    improvement_after_intervention: { value: 56,  meta: {} },
    scheme_beneficiary_mapping:     { value: 86,  meta: { unmapped: 4120 } },
    payment_completion:             { value: 81,  meta: { pendingPayments: 6800 } },
    pending_payments_grievances:    { value: 1240, meta: {} },
    issue_resolution_sla:           { value: 74,  meta: { openOverdue: 612 } },
    repeat_pending_cases:           { value: 312, meta: {} },
    gsqac_score:                    { value: 74,  meta: {} },
    schools_meeting_quality_benchmark: { value: 64, meta: {} },
    low_performing_schools:         { value: 142, meta: {} },
    gsqac_improvement_cycles:       { value: 2.4, meta: {} },
    improvement_actions_completed:  { value: 76,  meta: { openActions: 1820 } },
    same_day_reporting:             { value: 89,  meta: { lateSubmitters: 412 } },
    dashboard_data_lag:             { value: 2.0, meta: {} },
    pending_issues_cross_system:    { value: 1842, meta: {} },
    repeat_issues_pct:              { value: 12,  meta: {} },
    action_on_ews_flagged:          { value: 70,  meta: { pendingCount: 2120 } },
    dropout_reduction:              { value: 2.4, meta: {} },
    reenrollment_vs_target:         { value: 8420, meta: { target: 9500 } },
    samagra_shiksha_expenditure:    { value: 78,  meta: {} },
    pm_shri_performance:            { value: 79,  meta: {} },
  },
  parent: {
    child_attendance:           { value: 78,  meta: {} },                          // YELLOW vs target 90 (delta -12)
    child_proficiency:          { value: 62,  meta: {} },                          // YELLOW vs target 70 (delta -8)
    child_chronic_absence_flag: { value: 0,   meta: {} },                          // GREEN (not flagged)
    child_scholarship_status:   { value: 1,   meta: { statusLabel: 'Approved' } }, // GREEN
    child_namo_docs_pending:    { value: 2,   meta: {} },                          // YELLOW (2 docs)
  },
  pfms: {
    scheme_beneficiary_mapping:  { value: 86, meta: { unmapped: 4120 } },
    payment_completion:          { value: 81, meta: { pendingPayments: 6800 } },
    pending_payments_grievances: { value: 1240, meta: {} },
    issue_resolution_sla:        { value: 74, meta: { openOverdue: 612 } },
    repeat_pending_cases:        { value: 312, meta: {} },
  },
}

export const BENCHMARKS = {
  state_avg: {
    attendance_today: 88,
    attendance_reporting_compliance: 95,
    ews_followup_completed: 78,
    assessment_participation: 92,
    proficiency: 72,
    students_below_proficiency: 21,
    student_improvement_delta: 3.0,
    orf_fln_improvement: 5,
    reports_generated_downloaded: 90,
    student_module_completion: 78,
    students_identified_remediation: 22,
    students_receiving_remediation: 70,
    improvement_after_intervention: 60,
    scheme_beneficiary_mapping: 88,
    payment_completion: 84,
    issue_resolution_sla: 76,
    gsqac_score: 76,
    schools_meeting_quality_benchmark: 66,
    gsqac_improvement_cycles: 2.5,
    improvement_actions_completed: 80,
    same_day_reporting: 92,
    repeat_issues_pct: 10,
    action_on_ews_flagged: 76,
    dropout_reduction: 2.2,
    samagra_shiksha_expenditure: 80,
    pm_shri_performance: 78,
  },
  school_avg: {
    'Sardar Patel Prathmik Shala': {
      chronic_absentees: 3,
    },
  },
  cluster_avg: {
    MADHAPAR: {},
  },
  fixed_target: {
    tpd_hours: 50,
    dashboard_data_lag: 2,
    child_attendance: 90,
    child_proficiency: 70,
  },
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiData.js
git commit -m "feat(kpi): mock values + benchmarks across all 7 roles"
```

---

## Task 7: KPI engine — status + per-KPI compute

**Files:**
- Create: `src/kpi/kpiEngine.js`

- [ ] **Step 1: Write the engine.**

Create `src/kpi/kpiEngine.js`:

```js
// ─────────────────────────────────────────────────────────────────────────────
// KPI Engine — pure functions over kpiCatalog + kpiData.
// ─────────────────────────────────────────────────────────────────────────────
import { KPI_CATALOG, getCatalogForRole } from './kpiCatalog.js'
import { KPI_VALUES, BENCHMARKS } from './kpiData.js'

export { getCatalogForRole }

// ─── Benchmark resolution ───────────────────────────────────────────────────
function resolveBenchmark(kpi, role, profile) {
  switch (kpi.benchmarkSource) {
    case 'state_avg':    return BENCHMARKS.state_avg[kpi.id] ?? null
    case 'school_avg':   return BENCHMARKS.school_avg?.[profile?.school]?.[kpi.id] ?? null
    case 'cluster_avg':  return BENCHMARKS.cluster_avg?.[profile?.cluster]?.[kpi.id] ?? null
    case 'fixed_target': return BENCHMARKS.fixed_target[kpi.id] ?? kpi.fixedTarget ?? null
    case 'absolute':     return null   // status comes from absolute thresholds in statusBands
    default:             return null
  }
}

// ─── Status ────────────────────────────────────────────────────────────────
export function computeStatus(kpi, value, benchmark) {
  if (value == null) return 'unknown'

  // Absolute thresholds: statusBands are raw value bands; direction governs sign.
  // For direction='lower' counts (e.g. pending issues), green=0, yellow=N means
  // value <= 0 → green; value <= N → yellow; otherwise red.
  if (kpi.benchmarkSource === 'absolute') {
    if (kpi.direction === 'lower') {
      if (value <= kpi.statusBands.green)  return 'green'
      if (value <= kpi.statusBands.yellow) return 'yellow'
      return 'red'
    } else {
      // direction='higher' absolute (rare): treat statusBands as min thresholds.
      if (value >= kpi.statusBands.green)  return 'green'
      if (value >= kpi.statusBands.yellow) return 'yellow'
      return 'red'
    }
  }

  if (benchmark == null) return 'unknown'

  const rawDelta = value - benchmark
  const delta = kpi.direction === 'lower' ? -rawDelta : rawDelta
  if (delta >= kpi.statusBands.green)  return 'green'
  if (delta >= kpi.statusBands.yellow) return 'yellow'
  return 'red'
}

// ─── Per-KPI compute ───────────────────────────────────────────────────────
// Returns the everything the UI needs to render a tile or insight card.
//
//   { kpi, value, benchmark, delta, status, reason, action, meta }
//
// `kpi` is the catalog entry itself so consumers can read drilldown, ctaLabel,
// description, etc. without a second lookup.
export function computeKpi(kpi, role, profile) {
  const raw = KPI_VALUES[role]?.[kpi.id]
  const value = raw?.value ?? null
  const meta  = raw?.meta ?? {}

  const benchmark = resolveBenchmark(kpi, role, profile)

  let delta = null
  if (value != null && benchmark != null) {
    const rawDelta = value - benchmark
    delta = kpi.direction === 'lower' ? -rawDelta : rawDelta
  }

  const status = computeStatus(kpi, value, benchmark)
  const reason = kpi.reasonBuilder({ value, benchmark, delta, meta })

  return { kpi, value, benchmark, delta, status, reason, meta }
}

// ─── Convenience: get all computed KPIs for a role ─────────────────────────
export function getComputedKpis(role, profile) {
  return getCatalogForRole(role).map(k => computeKpi(k, role, profile))
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiEngine.js
git commit -m "feat(kpi): engine — computeStatus + computeKpi + benchmark resolution"
```

---

## Task 8: KPI engine — prioritise + overall score

**Files:**
- Modify: `src/kpi/kpiEngine.js`

- [ ] **Step 1: Append `prioritise` and `computeOverallScore`.**

Add to `src/kpi/kpiEngine.js` (after `getComputedKpis`):

```js
const SEVERITY = { red: 3, yellow: 2, green: 1, unknown: 0 }

// Returns up to `topN` computed KPIs sorted by status severity then |delta| desc.
// If no red KPIs exist, the worst yellow (or best green if everything green) is
// surfaced as the hero — the consumer can interpret index 0 as the hero slot.
//
// All-green roles: we promote the most improved (largest positive delta) to
// position 0 — handled by `pickHero()` below; `prioritise` itself stays a pure
// sort and lets the consumer apply the celebration treatment.
export function prioritise(role, profile, topN = 4) {
  return getComputedKpis(role, profile)
    .filter(c => c.status !== 'unknown')
    .sort((a, b) => {
      const sev = SEVERITY[b.status] - SEVERITY[a.status]
      if (sev !== 0) return sev
      const dA = Math.abs(a.delta ?? 0)
      const dB = Math.abs(b.delta ?? 0)
      return dB - dA
    })
    .slice(0, topN)
}

// All-green-state hero override: returns the KPI with the largest positive
// delta if everything is green; otherwise returns null and the consumer uses
// prioritise()'s first entry.
export function pickHero(role, profile) {
  const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  if (all.length === 0) return null
  const anyRedOrYellow = all.some(c => c.status === 'red' || c.status === 'yellow')
  if (anyRedOrYellow) return prioritise(role, profile, 1)[0]
  // All green — pick the largest positive delta (best performer).
  return [...all].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]
}

// Returns { score: 0-100, counts: {red,yellow,green} } across all role KPIs.
// Status weight: red=0, yellow=50, green=100, unknown skipped.
export function computeOverallScore(role, profile) {
  const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  if (all.length === 0) return { score: null, counts: { red: 0, yellow: 0, green: 0 } }
  const weight = { red: 0, yellow: 50, green: 100 }
  const total = all.reduce((sum, c) => sum + weight[c.status], 0)
  const counts = all.reduce((acc, c) => { acc[c.status]++; return acc }, { red: 0, yellow: 0, green: 0 })
  return { score: Math.round(total / all.length), counts }
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiEngine.js
git commit -m "feat(kpi): prioritise + pickHero + computeOverallScore"
```

---

## Task 9: KPI engine tests

**Files:**
- Create: `src/kpi/__tests__/kpiEngine.test.mjs`

- [ ] **Step 1: Write the test file.**

Create `src/kpi/__tests__/kpiEngine.test.mjs`:

```js
// node src/kpi/__tests__/kpiEngine.test.mjs
import {
  computeStatus, computeKpi, prioritise, pickHero, computeOverallScore,
  getCatalogForRole,
} from '../kpiEngine.js'

let pass = 0, fail = 0
function check(label, cond) {
  if (cond) { console.log('  ok  ', label); pass++ }
  else      { console.log('  FAIL', label); fail++ }
}

const teacherProfile = { school: 'Sardar Patel Prathmik Shala', cluster: null }
const principalProfile = { school: 'Sardar Patel Prathmik Shala', cluster: null }
const parentProfile = {}

console.log('computeStatus: % KPI with state_avg benchmark')
const kpiAtt = getCatalogForRole('teacher').find(k => k.id === 'attendance_today')
check('72 vs 88 → red',    computeStatus(kpiAtt, 72, 88) === 'red')
check('82 vs 88 → yellow', computeStatus(kpiAtt, 82, 88) === 'yellow')
check('90 vs 88 → green',  computeStatus(kpiAtt, 90, 88) === 'green')
check('null value → unknown', computeStatus(kpiAtt, null, 88) === 'unknown')

console.log('computeStatus: lower-is-better count KPI (chronic_absentees)')
const kpiCh = getCatalogForRole('teacher').find(k => k.id === 'chronic_absentees')
check('4 vs school_avg 3 → yellow (1 over)', computeStatus(kpiCh, 4, 3) === 'yellow')
check('3 vs school_avg 3 → green',           computeStatus(kpiCh, 3, 3) === 'green')
check('6 vs school_avg 3 → red',             computeStatus(kpiCh, 6, 3) === 'red')

console.log('computeStatus: absolute thresholds (repeat_pending_cases)')
const kpiRep = getCatalogForRole('principal').find(k => k.id === 'repeat_pending_cases')
check('0 → green',  computeStatus(kpiRep, 0, null) === 'green')
check('3 → yellow', computeStatus(kpiRep, 3, null) === 'yellow')
check('9 → red',    computeStatus(kpiRep, 9, null) === 'red')

console.log('computeKpi: teacher attendance_today')
const c = computeKpi(kpiAtt, 'teacher', teacherProfile)
check('value 72',           c.value === 72)
check('benchmark 88',       c.benchmark === 88)
check('delta -16',          c.delta === -16)
check('status red',         c.status === 'red')
check('reason mentions 9',  /9/.test(c.reason))

console.log('prioritise: teacher gets at most 4 entries, red first')
const top = prioritise('teacher', teacherProfile, 4)
check('returns 4',         top.length === 4)
check('first is red',      top[0].status === 'red')
check('non-increasing severity', top.every((c, i, arr) => i === 0 || SEVERITY(arr[i - 1]) >= SEVERITY(c)))
function SEVERITY(c) { return { red: 3, yellow: 2, green: 1, unknown: 0 }[c.status] }

console.log('computeOverallScore: principal')
const score = computeOverallScore('principal', principalProfile)
check('score is a number 0-100', typeof score.score === 'number' && score.score >= 0 && score.score <= 100)
check('counts sum > 0', score.counts.red + score.counts.yellow + score.counts.green > 0)

console.log('parent: 5 KPIs, hero never crashes')
const parentHero = pickHero('parent', parentProfile)
check('parent has a hero', parentHero != null)
check('parent KPI count = 5', getCatalogForRole('parent').length === 5)

console.log('deo: 0 KPIs, returns empty arrays')
check('deo prioritise empty', prioritise('deo', {}, 4).length === 0)
check('deo overall null', computeOverallScore('deo', {}).score === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
```

- [ ] **Step 2: Run tests.**

Run: `node src/kpi/__tests__/kpiEngine.test.mjs`
Expected: All checks pass, exit 0.

If a status check fails for `attendance_today`, your `statusBands` in the catalog don't match `{green: 0, yellow: -10}`. If `prioritise` ordering fails, your sort comparator is reversed.

- [ ] **Step 3: Commit.**

```bash
git add src/kpi/__tests__/kpiEngine.test.mjs
git commit -m "test(kpi): engine — status, compute, prioritise, overall score"
```

---

## Task 10: KPI actions resolver

**Files:**
- Create: `src/kpi/kpiActions.js`

- [ ] **Step 1: Write the resolver.**

This module exposes one function: `resolveDrilldown(kpiId, role, profile)`. It returns a discriminated union the UI consumes uniformly.

Create `src/kpi/kpiActions.js`:

```js
// ─────────────────────────────────────────────────────────────────────────────
// KPI Actions — resolve a KPI's drill-down target into a concrete instruction.
//
// Returns one of:
//   { kind: 'canvas', canvasType, canvasContext }
//   { kind: 'chat',   chatId }
//
// Per-role overrides can be added inline if a KPI's drilldown target differs
// between roles (e.g. parent vs teacher should land on different views). For
// v1 the catalog's drilldown is used as-is.
// ─────────────────────────────────────────────────────────────────────────────
import { KPI_CATALOG } from './kpiCatalog.js'

const BY_ID = new Map(KPI_CATALOG.map(k => [k.id, k]))

// Map a catalog drilldown.botId to an actual CHAT_IDS entry. If the requested
// id isn't in the app's chat-id set, fall back to 'swift'.
const CHAT_ID_FALLBACK = new Set(['swift', 'xamta', 'att', 'ews', 'tmsg', 'catt', 'cschol', 'dbt', 'datt', 'warroom', 'parentbot'])

export function resolveDrilldown(kpiId, role, profile) {
  const kpi = BY_ID.get(kpiId)
  if (!kpi) return null
  const dd = kpi.drilldown
  if (!dd) return null
  if (dd.kind === 'canvas') {
    return {
      kind: 'canvas',
      canvasType: dd.canvasType,
      canvasContext: { ...(dd.canvasContext || {}), role, kpiId, fromKpi: true },
    }
  }
  if (dd.kind === 'chat') {
    const id = CHAT_ID_FALLBACK.has(dd.botId) ? dd.botId : 'swift'
    return { kind: 'chat', chatId: id }
  }
  return null
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/kpi/kpiActions.js
git commit -m "feat(kpi): resolveDrilldown — canvas | chat union"
```

---

## Task 11: KPI NLP intents

**Files:**
- Create: `src/kpi/kpiNlp.js`

- [ ] **Step 1: Inspect the existing action registry API.**

Open `src/nlp/actionRegistry.js`. You're looking for the registration function. Typically it's `registerAction({ id, module, allowedRoles, requiredEntities, run })`. If you find a slightly different name (e.g. `register`, `add`), use that. The call shape inside `kpiNlp` should match what other modules in `src/nlp/` use — there are existing examples to follow.

- [ ] **Step 2: Write the KPI NLP file.**

Create `src/kpi/kpiNlp.js`:

```js
// ─────────────────────────────────────────────────────────────────────────────
// KPI NLP — registers KPI-specific intents with actionRegistry. Imported by
// aiBootstrap so the registrations happen at app boot.
// ─────────────────────────────────────────────────────────────────────────────
import { registerAction } from '../nlp/actionRegistry.js'
import {
  prioritise, pickHero, computeOverallScore, getComputedKpis, getCatalogForRole,
} from './kpiEngine.js'

const ALL_KPI_ROLES = ['teacher', 'principal', 'crc', 'beo', 'state_secretary', 'parent', 'pfms']

// Build a chat-renderable HTML card listing top N KPIs.
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
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

// ─── Intent: rank worst KPIs ────────────────────────────────────────────────
registerAction({
  id: 'KPI_RANK_WORST',
  module: 'kpi',
  allowedRoles: ALL_KPI_ROLES,
  patterns: [
    /which kpi.*(drag|pull|drop|drag).*(me|score) down/i,
    /what.*(pulling|dragging).*(me|score) down/i,
    /\bworst kpi\b/i,
    /\bbottom (3|five|three|5)\b/i,
  ],
  run({ role, profile }) {
    const top = prioritise(role, profile, 5)
    return {
      kind: 'message',
      message: {
        type: 'bot',
        html: rankCardHtml('Top 5 pulling your score down', top),
      },
    }
  },
})

// ─── Intent: compare to peers / state ───────────────────────────────────────
registerAction({
  id: 'KPI_COMPARE_PEER',
  module: 'kpi',
  allowedRoles: ALL_KPI_ROLES,
  patterns: [
    /compare.*(state|school|cluster|block)/i,
    /how (do|am) i compar/i,
    /vs (state|school|cluster|block)/i,
  ],
  run({ role, profile }) {
    const items = getComputedKpis(role, profile)
      .filter(c => c.benchmark != null)
      .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
      .slice(0, 6)
    return {
      kind: 'message',
      message: {
        type: 'bot',
        html: rankCardHtml('You vs benchmark — biggest gaps first', items),
      },
    }
  },
})

// ─── Intent: fix first ──────────────────────────────────────────────────────
registerAction({
  id: 'KPI_FIX_FIRST',
  module: 'kpi',
  allowedRoles: ALL_KPI_ROLES,
  patterns: [
    /(what.*(fix|do) first)|where.*start/i,
    /first action/i,
    /priority action/i,
  ],
  run({ role, profile }) {
    const hero = pickHero(role, profile)
    if (!hero) return { kind: 'message', message: { type: 'bot', html: 'You have no KPIs to act on right now.' } }
    return {
      kind: 'open_kpi',
      kpiId: hero.kpi.id,
      role,
    }
  },
})

// ─── Intent: open full report card ──────────────────────────────────────────
registerAction({
  id: 'KPI_OPEN_REPORT_CARD',
  module: 'kpi',
  allowedRoles: ALL_KPI_ROLES,
  patterns: [
    /(open|show).*(report card|full kpi|all kpi)/i,
    /\bmy report card\b/i,
  ],
  run() {
    return { kind: 'open_canvas', canvas: { type: 'report_card' } }
  },
})

// ─── Intent: summary ────────────────────────────────────────────────────────
registerAction({
  id: 'KPI_SUMMARY',
  module: 'kpi',
  allowedRoles: ALL_KPI_ROLES,
  patterns: [
    /\b(summari[sz]e|overview).*(report card|kpi|score)/i,
    /how.*(am|is).*(my|the) (score|report card)/i,
  ],
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
    return { kind: 'message', message: { type: 'bot', html } }
  },
})
```

If `registerAction` doesn't accept a `patterns` array in your project's `actionRegistry.js`, adapt to whatever pattern field the project uses (`triggers`, `match`, `aliases`). The behaviour shape stays the same.

- [ ] **Step 3: Commit.**

```bash
git add src/kpi/kpiNlp.js
git commit -m "feat(kpi): register 5 KPI intents (rank, compare, fix-first, open, summary)"
```

---

## Task 12: Wire KPI NLP into bootstrap

**Files:**
- Modify: `src/nlp/aiBootstrap.js`

- [ ] **Step 1: Add the side-effect import.**

Open `src/nlp/aiBootstrap.js`. Near the top of the file (alongside other side-effect imports for nlp modules), add:

```js
import '../kpi/kpiNlp.js'
```

If `aiBootstrap.js` is a function called at app boot, ensure the import runs at module load (a bare import does this). If `aiBootstrap.js` doesn't exist or has a different name, search `src/nlp/` for the boot-time module — there's exactly one entry point.

- [ ] **Step 2: Verify with a smoke check.**

Run: `npm run dev`. Open the app, log in as a teacher, type `which KPI is dragging my score down` into the chat composer.
Expected: A bot bubble with the ranked-KPI card renders (not the generic fallback).

If nothing happens, your `registerAction` signature in Task 11 doesn't match the project's `actionRegistry`. Check the existing nlp modules in `src/nlp/` for an example of a working registration and align the shape.

- [ ] **Step 3: Commit.**

```bash
git add src/nlp/aiBootstrap.js
git commit -m "feat(kpi): wire KPI NLP intents into boot"
```

---

## Task 13: `KpiTile` component

**Files:**
- Create: `src/components/kpi/KpiTile.jsx`

- [ ] **Step 1: Write the component.**

Create `src/components/kpi/KpiTile.jsx`:

```jsx
import React from 'react'

// Tone classes per status.
const TONE = {
  red:     { bg: 'bg-rose-50',    bd: 'border-rose-200',    text: 'text-rose-700',    pill: 'bg-rose-100 text-rose-700',       cta: 'bg-rose-700 text-white' },
  yellow:  { bg: 'bg-amber-50',   bd: 'border-amber-200',   text: 'text-amber-800',   pill: 'bg-amber-100 text-amber-800',     cta: 'bg-amber-700 text-white' },
  green:   { bg: 'bg-emerald-50', bd: 'border-emerald-200', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700', cta: 'bg-emerald-700 text-white' },
  unknown: { bg: 'bg-slate-50',   bd: 'border-slate-200',   text: 'text-slate-600',   pill: 'bg-slate-100 text-slate-600',     cta: 'bg-slate-600 text-white' },
}

const STATUS_LABEL = { red: 'RED', yellow: 'WATCH', green: 'GOOD', unknown: '—' }

function formatValue(value, unit) {
  if (value == null) return '—'
  if (unit === '%')      return `${value}%`
  if (unit === 'hours')  return `${value} hrs`
  if (unit === 'score')  return `${value}`
  if (unit === 'count')  return `${value}`
  return String(value)
}

function formatBench(c) {
  if (c.benchmark == null) return null
  const { kpi, benchmark, delta } = c
  const sign = delta == null ? '' : (delta >= 0 ? '+' : '−')
  const absDelta = delta == null ? '' : Math.abs(delta).toFixed(0)
  const benchLabel =
    kpi.benchmarkSource === 'fixed_target' ? `Target ${benchmark}${kpi.unit === '%' ? '%' : ''}` :
    kpi.benchmarkSource === 'school_avg'   ? `School ${benchmark}` :
    kpi.benchmarkSource === 'cluster_avg'  ? `Cluster ${benchmark}` :
    `State ${benchmark}${kpi.unit === '%' ? '%' : ''}`
  return delta == null ? benchLabel : `${benchLabel} · ${sign}${absDelta} pts`
}

export default function KpiTile({ computed, variant = 'hero', onClick }) {
  const { kpi, value, status, reason } = computed
  const t = TONE[status] || TONE.unknown
  const bench = formatBench(computed)

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className={`text-left w-full rounded-xl border ${t.bd} ${t.bg} ${t.text} p-3 transition hover:shadow-card focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider truncate opacity-80">{kpi.shortName}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.pill}`}>{STATUS_LABEL[status]}</span>
        </div>
        <div className="text-[20px] font-extrabold leading-tight mt-1">{formatValue(value, kpi.unit)}</div>
        {bench && <div className="text-[10px] opacity-70 mt-1 truncate">{bench}</div>}
      </button>
    )
  }

  // hero
  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-2xl border ${t.bd} ${t.bg} ${t.text} p-4 transition hover:shadow-card focus:outline-none`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{kpi.shortName}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.pill}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="text-[32px] font-extrabold leading-none mt-2">{formatValue(value, kpi.unit)}</div>
      {bench && <div className="text-[11px] opacity-75 mt-2">{bench}</div>}
      {reason && <div className="text-[12px] mt-2 leading-snug opacity-95">{reason}</div>}
      {kpi.ctaLabel && (
        <span className={`inline-block mt-3 px-3 py-1.5 rounded-full text-[11px] font-bold ${t.cta}`}>
          {kpi.ctaLabel} ›
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/kpi/KpiTile.jsx
git commit -m "feat(kpi): KpiTile — hero + compact variants"
```

---

## Task 14: `KpiInsightCard` component

**Files:**
- Create: `src/components/kpi/KpiInsightCard.jsx`

- [ ] **Step 1: Write the component.**

Create `src/components/kpi/KpiInsightCard.jsx`:

```jsx
import React from 'react'
import { useApp } from '../../context/AppContext'
import { resolveDrilldown } from '../../kpi/kpiActions'

const PILL = {
  red:     'bg-rose-100 text-rose-700',
  yellow:  'bg-amber-100 text-amber-800',
  green:   'bg-emerald-100 text-emerald-700',
  unknown: 'bg-slate-100 text-slate-600',
}
const LABEL = { red: 'RED', yellow: 'WATCH', green: 'GOOD', unknown: '—' }

export default function KpiInsightCard({ data }) {
  // data shape: ComputedKpi from kpiEngine.computeKpi
  const { role, openCanvas, navigate } = useApp()
  if (!data || !data.kpi) return null
  const { kpi, value, benchmark, delta, status, reason, meta } = data

  function runPrimary() {
    const dd = resolveDrilldown(kpi.id, role, {})
    if (!dd) return
    if (dd.kind === 'canvas') openCanvas({ type: dd.canvasType, ...dd.canvasContext })
    if (dd.kind === 'chat')   navigate('chat_' + dd.chatId)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden max-w-[360px]">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">{kpi.shortName}</div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PILL[status]}`}>{LABEL[status]}</span>
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-extrabold text-slate-900">{value ?? '—'}{kpi.unit === '%' ? '%' : ''}</span>
          {benchmark != null && delta != null && (
            <span className="text-[11px] text-slate-500">
              {kpi.benchmarkSource === 'fixed_target' ? 'Target' :
               kpi.benchmarkSource === 'school_avg' ? 'School' :
               kpi.benchmarkSource === 'cluster_avg' ? 'Cluster' : 'State'}{' '}
              {benchmark}{kpi.unit === '%' ? '%' : ''} · {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(0)} pts
            </span>
          )}
        </div>

        {reason && (
          <div className="text-[12.5px] text-slate-700 mt-2 leading-relaxed">{reason}</div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={runPrimary}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-bold border-[1.5px] border-primary text-primary bg-white"
          >
            {kpi.ctaLabel || 'Open'} ›
          </button>
        </div>

        <div className="text-[10px] text-slate-400 mt-2.5">
          {kpi.dataSource} · {kpi.sourceDashboard}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/kpi/KpiInsightCard.jsx
git commit -m "feat(kpi): KpiInsightCard chat-thread breakdown card"
```

---

## Task 15: Extend `ChatBubble` to render `kpi_insight` messages

**Files:**
- Modify: `src/components/ChatBubble.jsx`

- [ ] **Step 1: Add the `kind === 'kpi_insight'` branch.**

Open `src/components/ChatBubble.jsx`. In the JSX returned by `ChatBubble`, between the avatar block and the existing bubble `<div>` (lines ~40-50), add a new branch that short-circuits when `message.kind === 'kpi_insight'`. Concrete edit:

Replace:

```jsx
      <div>
        <div
          className={`px-3 py-2.5 rounded-2xl text-[13.5px] leading-[1.55] ${
            isBot
              ? 'bg-white text-txt-primary rounded-bl-[4px] shadow-card'
              : 'bg-primary text-white rounded-br-[4px]'
          }`}
          {...(isBot
            ? { dangerouslySetInnerHTML: { __html: message.html } }
            : { children: message.text })}
        />
```

with:

```jsx
      <div>
        {message.kind === 'kpi_insight' ? (
          <KpiInsightCard data={message.kpi} />
        ) : (
          <div
            className={`px-3 py-2.5 rounded-2xl text-[13.5px] leading-[1.55] ${
              isBot
                ? 'bg-white text-txt-primary rounded-bl-[4px] shadow-card'
                : 'bg-primary text-white rounded-br-[4px]'
            }`}
            {...(isBot
              ? { dangerouslySetInnerHTML: { __html: message.html } }
              : { children: message.text })}
          />
        )}
```

And add the import at the top of the file:

```jsx
import KpiInsightCard from './kpi/KpiInsightCard'
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/ChatBubble.jsx
git commit -m "feat(chat): render kpi_insight messages with KpiInsightCard"
```

---

## Task 16: Add `'kpi'` to `CHAT_IDS` and route `chat_kpi` to `ChatPage`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Append `'kpi'` to `CHAT_IDS`.**

Open `src/App.jsx`. Change line ~26:

```js
const CHAT_IDS = ['swift','xamta','att','ews','tmsg','catt','cschol','dbt','datt','warroom','parentbot']
```

to:

```js
const CHAT_IDS = ['swift','xamta','att','ews','tmsg','catt','cschol','dbt','datt','warroom','parentbot','kpi']
```

`STATIC_ROUTES` lookup for `chat_kpi` will miss and fall through to `<ChatPage chatId="kpi" />`, which is correct.

- [ ] **Step 2: Verify.**

Run: `npm run dev`. In the browser console run `useApp` is not directly accessible — instead use the role-switcher to enter as Teacher, then in the address bar / via dev tools call `window.__app_navigate?.('chat_kpi')` if exposed, or just confirm that navigating to a `chat_kpi` screen via clicking a future tile (Task 18) will reach `ChatPage`.

If you can't easily verify yet, defer to Task 25 manual pass.

- [ ] **Step 3: Commit.**

```bash
git add src/App.jsx
git commit -m "feat(app): register chat_kpi route"
```

---

## Task 17: Seed initial `kpi_insight` message when opening a `chat_kpi` thread

**Files:**
- Modify: `src/pages/ChatPage.jsx`

- [ ] **Step 1: Read existing ChatPage structure.**

Open `src/pages/ChatPage.jsx`. Locate where the page hydrates messages from the active chat. There's an effect or hook that initialises chat state. If a `chatId === 'kpi'` chat is opened with empty `messages`, we want to seed one bot message that contains the `KpiInsightCard` data.

- [ ] **Step 2: Add a kpi-seeding effect.**

Inside the `ChatPage` component (after the existing hydration logic), add:

```jsx
import { computeKpi } from '../kpi/kpiEngine'
import { KPI_CATALOG } from '../kpi/kpiCatalog'

// ... inside ChatPage, after activeChat is available:
useEffect(() => {
  if (chatId !== 'kpi') return
  if (!activeChat) return
  if (activeChat.messages && activeChat.messages.length > 0) return
  const kpiId = activeChat.toolState?.kpiId
  if (!kpiId) return
  const kpi = KPI_CATALOG.find(k => k.id === kpiId)
  if (!kpi) return
  const computed = computeKpi(kpi, role, userProfile || {})
  const msg = {
    type: 'bot',
    kind: 'kpi_insight',
    kpi: computed,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
  appendMessage(activeChat.id, msg)
}, [chatId, activeChat?.id])
```

Pull `role`, `userProfile`, `appendMessage`, `activeChat` from `useApp()` at the top of the component (most are already used elsewhere — extend the destructure).

If `ChatPage` doesn't take a `chatId` prop, look at how `App.jsx` invokes it (line ~50: `<ChatPage chatId={id.replace('chat_', '')} />`) — the prop is named `chatId`.

- [ ] **Step 3: Commit.**

```bash
git add src/pages/ChatPage.jsx
git commit -m "feat(chat): seed kpi_insight bubble when opening chat_kpi"
```

---

## Task 18: `KpiBotStrip` component

**Files:**
- Create: `src/components/kpi/KpiBotStrip.jsx`

- [ ] **Step 1: Write the component.**

Create `src/components/kpi/KpiBotStrip.jsx`:

```jsx
import React from 'react'
import { useApp } from '../../context/AppContext'
import { ROLE_BOTS } from '../../roles/roleConfig'

// Map a human-readable bot name to an internal CHAT_IDS entry. Anything not
// mapped falls back to 'swift'. Keep this terse — the labels are display only.
const BOT_TO_CHAT = {
  'VSK Gujarat':        'swift',
  'Shikshak Sahayak':   'tmsg',
  'Assessment Bot':     'xamta',
  'Remediation Bot':    'tmsg',
  'Parent Connect':     'parentbot',
  'School Monitor':     'catt',
  'Compliance Bot':     'catt',
  'Report Generator':   'cschol',
  'Block Analyst':      'datt',
  'Intervention Bot':   'warroom',
  'District Analyst':   'datt',
  'DBT Monitor':        'dbt',
  'War Room':           'warroom',
  'State Intelligence': 'swift',
  'Scheme Analytics':   'cschol',
  'District Drilldown': 'datt',
  'Policy Advisor':     'swift',
  'Parent Assistant':   'parentbot',
  'DigiVritti Approver':'catt',
  'Cluster Console':    'catt',
  'DigiVritti Payments':'dbt',
  'PFMS Console':       'dbt',
}

export default function KpiBotStrip({ role }) {
  const { navigate } = useApp()
  const bots = ROLE_BOTS[role] || []
  if (bots.length === 0) return null

  return (
    <div className="mt-4">
      <div className="px-1 mb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Apps</div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {bots.map(name => {
          const chatId = BOT_TO_CHAT[name] || 'swift'
          return (
            <button
              key={name}
              onClick={() => navigate('chat_' + chatId)}
              className="flex-shrink-0 w-[88px] h-[88px] rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center px-1.5 hover:shadow-card transition"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10" />
              <div className="text-[10.5px] font-bold text-slate-700 mt-1.5 text-center leading-tight">{name}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit.**

```bash
git add src/components/kpi/KpiBotStrip.jsx
git commit -m "feat(kpi): KpiBotStrip — slim Apps row below report card"
```

---

## Task 19: `ReportCardSection` component

**Files:**
- Create: `src/components/kpi/ReportCardSection.jsx`

- [ ] **Step 1: Write the component.**

Create `src/components/kpi/ReportCardSection.jsx`:

```jsx
import React, { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { prioritise, pickHero, getCatalogForRole } from '../../kpi/kpiEngine'
import { resolveDrilldown } from '../../kpi/kpiActions'
import KpiTile from './KpiTile'

export default function ReportCardSection() {
  const { role, userProfile, navigate, createChat, switchChat, openCanvas, updateChatToolState } = useApp()
  const profile = userProfile || {}

  const tiles = useMemo(() => {
    const top = prioritise(role, profile, 4)
    if (top.length === 0) return []
    // Override slot 0 with the celebration hero when no red/yellow exists.
    const hero = pickHero(role, profile)
    if (hero && top[0] && hero.kpi.id !== top[0].kpi.id) {
      const filtered = top.filter(c => c.kpi.id !== hero.kpi.id)
      return [hero, ...filtered].slice(0, 4)
    }
    return top
  }, [role, profile])

  const totalCount = getCatalogForRole(role).length

  function openKpiDrilldown(computed) {
    const chat = createChat({
      title: `Why is ${computed.kpi.shortName.toLowerCase()} ${computed.status}?`,
      tool: 'kpi_drill',
      initialMessages: [],
    })
    // Stash the kpiId on the chat (persisted) so ChatPage can seed the bubble.
    updateChatToolState(chat.id, { kpiId: computed.kpi.id })
    switchChat(chat.id)
    navigate('chat_kpi')
  }

  if (tiles.length === 0) return null

  return (
    <section className="mt-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="text-[12.5px] font-extrabold uppercase tracking-wider text-slate-700">📊 Top priority · Today</h2>
        <button
          onClick={() => openCanvas({ type: 'report_card' })}
          className="text-[11px] font-bold text-primary"
        >
          See all {totalCount} ›
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-2">
        <KpiTile computed={tiles[0]} variant="hero" onClick={() => openKpiDrilldown(tiles[0])} />
        <div className="grid grid-rows-3 gap-2 min-h-0">
          {tiles.slice(1, 4).map(c => (
            <KpiTile
              key={c.kpi.id}
              computed={c}
              variant="compact"
              onClick={() => openKpiDrilldown(c)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
```

Note on `toolState`: we use `updateChatToolState` (exposed by `useApp()`) rather than mutating the returned chat object directly, because `createChat` writes the new chat to localStorage immediately — a direct mutation would not persist. The ChatPage seeding effect (Task 17) reads `activeChat.toolState.kpiId` after hydration, so the persisted value is what matters.

- [ ] **Step 2: Commit.**

```bash
git add src/components/kpi/ReportCardSection.jsx
git commit -m "feat(kpi): ReportCardSection — hero + 3 compact + drill-down wiring"
```

---

## Task 20: `AttendanceCanvas` — accept `filter` prop

**Files:**
- Modify: `src/canvas/modules/AttendanceCanvas.jsx`

- [ ] **Step 1: Read existing AttendanceCanvas signature.**

Open `src/canvas/modules/AttendanceCanvas.jsx`. Identify where the rendered student list is computed — there's an array of students filtered by the active class/date.

- [ ] **Step 2: Layer in optional `filter` from canvasContext.**

At the top of the component body, after the existing context destructure, add:

```jsx
const filterMode = canvasContext?.filter || null  // 'unmarked' | 'chronic_absent' | 'non_submitting' | null
```

Wherever the student/school list is computed for rendering, add a passthrough:

```jsx
const visibleStudents = useMemo(() => {
  if (!filterMode) return students  // default behaviour preserved
  if (filterMode === 'unmarked') return students.filter(s => s.attendanceMark == null)
  if (filterMode === 'chronic_absent') return students.filter(s => s.attendance < 60)
  return students
}, [students, filterMode])
```

Render `visibleStudents` instead of `students` only when `filterMode` is truthy; otherwise keep the original list. The point is to **augment**, not replace, the canvas's existing behaviour.

If a top-of-canvas banner makes sense to indicate the filtered subset (e.g. "Showing 9 unmarked students from Class 8·A"), add it:

```jsx
{filterMode && (
  <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-[11.5px] text-amber-900">
    Filtered: {filterMode.replace(/_/g, ' ')} · {visibleStudents.length} of {students.length} students
  </div>
)}
```

- [ ] **Step 3: Commit.**

```bash
git add src/canvas/modules/AttendanceCanvas.jsx
git commit -m "feat(canvas): AttendanceCanvas honours canvasContext.filter"
```

---

## Task 21: `AtRiskStudentsCanvas` — accept `filter` prop

**Files:**
- Modify: `src/canvas/modules/AtRiskStudentsCanvas.jsx`

- [ ] **Step 1: Layer in `filter`.**

Apply the same pattern as Task 20. Filters to support (from `kpiCatalog`'s drilldowns):

- `chronic_absent` — `s.attendance < 60` (or `s.risk === 'high'` if there's such a flag).
- `below_proficiency` — `s.math < 40 || s.sci < 40 || s.guj < 40` (threshold may come from `canvasContext.threshold`, default 40).
- `assessment_absent` — students missing the most recent assessment (a `s.lastAssessmentAbsent` flag, or simply `!s.math && !s.sci`).
- `ews_pending_followup` — `s.risk === 'high' && !s.ewsActionTaken`.
- `module_incomplete` — `!s.moduleComplete`.
- `identified_remediation` — `s.identifiedRemediation`.
- `remediation_not_started` — `s.identifiedRemediation && !s.remediationStarted`.
- `schools_below_benchmark` (schools, not students — show a banner explaining the data isn't student-level for this filter, OR render a `<div>` with a school-level list if available).
- `low_performing_schools` — same caveat.

For filters where the existing canvas doesn't have the field, fall back to a sample subset (e.g. first 6 students) plus a banner explaining the filtered context.

- [ ] **Step 2: Commit.**

```bash
git add src/canvas/modules/AtRiskStudentsCanvas.jsx
git commit -m "feat(canvas): AtRiskStudentsCanvas honours canvasContext.filter"
```

---

## Task 22: `DigiVrittiCanvas` — accept `view`/`status` prefilter

**Files:**
- Modify: `src/canvas/modules/DigiVrittiCanvas.jsx`

- [ ] **Step 1: Add prefilter passthrough.**

`DigiVrittiCanvas` already handles a `view` prop (`apply` / `edit` / `payment-queue` etc.). Extend to honour additional canvasContext keys:

```jsx
const { view, status, filter } = canvasContext || {}
```

In the existing render branches:
- `view === 'payment-queue'` & `status === 'pending'` → filter the payment queue to only pending rows.
- `view === 'payment-queue'` & `status === 'failed'` → filter to failed rows.
- `view === 'grievances'` → render the grievance/CAL list (add a minimal section if it doesn't exist — even a placeholder list of 5 mock items is fine).
- `view === 'grievances'` & `filter === 'repeat'` → only reopened/duplicate items.
- `view === 'pending_mapping'` → list of unmapped beneficiaries.
- `view === 'parent_status'` → existing parent-view branch (no change).
- `view === 'samagra'` → render a small Samagra Shiksha utilisation card (literal numbers from `BENCHMARKS.state_avg.samagra_shiksha_expenditure` plus the role's value — read via context if available).

Keep existing branches working unchanged.

- [ ] **Step 2: Commit.**

```bash
git add src/canvas/modules/DigiVrittiCanvas.jsx
git commit -m "feat(canvas): DigiVrittiCanvas honours pending_mapping/grievances/samagra prefilters"
```

---

## Task 23: `ReportCanvas` — accept `filter`/`view` prop

**Files:**
- Modify: `src/canvas/modules/ReportCanvas.jsx`

- [ ] **Step 1: Add a small switch on `view`.**

Open `src/canvas/modules/ReportCanvas.jsx`. After the existing scope/branching, add:

```jsx
const view = canvasContext?.view || null
```

Add minimal sections for each view used by the catalog (proficiency_breakdown, progression, fln, gsqac, gsqac_distribution, gsqac_history, improvement_actions, data_timeliness, data_lag, dropout, reenrollment, pm_shri, parent_proficiency, pending_downloads).

For the prototype, each new view can render a placeholder block with the view name as a header plus a short copy line — the existing canvas charts/data don't need to back every variant in v1. The point is the route works and the user sees a labelled surface that maps back to what they clicked.

Example pattern:

```jsx
{view === 'proficiency_breakdown' && (
  <section className="p-4">
    <h3 className="text-[13px] font-bold text-slate-900">Proficiency breakdown</h3>
    <p className="text-[12.5px] text-slate-600 mt-1">Distribution of students by proficiency band (mock data).</p>
    {/* render mock chart from dashboardCharts helpers or a simple bar list */}
  </section>
)}
```

- [ ] **Step 2: Commit.**

```bash
git add src/canvas/modules/ReportCanvas.jsx
git commit -m "feat(canvas): ReportCanvas honours canvasContext.view branches"
```

---

## Task 24: `ReportCardCanvas`

**Files:**
- Create: `src/canvas/modules/ReportCardCanvas.jsx`
- Modify: `src/canvas/CanvasPanel.jsx` (register the new module)
- Modify: `src/roles/roleConfig.js` (add `report_card` to every ROLE_CANVASES except `deo`)

- [ ] **Step 1: Write the canvas module.**

Create `src/canvas/modules/ReportCardCanvas.jsx`:

```jsx
import React from 'react'
import { useApp } from '../../context/AppContext'
import { getComputedKpis, computeOverallScore } from '../../kpi/kpiEngine'
import KpiTile from '../../components/kpi/KpiTile'

const FRAMEWORK_TITLES = {
  A1: 'A1 · Attendance & Access',
  A2: 'A2 · Assessment & Learning Outcomes',
  A3: 'A3 · Adaptive Learning & Remediation',
  A4: 'A4 · Administration & Service Delivery',
  A5: 'A5 · Accreditation & School Quality',
  A6: 'A6 · Governance, Monitoring & AI Efficiency',
  District: 'District Level Tracking',
  Parent: 'Your child',
}

export default function ReportCardCanvas() {
  const { role, userProfile, createChat, switchChat, navigate, updateChatToolState } = useApp()
  const profile = userProfile || {}

  const items = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  const { score, counts } = computeOverallScore(role, profile)

  const byFramework = items.reduce((acc, c) => {
    const fw = c.kpi.framework
    if (!acc[fw]) acc[fw] = []
    acc[fw].push(c)
    return acc
  }, {})

  function open(computed) {
    const chat = createChat({
      title: `Why is ${computed.kpi.shortName.toLowerCase()} ${computed.status}?`,
      tool: 'kpi_drill',
      initialMessages: [],
    })
    updateChatToolState(chat.id, { kpiId: computed.kpi.id })
    switchChat(chat.id)
    navigate('chat_kpi')
  }

  if (items.length === 0) {
    return <div className="p-6 text-center text-slate-500 text-[13px]">No KPIs configured for this role.</div>
  }

  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <div className="p-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Overall</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[34px] font-extrabold text-slate-900">{score ?? '—'}</span>
            <span className="text-[14px] text-slate-500 font-bold">/ 100</span>
          </div>
          <div className="mt-2 flex gap-3 text-[12.5px] font-bold">
            <span className="text-rose-700">● {counts.red} red</span>
            <span className="text-amber-700">● {counts.yellow} yellow</span>
            <span className="text-emerald-700">● {counts.green} green</span>
          </div>
        </div>

        {Object.entries(byFramework).map(([fw, list]) => (
          <section key={fw} className="mt-5">
            <h3 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">{FRAMEWORK_TITLES[fw] || fw}</h3>
            <div className="grid grid-cols-2 gap-2">
              {list.map(c => (
                <KpiTile key={c.kpi.id} computed={c} variant="compact" onClick={() => open(c)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Register the module in `CanvasPanel.jsx`.**

Open `src/canvas/CanvasPanel.jsx`. Add the import alongside other module imports:

```js
import ReportCardCanvas from './modules/ReportCardCanvas'
```

In `MODULE_META`, append:

```js
  'report_card': { icon: '📊', title: () => 'Report card' },
```

In the routing render block where `canvasContext.type` is mapped to a component, add:

```jsx
{canvasContext.type === 'report_card' && <ReportCardCanvas />}
```

(Match the pattern used by neighbouring modules — single-line render.)

- [ ] **Step 3: Update `ROLE_CANVASES` for `report_card` access.**

Open `src/roles/roleConfig.js`. Current state of the existing roles' `ROLE_CANVASES`:
- `teacher`, `principal`, `state_secretary`, `parent` already include `'report_card'` — leave as is.
- `deo` currently includes `'report_card'` — **remove it** (DEO has no report card in v1, per spec §2).
- `crc`, `pfms` — **add** `'report_card'`.
- `beo` — already added in Task 1.

Final per-role state for `report_card`: in {teacher, principal, state_secretary, parent, crc, pfms, beo}; absent from {deo}.

- [ ] **Step 4: Commit.**

```bash
git add src/canvas/modules/ReportCardCanvas.jsx src/canvas/CanvasPanel.jsx src/roles/roleConfig.js
git commit -m "feat(canvas): ReportCardCanvas — full per-role report card grouped by 6A framework"
```

---

## Task 25: Replace bot-tile block in `SuperHomePage` with `ReportCardSection` + `KpiBotStrip`

**Files:**
- Modify: `src/pages/SuperHomePage.jsx`

- [ ] **Step 1: Locate the bot-tile rendering region.**

Open `src/pages/SuperHomePage.jsx`. Search for the JSX block that renders the bot-tile grid driven by `ROLE_BOTS[role]`. The state hook is `const bots = ROLE_BOTS[role] || ...` on line ~2045; the JSX that renders those `bots` will be in the page body (search for `bots.map`).

- [ ] **Step 2: Replace that block conditionally.**

DEO needs to keep the existing tiles (the spec keeps DEO unchanged). Every other role gets the new section.

At the top of the file's component, add:

```js
import ReportCardSection from '../components/kpi/ReportCardSection'
import KpiBotStrip       from '../components/kpi/KpiBotStrip'
```

Wrap the existing bot-tile JSX block:

```jsx
{role === 'deo' ? (
  // ── existing bot-tile block, unchanged ──
  <div className="grid grid-cols-2 gap-3">
    {bots.map(b => /* ...existing tile markup... */)}
  </div>
) : (
  <>
    <ReportCardSection />
    <KpiBotStrip role={role} />
  </>
)}
```

Replace the comment with the literal existing JSX (don't delete anything; just guard it).

- [ ] **Step 3: Verify per-role behaviour.**

Run: `npm run dev`. For each role below, log in and confirm the home screen.

| Role login | Expected |
|---|---|
| Teacher (TCH1001) | Report card: hero red `attendance_today` + 3 compact sidekicks; Apps strip with Teacher bots below. |
| Principal (PRI2001) | Report card with at least one red/yellow tile, See all 32 link; Apps strip. |
| CRC (CRC1001) | Report card; See all 31 link. |
| BEO (BEO5001) | Report card; See all 35 link. |
| State Secretary (SEC4001) | Report card; See all 35 link. |
| Parent (phone OTP 9876543210/1234) | Report card with 5 child-scoped tiles. |
| PFMS (PFMS001) | Report card with 5 A4 tiles. |
| DEO (DEO3001) | **Old bot tiles unchanged.** No report card section. |

Click any tile → drill-down chat opens with KpiInsightCard → primary CTA opens the relevant canvas/chat.

Click "See all N ›" → ReportCardCanvas opens grouped by framework.

- [ ] **Step 4: Commit.**

```bash
git add src/pages/SuperHomePage.jsx
git commit -m "feat(home): replace bot tiles with KPI report card (DEO keeps legacy view)"
```

---

## Task 26: Manual end-to-end verification

- [ ] **Step 1: Engine tests still pass.**

Run: `node src/kpi/__tests__/kpiCatalog.test.mjs && node src/kpi/__tests__/kpiEngine.test.mjs`
Expected: All checks pass.

- [ ] **Step 2: Drill-down flow — Teacher.**

```
1. npm run dev → log in as Teacher (TCH1001).
2. Home: hero shows "Today's attendance" tile RED · 72%.
3. Tap the hero tile.
4. Chat opens (chat_kpi); KpiInsightCard renders showing value 72%, state benchmark 88%, reason "9 students unmarked", CTA "Mark attendance now ›".
5. Tap CTA → AttendanceCanvas opens on the right with the filter banner "Filtered: unmarked".
```

- [ ] **Step 3: Full canvas flow — Principal.**

```
1. Switch role to Principal.
2. Home: report card with hero + 3 sidekicks.
3. Tap "See all 32 ›".
4. ReportCardCanvas opens on the right. Overall score visible. 7 framework sections rendered (A1–A6 + District/PM SHRI).
5. Tap any compact tile in the canvas → drill-down chat opens just like step 2.
```

- [ ] **Step 4: NLP intents — any role.**

```
1. In any chat thread, type "which kpi is dragging my score down" → ranked card renders.
2. Type "summarise my report card" → summary card with the 68/100-style number + red/yellow/green counts.
3. Type "open my full report card" → ReportCardCanvas opens.
```

- [ ] **Step 5: DEO unchanged.**

```
1. Switch role to DEO.
2. Home shows the pre-existing bot tiles (no report card section).
3. No new "See all N ›" link.
```

- [ ] **Step 6: Empty / all-green role test (optional).**

In `src/kpi/kpiData.js`, temporarily flip Parent's values so every KPI is green (e.g. `child_attendance.value = 95`, `child_proficiency.value = 85`, etc.). Re-login as Parent. Home should still show 4 tiles; the hero should now have a green pill and the celebration treatment (no red CTA, hero card uses green tone classes from KpiTile).

Revert the edit afterwards.

- [ ] **Step 7: Commit a tag / final marker (optional).**

```bash
git tag kpi-report-card-v1
```

---

## Out of plan — explicit non-goals

- **No backend changes.** Everything in `server/` stays untouched.
- **No new tests for UI components.** The existing harness is Node-only; UI is manually verified.
- **No design changes to existing canvases beyond the new `filter`/`view` prop branches.**
- **No DEO KPI plumbing** beyond gating the new section off for DEO. When the doc adds a district column, drop the DEO guard in Task 25 and add KPI rows to `KPI_VALUES.deo` in `kpiData.js`.
- **No deployment.** `npm run dev` only. The user has explicitly requested local-only.
