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
