// node src/kpi/__tests__/kpiEngine.test.mjs
import {
  computeStatus, computeKpi, prioritise, pickHero, computeOverallScore,
  getCatalogForRole,
} from '../kpiEngine.js'

let pass = 0, fail = 0
function check(label, cond) {
  if (cond) { console.log('  ok  ', label); pass++ }
  else      { console.log('  FAIL', label); fail++ }
}

const teacherProfile = { school: 'Sardar Patel Prathmik Shala', cluster: null }
const principalProfile = { school: 'Sardar Patel Prathmik Shala', cluster: null }
const parentProfile = {}

console.log('computeStatus: % KPI with state_avg benchmark')
const kpiAtt = getCatalogForRole('teacher').find(k => k.id === 'attendance_today')
check('72 vs 88 → red',    computeStatus(kpiAtt, 72, 88) === 'red')
check('82 vs 88 → yellow', computeStatus(kpiAtt, 82, 88) === 'yellow')
check('90 vs 88 → green',  computeStatus(kpiAtt, 90, 88) === 'green')
check('null value → unknown', computeStatus(kpiAtt, null, 88) === 'unknown')

console.log('computeStatus: lower-is-better count KPI (chronic_absentees)')
const kpiCh = getCatalogForRole('teacher').find(k => k.id === 'chronic_absentees')
check('4 vs school_avg 3 → yellow (1 over)', computeStatus(kpiCh, 4, 3) === 'yellow')
check('3 vs school_avg 3 → green',           computeStatus(kpiCh, 3, 3) === 'green')
check('6 vs school_avg 3 → red',             computeStatus(kpiCh, 6, 3) === 'red')

console.log('computeStatus: absolute thresholds (repeat_pending_cases)')
const kpiRep = getCatalogForRole('principal').find(k => k.id === 'repeat_pending_cases')
check('0 → green',  computeStatus(kpiRep, 0, null) === 'green')
check('3 → yellow', computeStatus(kpiRep, 3, null) === 'yellow')
check('9 → red',    computeStatus(kpiRep, 9, null) === 'red')

console.log('computeKpi: teacher attendance_today')
const c = computeKpi(kpiAtt, 'teacher', teacherProfile)
check('value 72',           c.value === 72)
check('benchmark 88',       c.benchmark === 88)
check('delta -16',          c.delta === -16)
check('status red',         c.status === 'red')
check('reason mentions 9',  /9/.test(c.reason))

console.log('prioritise: teacher gets at most 4 entries, red first')
const top = prioritise('teacher', teacherProfile, 4)
const SEV = (c) => ({ red: 3, yellow: 2, green: 1, unknown: 0 }[c.status])
check('returns 4',         top.length === 4)
check('first is red',      top[0].status === 'red')
check('non-increasing severity', top.every((c, i, arr) => i === 0 || SEV(arr[i - 1]) >= SEV(c)))

console.log('computeOverallScore: principal')
const score = computeOverallScore('principal', principalProfile)
check('score is a number 0-100', typeof score.score === 'number' && score.score >= 0 && score.score <= 100)
check('counts sum > 0', score.counts.red + score.counts.yellow + score.counts.green > 0)

console.log('parent: 5 KPIs, hero never crashes')
const parentHero = pickHero('parent', parentProfile)
check('parent has a hero', parentHero != null)
check('parent KPI count = 5', getCatalogForRole('parent').length === 5)

console.log('deo: 29 KPIs (full district tier per doc framework)')
check('deo KPI count = 29',  getCatalogForRole('deo').length === 29)
check('deo prioritise > 0',  prioritise('deo', {}, 4).length > 0)
check('deo overall is num',  typeof computeOverallScore('deo', {}).score === 'number')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
