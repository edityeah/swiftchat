// Hierarchical attendance data for DEO + BEO drilldown:
//   District (DEO) → blocks → clusters → schools
//   Block    (BEO)         → clusters → schools
//
// Real entities are pulled from the SCHOOLS / TEACHERS samples + master
// DISTRICTS data; gaps are padded with plausible synth names so demos show
// the full district even when the sample only contains a slice.
//
// Each level (block / cluster / school) carries a deterministic attendance
// metric so the user always sees coherent numbers. `range` is 'today' or
// '30d' — same shape, different seed.

import {
  SCHOOLS, TEACHERS, DISTRICTS,
  schoolsInDistrict, schoolsInBlock, schoolsInCluster,
} from './registries'

// ─── Helpers ───────────────────────────────────────────────────────────────
function strHash(s) {
  let h = 0
  for (let i = 0; i < String(s).length; i++) h = ((h << 5) - h + String(s).charCodeAt(i)) | 0
  return Math.abs(h)
}
function prng(seed) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// Common Gujarat taluka / cluster names used as padding when the sample
// registry doesn't cover a block.
const COMMON_TALUKAS = [
  'AMC', 'MANDAL', 'BAVLA', 'DETROJ-RAMPURA', 'DHANDHUKA', 'DHOLERA',
  'DHOLKA', 'SANAND', 'VIRAMGAM', 'DASCROI', 'CITY', 'BARWALA',
  'KADI', 'KHERALU', 'VISNAGAR', 'VIJAPUR', 'UNJHA', 'BECHARAJI',
  'ANJAR', 'BHACHAU', 'GANDHIDHAM', 'MUNDRA', 'NAKHATRANA', 'RAPAR',
]
const SYNTH_CLUSTER_PREFIXES = [
  'CHANDKHEDA','BAPUNAGAR','NIKOL','THALTEJ','BODAKDEV','NARODA',
  'VASTRAPUR','MEMNAGAR','KANKARIA','GHATLODIA','SARKHEJ','MOTERA',
]

// All blocks for a district (real from samples + padded to master count)
export function blocksForDistrict(districtName) {
  const real = new Set()
  schoolsInDistrict(districtName).forEach(s => { if (s.block) real.add(s.block) })
  TEACHERS.filter(t => String(t.district).toUpperCase() === String(districtName).toUpperCase())
    .forEach(t => { if (t.block) real.add(t.block) })
  const master = DISTRICTS.find(d => String(d.name).toUpperCase() === String(districtName).toUpperCase())
  const target = master?.blocks || real.size || 1
  const out = [...real]
  for (const tk of COMMON_TALUKAS) {
    if (out.length >= target) break
    if (!out.some(x => x.toUpperCase() === tk.toUpperCase())) out.push(tk)
  }
  return out.slice(0, target)
}

// All clusters under a block — real from sample, padded with synth names.
// Returns array of cluster names (strings).
export function clustersForBlock(blockName) {
  const real = new Set()
  schoolsInBlock(blockName).forEach(s => { if (s.cluster) real.add(s.cluster) })
  if (real.size >= 3) return [...real]
  // Pad to ~4 clusters for a credible block demo
  const seed = strHash(blockName)
  const out = [...real]
  for (let i = 0; out.length < 4 && i < SYNTH_CLUSTER_PREFIXES.length; i++) {
    const name = `${SYNTH_CLUSTER_PREFIXES[(seed + i) % SYNTH_CLUSTER_PREFIXES.length]} CLUSTER`
    if (!out.some(x => x.toUpperCase() === name.toUpperCase())) out.push(name)
  }
  return out
}

// All schools under a cluster — real from sample, padded with synth names.
export function schoolsForCluster(clusterName, blockName) {
  const real = schoolsInCluster(clusterName)
  if (real.length >= 3) return real
  // Synthesise ~4-6 schools to fill the cluster
  const seed = strHash(clusterName + '|' + (blockName || ''))
  const rand = prng(seed)
  const out = [...real]
  const targetCount = 4 + Math.floor(rand() * 3)
  const names = ['PRA SHALA', 'UPS', 'KANYA SHALA', 'KUMAR SHALA', 'HIGH SCHOOL', 'VIDYALAY']
  const villages = ['VIRPUR', 'TARANGA', 'BAPUNAGAR', 'NIKOL', 'NARODA', 'KARELI']
  for (let i = 0; out.length < targetCount; i++) {
    const v = villages[(seed + i) % villages.length]
    const t = names[(seed + i * 3) % names.length]
    out.push({
      schoolid: 24_000_000_000 + ((seed * 7 + i * 9013) % 9_999_999),
      school: `${v} ${t} ${i + 1}`,
      district: undefined, block: blockName, cluster: clusterName,
      students: 80 + Math.floor(rand() * 360),
      teachers: 3 + Math.floor(rand() * 12),
      _synth: true,
    })
  }
  return out
}

// Deterministic attendance % for an entity, biased by range.
function attendancePctFor(name, range = 'today') {
  const r = prng(strHash(`${name}|${range}`))
  // 70-98% range; 30d slightly higher on average than today
  const base = range === '30d' ? 86 : 84
  return +(base + r() * 12).toFixed(1)
}

// School-level metrics (students count + present count + pct)
function metricsForSchool(school, range) {
  const total = school.students || 100
  const pct = attendancePctFor(school.school || school.schoolid, range)
  const present = Math.round((total * pct) / 100)
  return { total, present, absent: total - present, pct }
}

// Cluster rollup = sum of its schools
function metricsForCluster(schools, range) {
  let total = 0, present = 0
  for (const s of schools) {
    const m = metricsForSchool(s, range)
    total += m.total; present += m.present
  }
  return { total, present, absent: total - present, pct: total ? +((present / total) * 100).toFixed(1) : 0 }
}

// Block rollup = sum of its clusters
function metricsForBlock(clusters, range) {
  let total = 0, present = 0
  for (const c of clusters) {
    total += c.metrics.total; present += c.metrics.present
  }
  return { total, present, absent: total - present, pct: total ? +((present / total) * 100).toFixed(1) : 0 }
}

// ─── Public builders ──────────────────────────────────────────────────────

// Build hierarchical tree for a DEO scope:
//   { district, totals, blocks: [{ name, metrics, clusters: [{ name, metrics, schools: [{ name, schoolid, metrics }] }] }] }
export function getDistrictHierarchy(districtName, range = 'today') {
  const blocks = blocksForDistrict(districtName).map(blockName => {
    const clusters = clustersForBlock(blockName).map(clusterName => {
      const schools = schoolsForCluster(clusterName, blockName).map(s => ({
        schoolid: s.schoolid,
        name: s.school,
        metrics: metricsForSchool(s, range),
      }))
      return { name: clusterName, metrics: metricsForCluster(schools.map(x => ({ school: x.name, students: x.metrics.total })), range), schools }
    })
    return { name: blockName, metrics: metricsForBlock(clusters, range), clusters }
  })
  const totals = blocks.reduce((a, b) => ({
    total: a.total + b.metrics.total,
    present: a.present + b.metrics.present,
  }), { total: 0, present: 0 })
  return {
    district: districtName,
    totals: { ...totals, absent: totals.total - totals.present, pct: totals.total ? +((totals.present / totals.total) * 100).toFixed(1) : 0 },
    blocks,
  }
}

// Build hierarchical tree for a CRC scope:
//   { cluster, totals, schools: [...] }
// One-level hierarchy — clusters drill straight to schools.
export function getClusterHierarchy(clusterName, blockName, range = 'today') {
  const schools = schoolsForCluster(clusterName, blockName).map(s => ({
    schoolid: s.schoolid,
    name: s.school,
    metrics: metricsForSchool(s, range),
  }))
  const totals = schools.reduce((a, s) => ({
    total: a.total + s.metrics.total,
    present: a.present + s.metrics.present,
  }), { total: 0, present: 0 })
  return {
    cluster: clusterName,
    totals: { ...totals, absent: totals.total - totals.present, pct: totals.total ? +((totals.present / totals.total) * 100).toFixed(1) : 0 },
    schools,
  }
}

// Build hierarchical tree for a BEO scope:
//   { block, totals, clusters: [{ name, metrics, schools: [...] }] }
export function getBlockHierarchy(blockName, range = 'today') {
  const clusters = clustersForBlock(blockName).map(clusterName => {
    const schools = schoolsForCluster(clusterName, blockName).map(s => ({
      schoolid: s.schoolid,
      name: s.school,
      metrics: metricsForSchool(s, range),
    }))
    return { name: clusterName, metrics: metricsForCluster(schools.map(x => ({ school: x.name, students: x.metrics.total })), range), schools }
  })
  const totals = clusters.reduce((a, c) => ({
    total: a.total + c.metrics.total,
    present: a.present + c.metrics.present,
  }), { total: 0, present: 0 })
  return {
    block: blockName,
    totals: { ...totals, absent: totals.total - totals.present, pct: totals.total ? +((totals.present / totals.total) * 100).toFixed(1) : 0 },
    clusters,
  }
}
