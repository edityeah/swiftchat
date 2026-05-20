# SwiftChat KPI Report Card — Design Spec

**Date:** 2026-05-19
**Status:** Draft for review
**Scope:** Frontend-only prototype change to SwiftChat v3. No backend deployment.

---

## 1. Goal

Replace the role-based bot tiles on `SuperHomePage` with a **KPI report card** that surfaces a few priority metrics for the current user, each colour-coded against a benchmark and paired with an actionable drill-down. The existing bot tiles do not disappear — they move into a slim "Apps" strip below the report card. A separate canvas exposes the full per-role KPI list grouped by domain.

The product motivation, from the stakeholder transcript:

> "The user has KPIs. Teachers have KPIs to meet, Schools have KPIs to meet… I should first see my latest report card through a tile… you can think of some red, green, yellow, which can show ki state average itna hai… I should click on it and I can get a summary in the chat page as to why that score is so and what is pulling me down. At the same time, there should be a simple action item, like 'OK, fix this'."

The KPI set is sourced from `Gujarat VSK 6A KPI Framework Enhanced.xlsx` — 35 KPIs grouped under the 6A framework (A1: Attendance & Access → A6: Governance, Monitoring & AI Efficiency) plus District Level Tracking.

---

## 2. Role × KPI mapping

The xlsx columns map to SwiftChat role IDs as follows:

| xlsx column | SwiftChat role | New role? | KPI count |
|---|---|---|---|
| Teacher | `teacher` | existing | 17 |
| School / Principal | `principal` | existing | 32 |
| Cluster | `crc` | existing | 31 |
| Block | `beo` | **NEW** | 35 |
| State | `state_secretary` | existing | 35 |

Two SwiftChat roles are not in the xlsx and are handled separately:

| SwiftChat role | Treatment |
|---|---|
| `deo` (district) | No KPIs in v1. Home keeps the existing bot tiles unchanged. When the doc adds a District column, slot DEO into the engine without code changes elsewhere. |
| `parent` | Custom 5-KPI catalog scoped to one child (child's own attendance %, proficiency %, chronic absence flag, scholarship status, Namo Lakshmi document upload state). |
| `pfms` | Filtered subset of the A4 Administration domain (KPIs #17–#21) at state scope. |

**Doc reading rule:** a cell that contains `—` means that role does not see that KPI. The engine filters by `kpi.roles[]` at the very first step; KPIs not in `roles[]` for a given role are not rendered, not stored, not surfaced. There is no "data missing" placeholder for absent KPIs.

A full role × KPI matrix is held in `kpiCatalog.js` (see §6) as the per-KPI `roles[]` list. Counts above are derived from the xlsx.

---

## 3. Home screen

`SuperHomePage` replaces its bot-tile block with two stacked sections:

```
┌─ 📊 Top priority · Today ─────────── See all N › ┐
│                                                    │
│  ┌──────────────────┐   ┌────────────┐            │
│  │ HERO TILE        │   │ small KPI  │            │
│  │ (worst KPI)      │   ├────────────┤            │
│  │ + benchmark      │   │ small KPI  │            │
│  │ + reason         │   ├────────────┤            │
│  │ + action CTA     │   │ small KPI  │            │
│  └──────────────────┘   └────────────┘            │
└────────────────────────────────────────────────────┘
Apps ┌──────┬──────┬──────┬──────┬──────┐
     │ Swift│ XAMTA│ Att  │ NamoL│ EWS  │
     └──────┴──────┴──────┴──────┴──────┘
```

### Tile composition (hero variant)

```
┌─────────────────────────────────────┐
│ TODAY'S ATTENDANCE         [ RED ]  │
│                                     │
│ 72%                                 │
│ State avg 88% · −16 pts             │
│                                     │
│ 9 students unmarked.                │
│  [ Mark attendance now › ]          │
└─────────────────────────────────────┘
```

### Tile composition (compact variant)

```
┌─────────────────────────────┐
│ CHRONIC ABSENTEES   [ 4 ]   │
│ 4 · School avg 3            │
└─────────────────────────────┘
```

The compact variant has no reason line and no CTA. Tapping it opens the same drill-down chat as the hero tile.

### Prioritisation rule (engine — `prioritise(role, profile)`)

1. Filter catalog to `kpi.roles.includes(role)`.
2. For each KPI, compute `{ value, benchmark, delta, status }` via `computeKpi(kpi, role, profile)`.
3. Sort by status severity: `red > yellow > green`.
4. Within same status, sort by `|delta|` descending (largest gap from benchmark first).
5. Take first 4. Index 0 → hero slot. Indices 1–3 → compact siblings.

### Empty / all-green state

If no KPI is red, the hero slot shows the **most improved** KPI (largest positive delta) with a different visual treatment — green background, no urgent CTA, copy like *"Best in cluster · keep it up"*. The three sidekicks still render in priority order.

If a role has fewer than 4 KPIs (e.g. `parent` with 5), all available KPIs render; if fewer than 4 total, the grid degrades gracefully — hero + 2 small, hero + 1 small, etc.

### Bot strip

Below the report card, a horizontal scroll strip renders existing `ROLE_BOTS[role]` entries at 1/3 their current size (`~64px` square, label below icon). Tap behaviour unchanged. This is what keeps the existing chat-driven apps reachable.

---

## 4. Drill-down flow

```
Tap any KPI tile
   ├─ createChat({ title, tool: 'kpi_drill', kpiId, role })
   ├─ navigate('chat_kpi')
   ▼
ChatPage('kpi')
   ├─ Seeds an initial bot message of type 'kpi_insight'
   │
   │  ┌──────────────────────────────────────────────┐
   │  │  KpiInsightCard                              │
   │  │  ───────────────────────────────────────     │
   │  │  Today's attendance · 72%                    │
   │  │  State avg 88% · School avg 79% · −16 pts    │
   │  │                                              │
   │  │  Why it's low:                               │
   │  │   • 9 students unmarked at 11:20 AM          │
   │  │   • 2 chronic absentees today                │
   │  │   • 7-day trend dropped 4 pts                │
   │  │                                              │
   │  │  [ Mark attendance now ›  ]  ← primary CTA   │
   │  │  [ See chronic list ›     ]  ← secondary    │
   │  └──────────────────────────────────────────────┘
   │
   ├─ Quick-reply chips seeded by the KPI:
   │   "Compare with last week" · "Why is the trend dropping?"
   │   "Show below-cutoff students"
   │
   └─ Free-typed text routes through useSwiftChatNlp → kpiNlp intents
      (KPI_RANK_WORST, KPI_COMPARE_PEER, KPI_FIX_FIRST, ...)
```

### Drill-down target — pre-filtered, not raw

The primary CTA on a KpiInsightCard opens a canvas with a **filter prop** so the user lands on the offending records only. **Illustrative examples** (the canonical mapping lives in `kpiActions.js`, finalised during implementation against the actual existing canvas APIs):

| KPI | CTA opens | Filter context |
|---|---|---|
| Attendance % (today) | `AttendanceCanvas` | `{ filter: 'unmarked', date: today }` |
| Chronic Absentee Students | `AtRiskStudentsCanvas` | `{ filter: 'chronic_absent', minDays: 7 }` |
| Students Below Proficiency % | `AtRiskStudentsCanvas` | `{ filter: 'below_proficiency', threshold: 40 }` |
| Scheme Beneficiary Mapping % | `DigiVrittiCanvas` | `{ view: 'pending_mapping' }` |
| Payment Completion % | `DigiVrittiCanvas` | `{ view: 'payment_queue', status: 'pending' }` |
| Reports Generated & Downloaded % | `ReportCanvas` | `{ view: 'pending_downloads' }` |
| TPD Hours Completion | bot chat trigger | resolves to an existing CPD-relevant bot ID in `roleConfig` (e.g. `Shikshak Sahayak` / `Remediation Bot`); exact ID picked during implementation when the bot-ID → chat-ID map is in front of us |

Canvas modules `AttendanceCanvas`, `AtRiskStudentsCanvas`, `DigiVrittiCanvas`, `ReportCanvas` each pick up an optional `filter`/`view` prop from `canvasContext` — ~5–10 lines each, no rewrites. Some KPIs may map to a chat-trigger rather than a canvas; `kpiActions.js` returns a discriminated union (`{kind:'canvas',...}` | `{kind:'chat',...}`) so the consumer doesn't need to know.

### Chat thread persistence

Each KPI tile tap creates a **fresh** chat thread (new `chatId`) via the existing `createChat()` API. The thread shows up in the sidebar's recency-grouped chat history and survives reload — the user can scroll back through past investigations. Multiple drill-downs on the same KPI create multiple threads (consistent with the rest of SwiftChat — bots already create new threads per session).

---

## 5. Full report card canvas

Triggered by:
- The "See all N ›" link on home (N = role's full KPI count).
- An explicit `openCanvas({ type: 'report_card' })` call from anywhere.
- A `kpiNlp` intent like *"open my full report card"*.

```
┌── Report card · Priya Mehta · Class 8·A ──────── [ × ] ─┐
│                                                          │
│  Overall · 68 / 100                                     │
│  ●●● 3 red   ●●●●  4 yellow   ●●● 3 green                │
│                                                          │
│  ── A1: Attendance & Access ─────────────────────────    │
│   [tile] Today's attendance · 72% · RED        Fix ›     │
│   [tile] Chronic absentees · 4 · YELLOW       Call ›     │
│   [tile] Reporting compliance · 95% · GREEN              │
│   [tile] EWS follow-up · 60% · YELLOW         Review ›   │
│                                                          │
│  ── A2: Assessment & Learning Outcomes ──────────────    │
│   [tile] Participation · 91% · GREEN                     │
│   [tile] Proficiency · 64% · YELLOW            Plan ›    │
│   [tile] Below proficiency · 11 · RED          Plan ›    │
│   [tile] ORF/FLN improvement · +6pp · GREEN              │
│                                                          │
│  ── A3: Adaptive Learning & Remediation ─────────────    │
│   [tile] Module completion · 82% · GREEN                 │
│   [tile] TPD hours · 38/50 · YELLOW           Resume ›   │
│   [tile] Identified for remediation · 18% · YELLOW       │
│   ...                                                    │
└──────────────────────────────────────────────────────────┘
```

### Overall score

`computeOverallScore(role, profile)` returns a 0–100 number computed as a weighted average across the role's KPIs:

```
score = (Σ statusWeight[kpi.status]) / (Σ maxWeight) × 100
where statusWeight: red=0, yellow=50, green=100
and   maxWeight=100 per KPI
```

Simple to compute, simple to explain to a user, and stable as we add KPIs to the doc. The header strip also shows raw counts (`3 red · 4 yellow · 3 green`).

### Talk to the data

The canvas uses SwiftChat's existing chat panel alongside it (canvases are right-side; chat stays on the left). Quick-reply chips are seeded by the canvas:

- *"Which KPI is dragging the score most?"* → `KPI_RANK_WORST` intent → ranked list card
- *"How does my score compare to school average?"* → `KPI_COMPARE_PEER` intent → comparison card
- *"What should I fix first?"* → `KPI_FIX_FIRST` intent → opens the worst KPI's drill-down

These are real intents (Phase 1, not later). Free-typed text routes through the same NLP path.

### RBAC

The new canvas type is added to every role's `ROLE_CANVASES` allow-list in `roleConfig.js` *except* `deo` (DEO has no report card in v1).

---

## 6. Architecture

### Module layout

```
src/
├── kpi/                              # new subsystem
│   ├── kpiCatalog.js                 # all 35 doc KPIs + parent KPIs + pfms aliases
│   ├── kpiEngine.js                  # compute, prioritise, computeOverallScore
│   ├── kpiData.js                    # role-keyed mock values + benchmarks
│   ├── kpiActions.js                 # KPI → drill-down resolver
│   └── kpiNlp.js                     # registers KPI intents with actionRegistry
│
├── components/kpi/                   # new UI
│   ├── ReportCardSection.jsx         # home section (hero + 3 small + see-all link)
│   ├── KpiTile.jsx                   # variant: 'hero' | 'compact'
│   ├── KpiBotStrip.jsx               # slim Apps strip
│   └── KpiInsightCard.jsx            # chat-bubble card for drill-downs
│
├── canvas/modules/
│   └── ReportCardCanvas.jsx          # full canvas grouped by 6A domain
│
├── pages/SuperHomePage.jsx           # swap bot-tile block → ReportCardSection + KpiBotStrip
├── canvas/CanvasPanel.jsx            # register report_card → ReportCardCanvas
├── App.jsx                           # add 'kpi' to CHAT_IDS
├── components/ChatBubble.jsx         # handle msg.type === 'kpi_insight'
├── roles/roleConfig.js               # add beo role; add report_card to ROLE_CANVASES
├── data/mockData.js                  # add USER_PROFILES.beo + DEMO_SSO_USERS entry
├── nlp/actionRegistry.js             # registered by kpiNlp.js
├── nlp/aiBootstrap.js                # imports kpiNlp at boot
└── canvas/modules/
    ├── AttendanceCanvas.jsx          # accept optional filter prop (~5 lines)
    ├── AtRiskStudentsCanvas.jsx      # accept optional filter prop (~5 lines)
    ├── DigiVrittiCanvas.jsx          # accept optional filter/view prop (~10 lines)
    └── ReportCanvas.jsx              # accept optional filter prop (~5 lines)
```

### `kpiCatalog.js` — entry shape

```js
{
  id: 'attendance_today',
  framework: 'A1',                           // A1..A6 | District | Parent | PFMS
  domain: 'Attendance & Access',             // display label for grouping
  shortName: "Today's attendance",
  description: 'Daily student attendance rate, calculated as ...',  // from xlsx
  roles: ['teacher', 'principal', 'crc', 'beo', 'state_secretary'],
  unit: '%',                                 // % | count | hours | score | currency
  direction: 'higher',                       // 'higher' | 'lower' (lower-is-better for count KPIs)
  benchmarkSource: 'state_avg',              // state_avg | cluster_avg | school_avg | fixed_target | none
  fixedTarget: null,                         // populated when benchmarkSource === 'fixed_target'
  statusBands: { green: 0, yellow: -10 },    // delta thresholds vs benchmark
  dataSource: 'Smart Attendance System (OAS)',          // from xlsx
  sourceDashboard: 'Attendance Live Dashboard (VSK)',   // from xlsx — informational
  drilldown: {
    canvasType: 'attendance',
    canvasContext: { filter: 'unmarked' },
    secondaryCanvas: null,
  },
  reasonBuilder: (ctx) => `${ctx.unmarked} students unmarked.`,
  ctaLabel: 'Mark attendance now',
}
```

### `kpiEngine.js` — public API

```js
getKpisForRole(role)                  → KpiCatalogEntry[]
computeKpi(kpi, role, profile)        → { value, benchmark, delta, status, reason, action }
prioritise(role, profile)             → ComputedKpi[]   // sorted, ready for ReportCardSection
computeOverallScore(role, profile)    → { score, counts: { red, yellow, green } }
```

### `kpiData.js` — fixture shape

```js
export const KPI_VALUES = {
  teacher:         { /* TCH1001 */ attendance_today: 72, chronic_absentees: 4, ... },
  principal:       { /* PRI2001 */ attendance_today: 84, schools_below_benchmark: 0, ... },
  crc:             { /* CRC1001 */ attendance_today: 86, ... },
  beo:             { attendance_today: 87, dropout_reduction: 2.1, ... },
  state_secretary: { attendance_today: 88, dropout_reduction: 2.4, ... },
  parent:          { /* child Ravi */ child_attendance: 91, child_proficiency: 78, ... },
  pfms:            { payment_completion: 92, pending_payments: 47, ... },
}

export const BENCHMARKS = {
  state_avg:   { attendance_today: 88, ... },
  cluster_avg: { CRC1001: { attendance_today: 86, ... } },
  school_avg:  { 'GPS-MEHSANA': { attendance_today: 79, ... } },
  fixed_target: { tpd_hours: 50, cpd_modules: 100 },
}
```

Numbers are chosen so every role has at least one red and one yellow KPI by default — guarantees the hero pattern always has something to show, and lets the green/empty state be tested by editing one row.

### `kpiNlp.js` — Phase 1 intents

| Intent | Trigger phrases | Output |
|---|---|---|
| `KPI_RANK_WORST` | "which KPI is dragging me down", "worst KPI", "what's pulling my score down" | Ranked list (top 5 by delta), each row tappable → drill-down chat |
| `KPI_COMPARE_PEER` | "compare with school", "how do I compare", "vs state avg" | Comparison card: my value vs school / cluster / state, per KPI |
| `KPI_FIX_FIRST` | "what should I fix first", "where do I start", "first action" | Opens the worst KPI's drill-down chat directly |
| `KPI_OPEN_REPORT_CARD` | "open my report card", "show me all KPIs", "full report card" | Opens `ReportCardCanvas` |
| `KPI_SUMMARY` | "summarise my report card", "report card overview" | Renders overall score + counts + 1-line summary |

Intents are registered with the existing `actionRegistry` + `permissionGuard` machinery. The action `run()` callback returns a `ChatMessage` (or fires `openCanvas()`), so the rest of the chat pipeline doesn't need to know about KPIs.

---

## 7. Status & benchmark rules

The engine's `computeStatus(kpi, value, benchmark)`:

```js
function computeStatus(kpi, value, benchmark) {
  if (value == null || benchmark == null) return 'unknown'
  const rawDelta = value - benchmark
  const delta = kpi.direction === 'lower' ? -rawDelta : rawDelta
  if (delta >= kpi.statusBands.green)  return 'green'
  if (delta >= kpi.statusBands.yellow) return 'yellow'
  return 'red'
}
```

| `benchmarkSource` | Resolution | Examples |
|---|---|---|
| `state_avg` | `BENCHMARKS.state_avg[kpiId]` | Attendance %, Proficiency %, Same-Day Reporting |
| `cluster_avg` | `BENCHMARKS.cluster_avg[clusterId][kpiId]` | School-level reporting compliance vs cluster |
| `school_avg` | `BENCHMARKS.school_avg[schoolId][kpiId]` | Chronic absentees in my class vs school avg |
| `fixed_target` | `BENCHMARKS.fixed_target[kpiId]` | TPD hours (target 50), CPD modules (target 100%) |
| `none` | n/a — status from absolute thresholds in `kpi.statusBands` | Repeat Pending Cases: 0 = green, 1–4 = yellow, 5+ = red |

**Counts (lower-is-better):** KPIs like *Chronic Absentees* or *Pending Payments* set `direction: 'lower'`. The engine inverts the delta so a lower-than-benchmark value still produces a positive (good) delta.

**Display strings** (kept consistent across surfaces):
- Hero tile bench line: `"State avg 88% · −16 pts"`
- Compact tile bench line: `"State avg 88%"` (no delta — saves room)
- KpiInsightCard bench line: full sentence — *"You're 16 points below the state average and 9 points below your school average."*

**Edge cases:**
- Missing benchmark → status = `unknown`, gray pill, no comparison line. Engine skips the tile from priority sort.
- Value is null → tile is **not rendered** (same as if KPI weren't in `roles[]`). Never a "data missing" placeholder. (Per user's explicit feedback during design.)

---

## 8. Tests

A QA harness already lives under `src/nlp/__tests__/` (run manually, not in `npm scripts`). Add:

- `src/kpi/__tests__/kpiEngine.test.mjs` — pure-function tests of `computeStatus`, `prioritise`, `computeOverallScore` for each role using fixture profiles. No DOM, no React.
- `src/kpi/__tests__/kpiCatalog.test.mjs` — schema validation: every entry has `roles[]`, valid `benchmarkSource`, etc. Asserts the catalog matches the doc counts (teacher 17, principal 32, crc 31, beo 35, state 35).
- `src/nlp/__tests__/kpiIntent.test.mjs` — extends the existing intent router test to cover the five new KPI intents.

Run via `node src/kpi/__tests__/kpiEngine.test.mjs` etc., consistent with the existing pattern.

---

## 9. Migration / rollout

- Pure additive frontend change; no schema migrations, no API changes, no backend.
- The existing `localStorage` keys are untouched.
- A new key `swiftchat.kpi.seeded.v1` could gate any future demo-data seeding, but for v1 the data lives entirely in `kpiData.js` as a static module — no seeding needed.
- BEO role addition: existing sessions hydrate from `localStorage`; users in other roles are not affected. To demo BEO, the user picks it from the SSO screen (we add `BEO001 — Mehul Patel — Mehsana Block Education Office` to `DEMO_SSO_USERS`).
- `npm run dev` is the only command needed. No deployment.

---

## 10. Out of scope (explicit non-goals)

- **No backend wiring.** All KPI values are mock. The user explicitly asked to keep this local.
- **No real-time data refresh.** KPI values are static per session.
- **No DEO report card.** DEO keeps existing bot tiles in v1. Adding district KPIs is a future iteration.
- **No KPI authoring UI.** The catalog is a developer-edited JS file; product can't add a new KPI without a code change.
- **No PWA-style notifications for KPI status changes.** That belongs to the existing notifications subsystem and would be a separate spec.
- **No A/B testing of tile densities or hero choice algorithm.**
- **No drag-to-reorder of tiles on home.** Priority is engine-computed.

---

## 11. Risks & open questions

1. **Quick-reply NLP coverage.** Five intents are wired in Phase 1. If the user types something off-script ("am I doing well?", "kya haal hai mera"), it falls through to the existing fallback. We accept this for the prototype.
2. **Mock data realism for 7 roles × ~30 KPIs.** Authoring ~150 numbers + benchmark sets is finger-typing; we'll keep them coarse but consistent (every role has at least one red, one yellow).
3. **`prioritise` stability.** If two KPIs tie on status + delta, ordering is by catalog order (deterministic). Acceptable for v1.
4. **BEO profile vs. existing SwiftChat fixtures.** We need to pick a real-sounding block. Using "Mehsana Block" keeps it close to the existing `GPS Mehsana` school fixture, so role-switching the demo feels coherent.
5. **Drill-down filter compatibility.** Three canvases need the new filter prop. If a canvas already filters internally (e.g. `AttendanceCanvas` showing today's class), the new prop should **augment**, not override. Implementation rule: filter prop is layered on top of canvas defaults, not in place of them.
