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

// ─── Main entry ────────────────────────────────────────────────────────────
const MATCHERS = [
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
