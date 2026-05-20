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
check('teacher = 17',         getCatalogForRole('teacher').length === 17)
check('principal = 32',       getCatalogForRole('principal').length === 32)
check('crc = 31',             getCatalogForRole('crc').length === 31)
check('beo = 35',             getCatalogForRole('beo').length === 35)
check('state_secretary = 35', getCatalogForRole('state_secretary').length === 35)
check('parent = 5',           getCatalogForRole('parent').length === 5)
check('pfms = 5',             getCatalogForRole('pfms').length === 5)
check('deo = 0',              getCatalogForRole('deo').length === 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
