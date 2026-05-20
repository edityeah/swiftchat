import React from 'react'
import { Grid3x3 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { ROLE_BOTS } from '../../roles/roleConfig'

// Each bot display name maps to a canvas context. Clicking an "Apps" tile
// opens the corresponding right-side canvas — never navigates to a chat
// surface (which would render in the 420px mobile frame). This keeps every
// home-screen affordance consistent with how the rest of the app opens
// work surfaces.
const BOT_TO_CANVAS = {
  'VSK Gujarat':         { type: 'report_card' },
  'Shikshak Sahayak':    { type: 'lesson-plan' },
  'Assessment Bot':      { type: 'class-report', grade: 8 },
  'Remediation Bot':     { type: 'at-risk-students' },
  'Parent Connect':      { type: 'attendance' },
  'School Monitor':      { type: 'dashboard', scope: 'school' },
  'Compliance Bot':      { type: 'report' },
  'Report Generator':    { type: 'report' },
  'Block Analyst':       { type: 'dashboard', scope: 'district' },
  'Intervention Bot':    { type: 'intervention' },
  'District Analyst':    { type: 'dashboard', scope: 'district' },
  'DBT Monitor':         { type: 'digivritti', view: 'payment-queue' },
  'War Room':            { type: 'dashboard', scope: 'district' },
  'State Intelligence':  { type: 'dashboard', scope: 'state' },
  'Scheme Analytics':    { type: 'digivritti', view: 'analytics' },
  'District Drilldown':  { type: 'dashboard', scope: 'district' },
  'Policy Advisor':      { type: 'report' },
  'Parent Assistant':    { type: 'attendance' },
  'DigiVritti Approver': { type: 'digivritti', view: 'review' },
  'Cluster Console':     { type: 'digivritti', view: 'review' },
  'DigiVritti Payments': { type: 'digivritti', view: 'payment-queue' },
  'PFMS Console':        { type: 'digivritti', view: 'payment-queue' },
}

const BOT_ICON = {
  'VSK Gujarat':         '🏛️',
  'Shikshak Sahayak':    '👩‍🏫',
  'Assessment Bot':      '📝',
  'Remediation Bot':     '🎯',
  'Parent Connect':      '👪',
  'School Monitor':      '🏫',
  'Compliance Bot':      '✅',
  'Report Generator':    '📋',
  'Block Analyst':       '📊',
  'Intervention Bot':    '🚦',
  'District Analyst':    '🗺️',
  'DBT Monitor':         '💸',
  'War Room':            '🚨',
  'State Intelligence':  '🛰️',
  'Scheme Analytics':    '📈',
  'District Drilldown':  '🔎',
  'Policy Advisor':      '📜',
  'Parent Assistant':    '🤝',
  'DigiVritti Approver': '🌸',
  'Cluster Console':     '🧭',
  'DigiVritti Payments': '💰',
  'PFMS Console':        '🏦',
}

const FONT = 'Montserrat, sans-serif'

export default function KpiBotStrip({ role }) {
  const { openCanvas } = useApp()
  const bots = ROLE_BOTS[role] || []
  if (bots.length === 0) return null

  return (
    <div className="w-full max-w-[704px] mx-auto mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Grid3x3 size={14} style={{ color: '#386AF6' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0E0E0E', fontFamily: FONT, letterSpacing: '-0.2px' }}>
          Apps
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {bots.map(name => {
          const target = BOT_TO_CANVAS[name] || { type: 'report_card' }
          const icon = BOT_ICON[name] || '🤖'
          return (
            <button
              key={name}
              onClick={() => openCanvas({ ...target, role })}
              className="flex flex-col items-center justify-center gap-2 py-4 px-2 active:scale-95 transition-all duration-150 hover:shadow-md bg-white"
              style={{ borderRadius: 12, border: '1px solid #D5D8DF', minHeight: 96 }}
            >
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{ background: '#EEF2FF', borderRadius: 8, fontSize: 22, lineHeight: 1 }}
              >
                <span aria-hidden>{icon}</span>
              </div>
              <span
                className="text-center whitespace-pre-line"
                style={{ fontSize: 11, fontWeight: 600, color: '#0E0E0E', fontFamily: FONT, lineHeight: '14px', letterSpacing: '0.2px' }}
              >
                {name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
