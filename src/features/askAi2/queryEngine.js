// ─────────────────────────────────────────────────────────────────────────────
// Ask-AI query engine — takes a free-form question, pattern-matches against
// the real registry data, and returns a card spec consumable by CardRenderer.
//
// When the OpenAI integration ships, this whole file is replaced by a single
// fetch() call that asks the model to emit the same card schema. UI is
// unchanged. The card schemas mirror KSK exactly so the prompt can be ported
// verbatim.
//
// Returned card schemas (see CardRenderer.jsx):
//   { type:'kpi_grid',    title, items:[{label, value, delta, tone, chip}] }
//   { type:'bar_chart',   title, data:[{label, value, color?}], orient, color, annotation, unit }
//   { type:'line_chart',  title, data:[{label, value}], color, annotation, unit }
//   { type:'donut_chart', title, data:[{label, value, color?}], annotation }
//   { type:'data_table',  title, columns:[{key,label,align,format}], rows:[{...}], annotation }
//   { type:'info',        title, body, bullets, tone }
// Every card may include `chips: string[]` — follow-up prompts.
// ─────────────────────────────────────────────────────────────────────────────

import { DISTRICTS, SCHOOLS, TEACHERS, AGGREGATES, titleCase } from '../../data/registries'
import { STATE_SUMMARY, NAMO_LAXMI_APPS } from '../../data/mockData'

// ─── Utility: tone bands from a percentage ─────────────────────────────────
function toneFor(pct) {
  if (pct >= 80) return 'emerald'
  if (pct >= 60) return 'amber'
  return 'rose'
}

// ─── Question matchers ─────────────────────────────────────────────────────
// Each matcher returns { card } when it handles the input, else null.

function tryDistrictLookup(q) {
  // "how many students in X district" / "schools in Y" / "teachers in Z"
  const m = q.match(/(?:students?|schools?|teachers?|classrooms?)\s+(?:in|of|at)\s+(?:the\s+)?([a-zA-Z][a-zA-Z\s]+?)(?:\s+district)?\??\s*$/i)
  if (!m) return null
  const target = m[1].trim()
  const d = DISTRICTS.find(x => x.name.toUpperCase().includes(target.toUpperCase()) || target.toUpperCase().includes(x.name.toUpperCase()))
  if (!d) return null
  const wantStudents = /student/i.test(q)
  const wantSchools  = /school/i.test(q)
  const wantTeachers = /teacher/i.test(q)
  if (wantStudents || wantSchools || wantTeachers) {
    return {
      card: {
        type: 'kpi_grid',
        title: `${titleCase(d.name)} — at a glance`,
        items: [
          { label: 'Schools',  value: d.schools.toLocaleString('en-IN'),  tone: 'primary' },
          { label: 'Teachers', value: d.teachers.toLocaleString('en-IN'), tone: 'sky'     },
          { label: 'Students', value: d.students >= 1e5 ? `${(d.students / 1e5).toFixed(1)} L` : d.students.toLocaleString('en-IN'), tone: 'emerald' },
          { label: 'Blocks',   value: d.blocks.toLocaleString('en-IN'),   tone: 'violet'  },
          { label: 'Clusters', value: d.clusters.toLocaleString('en-IN'), tone: 'indigo'  },
        ],
        chips: [
          `Top 5 districts by students`,
          `Schools in ${titleCase(d.name)}`,
          `Compare ${titleCase(d.name)} with state average`,
        ],
      },
    }
  }
  return null
}

function tryTopBottomDistricts(q) {
  const m = q.match(/(top|bottom)\s+(\d+)?\s*(districts?)?\s*(?:by\s+)?(students?|schools?|teachers?|attendance)?/i)
  if (!m) return null
  const dir = m[1].toLowerCase()
  const n = Number(m[2]) || 5
  const metricRaw = (m[4] || 'students').toLowerCase()
  const metric =
    metricRaw.startsWith('school')  ? 'schools'  :
    metricRaw.startsWith('teacher') ? 'teachers' :
    metricRaw.startsWith('attendance') ? 'attendance' :
    'students'

  // Synthesise attendance % per district from districtId for "attendance" metric
  const rows = DISTRICTS.map(d => {
    const seed = Number(d.districtId) || 0
    const attendance = 78 + ((seed * 17) % 14)
    return { name: titleCase(d.name), schools: d.schools, teachers: d.teachers, students: d.students, attendance }
  })
  const sorted = [...rows].sort((a, b) => dir === 'top' ? b[metric] - a[metric] : a[metric] - b[metric])
  const slice = sorted.slice(0, n)

  return {
    card: {
      type: 'bar_chart',
      title: `${dir === 'top' ? 'Top' : 'Bottom'} ${n} districts by ${metric}`,
      orient: 'horizontal',
      color: dir === 'top' ? 'emerald' : 'rose',
      unit: metric === 'attendance' ? '%' : metric,
      annotation: dir === 'top'
        ? `Highest ${metric} across Gujarat's ${DISTRICTS.length} districts.`
        : `These ${n} districts trail the state. Pulling them up has the largest absolute impact.`,
      data: slice.map(r => ({ label: r.name, value: metric === 'attendance' ? Number(r.attendance.toFixed(1)) : r[metric] })),
      chips: [
        `${dir === 'top' ? 'Bottom' : 'Top'} ${n} districts by ${metric}`,
        `Top 5 districts by ${metric === 'students' ? 'attendance' : 'students'}`,
        `Compare ${slice[0]?.name} and ${slice[1]?.name}`,
      ],
    },
  }
}

function tryStateOverview(q) {
  if (!/(state|overall|gujarat|summary|overview)/i.test(q)) return null
  if (!/(students?|schools?|teachers?|total|count|how many|summary|overview)/i.test(q)) return null
  return {
    card: {
      type: 'kpi_grid',
      title: 'Gujarat — state overview',
      items: [
        { label: 'Districts', value: AGGREGATES.districtCount, tone: 'violet' },
        { label: 'Blocks',    value: AGGREGATES.blockCount.toLocaleString('en-IN'),   tone: 'indigo' },
        { label: 'Clusters',  value: AGGREGATES.clusterCount.toLocaleString('en-IN'), tone: 'sky' },
        { label: 'Schools',   value: AGGREGATES.totalSchools.toLocaleString('en-IN'), tone: 'primary' },
        { label: 'Teachers',  value: `${(AGGREGATES.totalTeachers / 1000).toFixed(1)}K`, tone: 'emerald' },
        { label: 'Students',  value: `${(AGGREGATES.totalStudents / 1e7).toFixed(2)} Cr`, tone: 'amber' },
      ],
      chips: [
        'Top 5 districts by students',
        'Top 5 districts by attendance',
        'Show schools by management type',
      ],
    },
  }
}

function trySchoolsByManagement(q) {
  if (!/(management|govt|government|private|granted|tribal|by management|type)/i.test(q)) return null
  if (!/(school|distribution|breakdown|by)/i.test(q)) return null
  // Synthesise distribution
  const data = [
    { label: 'Government',  value: Math.round(AGGREGATES.totalSchools * 0.78), color: '#386AF6' },
    { label: 'Granted',     value: Math.round(AGGREGATES.totalSchools * 0.08), color: '#10B981' },
    { label: 'Private',     value: Math.round(AGGREGATES.totalSchools * 0.10), color: '#F59E0B' },
    { label: 'Tribal',      value: Math.round(AGGREGATES.totalSchools * 0.03), color: '#8B5CF6' },
    { label: 'Other',       value: Math.round(AGGREGATES.totalSchools * 0.01), color: '#F43F5E' },
  ]
  return {
    card: {
      type: 'donut_chart',
      title: 'Schools by management type',
      data,
      annotation: 'Government schools account for ~78% of all 55K schools in Gujarat.',
      chips: [
        'Schools by medium of instruction',
        'Top 5 districts by school count',
        'Attendance by management type',
      ],
    },
  }
}

function tryAttendanceTrend(q) {
  if (!/(attendance|present|absentee)/i.test(q)) return null
  if (!/(trend|over time|last \d+|past|week|month|monthly|weekly|history)/i.test(q)) return null
  // 8-week trend synthesised
  const weeks = ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'This wk']
  const values = [82, 83, 81, 85, 84, 86, 83, 85]
  return {
    card: {
      type: 'line_chart',
      title: 'State attendance — last 8 weeks',
      unit: '%',
      color: 'emerald',
      annotation: 'Holding steady around 83–85%. Dip in W-5 driven by Banaskantha and Patan exams.',
      data: weeks.map((w, i) => ({ label: w, value: values[i] })),
      chips: [
        'Top 5 districts by attendance',
        'Districts below 75% attendance',
        'Attendance vs scholarship correlation',
      ],
    },
  }
}

function tryScholarshipQuery(q) {
  if (!/(scholarship|namo|laxmi|saraswati|disbursed|dbt|payment)/i.test(q)) return null
  // Aggregate Namo Laxmi by status
  const counts = (NAMO_LAXMI_APPS || []).reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, { approved: 0, pending: 0, rejected: 0 })
  // Synthesise headline disbursal stats
  const disbursedThisMonth = 34572
  const disbursedAmount = '₹428 Cr'
  const blockedCount = 1128

  if (/last\s+month|this\s+month|disbursed|how many/i.test(q)) {
    return {
      card: {
        type: 'kpi_grid',
        title: 'Namo Lakshmi — this month',
        items: [
          { label: 'Disbursed',         value: disbursedThisMonth.toLocaleString('en-IN'), tone: 'emerald', delta: '+12% MoM' },
          { label: 'Amount',            value: disbursedAmount, tone: 'primary' },
          { label: 'Blocked',           value: blockedCount.toLocaleString('en-IN'), tone: 'rose', hint: 'Attendance < 80%, Aadhaar mismatch' },
          { label: 'Pending review',    value: '236', tone: 'amber' },
        ],
        chips: [
          'Reasons for blocked Namo Lakshmi payments',
          'Top districts by Namo Lakshmi success',
          'Namo Saraswati — this month',
          'Namo Lakshmi trend over last 6 months',
        ],
      },
    }
  }

  if (/block|fail|reject/i.test(q)) {
    return {
      card: {
        type: 'donut_chart',
        title: 'Namo Lakshmi — why payments are blocked',
        data: [
          { label: 'Attendance < 80%',      value: 743, color: '#F43F5E' },
          { label: 'Invalid bank details',  value: 215, color: '#F59E0B' },
          { label: 'Aadhaar mismatch',      value: 100, color: '#8B5CF6' },
          { label: 'Pending documents',     value: 70,  color: '#0EA5E9' },
        ],
        annotation: 'Attendance is the dominant blocker (66%). Improving attendance in bottom-5 districts unlocks ~₹9 Cr.',
        chips: ['Bottom 5 districts by attendance', 'Show retry workflow', 'Compare with Namo Saraswati'],
      },
    }
  }

  return {
    card: {
      type: 'kpi_grid',
      title: 'Scholarship snapshot',
      items: [
        { label: 'Namo Lakshmi approved', value: counts.approved, tone: 'emerald' },
        { label: 'Namo Lakshmi pending',  value: counts.pending,  tone: 'amber' },
        { label: 'Namo Lakshmi rejected', value: counts.rejected, tone: 'rose' },
        { label: 'Total apps',            value: (NAMO_LAXMI_APPS || []).length, tone: 'primary' },
      ],
      chips: [
        'Namo Lakshmi disbursed this month',
        'Why are payments blocked?',
        'Compare Namo Lakshmi and Namo Saraswati',
      ],
    },
  }
}

function trySchoolLookup(q) {
  const m = q.match(/schools?\s+(?:in|at|of)\s+(?:the\s+)?([a-zA-Z][a-zA-Z\s\-]+?)(?:\s+(?:district|block|cluster))?\??\s*$/i)
  if (!m) return null
  const target = m[1].trim().toUpperCase()
  const schoolsHere = SCHOOLS.filter(s =>
    (s.district || '').toUpperCase().includes(target) ||
    (s.block    || '').toUpperCase().includes(target) ||
    (s.cluster  || '').toUpperCase().includes(target),
  )
  if (schoolsHere.length === 0) return null
  return {
    card: {
      type: 'data_table',
      title: `Schools in ${titleCase(target)}`,
      annotation: `Showing ${Math.min(10, schoolsHere.length)} of ${schoolsHere.length} schools (sample from the 55K state-wide).`,
      columns: [
        { key: 'school',   label: 'School',    align: 'left'  },
        { key: 'block',    label: 'Block',     align: 'left'  },
        { key: 'students', label: 'Students',  align: 'right', format: 'number' },
        { key: 'teachers', label: 'Teachers',  align: 'right', format: 'number' },
      ],
      rows: schoolsHere.slice(0, 10).map(s => ({
        school: s.school,
        block: titleCase(s.block || ''),
        students: s.students,
        teachers: s.teachers,
      })),
      chips: [
        `Top 5 schools in ${titleCase(target)} by students`,
        `District summary — ${titleCase(target)}`,
        `Teachers in ${titleCase(target)}`,
      ],
    },
  }
}

function tryTeacherQuery(q) {
  if (!/teacher/i.test(q)) return null
  if (!/(how many|count|total|number of)/i.test(q)) return null
  return {
    card: {
      type: 'kpi_grid',
      title: 'Teachers across Gujarat',
      items: [
        { label: 'Total active', value: AGGREGATES.totalTeachers.toLocaleString('en-IN'), tone: 'primary' },
        { label: 'Per school',   value: Math.round(AGGREGATES.totalTeachers / AGGREGATES.totalSchools), tone: 'sky', hint: 'Average' },
        { label: 'Districts',    value: AGGREGATES.districtCount, tone: 'violet' },
        { label: 'Teacher : Student', value: `1 : ${Math.round(AGGREGATES.totalStudents / AGGREGATES.totalTeachers)}`, tone: 'emerald' },
      ],
      chips: [
        'Top 5 districts by teacher count',
        'Teacher : student ratio by district',
        'Teachers by designation',
      ],
    },
  }
}

// ─── Additional matchers for common askAi prompts ─────────────────────────

function tryHighestRiskDistricts(q) {
  if (!/(highest risk|risk.*district|risky districts|risk top)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'Districts with highest risk',
      orient: 'horizontal',
      color: 'rose',
      unit: '% risk',
      annotation: '5 districts have distinct, high-priority risks needing different interventions.',
      data: [
        { label: 'Dahod',        value: 90.9, color: 'rose' },
        { label: 'Banaskantha',  value: 78.4, color: 'amber' },
        { label: 'Dang',         value: 60.0, color: 'amber' },
        { label: 'Kachchh',      value: 52.1, color: 'sky' },
        { label: 'Panchmahals',  value: 47.2, color: 'sky' },
      ],
      chips: [
        'Why is Dahod at 90.9%?',
        'Open district comparison',
        'Compare risk types across districts',
      ],
    },
  }
}

function tryLowestPaymentSuccess(q) {
  if (!/(lowest payment|payment success|success rate.*low|payment.*fail|payment.*block)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'Districts with lowest payment success rate',
      orient: 'horizontal',
      color: 'rose',
      unit: '% success',
      annotation: '5 districts are below 70% payment success. Common cause: Aadhaar mismatch + bank validation.',
      data: [
        { label: 'Dahod',       value: 62.4, color: 'rose' },
        { label: 'Dang',        value: 64.1, color: 'rose' },
        { label: 'Kachchh',     value: 66.8, color: 'amber' },
        { label: 'Banaskantha', value: 68.3, color: 'amber' },
        { label: 'Panchmahals', value: 69.5, color: 'amber' },
      ],
      chips: [
        'Why are payments blocked?',
        'Show retry workflow',
        'Top 5 districts by payment success',
      ],
    },
  }
}

function tryXamtaFollowup(q) {
  if (!/(xamta|data.entry|follow.?up.*xamta|xamta.*follow|data.entry.*follow)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'Districts needing XAMTA data-entry follow-up',
      orient: 'horizontal',
      color: 'amber',
      unit: '% pending',
      annotation: 'Pending XAMTA scans by district. Schools below 50% completion need a BRC nudge today.',
      data: [
        { label: 'Banaskantha',  value: 58.4 },
        { label: 'Kachchh',      value: 52.0 },
        { label: 'Panchmahals',  value: 47.5 },
        { label: 'Dahod',        value: 42.1 },
        { label: 'Dang',         value: 38.8 },
      ],
      chips: [
        'Show schools below 50% XAMTA',
        'Send broadcast to BRC officers',
        'XAMTA trend over last 4 weeks',
      ],
    },
  }
}

function tryNamoComparison(q) {
  if (!/(namo lakshmi.*namo saraswati|namo saraswati.*namo lakshmi|compare.*namo|namo.*performance|scheme.*compare)/i.test(q)) return null
  return {
    card: {
      type: 'donut_chart',
      title: 'Namo Lakshmi vs Namo Saraswati — beneficiaries',
      data: [
        { label: 'Namo Lakshmi (approved)',   value: 34572, color: '#10B981' },
        { label: 'Namo Lakshmi (blocked)',    value: 1128,  color: '#F43F5E' },
        { label: 'Namo Saraswati (approved)', value: 21840, color: '#386AF6' },
        { label: 'Namo Saraswati (pending)',  value: 612,   color: '#F59E0B' },
      ],
      annotation: 'Namo Lakshmi serves ~1.6× the Namo Saraswati base; success rates similar (~97%).',
      chips: [
        'Why are Namo Lakshmi payments blocked?',
        'Namo Saraswati district-wise breakdown',
        'Combined disbursement trend',
      ],
    },
  }
}

function tryScholarshipFunnel(q) {
  if (!/(scholarship.*funnel|funnel.*scholarship|state.level scholarship|application.*funnel)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'State-level scholarship funnel',
      orient: 'horizontal',
      color: 'primary',
      unit: 'applications',
      annotation: '5-stage funnel from application to disbursement. Biggest drop: documents → approval.',
      data: [
        { label: 'Applied',          value: 48200 },
        { label: 'Documents OK',     value: 39600 },
        { label: 'CRC approved',     value: 36800 },
        { label: 'BEO/DEO approved', value: 35100 },
        { label: 'Disbursed',        value: 34572 },
      ],
      chips: [
        'Why do documents fail validation?',
        'CRC approval bottlenecks',
        'Disbursement trend last 6 months',
      ],
    },
  }
}

function tryTopActions(q) {
  if (!/(top \d+.*action|state action|priority action|action.*week|top.*priorit)/i.test(q)) return null
  return {
    card: {
      type: 'info',
      tone: 'insight',
      title: 'Top 3 state actions this week',
      body: 'Based on this week\'s KPI deltas across attendance, scholarship and grievances:',
      bullets: [
        '🔴 Escalate Dahod payment-success cleanup — 4,780 stuck applications; potential ₹9 Cr unblocked.',
        '🟡 Broadcast XAMTA reminder to Banaskantha + Kachchh BRC — 58% and 52% pending respectively.',
        '🟢 Replicate Surendranagar attendance playbook to bottom-5 districts (Aravalli, Botad, Gandhinagar).',
      ],
      chips: [
        'Open district comparison',
        'Create state notification',
        'Why is Dahod payment-success low?',
      ],
    },
  }
}

// ─── Cross-referenced with VSK KPI Framework (Iteration-1) ─────────────────
// Each matcher below corresponds to a query in
// Swift Insight 3.0 - KPI Review - Iteration-1.xlsx that maps to one or
// more KPIs in the Gujarat VSK KPI Framework. The list is intentionally
// scoped — only queries with a strong VSK cross-reference are simulated.

// #1 — "Analyze the attendance scenario in the state for the upcoming review"
//   VSK A1: Attendance %, Chronic absentees, Reporting compliance
function tryAttendanceScenario(q) {
  if (!/(attendance scenario|attendance.*state|state.*attendance|review.*attendance|attendance.*review)/i.test(q)) return null
  return {
    card: {
      type: 'kpi_grid',
      title: 'State attendance scenario — today',
      annotation: 'Snapshot for the review meeting. Drill into any tile for district / block breakdown.',
      items: [
        { label: "Today's attendance",     value: '85.4%', delta: '−2.6 pts vs last week', color: 'amber' },
        { label: 'Chronic absentees',      value: '4,820', delta: '+312 vs last month',     color: 'rose'  },
        { label: 'Schools below benchmark',value: '184',   delta: '+12 vs last week',       color: 'rose'  },
        { label: 'Teacher attendance',     value: '92.1%', delta: '−0.8 pts',               color: 'emerald' },
        { label: 'Schools reported today', value: '93%',   delta: 'Target 95%',             color: 'amber' },
        { label: 'Districts in red',       value: '6 / 33',delta: 'vs 4 last week',         color: 'rose'  },
      ],
      chips: [
        'Top 5 districts by attendance',
        'Bottom 5 districts by attendance',
        'Schools that haven\'t submitted today',
        '7-day attendance trend',
      ],
    },
  }
}

// #2 — "Identify the 3 most poorly performing hilly districts and reasons"
//   VSK A1 + A2 + A5
function tryHillyDistrictsBottom(q) {
  if (!/(hilly|hill.*district|poorly.performing.*hilly|hill.*poor|hilly.*reason)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: '3 poorest-performing hilly districts',
      orient: 'horizontal',
      color: 'rose',
      unit: '% composite (attendance + LEP)',
      annotation: 'Composite score combining attendance, LEP proficiency, and quality benchmark. Common drivers: distance to school, teacher vacancies, monsoon access.',
      data: [
        { label: 'Dang',         value: 58.4, color: 'rose' },
        { label: 'Kachchh',      value: 62.8, color: 'rose' },
        { label: 'Chhotaudepur', value: 65.1, color: 'amber' },
      ],
      chips: [
        'Why is Dang under-performing?',
        'Compare hilly vs plains districts',
        'Send broadcast to hilly BEOs',
        'Open intervention plan',
      ],
    },
  }
}

// #12 — "State's current compliance rate for functional toilets / water / electricity"
//   VSK A5: GSQAC score (Quality)
function tryInfraCompliance(q) {
  if (!/(toilet|drinking water|electricity|infra.*compliance|infrastructure.*compliance|functional.*toilet)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'Infrastructure compliance — state',
      orient: 'horizontal',
      color: 'sky',
      unit: '% schools compliant',
      annotation: 'Drinking water and electricity near saturation; functional toilets the biggest gap (5,400 schools below standard).',
      data: [
        { label: 'Drinking water',     value: 98.2 },
        { label: 'Electricity',        value: 96.7 },
        { label: 'Boundary wall',      value: 89.3 },
        { label: 'Functional toilets', value: 90.3 },
        { label: 'Ramps (CWSN)',       value: 82.6 },
        { label: 'Internet',           value: 76.1 },
      ],
      chips: [
        'Schools with broken toilets',
        'Districts below 90% on toilets',
        'Compare with last cycle',
        'Unspent infrastructure grants',
      ],
    },
  }
}

// #18 — "State/District average LEP performance by grade and subject"
//   VSK A2: Proficiency %, ORF/FLN improvement
function tryLepByGradeSubject(q) {
  if (!/(lep.*grade|lep.*subject|lep performance|grade.*subject|average.*lep)/i.test(q)) return null
  return {
    card: {
      type: 'data_table',
      title: 'State LEP proficiency — last assessment cycle',
      annotation: 'Class 3 is below 60% in Math and Science — strongest case for FLN intervention.',
      columns: ['Grade', 'Math', 'Science', 'English', 'Gujarati'],
      rows: [
        ['Class 3',  '58%', '54%', '67%', '78%'],
        ['Class 5',  '62%', '60%', '69%', '76%'],
        ['Class 8',  '66%', '64%', '71%', '74%'],
        ['Class 10', '63%', '61%', '70%', '72%'],
      ],
      chips: [
        'Top 5 districts in Math Class 3',
        'Trend over last 3 cycles',
        'Bottom 5 districts',
        'Open FLN intervention plan',
      ],
    },
  }
}

// #19 — "Top and bottom 5 districts/blocks/schools by LEP score"
//   VSK A2: Proficiency %, Students below proficiency
function tryTopBottomLep(q) {
  if (!/(top.*lep|bottom.*lep|lep.*top|lep.*bottom|districts.*lep|lep.*district)/i.test(q)) return null
  return {
    card: {
      type: 'bar_chart',
      title: 'Districts by LEP score — last cycle',
      orient: 'horizontal',
      color: 'primary',
      unit: '% proficient',
      annotation: '17 pp gap between best (Mehesana) and worst (Dahod). Top three follow same teacher-attendance pattern.',
      data: [
        { label: 'Mehesana',     value: 78.1, color: 'emerald' },
        { label: 'Surendranagar',value: 74.6, color: 'emerald' },
        { label: 'Anand',        value: 73.2, color: 'emerald' },
        { label: '… mid 28 districts …', value: 65.4, color: 'slate' },
        { label: 'Banaskantha',  value: 62.1, color: 'amber' },
        { label: 'Kachchh',      value: 61.0, color: 'amber' },
        { label: 'Dahod',        value: 61.1, color: 'rose' },
      ],
      chips: [
        'By grade and subject',
        'Why is Mehesana the top performer?',
        'Bottom-5 deep dive',
        'Generate state notification',
      ],
    },
  }
}

// #21 — "Schools with LEP score < threshold AND critical TSR/infra/attendance"
//   VSK A1 + A2 + A5 — multi-issue at-risk schools
function tryMultiIssueSchools(q) {
  if (!/(low lep.*critical|lep.*infra.*attendance|multi.*issue|critical.*school|equity.*gap.*school|targeted support)/i.test(q)) return null
  return {
    card: {
      type: 'data_table',
      title: 'Schools below LEP threshold + critical attendance/infra',
      annotation: '142 schools meet ALL three criteria: LEP < 60%, attendance < 70%, infra score below state average. Highest concentration in Dahod and Banaskantha.',
      columns: ['School', 'Block', 'LEP %', 'Att. %', 'Infra'],
      rows: [
        ['GPS Khedbrahma',     'Khedbrahma',  '52%', '64%', 'D'],
        ['GPS Limkheda',       'Limkheda',    '54%', '66%', 'D'],
        ['GPS Devgadbaria',    'Devgadbaria', '55%', '68%', 'C'],
        ['GPS Garbada',        'Garbada',     '57%', '69%', 'D'],
        ['GPS Sanjeli',        'Sanjeli',     '58%', '67%', 'C'],
        ['… 137 more rows',    '',            '',    '',    ''  ],
      ],
      chips: [
        'Show all 142 schools',
        'Group by block',
        'Open intervention plan',
        'Notify DEOs',
      ],
    },
  }
}

// #26 — "% of schools submitted all required data (attendance, infra, LEP)"
//   VSK A1 #4 Reporting compliance + A6 #27 Same-day reporting
function tryDataSubmissionCoverage(q) {
  if (!/(submitted.*data|data.*submit|submission.*rate|required data|reporting.*complete|all required)/i.test(q)) return null
  return {
    card: {
      type: 'donut_chart',
      title: 'Data submission coverage — latest cycle',
      annotation: '93.4% of schools have submitted all three required streams (attendance, infra, LEP). 3,672 schools have at least one stream missing.',
      data: [
        { label: 'All three submitted',  value: 51940, color: '#10B981' },
        { label: 'Two submitted',        value: 2380,  color: '#F59E0B' },
        { label: 'One submitted',        value: 891,   color: '#EF4444' },
        { label: 'None submitted',       value: 401,   color: '#DC2626' },
      ],
      chips: [
        'Schools missing attendance only',
        'Schools missing LEP only',
        'By district — submission rate',
        'Send reminder broadcast',
      ],
    },
  }
}

// #27 — "Schools with missing or anomalous data"
//   VSK A6 #29 Pending issues + #30 Repeat issues
function tryAnomalousSchools(q) {
  if (!/(anomalous|anomaly|missing data|extreme value|suspicious entry|data.*anomal)/i.test(q)) return null
  return {
    card: {
      type: 'data_table',
      title: 'Schools with missing or anomalous data — latest cycle',
      annotation: '218 schools flagged. Most common issue: attendance > 100% (data-entry typos). 41 are repeat offenders.',
      columns: ['School', 'District', 'Issue', 'Last update'],
      rows: [
        ['GPS Khedbrahma',  'Sabarkantha', 'Attendance 104%',           '2 days ago'],
        ['GPS Bayad',       'Aravalli',    'LEP scores all 100%',       '1 day ago' ],
        ['GPS Modasa',      'Aravalli',    'Missing infra updates ×3',  '5 days ago'],
        ['GPS Talod',       'Sabarkantha', 'No attendance for 7 days',  '7 days ago'],
        ['GPS Idar',        'Sabarkantha', 'Teacher count = 0',         '3 days ago'],
        ['… 213 more rows', '',            '',                          ''          ],
      ],
      chips: [
        'Group by issue type',
        'Repeat offenders only',
        'Send to BRC officers',
        'Cross-validate against UDISE',
      ],
    },
  }
}

// #29 — "Schools requiring data-entry correction or follow-up communication"
//   VSK A6 #31 Action taken on EWS-flagged cases
function tryDataEntryFollowup(q) {
  if (!/(data.entry correction|follow.?up communication|data.entry.*follow|correction.*needed|entry.*follow|correction.*school)/i.test(q)) return null
  return {
    card: {
      type: 'data_table',
      title: 'Schools needing data-entry correction or follow-up',
      annotation: '187 schools queued for follow-up. Recommended channels: SMS to principal (urgent) + email to BRC officer (routine).',
      columns: ['School', 'Block', 'Correction needed', 'Priority'],
      rows: [
        ['GPS Khedbrahma',   'Khedbrahma',  'Re-enter Sept attendance', 'High'  ],
        ['GPS Bayad',        'Bayad',       'Update infra status',      'Medium'],
        ['GPS Talod',        'Talod',       'Add teacher count',        'High'  ],
        ['GPS Idar',         'Idar',        'Verify LEP scores',        'Medium'],
        ['GPS Devgadbaria',  'Devgadbaria', 'Re-submit Q2 report',      'Low'   ],
        ['… 182 more rows',  '',            '',                          ''      ],
      ],
      chips: [
        'Send SMS to high-priority',
        'Queue email to BRC officers',
        'Filter by district',
        'Bulk acknowledge',
      ],
    },
  }
}

// ─── Main entry ────────────────────────────────────────────────────────────
const MATCHERS = [
  // VSK cross-referenced (Swift Insight 3.0 iteration-1)
  tryAttendanceScenario,
  tryHillyDistrictsBottom,
  tryInfraCompliance,
  tryLepByGradeSubject,
  tryTopBottomLep,
  tryMultiIssueSchools,
  tryDataSubmissionCoverage,
  tryAnomalousSchools,
  tryDataEntryFollowup,
  // Earlier matchers (Ask AI starter prompts)
  tryHighestRiskDistricts,
  tryLowestPaymentSuccess,
  tryXamtaFollowup,
  tryNamoComparison,
  tryScholarshipFunnel,
  tryTopActions,
  tryStateOverview,
  tryTopBottomDistricts,
  trySchoolsByManagement,
  tryAttendanceTrend,
  tryScholarshipQuery,
  tryDistrictLookup,
  trySchoolLookup,
  tryTeacherQuery,
]

export function answerQuery(query) {
  const q = String(query || '').trim()
  if (!q) return null

  for (const matcher of MATCHERS) {
    const out = matcher(q)
    if (out) return out
  }

  // Fallback: info card with relevant suggestions
  return {
    card: {
      type: 'info',
      tone: 'insight',
      title: 'I need a bit more to answer that',
      body: 'I can pull live numbers from the school, teacher and student registries, and from KPI snapshots. Try one of these:',
      bullets: [
        'How many students in Surat district?',
        'Top 5 districts by attendance',
        'Schools by management type',
        'Namo Lakshmi disbursed this month',
        'State overview',
      ],
      chips: [
        'State overview',
        'Top 5 districts by students',
        'Namo Lakshmi disbursed this month',
      ],
    },
  }
}

// Pre-baked role-aware suggested prompts shown on first open.
export function suggestedPromptsFor(role) {
  if (role === 'state_secretary') return [
    'State overview',
    'Top 5 districts by students',
    'Top 5 districts by attendance',
    'Bottom 5 districts by attendance',
    'Namo Lakshmi disbursed this month',
    'Why are Namo Lakshmi payments blocked?',
    'Schools by management type',
    'State attendance trend over last 8 weeks',
  ]
  if (role === 'deo') return [
    'How many students in Ahmedabad?',
    'Schools in Ahmedabad',
    'Top 5 blocks in my district by attendance',
    'Namo Lakshmi pending in my district',
    'Attendance trend in my district',
  ]
  if (role === 'beo') return [
    'How many schools in Mehsana block?',
    'Top 5 schools in my block by attendance',
    'Teacher count in my block',
    'Schools below 75% attendance',
  ]
  if (role === 'crc') return [
    'Schools in MADHAPAR cluster',
    'Pending DigiVritti reviews in cluster',
    'Top 3 schools in cluster',
    'Attendance trend in cluster',
  ]
  if (role === 'principal') return [
    'How many students in our school?',
    'Class-wise attendance today',
    'Teacher attendance breakdown',
    'Students at risk in our school',
    "Namo Lakshmi status for this school's students",
  ]
  if (role === 'teacher') return [
    "Who is absent in my class today?",
    'My class attendance trend',
    'Students below 80% attendance',
    'Namo Lakshmi eligibility in my class',
  ]
  if (role === 'parent') return [
    "How is my child's attendance this month?",
    "My child's latest assessment",
    'Namo Lakshmi status',
    'Homework due this week',
  ]
  if (role === 'pfms') return [
    'Namo Lakshmi disbursed this month',
    'Why are payments blocked?',
    'District-wise success rate',
    'Failed transactions in last 7 days',
  ]
  return [
    'State overview',
    'Top 5 districts by students',
    'Schools by management type',
  ]
}
