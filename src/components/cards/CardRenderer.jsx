// CardRenderer — switches on `card.type` and renders the matching component.
// Mirrors KSK's registry pattern. When an OpenAI integration ships, the
// model returns JSON of the same shape; no UI changes required.

import React from 'react'
import BarChartCard   from './BarChartCard'
import LineChartCard  from './LineChartCard'
import DonutChartCard from './DonutChartCard'
import KpiGridCard    from './KpiGridCard'
import DataTableCard  from './DataTableCard'
import InfoCard       from './InfoCard'
import Chips          from './Chips'

const REGISTRY = {
  bar_chart:   BarChartCard,
  line_chart:  LineChartCard,
  donut_chart: DonutChartCard,
  kpi_grid:    KpiGridCard,
  data_table:  DataTableCard,
  info:        InfoCard,
}

export default function CardRenderer({ card, onChip }) {
  if (!card || !card.type) return null
  const Component = REGISTRY[card.type] || InfoCard
  return (
    <div className="my-2">
      <Component card={card} onChip={onChip} />
      {Array.isArray(card.chips) && card.chips.length > 0 && (
        <Chips chips={card.chips} onChip={onChip} />
      )}
    </div>
  )
}
