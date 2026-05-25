import React, { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { prioritise, getComputedKpis, getCatalogForRole } from '../../kpi/kpiEngine'
import KpiTile from './KpiTile'

const FONT = 'Montserrat, sans-serif'

// Home KPI section — 3-column × 2-row grid of equal compact tiles.
// Composition: up to 4 worst (red/yellow) + up to 2 best (green) for balance.
// Returns null for roles with no KPIs (e.g. deo).
export default function ReportCardSection() {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}

  const tiles = useMemo(() => {
    const worst = prioritise(role, profile, 4)
    const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
    const usedIds = new Set(worst.map(c => c.kpi.id))

    const greens = all
      .filter(c => c.status === 'green' && !usedIds.has(c.kpi.id))
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
      .slice(0, 2)

    let result = [...worst, ...greens]
    if (result.length < 6) {
      const filled = new Set(result.map(c => c.kpi.id))
      const rest = all.filter(c => !filled.has(c.kpi.id)).slice(0, 6 - result.length)
      result = [...result, ...rest]
    }
    return result.slice(0, 6)
  }, [role, profile])

  if (tiles.length === 0) return null

  const totalCount = getCatalogForRole(role).length

  // KPIs that get the richer dashboard canvas instead of the generic
  // KPI-insight canvas (charts + chips + chat).
  const ATTENDANCE_KPIS = new Set([
    'attendance_today',
    'attendance_reporting_compliance',
  ])

  function openKpiDrilldown(computed) {
    const id = computed.kpi.id
    if (ATTENDANCE_KPIS.has(id)) {
      const scope =
        role === 'state_secretary' ? 'state' :
        role === 'deo'              ? 'district' :
        role === 'beo'              ? 'block' :
        role === 'crc'              ? 'cluster' :
        role === 'principal'        ? 'school' :
        role === 'teacher'          ? 'class' :
        role === 'parent'           ? 'class' :
        role === 'pfms'             ? 'state' : 'state'
      openCanvas({
        type: 'attendance-dashboard',
        scope,
        district: profile?.district,
        block:    profile?.block,
        cluster:  profile?.cluster,
        school:   profile?.school,
        grade:    profile?.classes?.[0] || 6,
        kpiId: id,
      })
      return
    }
    openCanvas({ type: 'kpi_insight', kpiId: id })
  }

  return (
    <div className="w-full max-w-[704px] mb-8" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} style={{ color: '#386AF6' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0E0E0E', letterSpacing: '-0.2px' }}>
            Top priority · Today
          </span>
        </div>
        <button
          onClick={() => openCanvas({ type: 'report_card' })}
          style={{
            fontSize: 12, fontWeight: 600, color: '#386AF6',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          See all {totalCount} ›
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {tiles.map(c => (
          <KpiTile
            key={c.kpi.id}
            computed={c}
            variant="compact"
            onClick={() => openKpiDrilldown(c)}
          />
        ))}
      </div>
    </div>
  )
}
