// ─────────────────────────────────────────────────────────────────────────────
// KPI Actions — resolve a KPI's drill-down target into a concrete instruction.
//
// Returns one of:
//   { kind: 'canvas', canvasType, canvasContext }
//   { kind: 'chat',   chatId }
// ─────────────────────────────────────────────────────────────────────────────
import { KPI_CATALOG } from './kpiCatalog.js'

const BY_ID = new Map(KPI_CATALOG.map(k => [k.id, k]))

// Whitelist of chat IDs that the app routes to (must match CHAT_IDS in App.jsx).
const CHAT_ID_FALLBACK = new Set(['swift', 'xamta', 'att', 'ews', 'tmsg', 'catt', 'cschol', 'dbt', 'datt', 'warroom', 'parentbot'])

export function resolveDrilldown(kpiId, role, profile) {
  const kpi = BY_ID.get(kpiId)
  if (!kpi) return null
  const dd = kpi.drilldown
  if (!dd) return null
  if (dd.kind === 'canvas') {
    return {
      kind: 'canvas',
      canvasType: dd.canvasType,
      canvasContext: { ...(dd.canvasContext || {}), role, kpiId, fromKpi: true },
    }
  }
  if (dd.kind === 'chat') {
    const id = CHAT_ID_FALLBACK.has(dd.botId) ? dd.botId : 'swift'
    return { kind: 'chat', chatId: id }
  }
  return null
}
