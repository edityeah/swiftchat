import React from 'react'

// Status pill styling — kept subtle. White card matches the rest of the
// VSK home; status comes through the pill + the value color, not a coloured
// background fill.
const PILL = {
  red:     { bg: '#FEE2E2', fg: '#B91C1C', label: 'RED' },
  yellow:  { bg: '#FEF3C7', fg: '#92400E', label: 'WATCH' },
  green:   { bg: '#D1FAE5', fg: '#065F46', label: 'GOOD' },
  unknown: { bg: '#E5E7EB', fg: '#6B7280', label: '—' },
}

const VALUE_COLOR = {
  red:     '#B91C1C',
  yellow:  '#92400E',
  green:   '#065F46',
  unknown: '#0E0E0E',
}

const FONT = 'Montserrat, sans-serif'

function formatValue(value, unit) {
  if (value == null) return '—'
  if (unit === '%')      return `${value}%`
  if (unit === 'hours')  return `${value} hrs`
  return String(value)
}

function formatBench(c) {
  if (c.benchmark == null) return null
  const { kpi, benchmark, delta } = c
  const sign = delta == null ? '' : (delta >= 0 ? '+' : '−')
  const absDelta = delta == null ? '' : Math.abs(delta).toFixed(0)
  const benchLabel =
    kpi.benchmarkSource === 'fixed_target' ? `Target ${benchmark}${kpi.unit === '%' ? '%' : ''}` :
    kpi.benchmarkSource === 'school_avg'   ? `School ${benchmark}` :
    kpi.benchmarkSource === 'cluster_avg'  ? `Cluster ${benchmark}` :
    `State ${benchmark}${kpi.unit === '%' ? '%' : ''}`
  return delta == null ? benchLabel : `${benchLabel} · ${sign}${absDelta} pts`
}

export default function KpiTile({ computed, variant = 'hero', onClick }) {
  const { kpi, value, status, reason } = computed
  const pill = PILL[status] || PILL.unknown
  const valueColor = VALUE_COLOR[status] || VALUE_COLOR.unknown
  const bench = formatBench(computed)

  // Compact — used for the 3 sidekicks and in the full report card canvas.
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="text-left w-full transition-all duration-150 hover:shadow-md hover:border-[#84A2F4] active:scale-[0.98] bg-white"
        style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: '12px 14px', fontFamily: FONT }}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {kpi.shortName}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: pill.bg, color: pill.fg, letterSpacing: '0.02em',
          }}>
            {pill.label}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px', color: valueColor, marginTop: 6, fontFamily: FONT }}>
          {formatValue(value, kpi.unit)}
        </div>
        {bench && (
          <div style={{ fontSize: 11, color: '#828996', marginTop: 4, fontFamily: FONT }}>
            {bench}
          </div>
        )}
      </button>
    )
  }

  // Hero — full rich content with reason + CTA. Used for slot 0 on home.
  return (
    <button
      onClick={onClick}
      className="text-left w-full transition-all duration-150 hover:shadow-md hover:border-[#84A2F4] active:scale-[0.99] bg-white"
      style={{ borderRadius: 12, border: '1px solid #D5D8DF', padding: '16px 18px', fontFamily: FONT, minHeight: 184 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {kpi.shortName}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: pill.bg, color: pill.fg, letterSpacing: '0.02em',
        }}>
          {pill.label}
        </span>
      </div>

      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: '36px', color: valueColor, marginTop: 8, fontFamily: FONT }}>
        {formatValue(value, kpi.unit)}
      </div>

      {bench && (
        <div style={{ fontSize: 11, color: '#7383A5', marginTop: 6, fontFamily: FONT }}>
          {bench}
        </div>
      )}

      {reason && (
        <div style={{ fontSize: 12.5, color: '#0E0E0E', marginTop: 10, lineHeight: '17px', fontFamily: FONT }}>
          {reason}
        </div>
      )}

      {kpi.ctaLabel && (
        <span
          style={{
            display: 'inline-block', marginTop: 12,
            padding: '7px 14px', borderRadius: 999,
            background: '#386AF6', color: '#FFFFFF',
            fontSize: 11.5, fontWeight: 700, fontFamily: FONT,
          }}
        >
          {kpi.ctaLabel} ›
        </span>
      )}
    </button>
  )
}
