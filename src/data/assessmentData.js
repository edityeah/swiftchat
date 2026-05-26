// Assessment data layer for the XAMTA KPIs (A2: Assessment & Learning
// Outcomes). Drives the AssessmentDashboardCanvas + the print-to-PDF
// student report card. All data is synthesised deterministically from
// the SSMID + grade + subject so re-renders agree.
//
// Six KPIs surface this data:
//   assessment_participation       — % of enrolled students who appeared
//   proficiency                    — % at/above the result threshold
//   students_below_proficiency     — % scoring below result threshold
//   student_improvement_delta      — pp change vs last cycle
//   orf_fln_improvement            — Oral Reading Fluency + FLN levels
//   reports_generated_downloaded   — % schools that downloaded reports

import { STUDENTS } from './mockData'

// Subjects per grade. Class 3 has no Hindi; Class 8 adds Sanskrit.
const SUBJECTS_BY_GRADE = {
  1: ['Gujarati 1st Lang', 'Maths', 'EVS'],
  2: ['Gujarati 1st Lang', 'Maths', 'EVS'],
  3: ['Gujarati 1st Lang', 'Maths', 'EVS', 'English 2nd Lang'],
  4: ['Gujarati 1st Lang', 'Maths', 'EVS', 'English 2nd Lang', 'Hindi 2nd Lang'],
  5: ['Gujarati 1st Lang', 'Maths', 'EVS', 'English 2nd Lang', 'Hindi 2nd Lang'],
  6: ['Gujarati 1st Lang', 'Maths', 'Science', 'Social Science', 'English 2nd Lang', 'Hindi 2nd Lang'],
  7: ['Gujarati 1st Lang', 'Maths', 'Science', 'Social Science', 'English 2nd Lang', 'Hindi 2nd Lang'],
  8: ['Gujarati 1st Lang', 'Maths', 'Science', 'Social Science', 'English 2nd Lang', 'Hindi 2nd Lang', 'Sanskrit'],
}

export function subjectsForGrade(grade) {
  return SUBJECTS_BY_GRADE[grade] || SUBJECTS_BY_GRADE[6]
}

// Result threshold (mark % at/above which a student is "proficient").
export const PROFICIENCY_THRESHOLD = 50

function _hash(s) {
  let h = 0
  for (let i = 0; i < String(s).length; i++) h = ((h << 5) - h + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}
const _prng = (seed) => {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// Per-student per-subject assessment record. Returns:
//   { participated, scoreOutOf100, prevScore, los: [{ outcome, mark, total }], remedialLos: [...] }
//
// Synthesises around the student's `attendance` and `math/sci/guj` fields so
// poor-attendance students also tend to underperform — keeps the story
// consistent with the rest of the app.
const _studentAssessmentCache = new Map()
export function getStudentAssessment(student, subject) {
  const key = `${student.id}|${subject}`
  if (_studentAssessmentCache.has(key)) return _studentAssessmentCache.get(key)

  const seed = _hash(key)
  const rand = _prng(seed)

  // Participation: 90% base, dragged down 1pp per 1pp below 80 attendance.
  const att = student.attendance ?? 75
  const dropProb = Math.max(0, 0.95 - (att / 100) * 0.85)
  const participated = rand() > dropProb

  let scoreOutOf100 = null
  let prevScore = null
  if (participated) {
    // Bias score by the student's subject-area marks if available.
    let base = 50
    if (/maths/i.test(subject))      base = student.math ?? 60
    else if (/science|evs/i.test(subject)) base = student.sci ?? 60
    else if (/gujarati|hindi|english|sanskrit|language/i.test(subject)) base = student.guj ?? 60
    else                              base = (student.math + student.sci + student.guj) / 3 || 60
    const noise = (rand() - 0.5) * 16
    scoreOutOf100 = Math.max(5, Math.min(99, Math.round(base + noise)))
    prevScore = Math.max(5, Math.min(99, Math.round(base + noise - 3 + rand() * 8)))
  }

  // Learning outcomes (10 LOs per subject; each scored against its total).
  const los = []
  const remedialLos = []
  if (participated) {
    for (let i = 0; i < 10; i++) {
      const total = 4 + Math.floor(rand() * 9)            // total marks 4-12
      const ratio = Math.max(0.2, Math.min(1, scoreOutOf100 / 100 + (rand() - 0.5) * 0.4))
      const mark  = Math.round(total * ratio)
      const lo = {
        outcome: LO_SAMPLES[subject]?.[i] || `LO ${i + 1} for ${subject}`,
        mark, total,
      }
      los.push(lo)
      // Remedial = scored less than 50% on this LO.
      if (mark / total < 0.5) remedialLos.push(lo)
    }
  }

  const value = { participated, scoreOutOf100, prevScore, los, remedialLos }
  _studentAssessmentCache.set(key, value)
  return value
}

// LO descriptions (English placeholders — the real PDF was in Gujarati).
// 10 per subject; remedial set is auto-derived.
const LO_SAMPLES = {
  'Gujarati 1st Lang': [
    'Reads simple connected sentences with appropriate phrasing.',
    'Writes a short paragraph on a familiar topic.',
    'Identifies main idea + supporting detail in a passage.',
    'Uses common grammar (singular/plural, tense) correctly.',
    'Distinguishes prose, poem and dialogue.',
    'Composes a poem of 4 lines on a given topic.',
    'Spells common words correctly in dictation.',
    'Summarises a story in 4-5 sentences.',
    'Identifies parts of speech in a sentence.',
    'Engages in a 3-turn classroom dialogue.',
  ],
  'Maths': [
    'Reads and writes numbers up to 1,00,000.',
    'Performs 4-digit addition and subtraction with regrouping.',
    'Multiplies 3-digit by 2-digit numbers.',
    'Divides 4-digit by 1-digit with remainder.',
    'Identifies fractions, decimals on a number line.',
    'Solves 1-step word problems on money / length.',
    'Recognises 2D / 3D shapes by their properties.',
    'Reads a bar graph and pie chart.',
    'Estimates the result of an arithmetic operation.',
    'Solves a 2-step word problem.',
  ],
  'EVS': [
    'Names parts of a plant and their functions.',
    'Identifies common water sources around her village.',
    'Describes a balanced meal.',
    'Lists 3 features of his/her own neighbourhood.',
    'Distinguishes living vs non-living using examples.',
    'Identifies 3 modes of transport and their use.',
    'Explains why we wash hands before meals.',
    'Names festivals celebrated locally.',
    'Identifies safety rules at school + home.',
    'Describes how seeds germinate.',
  ],
  'Science': [
    'Classifies materials into solid / liquid / gas.',
    'Explains the water cycle with a labelled diagram.',
    'Describes photosynthesis at a basic level.',
    'Identifies the parts of a digestive system.',
    'Lists three reversible + three irreversible changes.',
    'Explains the difference between weather and climate.',
    'Names planets in order from the Sun.',
    'Designs a simple experiment with a hypothesis.',
    'Explains how a circuit works (battery, bulb, wires).',
    'Names different types of teeth and their function.',
  ],
  'Social Science': [
    'Locates state + capital on a political map of India.',
    'Names the three branches of government.',
    'Describes the Constitution\'s fundamental rights.',
    'Identifies 3 freedom fighters of Gujarat.',
    'Explains why we conserve water.',
    'Lists features of the Mughal era.',
    'Distinguishes urban vs rural in 2 ways.',
    'Reads a simple historical timeline.',
    'Names 3 industries of Gujarat + their products.',
    'Identifies major rivers of India on a map.',
  ],
  'English 2nd Lang': [
    'Reads short passages with appropriate intonation.',
    'Identifies subject + verb in a simple sentence.',
    'Uses common prepositions correctly.',
    'Writes a 3-line description of a picture.',
    'Picks an antonym / synonym from given options.',
    'Spells 10 common words from dictation.',
    'Forms a question from a given statement.',
    'Greets and introduces self in 3 sentences.',
    'Recites a 6-line poem with expression.',
    'Reads a short story and answers wh- questions.',
  ],
  'Hindi 2nd Lang': [
    'Reads simple Hindi sentences fluently.',
    'Writes a short letter to a friend.',
    'Identifies parts of speech in a sentence.',
    'Recites a 6-line Hindi poem.',
    'Spells 10 common Hindi words.',
    'Forms a question from a Hindi statement.',
    'Translates 5 simple sentences English → Hindi.',
    'Names 3 Hindi poets / writers.',
    'Identifies common Hindi grammar rules.',
    'Reads a short Hindi story and summarises.',
  ],
  'Sanskrit': [
    'Reads simple Sanskrit shlokas with correct accent.',
    'Identifies common Sanskrit words.',
    'Translates 3 simple Sanskrit sentences.',
    'Recites a 4-line shloka with meaning.',
    'Names 3 Sanskrit poets.',
    'Identifies Sanskrit grammar basics.',
    'Distinguishes shloka, sutra and mantra.',
    'Spells common Sanskrit words.',
    'Forms a question in Sanskrit.',
    'Reads a short Sanskrit passage.',
  ],
}

// ─── Roll-ups ─────────────────────────────────────────────────────────────

// Class-level participation + result for a given subject.
// Returns { totalStudents, participated, participationPct, avgScore, passedCount, belowCount, improvedCount, prevAvg }
export function classAssessmentRollup(grade, subject) {
  const students = STUDENTS[grade] || []
  if (!students.length) return null
  let participated = 0, totalScore = 0, totalPrevScore = 0, passedCount = 0, belowCount = 0, improvedCount = 0
  for (const s of students) {
    const a = getStudentAssessment(s, subject)
    if (a.participated) {
      participated++
      totalScore     += a.scoreOutOf100
      totalPrevScore += a.prevScore
      if (a.scoreOutOf100 >= PROFICIENCY_THRESHOLD) passedCount++
      else                                          belowCount++
      if (a.scoreOutOf100 - a.prevScore >= 5) improvedCount++
    }
  }
  const totalStudents = students.length
  const participationPct = totalStudents ? +((participated / totalStudents) * 100).toFixed(1) : 0
  const avgScore     = participated ? +(totalScore     / participated).toFixed(1) : 0
  const prevAvg      = participated ? +(totalPrevScore / participated).toFixed(1) : 0
  return {
    grade, subject, totalStudents, participated, participationPct,
    avgScore, prevAvg, deltaScore: +(avgScore - prevAvg).toFixed(1),
    passedCount, belowCount, improvedCount,
    passedPct: participated ? +((passedCount / participated) * 100).toFixed(1) : 0,
    belowPct:  participated ? +((belowCount  / participated) * 100).toFixed(1) : 0,
    improvedPct: participated ? +((improvedCount / participated) * 100).toFixed(1) : 0,
  }
}

// Per-student rows for the canvas table (single subject view).
export function studentsForAssessment(grade, subject) {
  const students = STUDENTS[grade] || []
  return students.map(s => {
    const a = getStudentAssessment(s, subject)
    return {
      id: s.id, ssmid: s.ssmid, name: s.name, grade,
      section: s.section, gender: s.gender,
      participated: a.participated,
      score: a.scoreOutOf100,
      prevScore: a.prevScore,
      delta: a.scoreOutOf100 != null && a.prevScore != null ? a.scoreOutOf100 - a.prevScore : null,
      remedialCount: a.remedialLos.length,
      risk: s.risk, ewsFlag: s.ewsFlag,
    }
  })
}

// School-level rollup — sums across all classes available.
export function schoolAssessmentRollup(subject) {
  const grades = Object.keys(STUDENTS).map(Number).sort((a, b) => a - b)
  const perClass = grades.map(g => classAssessmentRollup(g, subject)).filter(Boolean)
  if (!perClass.length) return null
  const totalStudents   = perClass.reduce((a, c) => a + c.totalStudents, 0)
  const participated    = perClass.reduce((a, c) => a + c.participated, 0)
  const totalScore      = perClass.reduce((a, c) => a + c.avgScore * c.participated, 0)
  const totalPrev       = perClass.reduce((a, c) => a + c.prevAvg  * c.participated, 0)
  const passedCount     = perClass.reduce((a, c) => a + c.passedCount, 0)
  const belowCount      = perClass.reduce((a, c) => a + c.belowCount, 0)
  const improvedCount   = perClass.reduce((a, c) => a + c.improvedCount, 0)
  return {
    subject,
    totalStudents, participated,
    participationPct: totalStudents ? +((participated / totalStudents) * 100).toFixed(1) : 0,
    avgScore: participated ? +(totalScore / participated).toFixed(1) : 0,
    prevAvg:  participated ? +(totalPrev  / participated).toFixed(1) : 0,
    deltaScore: participated ? +((totalScore - totalPrev) / participated).toFixed(1) : 0,
    passedCount, belowCount, improvedCount,
    passedPct: participated ? +((passedCount / participated) * 100).toFixed(1) : 0,
    belowPct:  participated ? +((belowCount  / participated) * 100).toFixed(1) : 0,
    improvedPct: participated ? +((improvedCount / participated) * 100).toFixed(1) : 0,
    perClass,
  }
}

// Scope-aware participation table for non-class scopes. Each row is a
// child entity (class for school scope, school for cluster, etc.).
//
// Returns { rows: [{ name, code, total, submitted, pct, avgScore }], totals }
export function scopedAssessmentBreakdown(scope, subject) {
  if (scope === 'school') {
    const grades = Object.keys(STUDENTS).map(Number).sort((a, b) => a - b)
    return {
      entityNoun: 'Class',
      rows: grades.map(g => {
        const r = classAssessmentRollup(g, subject)
        return { name: `Class ${g}`, code: String(g), total: r.totalStudents, submitted: r.participated, pct: r.participationPct, avgScore: r.avgScore }
      }),
    }
  }
  // For cluster/block/district/state we synthesise on top of the school-level
  // numbers so the demo always has rows. Replace with real backend later.
  const synthSeed = scope === 'cluster' ? 5 : scope === 'block' ? 14 : scope === 'district' ? 33 : 33
  const rows = []
  for (let i = 0; i < synthSeed; i++) {
    const name = scope === 'cluster' ? `Cluster school ${i + 1}`
              : scope === 'block'   ? `Block cluster ${i + 1}`
              : scope === 'district'? `District block ${i + 1}`
              :                       `District ${i + 1}`
    const rand = _prng(_hash(name + subject))
    const total = 200 + Math.floor(rand() * 3000)
    const pct = 85 + rand() * 14
    const submitted = Math.round(total * pct / 100)
    const avgScore = 50 + Math.floor(rand() * 40)
    rows.push({ name, code: `${100 + i}`, total, submitted, pct: +pct.toFixed(1), avgScore })
  }
  rows.sort((a, b) => b.pct - a.pct)
  return { entityNoun: scope === 'cluster' ? 'School' : scope === 'block' ? 'Cluster' : scope === 'district' ? 'Block' : 'District', rows }
}

// ─── Scope-aware participation tables (the BIG fix) ─────────────────────────
// Per the user's contract:
//   Teacher    → student-level (filtered by subject only — class is fixed)
//   Principal  → student-level (filtered by class + subject)
//   Cluster    → school-level  (filtered by grade + subject)
//   Block      → cluster-level (filtered by grade + subject)
//   District   → block-level   (filtered by grade + subject)
//   State      → district-level (filtered by grade + subject)
//
// Returns:
//   { kind: 'students' | 'schools' | 'clusters' | 'blocks' | 'districts',
//     entityNoun, rows: [{ name, code, ...metrics }], totals }
//
// Synth scopes use a deterministic PRNG keyed on (scope, subject, grade) so
// numbers stay stable while the user clicks subject / grade pills.
import { schoolsInCluster, schoolsInBlock, schoolsInDistrict, SCHOOLS, DISTRICTS, TEACHERS } from './registries'

// Block names per district. We combine the school sample + teacher sample +
// pad to match the master district's `blocks` count. So DEO Ahmedabad sees
// all 11 blocks instead of just the 2 that happen to be in the school
// sample. Padding names are common Gujarat talukas so the demo doesn't
// expose "Block 9" placeholders.
const _COMMON_GUJARAT_TALUKAS = [
  'AMC', 'MANDAL', 'BAVLA', 'DETROJ-RAMPURA', 'DHANDHUKA', 'DHOLERA',
  'DHOLKA', 'SANAND', 'VIRAMGAM', 'DASCROI', 'CITY', 'BARWALA',
  'KADI', 'KHERALU', 'VISNAGAR', 'VIJAPUR', 'UNJHA', 'BECHARAJI',
  'ANJAR', 'BHACHAU', 'GANDHIDHAM', 'MUNDRA', 'NAKHATRANA', 'RAPAR',
]
function blocksForDistrict(districtName) {
  // Real blocks in scope (from both samples), de-duplicated.
  const real = new Set()
  schoolsInDistrict(districtName).forEach(s => { if (s.block) real.add(s.block) })
  TEACHERS.filter(t => String(t.district).toUpperCase() === String(districtName).toUpperCase()).forEach(t => { if (t.block) real.add(t.block) })
  const master = DISTRICTS.find(d => String(d.name).toUpperCase() === String(districtName).toUpperCase())
  const target = master?.blocks || real.size || 1
  const out = [...real]
  // Pad with plausible-looking taluka names not already in the list.
  for (const tk of _COMMON_GUJARAT_TALUKAS) {
    if (out.length >= target) break
    if (!out.some(x => x.toUpperCase() === tk.toUpperCase())) out.push(tk)
  }
  return out.slice(0, target)
}

// Exported synth helpers so callers (e.g. AssessmentDashboardCanvas with
// hierarchical drill-down filters) can build their own scope tables off the
// same primitives — keeping the number-shape consistent across views.
export function _assessHash(s) { return _hash(s) }
export function _assessRollup(seed, total) { return _synthClasswiseRollup(seed, total) }

function _synthClasswiseRollup(seed, total) {
  // Returns { submitted, pct, present, absent }
  const rand = _prng(seed)
  const pct = 86 + rand() * 13       // 86-99%
  const submitted = Math.round(total * pct / 100)
  const presentPct = pct - (1 + rand() * 4)
  const present = Math.round(total * presentPct / 100)
  return {
    submitted, pct: +pct.toFixed(1),
    present, absent: total - present,
  }
}

export function participationForScope({ scope, role, profile, subject, grade }) {
  // ── Teacher ── student rows for the teacher's own class
  if (scope === 'class' || role === 'teacher' || role === 'parent') {
    const g = grade || profile?.classes?.[0] || 6
    const rows = (STUDENTS[g] || []).map(s => {
      const a = getStudentAssessment(s, subject)
      return {
        id: s.id, ssmid: s.ssmid, name: s.name, code: s.id,
        grade: g, section: s.section,
        participated: a.participated,
        score: a.scoreOutOf100, prevScore: a.prevScore,
        delta: a.participated ? a.scoreOutOf100 - a.prevScore : null,
        remedialCount: a.remedialLos.length,
        risk: s.risk, ewsFlag: s.ewsFlag,
      }
    })
    return {
      kind: 'students', entityNoun: 'Student',
      scope: 'class', scopeLabel: `Class ${g}`,
      rows,
      totals: {
        total: rows.length,
        submitted: rows.filter(r => r.participated).length,
        pct: rows.length ? +((rows.filter(r => r.participated).length / rows.length) * 100).toFixed(1) : 0,
      },
    }
  }

  // ── Principal ── student rows for the SELECTED class within the school
  if (scope === 'school' || role === 'principal') {
    const g = grade || 6
    const rows = (STUDENTS[g] || []).map(s => {
      const a = getStudentAssessment(s, subject)
      return {
        id: s.id, ssmid: s.ssmid, name: s.name, code: s.id,
        grade: g, section: s.section,
        participated: a.participated,
        score: a.scoreOutOf100, prevScore: a.prevScore,
        delta: a.participated ? a.scoreOutOf100 - a.prevScore : null,
        remedialCount: a.remedialLos.length,
        risk: s.risk, ewsFlag: s.ewsFlag,
      }
    })
    return {
      kind: 'students', entityNoun: 'Student',
      scope: 'school', scopeLabel: `${profile?.school || 'School'} · Class ${g}`,
      rows,
      totals: {
        total: rows.length,
        submitted: rows.filter(r => r.participated).length,
        pct: rows.length ? +((rows.filter(r => r.participated).length / rows.length) * 100).toFixed(1) : 0,
      },
    }
  }

  // ── Cluster (CRC) ── school-level rows for the cluster
  if (scope === 'cluster' || role === 'crc') {
    const clusterName = profile?.cluster || 'ANAND-6'
    const pool = schoolsInCluster(clusterName)
    const rows = pool.map(s => {
      const grade5Students = Math.max(15, Math.round((s.students || 100) / 8))   // ~1/8 of school per grade
      const r = _synthClasswiseRollup(_hash(`${s.schoolid}|${subject}|${grade}`), grade5Students)
      return {
        name: s.school, code: String(s.schoolid),
        total: grade5Students, submitted: r.submitted, pct: r.pct,
        present: r.present, absent: r.absent,
        avgScore: 55 + (_hash(`${s.schoolid}|${subject}`) % 35),
      }
    })
    rows.sort((a, b) => b.pct - a.pct)
    return {
      kind: 'schools', entityNoun: 'School',
      scope: 'cluster', scopeLabel: `Cluster ${clusterName}`,
      rows,
      totals: _aggregateTotals(rows),
    }
  }

  // ── Block (BEO) ── cluster-level rows for the block
  if (scope === 'block' || role === 'beo') {
    const blockName = profile?.block || 'ANAND'
    const pool = schoolsInBlock(blockName)
    // Group schools by cluster, then roll up.
    const byCluster = new Map()
    for (const s of pool) {
      const k = s.cluster || '—'
      if (!byCluster.has(k)) byCluster.set(k, [])
      byCluster.get(k).push(s)
    }
    const rows = [...byCluster.entries()].map(([cluster, schools]) => {
      const studentsPerGrade = schools.reduce((a, s) => a + Math.max(15, Math.round((s.students || 100) / 8)), 0)
      const r = _synthClasswiseRollup(_hash(`${cluster}|${subject}|${grade}`), studentsPerGrade)
      return {
        name: cluster, code: schools[0]?.clusterid ? String(schools[0].clusterid) : '—',
        total: studentsPerGrade, submitted: r.submitted, pct: r.pct,
        present: r.present, absent: r.absent,
        schoolCount: schools.length,
      }
    })
    rows.sort((a, b) => b.pct - a.pct)
    return {
      kind: 'clusters', entityNoun: 'Cluster',
      scope: 'block', scopeLabel: `Block ${blockName}`,
      rows,
      totals: _aggregateTotals(rows),
    }
  }

  // ── District (DEO) ── block-level rows for the district
  if (scope === 'district' || role === 'deo') {
    const distName = profile?.district || 'Ahmedabad'
    const blocks = blocksForDistrict(distName)
    // Master district has N students total — assume even split across blocks
    // and 1/12th per grade. This makes DEO see ALL blocks (not just the 1-2
    // that the SCHOOLS sample happens to contain).
    const master = DISTRICTS.find(d => String(d.name).toUpperCase() === String(distName).toUpperCase())
    const districtStudents = master?.students || 100_000
    const studentsPerGrade = Math.round(districtStudents / 12)
    const perBlockStudents = Math.max(150, Math.round(studentsPerGrade / blocks.length))
    const rows = blocks.map(block => {
      const r = _synthClasswiseRollup(_hash(`${block}|${subject}|${grade}|${distName}`), perBlockStudents)
      return {
        name: block, code: '—',
        total: perBlockStudents, submitted: r.submitted, pct: r.pct,
        present: r.present, absent: r.absent,
      }
    })
    rows.sort((a, b) => b.pct - a.pct)
    return {
      kind: 'blocks', entityNoun: 'Block',
      scope: 'district', scopeLabel: `${distName} district`,
      rows,
      totals: _aggregateTotals(rows),
    }
  }

  // ── State Secretary ── district-level rows
  const rows = DISTRICTS.map(d => {
    const studentsPerGrade = Math.max(2000, Math.round((d.students || 50000) / 12))
    const r = _synthClasswiseRollup(_hash(`${d.name}|${subject}|${grade}`), studentsPerGrade)
    return {
      name: d.name, code: String(d.districtId || '—'),
      total: studentsPerGrade, submitted: r.submitted, pct: r.pct,
      present: r.present, absent: r.absent,
      schoolCount: d.schools,
    }
  })
  rows.sort((a, b) => b.pct - a.pct)
  return {
    kind: 'districts', entityNoun: 'District',
    scope: 'state', scopeLabel: 'Gujarat',
    rows,
    totals: _aggregateTotals(rows),
  }
}

function _aggregateTotals(rows) {
  const total     = rows.reduce((a, r) => a + (r.total ?? 0), 0)
  const submitted = rows.reduce((a, r) => a + (r.submitted ?? 0), 0)
  const present   = rows.reduce((a, r) => a + (r.present ?? 0), 0)
  const absent    = rows.reduce((a, r) => a + (r.absent ?? 0), 0)
  return { total, submitted, present, absent, pct: total ? +((submitted / total) * 100).toFixed(1) : 0 }
}
