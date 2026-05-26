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
//   dataSource:       'Smart Attendance System (OAS)'   // from xlsx
//   sourceDashboard:  'Attendance Live Dashboard (VSK)' // from xlsx
//   drilldown:        { kind: 'canvas', canvasType, canvasContext } |
//                     { kind: 'chat', botId }          // resolved by kpiActions
//   ctaLabel:         'Mark attendance now'           // CTA button label
//   reasonBuilder:    ({ value, benchmark, delta, meta }) => string
// ─────────────────────────────────────────────────────────────────────────────

// Doc framework has 6 hierarchy columns: Teacher / School-Principal / Cluster
// (CRC) / Block (BEO) / District (DEO) / State (State Secretary). Every list
// below now includes `deo` because the doc's District column has a value for
// every row — DEO is a full administrative tier with the same KPI surface as
// State Secretary, just scoped to one district.
const ALL_DOC_ROLES = ['teacher', 'principal', 'crc', 'beo', 'deo', 'state_secretary']
const FROM_PRINCIPAL = ['principal', 'crc', 'beo', 'deo', 'state_secretary']
const BLOCK_AND_STATE = ['beo', 'deo', 'state_secretary']            // doc rows 26-28
const PRINCIPAL_BLOCK_STATE = ['principal', 'beo', 'deo', 'state_secretary']  // doc row 29
// All KPIs in the catalog now map 1:1 to the Gujarat VSK KPI Framework PDF.
// Each row's `roles` array lists only the columns that have a value (not "—")
// in the doc — that's why teachers see 13, principals 26, cluster 25, block
// 29, and state 29.

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
    // Drilldown to the school-level cohort canvas (was student canvas — wrong
    // for a school-count KPI).
    drilldown: { kind: 'canvas', canvasType: 'schools-at-risk', canvasContext: { filter: 'schools_below_benchmark' } },
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
  // (Removed `ews_followup_completed` — not in the Gujarat VSK KPI Framework
  // doc. EWS follow-up is still surfaced via the EWS canvas, but is no longer
  // tracked as a top-level KPI on anyone's report card.)

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
    // Assessment KPIs drilldown into the dedicated AssessmentDashboardCanvas
    // — six sub-views (participation / result / below / delta / ORF-FLN /
    // reports) keyed off the kpiId passed in the context.
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'assessment_participation' } },
    ctaLabel: 'See absent students',
    reasonBuilder: ({ meta }) => `${meta?.absentCount ?? 0} students missed the last assessment.`,
  },
  {
    id: 'proficiency',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Assessment result %',
    description: 'Percentage of students who passed (scored at or above the result threshold) in the most recent assessment cycle. Calibrated against PARAKH benchmarks.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Xamta App + PARAKH',
    sourceDashboard: 'Gyan Prabhav Reports',
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'proficiency' } },
    ctaLabel: 'Open assessment report',
    reasonBuilder: ({ delta }) => `${Math.abs(delta).toFixed(0)} pts below state average.`,
  },
  {
    id: 'students_below_proficiency',
    framework: 'A2', domain: 'Assessment & Learning Outcomes',
    shortName: 'Below assessment result',
    description: 'Percentage of assessed students scoring below the result threshold (e.g., <40%). Segmented into score buckets for targeted intervention.',
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'lower',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'Xamta App + Gyan Prabhav',
    sourceDashboard: 'Gyan Prabhav Analytics',
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'students_below_proficiency' } },
    ctaLabel: 'Plan intervention',
    reasonBuilder: ({ meta }) => `${meta?.studentCount ?? 0} students below result threshold. ${meta?.priorityCount ? `${meta.priorityCount} need urgent support.` : ''}`,
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
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'student_improvement_delta' } },
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
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'orf_fln_improvement' } },
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
    drilldown: { kind: 'canvas', canvasType: 'assessment-dashboard', canvasContext: { kpiId: 'reports_generated_downloaded' } },
    ctaLabel: 'Open pending downloads',
    reasonBuilder: ({ meta }) => `${meta?.pendingSchools ?? 0} schools have not downloaded reports yet.`,
  },

  // ─── A3: Adaptive Learning & Remediation ───────────────────────────────────
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
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'tpd_progress' } },
    ctaLabel: 'Open training progress',
    reasonBuilder: ({ value }) => `${value} of 50 hours logged.`,
  },
  // (Removed `students_identified_remediation`, `students_receiving_remediation`,
  //  and `improvement_after_intervention` — not in the Gujarat VSK KPI Framework
  //  doc. Doc's CPD-for-Teachers domain only carries Module completion and
  //  Teacher TPD hours; remediation is surfaced via the at-risk-students canvas
  //  rather than as a top-level KPI.)

  // ─── A4: Administration & Service Delivery ─────────────────────────────────
  //  All 5 use roles: [...FROM_PRINCIPAL, 'pfms']
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

  // ─── A5: Accreditation & School Quality ────────────────────────────────────
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
    // Drilldown to the school-level cohort canvas (was student canvas — wrong
    // for a low-performing-schools KPI).
    drilldown: { kind: 'canvas', canvasType: 'schools-at-risk', canvasContext: { filter: 'low_performing_schools' } },
    ctaLabel: 'Open improvement plans',
    reasonBuilder: ({ value }) => `${value} schools at C/D grade.`,
  },
  {
    id: 'gsqac_improvement_cycles',
    framework: 'A5', domain: 'Accreditation & School Quality',
    shortName: 'GSQAC Δ across cycles',
    description: 'Percentage-point change in a school\'s GSQAC score between consecutive cycles.',
    // Doc framework: applies to teachers too (Improvement across cycles %).
    roles: ALL_DOC_ROLES,
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
    // Doc framework: applies to teachers too (Improvement actions completed %).
    roles: ALL_DOC_ROLES,
    unit: '%', direction: 'higher',
    benchmarkSource: 'state_avg', fixedTarget: null,
    statusBands: { green: 0, yellow: -10 },
    dataSource: 'SMA + Saksham Shala',
    sourceDashboard: 'Saksham Shala (SS) Dashboard',
    drilldown: { kind: 'canvas', canvasType: 'report', canvasContext: { view: 'improvement_actions' } },
    ctaLabel: 'Open action tracker',
    reasonBuilder: ({ meta }) => `${meta?.openActions ?? 0} actions not yet closed.`,
  },

  // ─── A6: Governance, Monitoring & AI Efficiency ────────────────────────────
  // (Removed `same_day_reporting` and `dashboard_data_lag` — not in the
  //  Gujarat VSK KPI Framework doc. Doc's A6 carries only Pending issues
  //  count, Repeat issues %, and Action taken on flagged cases %.)
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

  // ─── District Level Tracking (Block + State only) ──────────────────────────
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

  // ─── Parent-scoped (child level) ───────────────────────────────────────────
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
]

export function getCatalogForRole(role) {
  return KPI_CATALOG.filter(k => k.roles.includes(role))
}
