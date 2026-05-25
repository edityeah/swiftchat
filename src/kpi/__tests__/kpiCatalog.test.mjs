// node src/kpi/__tests__/kpiCatalog.test.mjs
import { KPI_CATALOG, getCatalogForRole } from '../kpiCatalog.js'

let pass = 0, fail = 0
function check(label, cond) {
  if (cond) { console.log('  ok  ', label); pass++ }
  else      { console.log('  FAIL', label); fail++ }
}

console.log('catalog: shape')
for (const k of KPI_CATALOG) {
  check(`${k.id} has roles[]`, Array.isArray(k.roles) && k.roles.length > 0)
  check(`${k.id} has framework`, typeof k.framework === 'string')
  check(`${k.id} has statusBands`, k.statusBands && 'green' in k.statusBands && 'yellow' in k.statusBands)
  check(`${k.id} has drilldown.kind`, k.drilldown && ['canvas', 'chat'].includes(k.drilldown.kind))
  check(`${k.id} has reasonBuilder`, typeof k.reasonBuilder === 'function')
}

console.log('catalog: per-role counts (matches doc)')
// Per Gujarat VSK KPI Framework PDF — each role sees only the rows that
// have a value (not "—") in its column:
//   Teacher    = 13 (T-applicable rows)
//   Principal  = 26 (rows 1-25 + row 29 PM SHRI)
//   Cluster    = 25 (rows 1-25)
//   Block      = 29 (all rows)
//   State      = 29 (all rows)
// Plus custom roles outside the doc: pfms = 5 (A4 admin), parent = 5
// (child_* KPIs), deo = 0 (placeholder).
check('teacher = 13',         getCatalogForRole('teacher').length === 13)
check('principal = 26',       getCatalogForRole('principal').length === 26)
check('crc = 25',             getCatalogForRole('crc').length === 25)
check('beo = 29',             getCatalogForRole('beo').length === 29)
check('state_secretary = 29', getCatalogForRole('state_secretary').length === 29)
check('parent = 5',           getCatalogForRole('parent').length === 5)
check('pfms = 5',             getCatalogForRole('pfms').length === 5)
// DEO is a full administrative tier in the doc (District column has values
// on every row). Same surface as State Secretary, scoped to one district.
check('deo = 29',             getCatalogForRole('deo').length === 29)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
