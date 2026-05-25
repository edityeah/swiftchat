// Scope-aware at-risk cohort builder. Returns the SAME shape regardless of
// the role; the canvas then renders the filters / breakdowns relevant to that
// role. Keeping the shape uniform lets the chat handler send a single data
// block to OpenAI no matter the scope.
//
// Output:
//   {
//     scope: 'class' | 'school' | 'cluster' | 'block' | 'district' | 'state',
//     scopeLabel: 'Class 6' | 'Sardar Patel...' | ...,
//     totalStudents,
//     atRisk: { urgent, high, medium, low, total },
//     students: [...]   // the actual student records, with risk + flags
//     breakdowns: {
//       gender:    [{ label, count, pct }],
//       category:  [{ label, count, pct }],
//       classWise: [{ label, count, pct }],
//       schoolWise:[{ label, count, pct }],   // only meaningful for cluster+
//       districtWise:[{ label, count, pct }], // only for state
//       predictors:[{ label, pct }],          // attendance/social/etc.
//     }
//   }

import { STUDENTS } from './mockData'
import { DISTRICTS } from './registries'

// ─── Risk tiers ──────────────────────────────────────────────────────────────
// URGENT = EWS-flagged (composite of low att + low LO)
// HIGH   = risk === 'high'    (but not also EWS)
// MEDIUM = risk === 'medium'
// LOW    = risk === 'low'
function tierOf(s) {
  if (s.ewsFlag) return 'urgent'
  if (s.risk === 'high')   return 'high'
  if (s.risk === 'medium') return 'medium'
  return 'low'
}

// Predictor weights — what % of the at-risk pool is flagged by each factor.
// Derived from the per-student fields we have; computed deterministically so
// every render agrees.
function computePredictors(students) {
  if (!students.length) return []
  const n = students.length
  const att = students.filter(s => (s.attendance ?? 100) < 75).length
  const lo  = students.filter(s => (s.math < 50 || s.sci < 50 || s.guj < 50)).length
  const sat = students.filter(s => s.math < 40).length          // SAT proxy = lowest LO
  const soc = students.filter(s => ['SC','ST'].includes(s.socialCategory)).length
  const rte = students.filter(s => s.isRTE).length
  const econ = students.filter(s => s.isRTE || s.socialCategory === 'ST').length // very rough
  const geo = Math.round(n * 0.85)                              // synthesise — most live in rural
  return [
    { label: 'Attendance factors',    pct: Math.round((att / n) * 100) },
    { label: 'Geographical factors',  pct: Math.round((geo / n) * 100) },
    { label: 'SAT (LO) factors',      pct: Math.round((lo  / n) * 100) },
    { label: 'Social factors',        pct: Math.round((soc / n) * 100) },
    { label: 'School factors',        pct: Math.round((rte / n) * 100) },
    { label: 'Economic factors',      pct: Math.round((econ / n) * 100) },
  ]
}

function pctRow(label, count, total) {
  return { label, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }
}

function buildBreakdowns(students, opts = {}) {
  const total = students.length || 1

  // Gender
  const female = students.filter(s => s.gender === 'F').length
  const male   = students.filter(s => s.gender === 'M').length
  const gender = [
    pctRow('Female', female, total),
    pctRow('Male',   male,   total),
  ]

  // Social category
  const cats = ['General', 'OBC', 'SC', 'ST']
  const category = cats.map(c =>
    pctRow(c, students.filter(s => s.socialCategory === c).length, total)
  )

  // Class-wise (only meaningful if we have students from multiple grades)
  const grades = [...new Set(students.map(s => s.grade))].sort((a, b) => a - b)
  const classWise = grades.map(g =>
    pctRow(`Class ${g}`, students.filter(s => s.grade === g).length, total)
  )

  const predictors = computePredictors(students)

  return {
    gender, category, classWise, predictors,
    schoolWise: opts.schoolWise || null,
    districtWise: opts.districtWise || null,
  }
}

// ─── Public builder ─────────────────────────────────────────────────────────
// `filters` is a shallow object: { grade, classFilter, school, cluster, block, district, tierFilter }
// Only the fields relevant to the active scope are read; the rest are
// ignored, so callers can blast in a single filter object.
export function getAtRiskCohort(role, profile, filters = {}) {
  const tierMatcher = filters.tierFilter
    ? s => tierOf(s) === filters.tierFilter
    : s => tierOf(s) !== 'low' // default = exclude "on track"

  // ── Teacher ── single class
  if (role === 'teacher' || role === 'parent') {
    const grade = filters.grade || profile?.classes?.[0] || 6
    const all   = (STUDENTS[grade] || []).map(s => ({ ...s, grade }))
    const candidates = all.filter(tierMatcher)
    return buildResult({
      scope: 'class',
      scopeLabel: `Class ${grade}`,
      totalStudents: all.length,
      students: candidates,
    })
  }

  // ── Principal ── whole school (all grades in STUDENTS, optionally filtered by class)
  if (role === 'principal') {
    const allGrades = Object.keys(STUDENTS).map(Number)
    const grade = filters.grade || filters.classFilter || 'all'
    const pool = (grade === 'all'
      ? allGrades.flatMap(g => (STUDENTS[g] || []).map(s => ({ ...s, grade: g })))
      : (STUDENTS[Number(grade)] || []).map(s => ({ ...s, grade: Number(grade) }))
    )
    const candidates = pool.filter(tierMatcher)
    return buildResult({
      scope: 'school',
      scopeLabel: profile?.school || 'Sardar Patel Prathmik Shala',
      totalStudents: pool.length,
      students: candidates,
      // No school/district breakdown — only one school in scope.
    })
  }

  // ── CRC ── synthesise across N cluster schools (we only have one real
  //          school of mock students, so each "cluster school" mirrors that
  //          with a name tag and a slight risk-rate shift).
  if (role === 'crc') {
    const clusterName = filters.cluster || profile?.cluster || 'CLUSTER'
    const schools = synthCohortSchools(clusterName, 5)
    const candidates = schools.flatMap(s => s.students).filter(tierMatcher)
    const schoolWise = schools.map(s =>
      pctRow(s.name, s.students.filter(tierMatcher).length, candidates.length || 1)
    )
    return buildResult({
      scope: 'cluster',
      scopeLabel: clusterName,
      totalStudents: schools.reduce((a, s) => a + s.students.length, 0),
      students: candidates,
      breakdownExtras: { schoolWise },
    })
  }

  // ── BEO ── ~15 schools across the block
  if (role === 'beo') {
    const blockName = filters.block || profile?.block || 'BLOCK'
    const schools = synthCohortSchools(blockName, 15)
    const candidates = schools.flatMap(s => s.students).filter(tierMatcher)
    const schoolWise = topN(
      schools.map(s => pctRow(s.name, s.students.filter(tierMatcher).length, candidates.length || 1)),
      8
    )
    return buildResult({
      scope: 'block',
      scopeLabel: blockName,
      totalStudents: schools.reduce((a, s) => a + s.students.length, 0),
      students: candidates,
      breakdownExtras: { schoolWise },
    })
  }

  // ── DEO / State Secretary ── district-wise rollup using the registry.
  if (role === 'deo' || role === 'state_secretary') {
    const isState = role === 'state_secretary'
    const districtRows = DISTRICTS.map(d => {
      // ~0.78% of students flagged at risk on EWS (matches the screenshot)
      const flagged = Math.round((d.students || 0) * 0.0078)
      return { label: d.name, count: flagged, students: d.students }
    })
    const totalFlagged   = districtRows.reduce((a, r) => a + r.count, 0)
    const totalStudents  = districtRows.reduce((a, r) => a + r.students, 0)
    const districtWise   = topN(districtRows.map(r => pctRow(r.label, r.count, totalFlagged)), 8)
    // Build a representative SAMPLE student list using our STUDENTS pool —
    // it's not all 90,000 flagged kids, just enough to populate the table.
    const sample = sampleStudents(36)
    return buildResult({
      scope: 'state',
      scopeLabel: isState ? 'Gujarat (all 33 districts)' : (filters.district || profile?.district || 'District'),
      totalStudents,
      students: sample,
      // For state, override the "count" pill totals with the real district sum.
      counterOverride: { total: totalFlagged },
      breakdownExtras: { districtWise },
    })
  }

  // Fallback — empty cohort
  return buildResult({
    scope: 'class',
    scopeLabel: '—',
    totalStudents: 0,
    students: [],
  })
}

function buildResult({ scope, scopeLabel, totalStudents, students, breakdownExtras = {}, counterOverride }) {
  const counts = {
    urgent: students.filter(s => tierOf(s) === 'urgent').length,
    high:   students.filter(s => tierOf(s) === 'high').length,
    medium: students.filter(s => tierOf(s) === 'medium').length,
    low:    students.filter(s => tierOf(s) === 'low').length,
    total:  students.length,
  }
  if (counterOverride?.total) counts.total = counterOverride.total
  return {
    scope, scopeLabel,
    totalStudents,
    atRisk: counts,
    students,
    breakdowns: { ...buildBreakdowns(students), ...breakdownExtras },
  }
}

// ─── Synth helpers ──────────────────────────────────────────────────────────
// Build N "schools" worth of at-risk students by sampling STUDENTS.
function synthCohortSchools(scopeName, n) {
  const grades = Object.keys(STUDENTS).map(Number)
  const base = grades.flatMap(g => (STUDENTS[g] || []).map(s => ({ ...s, grade: g })))
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({
      name: `${scopeName.slice(0, 18)} School ${i + 1}`,
      students: base.map(s => ({ ...s, school: `${scopeName} School ${i + 1}` })),
    })
  }
  return out
}

function sampleStudents(n) {
  const grades = Object.keys(STUDENTS).map(Number)
  const all = grades.flatMap(g => (STUDENTS[g] || []).map(s => ({ ...s, grade: g })))
  return all.slice(0, n)
}

function topN(arr, n) {
  return [...arr].sort((a, b) => (b.count ?? b.pct ?? 0) - (a.count ?? a.pct ?? 0)).slice(0, n)
}
