// ─────────────────────────────────────────────────────────────────────────────
// KPI Engine — pure functions over kpiCatalog + kpiData.
// ─────────────────────────────────────────────────────────────────────────────
import { KPI_CATALOG, getCatalogForRole } from './kpiCatalog.js'
import { KPI_VALUES, BENCHMARKS } from './kpiData.js'

export { getCatalogForRole }

// ─── Benchmark resolution ───────────────────────────────────────────────────
function resolveBenchmark(kpi, role, profile) {
  switch (kpi.benchmarkSource) {
    case 'state_avg':    return BENCHMARKS.state_avg[kpi.id] ?? null
    case 'school_avg':   return BENCHMARKS.school_avg?.[profile?.school]?.[kpi.id] ?? null
    case 'cluster_avg':  return BENCHMARKS.cluster_avg?.[profile?.cluster]?.[kpi.id] ?? null
    case 'fixed_target': return BENCHMARKS.fixed_target[kpi.id] ?? kpi.fixedTarget ?? null
    case 'absolute':     return null
    default:             return null
  }
}

// ─── Status ────────────────────────────────────────────────────────────────
export function computeStatus(kpi, value, benchmark) {
  if (value == null) return 'unknown'

  // Absolute thresholds.
  if (kpi.benchmarkSource === 'absolute') {
    if (kpi.direction === 'lower') {
      if (value <= kpi.statusBands.green)  return 'green'
      if (value <= kpi.statusBands.yellow) return 'yellow'
      return 'red'
    } else {
      if (value >= kpi.statusBands.green)  return 'green'
      if (value >= kpi.statusBands.yellow) return 'yellow'
      return 'red'
    }
  }

  if (benchmark == null) return 'unknown'

  const rawDelta = value - benchmark
  const delta = kpi.direction === 'lower' ? -rawDelta : rawDelta
  if (delta >= kpi.statusBands.green)  return 'green'
  if (delta >= kpi.statusBands.yellow) return 'yellow'
  return 'red'
}

// ─── Per-KPI compute ───────────────────────────────────────────────────────
export function computeKpi(kpi, role, profile) {
  const raw = KPI_VALUES[role]?.[kpi.id]
  const value = raw?.value ?? null
  const meta  = raw?.meta ?? {}

  const benchmark = resolveBenchmark(kpi, role, profile)

  let delta = null
  if (value != null && benchmark != null) {
    const rawDelta = value - benchmark
    delta = kpi.direction === 'lower' ? -rawDelta : rawDelta
  }

  const status = computeStatus(kpi, value, benchmark)
  const reason = kpi.reasonBuilder({ value, benchmark, delta, meta })

  return { kpi, value, benchmark, delta, status, reason, meta }
}

export function getComputedKpis(role, profile) {
  return getCatalogForRole(role).map(k => computeKpi(k, role, profile))
}

// ─── Prioritise + hero + overall score ──────────────────────────────────────
const SEVERITY = { red: 3, yellow: 2, green: 1, unknown: 0 }

export function prioritise(role, profile, topN = 4) {
  return getComputedKpis(role, profile)
    .filter(c => c.status !== 'unknown')
    .sort((a, b) => {
      const sev = SEVERITY[b.status] - SEVERITY[a.status]
      if (sev !== 0) return sev
      const dA = Math.abs(a.delta ?? 0)
      const dB = Math.abs(b.delta ?? 0)
      return dB - dA
    })
    .slice(0, topN)
}

// All-green hero override: returns the largest-positive-delta KPI when
// everything is green, otherwise the worst KPI.
export function pickHero(role, profile) {
  const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  if (all.length === 0) return null
  const anyRedOrYellow = all.some(c => c.status === 'red' || c.status === 'yellow')
  if (anyRedOrYellow) return prioritise(role, profile, 1)[0]
  return [...all].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0]
}

// Status weight: red=0, yellow=50, green=100, unknown skipped.
export function computeOverallScore(role, profile) {
  const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  if (all.length === 0) return { score: null, counts: { red: 0, yellow: 0, green: 0 } }
  const weight = { red: 0, yellow: 50, green: 100 }
  const total = all.reduce((sum, c) => sum + weight[c.status], 0)
  const counts = all.reduce((acc, c) => { acc[c.status]++; return acc }, { red: 0, yellow: 0, green: 0 })
  return { score: Math.round(total / all.length), counts }
}
