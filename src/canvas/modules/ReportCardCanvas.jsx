import React from 'react'
import { useApp } from '../../context/AppContext'
import { getComputedKpis, computeOverallScore } from '../../kpi/kpiEngine'
import KpiTile from '../../components/kpi/KpiTile'

const FONT = 'Montserrat, sans-serif'

const FRAMEWORK_TITLES = {
  A1: 'Attendance',
  A2: 'Assessment',
  A5: 'Accreditation',
  // Legacy frameworks kept for back-compat. They're filtered out by the
  // catalog visibility list — these labels would only render if a future
  // KPI gets added back into the visible set.
  A3: 'Adaptive Learning',
  A4: 'Administration',
  A6: 'Governance',
  District: 'District',
  Parent: 'Your child',
}

// Render order — Attendance → Assessment → Accreditation, top to bottom.
const FRAMEWORK_ORDER = ['A1', 'A2', 'A5', 'Parent', 'District', 'A3', 'A4', 'A6']

export default function ReportCardCanvas() {
  const { role, userProfile, openCanvas } = useApp()
  const profile = userProfile || {}

  const items = getComputedKpis(role, profile).filter(c => c.status !== 'unknown')
  const { score, counts } = computeOverallScore(role, profile)

  const byFramework = items.reduce((acc, c) => {
    const fw = c.kpi.framework
    if (!acc[fw]) acc[fw] = []
    acc[fw].push(c)
    return acc
  }, {})

  // Attendance-flavoured KPIs → rich attendance dashboard.
  // Assessment-flavoured KPIs (all six A2 KPIs) → AssessmentDashboardCanvas.
  // Everything else → generic KPI insight canvas.
  const ATTENDANCE_KPIS = new Set([
    'attendance_today',
    'attendance_reporting_compliance',
  ])
  const ASSESSMENT_KPIS = new Set([
    'assessment_participation',
    'proficiency',
    'students_below_proficiency',
    'student_improvement_delta',
    'orf_fln_improvement',
    'reports_generated_downloaded',
  ])

  function open(computed) {
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

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-[13px]" style={{ color: '#7383A5', fontFamily: FONT }}>
        No KPIs configured for this role.
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="p-5">
        {/* Overall score card */}
        <div style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: 16, background: '#FAFBFC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Overall
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span style={{ fontSize: 36, fontWeight: 700, color: '#0E0E0E', lineHeight: '40px', fontFamily: FONT }}>
              {score ?? '—'}
            </span>
            <span style={{ fontSize: 14, color: '#7383A5', fontWeight: 600, fontFamily: FONT }}>/ 100</span>
          </div>
          <div className="mt-3 flex gap-4" style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FONT }}>
            <span style={{ color: '#B91C1C' }}>● {counts.red} red</span>
            <span style={{ color: '#92400E' }}>● {counts.yellow} yellow</span>
            <span style={{ color: '#065F46' }}>● {counts.green} green</span>
          </div>
        </div>

        {/* Per-framework groups — rendered in fixed order so Attendance
            always sits above Assessment above Accreditation. */}
        {FRAMEWORK_ORDER.filter(fw => byFramework[fw]).map(fw => [fw, byFramework[fw]]).map(([fw, list]) => (
          <section key={fw} className="mt-5">
            <h3 style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10, fontFamily: FONT }}>
              {FRAMEWORK_TITLES[fw] || fw}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {list.map(c => (
                <KpiTile key={c.kpi.id} computed={c} variant="compact" onClick={() => open(c)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
