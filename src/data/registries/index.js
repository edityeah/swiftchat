// ─────────────────────────────────────────────────────────────────────────────
// Registry helpers — single import surface for all registry-backed views.
//
// Source data:
//   districts.json      — 33 districts of Gujarat with school/teacher/student counts
//   schools_sample.json — 680 schools (20 per district) with computed counts
//   teachers_sample.json — 50 teachers per district (synthetic names, real metadata)
//   aggregates.json     — top-level totals
//
// PII handling: extraction scripts (in /scripts) explicitly avoid reading
// Aadhaar, mobile, email, parent names, DOB. Teacher names are synthesised
// from a pool. School/district names are real but public.
// ─────────────────────────────────────────────────────────────────────────────

import DISTRICTS from './districts.json'
import SCHOOLS   from './schools_sample.json'
import TEACHERS  from './teachers_sample.json'
import AGGREGATES from './aggregates.json'

export { DISTRICTS, SCHOOLS, TEACHERS, AGGREGATES }

// ─── Name matching helpers (real data is ALL CAPS; profiles use Title Case) ─
function norm(s) {
  return String(s || '').trim().toUpperCase()
}

// Profile spellings → canonical CSV spellings (real master data).
// The CSV uses idiosyncratic spellings like "MAHESANA" / "SABAR KANTHA" /
// "PANCH MAHALS"; profiles use the popular forms. This map lets fuzzyEq
// resolve both directions.
const DISTRICT_ALIASES = {
  'MEHSANA': 'MAHESANA',
  'MAHESANA': 'MEHSANA',
  'SABARKANTHA': 'SABAR KANTHA',
  'SABAR KANTHA': 'SABARKANTHA',
  'BANASKANTHA': 'BANAS KANTHA',
  'BANAS KANTHA': 'BANASKANTHA',
  'PANCHMAHAL': 'PANCH MAHALS',
  'PANCH MAHALS': 'PANCHMAHAL',
  'DAHOD': 'DOHAD',
  'DOHAD': 'DAHOD',
  'DANG': 'THE DANGS',
  'THE DANGS': 'DANG',
  'CHHOTA UDAIPUR': 'CHHOTAUDEPUR',
  'CHHOTAUDEPUR': 'CHHOTA UDAIPUR',
  'KACHCHH': 'KUTCH',
  'KUTCH': 'KACHCHH',
  'GIR SOMNATH': 'GIRSOMNATH',
  'GIRSOMNATH': 'GIR SOMNATH',
}

function fuzzyEq(a, b) {
  const A = norm(a), B = norm(b)
  if (!A || !B) return false
  if (A === B) return true
  if (A === DISTRICT_ALIASES[B] || B === DISTRICT_ALIASES[A]) return true
  // Last resort: contains check. "MAHESANA" contains "MEHSANA"? false, but
  // "JUNAGADH" contains "JUNA" yes — still useful for partial inputs.
  return A.includes(B) || B.includes(A)
}

export function titleCase(s) {
  if (s == null) return ''
  return String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Lookups ────────────────────────────────────────────────────────────────
export function findDistrict(districtName) {
  return DISTRICTS.find(d => fuzzyEq(d.name, districtName))
}

export function schoolsInDistrict(districtName) {
  return SCHOOLS.filter(s => fuzzyEq(s.district, districtName))
}

export function schoolsInBlock(blockName) {
  return SCHOOLS.filter(s => fuzzyEq(s.block, blockName))
}

export function schoolsInCluster(clusterName) {
  return SCHOOLS.filter(s => fuzzyEq(s.cluster, clusterName))
}

export function teachersInDistrict(districtName) {
  return TEACHERS.filter(t => fuzzyEq(t.district, districtName))
}

export function teachersInBlock(blockName) {
  return TEACHERS.filter(t => fuzzyEq(t.block, blockName))
}

export function teachersInCluster(clusterName) {
  return TEACHERS.filter(t => fuzzyEq(t.cluster, clusterName))
}

export function teachersInSchool(schoolId) {
  return TEACHERS.filter(t => t.schoolId === schoolId)
}

// Look up by teacher code (8-digit). Accepts string or number.
export function findTeacherByCode(code) {
  if (code == null) return null
  const n = Number(code)
  return TEACHERS.find(t => t.teacherCode === n || String(t.teacherCode) === String(code)) || null
}

// ─── Teacher profile synthesis ──────────────────────────────────────────────
// The registry has identity + posting (name, school, classes taught, etc.) but
// no behavioural data. We synthesise attendance %, TPD hours, performance and
// recognition deterministically from the teacher code so the same teacher
// shows the same numbers every render. PII fields (phone / email / Aadhaar)
// are NOT in the source JSON — we stub them with masked, plausible values.
function _hashCode(n) { return Math.abs(((Number(n) | 0) * 2654435761) % 4294967295) }

function _maskedPhone(seed) {
  const start = 9 - (seed % 3)
  const tail  = String(seed % 1_0000_0000).padStart(8, '0')
  return `${start}${tail[0]}${tail[1]} •• ${tail.slice(-4)}`
}

function _yrsBetween(fromDate) {
  if (!fromDate) return null
  const d = new Date(fromDate)
  if (isNaN(+d)) return null
  return Math.max(0, Math.round(((Date.now() - +d) / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10)
}

// Hierarchy peer percentile — where this teacher's metric sits in their peer
// group (school / cluster / block / district). Deterministic per teacher.
function _percentile(seed, salt) {
  const r = ((seed ^ salt) % 1000) / 1000
  // Bias toward middle (most teachers cluster around average).
  return Math.round(20 + r * 70) // 20-90
}

// ─── School profile synthesis ────────────────────────────────────────────────
// Like teachers, schools come from the registry with identity + posting but
// no behavioural data. We synthesise attendance %, submission %, GSQAC,
// dropout, infra score, HM (Head Master) details, etc. — all deterministic
// per school ID so re-renders agree and the same school looks identical
// across canvases.
const _PRINCIPAL_FIRSTS = ['Rakesh','Sunita','Mahesh','Hetal','Mukesh','Pooja','Hardik','Geeta','Niraj','Bhavna','Sanjay','Madhu']
const _PRINCIPAL_LASTS  = ['Joshi','Patel','Pandya','Trivedi','Mehta','Desai','Rao','Bhatt','Shah','Modi']

function _phone18(seed) {
  const start = 9 - (seed % 3)
  const tail  = String(seed % 100_000_000).padStart(8, '0')
  return `${start}${tail[0]}${tail[1]} •• ${tail.slice(-4)}`
}

export function findSchoolById(schoolId) {
  if (schoolId == null) return null
  const n = Number(schoolId)
  return SCHOOLS.find(s => s.schoolid === n || String(s.schoolid) === String(schoolId)) || null
}

// Build a deep school profile: identity + posting + headmaster + behavioural
// + recognition + infra. Used by SchoolProfileCanvas.
export function buildSchoolProfile(school) {
  if (!school) return null
  const seed = Math.abs(((Number(school.schoolid) | 0) * 2654435761) % 4294967295)

  // Headmaster (synthetic — no PII in source data)
  const hmFirst = _PRINCIPAL_FIRSTS[seed % _PRINCIPAL_FIRSTS.length]
  const hmLast  = _PRINCIPAL_LASTS[(seed >> 3) % _PRINCIPAL_LASTS.length]

  // Behavioural KPIs — deterministic from the school id. Spread across the
  // tone bands so the canvas always has a story to tell.
  const attendance  = 55 + (seed % 40)                 // 55-94
  const submissionPct = 60 + ((seed >> 4) % 38)         // 60-97
  const gsqac       = +(3 + ((seed >> 6) % 18) / 10).toFixed(1)  // 3.0-4.7
  const dropoutPct  = +(((seed >> 8) % 60) / 10).toFixed(1)      // 0.0-6.0
  const infraScore  = 50 + ((seed >> 10) % 50)          // 50-99
  const enrollmentDelta = ((seed >> 12) % 20) - 10      // -10..+10 year-on-year %
  const teacherAttendance = 85 + (seed % 14)            // 85-98

  // Risk tiering (mirrors the EWS dashboard logic)
  const flags = []
  if (attendance < 75) flags.push('Below attendance benchmark')
  if (submissionPct < 70) flags.push('Late on data submission')
  if (gsqac < 3.5) flags.push('Low GSQAC score')
  if (dropoutPct > 3) flags.push('Dropout above state avg')
  const tier = attendance < 60 || gsqac < 3.2 ? 'urgent'
             : attendance < 75 || flags.length >= 2 ? 'high'
             : attendance < 85 ? 'medium'
             : 'low'

  // Recognition / awards (sparse)
  const recognition = []
  if ((seed % 11) < 2) recognition.push('Saksham Shala 2024')
  if ((seed %  7) < 1) recognition.push('PM SHRI selected school')

  return {
    schoolId: school.schoolid,
    name: school.school,
    udise: String(school.schoolid),
    category: school.schoolcategory,
    management: school.schoolmanagement,
    classes: `${school.lowclass < 0 ? 1 : school.lowclass}-${school.highclass}`,
    location: school.school_location,
    medium: school.schoolmedium_desc,
    village: school.village,
    cluster: school.cluster,
    block: titleCase(school.block || ''),
    district: titleCase(school.district || ''),
    established: school.school_established_year,
    isActive: school.isactive,
    totalStudents: school.students,
    totalTeachers: school.teachers,
    headmaster: {
      name: `${hmFirst} ${hmLast}`,
      phone: _phone18(seed),
      tenureYears: 2 + (seed % 12),
    },
    // Behavioural KPIs (synthesised)
    attendance, submissionPct, gsqac, dropoutPct, infraScore,
    teacherAttendance, enrollmentDelta,
    tier, flags, recognition,
  }
}

// Returns a synthesised "full" teacher profile with behavioural + recognition
// + admin-system fields layered on top of the registry record.
export function buildTeacherProfile(teacher) {
  if (!teacher) return null
  const seed = _hashCode(teacher.teacherCode)

  // Classes taught (parse "{6,7,8}" → [6,7,8])
  const classes = String(teacher.classTaught || '')
    .replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n))

  // Attendance %, TPD hours, student LO improvement, parent satisfaction.
  // All deterministic from the teacher code so re-renders agree.
  const attendance   = 80 + (seed % 18)                        // 80-97
  const tpdHours     = 25 + ((seed >> 3) % 35)                 // 25-59 (target 50)
  const loDelta      = ((seed >> 5) % 10) - 3                  // -3..+6 percentage points
  const parentRating = +((3.6 + ((seed >> 7) % 14) / 10).toFixed(1)) // 3.6-4.9
  const yearsService = _yrsBetween(teacher.joiningDate) ?? (3 + (seed % 25))
  const isPunctual   = attendance >= 88
  const flagged      = attendance < 85 || tpdHours < 35

  // Recognition history — small list of awards / certifications.
  const allRecognition = [
    'State Best Teacher 2023',
    'Cluster STEM Champion 2024',
    'District Reading Mela Mentor',
    'Adarsh Shikshak Award 2022',
    'CCE Master Trainer',
    'NCERT Resource Person',
  ]
  const recognition = []
  if ((seed % 7) < 2) recognition.push(allRecognition[seed % allRecognition.length])
  if ((seed % 13) < 2) recognition.push(allRecognition[(seed >> 2) % allRecognition.length])

  // Subject ownership — derived from designation. Most teachers in primary
  // schools teach all subjects; higher-secondary teachers tend to specialise.
  const designation = teacher.designation || 'Teacher'
  const primarySubjects = ['Gujarati', 'Maths', 'EVS', 'Hindi', 'English']
  const secondarySubjects = ['Maths', 'Science', 'Social Studies', 'Gujarati', 'English']
  const subjects = /higher\s*secondary/i.test(designation)
    ? [secondarySubjects[seed % secondarySubjects.length]]
    : /secondary/i.test(designation)
      ? secondarySubjects.slice(0, 2 + (seed % 2))
      : primarySubjects

  return {
    // ── Identity (from registry) ──
    teacherCode: teacher.teacherCode,
    name: teacher.name,
    gender: teacher.gender,
    designation,
    qualification: teacher.qualification,
    additionalQualification: teacher.additionalQualification,
    teacherType: teacher.teacherType,
    category: teacher.category,
    classes,
    subjects,
    // ── Posting ──
    schoolId: teacher.schoolId,
    school: teacher.school,
    district: titleCase(teacher.district || ''),
    block: titleCase(teacher.block || ''),
    cluster: teacher.cluster,
    joiningYear: teacher.joiningYear,
    yearsService,
    // ── Synthesised demographic stubs (masked PII) ──
    phone: _maskedPhone(seed),
    email: `t${teacher.teacherCode}@vsk.gujarat.gov.in`,
    employeeId: `EMP${teacher.teacherCode}`,
    // ── Synthesised behavioural KPIs ──
    attendance,                    // % term-to-date
    tpdHours,                      // out of 50 target
    loDelta,                       // pp change in students' LO scores
    parentRating,                  // out of 5
    isPunctual,
    flagged,                       // attendance < 85 OR tpdHours < 35
    // ── Percentiles within each scope ──
    percentile: {
      school:   _percentile(seed, 1),
      cluster:  _percentile(seed, 2),
      block:    _percentile(seed, 3),
      district: _percentile(seed, 4),
      state:    _percentile(seed, 5),
    },
    recognition,
  }
}

// ─── Aggregation per scope (computed from DISTRICTS data) ───────────────────
export function aggregatesFor(scope, target) {
  if (scope === 'state' || !scope) {
    return {
      schools:  AGGREGATES.totalSchools,
      teachers: AGGREGATES.totalTeachers,
      students: AGGREGATES.totalStudents,
      label:    'Gujarat',
    }
  }
  if (scope === 'district') {
    const d = findDistrict(target)
    if (d) {
      return {
        schools:  d.schools,
        teachers: d.teachers,
        students: d.students,
        blocks:   d.blocks,
        clusters: d.clusters,
        label:    titleCase(d.name),
      }
    }
  }
  if (scope === 'block') {
    // Block-level aggregates: sum from the schools that match this block.
    // We only have 680 sampled schools so the sums are illustrative — for a
    // real demo this should drive a backend query.
    const inBlock = schoolsInBlock(target)
    return {
      schools:  inBlock.length,
      teachers: inBlock.reduce((s, x) => s + (x.teachers || 0), 0),
      students: inBlock.reduce((s, x) => s + (x.students || 0), 0),
      label:    titleCase(target),
    }
  }
  if (scope === 'cluster') {
    const inCluster = schoolsInCluster(target)
    return {
      schools:  inCluster.length,
      teachers: inCluster.reduce((s, x) => s + (x.teachers || 0), 0),
      students: inCluster.reduce((s, x) => s + (x.students || 0), 0),
      label:    titleCase(target),
    }
  }
  if (scope === 'school') {
    // Principal scope. We don't have the Principal's exact school in the real
    // CSV (mock profile names like "Sardar Patel Prathmik Shala" don't match
    // real schoolids), so callers pass schoolMeta with mocked-school totals
    // (students/teachers). aggregatesFor returns those directly.
    return {
      schools:  1,
      teachers: target?.teachers ?? null,
      students: target?.students ?? null,
      label:    target?.schoolName || 'School',
    }
  }
  return null
}
