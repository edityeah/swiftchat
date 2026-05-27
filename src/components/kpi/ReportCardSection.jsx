import React, { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getComputedKpis, getCatalogForRole } from '../../kpi/kpiEngine'
import { kpiCategory, KPI_CATEGORY_ORDER } from '../../kpi/kpiCatalog'
import KpiTile from './KpiTile'

const FONT = 'Montserrat, sans-serif'

// Home KPI section — 3 compact tiles, one per category:
//   1. Attendance
//   2. Assessment
//   3. Accreditation
// Each tile shows the WORST-status KPI inside that category, so the user
// sees one priority per bucket. "See all" opens the full Report Card canvas.
export default function ReportCardSection() {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}

  const tiles = useMemo(() => {
    const all = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
    const sev = { red: 3, yellow: 2, green: 1, unknown: 0 }
    return KPI_CATEGORY_ORDER.map(cat => {
      const inCat = all.filter(c => kpiCategory(c.kpi.id) === cat)
      if (inCat.length === 0) return null
      return inCat.sort((a, b) => {
        const d = (sev[b.status] || 0) - (sev[a.status] || 0)
        if (d !== 0) return d
        return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0)
      })[0]
    }).filter(Boolean)
  }, [role, profile])

  if (tiles.length === 0) return null

  const totalCount = getCatalogForRole(role).length

  // KPIs that get a dedicated rich-dashboard canvas instead of the generic
  // KPI-insight canvas. Keep these sets in lock-step with the equivalent
  // sets in canvas/modules/ReportCardCanvas.jsx.
  const ATTENDANCE_KPIS = new Set([
    'attendance_today',
    'attendance_reporting_compliance',
  ])
  // All six A2 KPIs route to the new AssessmentDashboardCanvas with the
  // kpiId in context so the canvas can pick the right sub-view.
  const ASSESSMENT_KPIS = new Set([
    'assessment_participation',
    'proficiency',
    'students_below_proficiency',
    'student_improvement_delta',
    'orf_fln_improvement',
    'reports_generated_downloaded',
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
    if (ASSESSMENT_KPIS.has(id)) {
      openCanvas({ type: 'assessment-dashboard', kpiId: id })
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
