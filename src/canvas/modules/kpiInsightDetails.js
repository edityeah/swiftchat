// Per-KPI "details" registry — the rich inline content that used to live
// behind a "Open X list" CTA button. Now it sits right inside the KPI
// insight canvas, so the user never has to open a second canvas to see the
// records that back a KPI value.
//
// `getDetailsFor` returns a structured payload that the canvas renders. The
// type tells the canvas WHICH renderer to use; the data is the payload.
//
//   { type: 'student_list',    title, students:[{ name, klass, absentDays, pattern[14], lastSeen, reason, risk }] }
//   { type: 'entity_list',     title, headers:[], rows:[[...]], rowCount }
//   { type: 'segment_bars',    title, segments:[{ label, value, accent }] }
//   { type: 'domain_breakdown',title, domains:[{ label, value, color }] }
//
// Everything is mock — the goal is a realistic story per KPI, not real data.

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Build a deterministic 14-day attendance pattern for a student. `absentDays`
// caps the count. We bias absences to Mondays + Fridays + recent days so the
// pattern looks like a real chronic-absence trend rather than random noise.
function makeAttendancePattern(seed, absentDays) {
  const days = 14
  const pattern = new Array(days).fill('P')
  // PRNG seeded by name length + char codes — deterministic per student.
  let s = seed
  const next = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const candidates = []
  for (let i = 0; i < days; i++) {
    const dow = (i + 6) % 7      // assume day 0 is a Saturday in cycle
    let weight = 1
    if (dow === 1 || dow === 5) weight = 2.2  // Monday + Friday absences
    if (i >= days - 5)           weight *= 1.6 // bias to recent days
    candidates.push({ i, w: weight * (0.7 + next() * 0.6) })
  }
  candidates.sort((a, b) => b.w - a.w)
  candidates.slice(0, absentDays).forEach(c => { pattern[c.i] = 'A' })
  return pattern
}

// Stable hash for a string — used to seed the PRNG above.
function strHash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ─── KPI-specific builders ───────────────────────────────────────────────────

// Chronic absentees — 6 students of varying severity. Teacher mock value is
// 6, so this list has exactly 6 entries (numbers MUST agree).
function chronicAbsenteesForTeacher() {
  const raw = [
    { name: 'Ravi Patel',     klass: 'VIII-A', absentDays: 12, lastSeen: '5 days ago',  reason: 'Family fieldwork — seasonal labour migration', risk: 'high' },
    { name: 'Dhruv Vaghela',  klass: 'VIII-A', absentDays: 11, lastSeen: '4 days ago',  reason: 'Repeated illness — needs medical follow-up',    risk: 'high' },
    { name: 'Harsh Bhatt',    klass: 'VIII-A', absentDays:  9, lastSeen: '3 days ago',  reason: 'Monday/Friday absence pattern, low LO scores',  risk: 'high' },
    { name: 'Komal Patel',    klass: 'VIII-A', absentDays:  8, lastSeen: '2 days ago',  reason: 'Declining trend over last 4 weeks',             risk: 'watch' },
    { name: 'Hetal Chauhan',  klass: 'VIII-A', absentDays:  8, lastSeen: '2 days ago',  reason: 'Maths-period skipping pattern',                 risk: 'watch' },
    { name: 'Jay Prajapati',  klass: 'VIII-A', absentDays:  8, lastSeen: '1 day ago',   reason: 'Sibling care responsibilities at home',         risk: 'watch' },
  ]
  return raw.map(s => ({
    ...s,
    pattern: makeAttendancePattern(strHash(s.name), s.absentDays),
  }))
}

// Other roles roll up to counts large enough that a per-student list isn't
// useful — we surface a school / block / district list instead.
function entityListForChronicAbsentees(role) {
  if (role === 'principal') {
    return {
      type: 'entity_list',
      title: '42 students flagged across the school',
      headers: ['Class', 'Students', 'Avg absent days', 'Severity'],
      rows: [
        ['VIII-A', 6,  9.3, 'high'],
        ['VIII-B', 5,  8.6, 'high'],
        ['VII-A',  4,  8.0, 'watch'],
        ['VII-B',  4,  7.8, 'watch'],
        ['VI-A',   7,  8.2, 'watch'],
        ['IX-A',   8,  9.0, 'high'],
        ['IX-B',   5,  7.6, 'watch'],
        ['X-A',    3,  7.4, 'watch'],
      ],
      rowCount: 42,
    }
  }
  if (role === 'crc') {
    return {
      type: 'entity_list',
      title: '210 students flagged across 14 schools in the cluster',
      headers: ['School', 'Flagged', 'Schools below threshold'],
      rows: [
        ['MADHAPAR-1 UPS', 28, 'yes'],
        ['MADHAPAR-2 UPS', 22, 'yes'],
        ['BHACHAU PS',     19, 'yes'],
        ['ANJAR-1 PS',     17, 'no'],
        ['GANDHIDHAM PS',  16, 'no'],
        ['TUNA UPS',       15, 'yes'],
        ['…and 8 more',    93, '—'],
      ],
      rowCount: 210,
    }
  }
  if (role === 'beo' || role === 'state_secretary' || role === 'deo') {
    const isState = role === 'state_secretary'
    return {
      type: 'entity_list',
      title: isState
        ? '48,000 students flagged across the state — top blocks'
        : '820 students flagged across the block — top schools',
      headers: isState
        ? ['District', 'Flagged', 'Schools >5%']
        : ['School',   'Flagged', 'Class wings >2'],
      rows: isState
        ? [
            ['Dahod',       4200, 24],
            ['Banaskantha', 3850, 21],
            ['Kachchh',     3400, 19],
            ['Aravalli',    3100, 17],
            ['Botad',       2950, 16],
            ['Gandhinagar', 2700, 15],
            ['…and 27 more', 27800, 142],
          ]
        : [
            ['BHUJ-1 UPS',    52, 3],
            ['MUNDRA PS',     46, 2],
            ['ANJAR-3 UPS',   41, 2],
            ['NAKHATRANA PS', 38, 2],
            ['…and 38 more', 643, '—'],
          ],
      rowCount: isState ? 48000 : 820,
    }
  }
  return null
}

// Generic segment-breakdown for percentage KPIs that don't have a custom
// builder. Tailors labels to the role.
function segmentBreakdownGeneric(role, kpi) {
  const labels =
    role === 'state_secretary' ? ['Ahmedabad', 'Surat', 'Mehsana', 'Kachchh', 'Rajkot']
  : role === 'beo'             ? ['Mehsana Block', 'Kadi', 'Visnagar', 'Becharaji', 'Vijapur']
  : role === 'crc'             ? ['MADHAPAR-1', 'MADHAPAR-2', 'BHACHAU', 'ANJAR', 'GANDHIDHAM']
  : role === 'principal'       ? ['VI-A','VI-B','VII-A','VIII-A','VIII-B']
  : role === 'pfms'            ? ['Namo Lakshmi','Namo Saraswati','DigiVritti','Gyan Sadhana','Gyan Sethu']
  :                              ['English','Maths','Science','Hindi','Gujarati']
  const values = [92, 87, 78, 69, 58]
  return {
    type: 'segment_bars',
    title: role === 'teacher' ? `Subject-wise breakdown` :
           role === 'principal' ? `Class-wise breakdown` :
           role === 'crc' ? `Schools in cluster` :
           role === 'beo' ? `Schools in block` :
           role === 'state_secretary' ? `Top 5 districts` :
           role === 'pfms' ? `By scheme` :
           `Top 5`,
    segments: labels.map((label, i) => ({
      label,
      value: values[i],
      unit: kpi.unit === '%' ? '%' : kpi.unit === 'hours' ? ' hrs' : '',
    })),
  }
}

// Domain breakdown for GSQAC-style score KPIs.
function gsqacDomainBreakdown() {
  return {
    type: 'domain_breakdown',
    title: 'Domain-wise GSQAC score',
    domains: [
      { label: 'Curriculum & Pedagogy',      value: 4.1, color: '#10B981' },
      { label: 'Learning Environment',       value: 3.9, color: '#10B981' },
      { label: 'Student Engagement',         value: 3.7, color: '#3B82F6' },
      { label: 'Inclusion & Equity',         value: 3.5, color: '#3B82F6' },
      { label: 'Leadership & Governance',    value: 3.2, color: '#F59E0B' },
      { label: 'Infrastructure & Safety',    value: 2.9, color: '#EF4444' },
    ],
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getDetailsFor(kpi, role) {
  if (!kpi) return null

  // Strong per-KPI builders first.
  if (kpi.id === 'chronic_absentees') {
    if (role === 'teacher' || role === 'parent') {
      return {
        type: 'student_list',
        title: '6 students absent more than 7 days',
        students: chronicAbsenteesForTeacher(),
      }
    }
    return entityListForChronicAbsentees(role)
  }

  if (kpi.id === 'gsqac_score') {
    return gsqacDomainBreakdown()
  }

  // Generic fallbacks — pick a renderer by unit.
  if (kpi.unit === '%' || kpi.unit === 'hours') {
    return segmentBreakdownGeneric(role, kpi)
  }

  // Count KPIs without a custom builder — minimal placeholder list.
  if (kpi.unit === 'count') {
    return {
      type: 'entity_list',
      title: 'Items behind this number',
      headers: ['Item', 'Value'],
      rows: [],
      rowCount: 0,
    }
  }

  // Score (default to domain breakdown using a generic template).
  return {
    type: 'segment_bars',
    title: 'Top contributors',
    segments: segmentBreakdownGeneric(role, kpi).segments,
  }
}
