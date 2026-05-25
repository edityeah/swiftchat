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

// Look up by teacher code. Accepts string or number. Checks real TEACHERS
// first, then falls back to the synth cache (populated by teachersForScope
// whenever a scope is queried — so any synth teacher the user has already
// seen in a registry canvas is findable here).
const _synthTeacherCache = new Map()
export function findTeacherByCode(code) {
  if (code == null) return null
  const n = Number(code)
  const real = TEACHERS.find(t => t.teacherCode === n || String(t.teacherCode) === String(code))
  if (real) return real
  return _synthTeacherCache.get(n) || _synthTeacherCache.get(String(code)) || null
}

// ─── Teacher synthesis (single source of truth across home + canvas) ────────
// Problem: the home tile counts teachers by summing school.teachers (from the
// SCHOOLS sample), while the canvas reads from the TEACHERS sample. The two
// samples don't fully overlap, so 63 on a CRC tile turned into 2 in the
// canvas. Fix: ONE function that returns the full teacher list for any
// scope — real teachers first, synthesised teachers to fill the gap up to
// the expected rolled-up count (capped at 500 for browser perf). Both the
// home tile and the registry canvas now call this same function, so the
// count is identical by construction.

const _SYNTH_F_M = ['Rakesh','Sunil','Vimal','Hiren','Jignesh','Kalpesh','Amar','Bharat','Dilip','Mahesh','Ramesh','Kiran','Nilesh','Pranay','Vipul','Hardik','Bipin','Jayesh','Dhiren','Kamlesh','Sanjay','Manoj','Vijay','Anil','Bhavesh']
const _SYNTH_F_W = ['Sunita','Meera','Hetal','Priya','Sheetal','Nita','Pooja','Geeta','Bhavna','Rashmi','Asha','Reena','Madhu','Anjali','Falguni','Jyoti','Kavita','Lata','Neha','Pratibha','Smita','Tejal','Urmila','Vidhya','Yamini']
const _SYNTH_LAST = ['Patel','Joshi','Pandya','Shah','Mehta','Trivedi','Bhatt','Modi','Dave','Desai','Rao','Vaghela','Solanki','Parmar','Gohil','Rathod','Chauhan','Prajapati','Makwana','Barot','Vasava','Dabhi','Thakor','Raval','Jadeja']
const _SYNTH_DES = ['Teacher','Teacher','Teacher','Teacher','Assistant Teacher (Secondary)','Assistant Teacher (Higher Secondary)']
const _SYNTH_QUAL = ['B.Ed. or equivalent','B.Ed. or equivalent','B.Ed. or equivalent','M.Ed.','M.A. + B.Ed.']
const _SYNTH_TYPE = ['Regular','Regular','Regular','Regular','Contract']

function _strHash(s) {
  let h = 0
  for (let i = 0; i < String(s).length; i++) h = ((h << 5) - h + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}

function _synthTeacher(seed, school) {
  const isFemale = (seed & 1) === 0
  const firsts = isFemale ? _SYNTH_F_W : _SYNTH_F_M
  const first  = firsts[seed % firsts.length]
  const last   = _SYNTH_LAST[(seed >> 3) % _SYNTH_LAST.length]
  // 9-prefixed teacher codes mark synthesised rows. Real codes are 8-digit
  // (1xxxxxxx); the 9-prefix puts ours in a non-colliding namespace.
  const teacherCode = 90_000_000 + ((seed * 2654435761) >>> 0) % 9_999_999
  return {
    teacherCode,
    name: `${first} ${last}`,
    gender: isFemale ? 'Female' : 'Male',
    designation: _SYNTH_DES[seed % _SYNTH_DES.length],
    category: null,
    qualification: _SYNTH_QUAL[(seed >> 2) % _SYNTH_QUAL.length],
    additionalQualification: 'Graduate',
    teacherType: _SYNTH_TYPE[seed % _SYNTH_TYPE.length],
    classTaught: `{${((seed >> 4) % 8) + 1}}`,
    joiningYear: 2000 + (seed % 23),
    schoolId: school.schoolid,
    school: school.school,
    district: school.district,
    block: school.block,
    cluster: school.cluster,
    _synth: true,                    // flag — not surfaced in UI
  }
}

// Maximum rows we synth per scope. Above this, the canvas shows a sampling
// banner instead of hammering the DOM. 500 covers CRC/BEO comfortably; for
// DEO/State we lean on the banner.
const SYNTH_TEACHER_CAP = 500

export function teachersForScope({ cluster, block, district, schoolId } = {}, opts = {}) {
  const cap = opts.cap ?? SYNTH_TEACHER_CAP

  // 1. Pool of schools the synthesised teachers can be attached to.
  let schools = []
  if (schoolId)      schools = SCHOOLS.filter(s => s.schoolid === Number(schoolId))
  else if (cluster)  schools = schoolsInCluster(cluster)
  else if (block)    schools = schoolsInBlock(block)
  else if (district) schools = schoolsInDistrict(district)
  else               schools = SCHOOLS

  // 2. Real teachers in scope (these come first in the returned list).
  let real = []
  if (schoolId)      real = teachersInSchool(Number(schoolId))
  else if (cluster)  real = teachersInCluster(cluster)
  else if (block)    real = teachersInBlock(block)
  else if (district) real = teachersInDistrict(district)
  else               real = TEACHERS

  // 3. Target count: at district scope we trust the master districts.json
  //    (which has the real Ahmedabad/Mahesana/etc. totals). For smaller
  //    scopes we sum the SCHOOLS sample's `teachers` field which is the
  //    rolled-up sample reality.
  let expected
  if (district && !block && !cluster && !schoolId) {
    const d = findDistrict(district)
    expected = d ? d.teachers : schools.reduce((a, s) => a + (s.teachers || 0), 0)
  } else {
    expected = schools.reduce((a, s) => a + (s.teachers || 0), 0) || real.length
  }
  const target = Math.min(expected, cap)

  if (real.length >= target) return real.slice(0, target)
  if (!schools.length)       return real

  // 4. Synthesise the difference. Each synth teacher is tied deterministically
  //    to a real school in scope so the school/cluster/block/district fields
  //    line up. Also cache by teacherCode so findTeacherByCode can resolve
  //    them later (e.g. when the user clicks Open Profile on a synth row).
  const out = [...real]
  const baseSeed = _strHash(`${cluster || ''}|${block || ''}|${district || ''}|${schoolId || ''}`)
  const needed = target - real.length
  for (let i = 0; i < needed; i++) {
    const school = schools[i % schools.length]
    const t = _synthTeacher(baseSeed + i * 7919, school)
    _synthTeacherCache.set(t.teacherCode, t)
    _synthTeacherCache.set(String(t.teacherCode), t)
    out.push(t)
  }
  return out
}

// ─── School synthesis (parallel to teacher synthesis) ──────────────────────
// District scope (e.g. Ahmedabad) has ~3,968 schools per master district
// data, but our SCHOOLS sample only contains 20. Same fix pattern:
// schoolsForScope() returns real schools first, then synthesised schools to
// fill up to the master aggregate (capped at 500 for browser perf).
const _SYNTH_SCHOOL_PREFIX = ['SHRI','SHREE','JAY','VANDE','SARDAR','VEER','MAHATMA','SARASWATI','GANDHI','SHIVAJI','SAMARPAN']
const _SYNTH_SCHOOL_MIDDLE = ['VIDYA','BAL','PRA.','PRATHMIK','UPPER','HIGH','VIRDI','NAVA','PRAYAS','BHAVIK']
const _SYNTH_SCHOOL_SUFFIX = ['SHALA','VIDHYALAY','SCHOOL','PRA SCHOOL','PRI SCHOOL','HIGH SCHOOL','UPS','PS']
const _SYNTH_VILLAGES = ['VIRPUR','SAMTHALI','TARANGA','BAPUNAGAR','NIKOL','NARODA','MEMNAGAR','THALTEJ','BODAKDEV','KARELI']
const _SYNTH_MANAGEMENT = ['Government','Government','Government','Government','Private Unaided','Granted','Local Body','Granted']
const _SYNTH_CATEGORY = ['Primary with grades 1 to 5','Upper Primary with grades 1 to 8','Higher Secondary School','Secondary School']
const _SYNTH_LOCATION = ['Rural','Rural','Rural','Urban']
const _SYNTH_MEDIUM = ['Gujarati','Gujarati','Gujarati','Hindi','English']

const SYNTH_SCHOOL_CAP = 500

function _synthSchool(seed, parentScope) {
  const a = _SYNTH_SCHOOL_PREFIX[seed % _SYNTH_SCHOOL_PREFIX.length]
  const b = _SYNTH_SCHOOL_MIDDLE[(seed >> 2) % _SYNTH_SCHOOL_MIDDLE.length]
  const c = _SYNTH_SCHOOL_SUFFIX[(seed >> 4) % _SYNTH_SCHOOL_SUFFIX.length]
  const village = _SYNTH_VILLAGES[(seed >> 6) % _SYNTH_VILLAGES.length]
  // Synth UDISE: 24 (Gujarat) + district id + 5-digit serial. Stays 11 digits.
  const distId = String(parentScope.districtid || 24).padStart(4, '0')
  const serial = String(seed % 999_999_999).padStart(7, '0').slice(0, 7)
  const schoolid = Number(`${distId}${serial}`)
  return {
    schoolid,
    statename: 'Gujarat',
    districtid: parentScope.districtid,
    district:   parentScope.district,
    blockid:    parentScope.blockid,
    block:      parentScope.block,
    clusterid:  parentScope.clusterid,
    cluster:    parentScope.cluster,
    village,
    school:     `${a} ${b} ${c}`,
    schoolcategory:   _SYNTH_CATEGORY[seed % _SYNTH_CATEGORY.length],
    schoolmanagement: _SYNTH_MANAGEMENT[(seed >> 1) % _SYNTH_MANAGEMENT.length],
    lowclass:   1,
    highclass:  (seed % 2 === 0) ? 8 : 12,
    school_location: _SYNTH_LOCATION[(seed >> 3) % _SYNTH_LOCATION.length],
    school_established_year: 1960 + (seed % 60),
    isactive: true,
    schoolmedium_desc: _SYNTH_MEDIUM[seed % _SYNTH_MEDIUM.length],
    students: 80 + (seed % 480),                  // 80-560 students
    teachers: 3 + ((seed >> 2) % 18),             // 3-20 teachers
    _synth: true,
  }
}

export function schoolsForScope({ cluster, block, district } = {}, opts = {}) {
  const cap = opts.cap ?? SYNTH_SCHOOL_CAP

  let real = []
  if (cluster)       real = schoolsInCluster(cluster)
  else if (block)    real = schoolsInBlock(block)
  else if (district) real = schoolsInDistrict(district)
  else               real = SCHOOLS

  // Master expected count from districts.json for district scope; for
  // cluster/block fall back to the real sample length (they're small scopes
  // where sample = reality is reasonable).
  let expected = real.length
  if (district && !block && !cluster) {
    const d = findDistrict(district)
    if (d) expected = d.schools
  }
  const target = Math.min(expected, cap)
  if (real.length >= target) return real.slice(0, target)
  if (!real.length)          return real

  // Use the first real school as the "shape" for synth (preserves district/
  // block/cluster fields).
  const parent = real[0]
  // Cache synth schools by schoolid so findSchoolById can resolve them
  // when the user clicks "Open profile" on a synth row.
  const out = [...real]
  const baseSeed = _strHash(`${cluster || ''}|${block || ''}|${district || ''}`)
  const needed = target - real.length
  for (let i = 0; i < needed; i++) {
    const sc = _synthSchool(baseSeed + i * 9931, parent)
    _synthSchoolCache.set(sc.schoolid, sc)
    _synthSchoolCache.set(String(sc.schoolid), sc)
    out.push(sc)
  }
  return out
}

// The rolled-up "expected" teacher headcount for any scope — what the home
// tile should display. Stays consistent with teachersForScope().length when
// the cap doesn't kick in.
export function expectedTeacherCount(scope, target) {
  if (scope === 'cluster')  return schoolsInCluster(target).reduce((a, s) => a + (s.teachers || 0), 0)
  if (scope === 'block')    return schoolsInBlock(target).reduce((a, s) => a + (s.teachers || 0), 0)
  if (scope === 'district') {
    const d = findDistrict(target)
    return d ? d.teachers : schoolsInDistrict(target).reduce((a, s) => a + (s.teachers || 0), 0)
  }
  return 0
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

// Same cache pattern as findTeacherByCode — falls back to synth school
// cache so users can open profiles for synthesised schools they saw in a
// canvas list.
const _synthSchoolCache = new Map()
export function findSchoolById(schoolId) {
  if (schoolId == null) return null
  const n = Number(schoolId)
  const real = SCHOOLS.find(s => s.schoolid === n || String(s.schoolid) === String(schoolId))
  if (real) return real
  return _synthSchoolCache.get(n) || _synthSchoolCache.get(String(schoolId)) || null
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
