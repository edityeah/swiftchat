// ─────────────────────────────────────────────────────────────────────────────
// VSK Gujarat Mock Data — Gujarat Education
// ─────────────────────────────────────────────────────────────────────────────

export const SCHOOL_INFO = {
  name: 'Sardar Patel Prathmik Shala',
  udise: 'GJ24010012001',
  block: 'Mehsana',
  district: 'Mehsana',
  state: 'Gujarat',
  type: 'Government',
  medium: 'Gujarati',
  principal: 'Rakesh Joshi',
  totalStudents: 342,
  totalTeachers: 18,
  classes: [3, 5, 6, 8],
}

// ── Demo Credentials ──────────────────────────────────────────────────────────
export const DEMO_SSO_USERS = [
  { stateId: 'TCH1001', password: 'Demo@123', name: 'Priya Mehta',   role: 'teacher',         badge: 'Teacher',         org: 'GPS Mehsana',        school: 'GPS Mehsana', district: 'Mehsana',   initials: 'PM', color: '#3B82F6', emoji: '👩‍🏫' },
  { stateId: 'PRI2001', password: 'Demo@123', name: 'Rakesh Joshi',  role: 'principal',       badge: 'Principal',       org: 'GPS Mehsana',        school: 'GPS Mehsana', district: 'Mehsana',   initials: 'RJ', color: '#7C3AED', emoji: '🏫' },
  { stateId: 'DEO3001', password: 'Demo@123', name: 'Amit Trivedi',  role: 'deo',             badge: 'DEO',             org: 'Ahmedabad District', school: null,          district: 'Ahmedabad', initials: 'AT', color: '#059669', emoji: '📊' },
  { stateId: 'SEC4001', password: 'Demo@123', name: 'Nidhi Shah',    role: 'state_secretary', badge: 'State Secretary', org: 'State — Gujarat',    school: null,          district: null,        initials: 'NS', color: '#DC2626', emoji: '🏛️' },
  { stateId: 'CRC1001', password: 'Demo@123', name: 'Mehul Parmar',  role: 'crc',             badge: 'CRC · Cluster Approver', org: 'Cluster MADHAPAR · Kachchh', school: null,    district: 'Kachchh',   initials: 'MP', color: '#0EA5E9', emoji: '✅', cluster: 'MADHAPAR', approverCode: 'APR001' },
  { stateId: 'PFMS001', password: 'Demo@123', name: 'Farida Shaikh', role: 'pfms',            badge: 'PFMS · Payment Officer', org: 'PFMS — Gujarat',           school: null,    district: null,        initials: 'FS', color: '#F97316', emoji: '💰' },
]

export const DEMO_PHONE_USER = {
  phone: '9876543210', otp: '1234',
  name: 'Meena Patel', role: 'parent', badge: 'Parent', org: 'Parent Portal',
  childName: 'Ravi Patel', childGrade: 'Class 8',
  initials: 'MP', color: '#F59E0B', emoji: '👪',
}

// ── Student Generator ────────────────────────────────────────────────────────
const FIRST_M = ['Aarav','Veer','Dev','Kabir','Om','Arjun','Harsh','Pranav','Jay','Siddh','Dhruv','Ishaan','Kian','Reyansh','Vivaan','Yash','Neel','Raj','Krish','Aditya','Darsh','Hemal','Jeet','Kushal','Laksh','Meet','Parth','Ruhan','Sahil','Tanay']
const FIRST_F = ['Diya','Riya','Ananya','Ishita','Komal','Nisha','Keya','Tanvi','Pooja','Sneha','Krupa','Hetal','Prisha','Myra','Aanya','Bhumi','Charmi','Isha','Khushi','Mira','Neha','Priti','Sara','Urvi','Vaishali','Zara','Riddhi','Gauri','Nidhi','Pari']
const LAST = ['Shah','Patel','Mehta','Joshi','Trivedi','Pandya','Desai','Chauhan','Rathod','Solanki','Gohil','Parmar','Thakor','Prajapati','Vasava','Barot','Bhatt','Rao','Vaghela','Dave','Modi','Thakkar','Rajput','Raval','Jadeja','Panchal','Makwana','Dabhi','Chaudhari','Nayak']
const RISKS = ['low','low','low','low','low','low','medium','medium','high']
const LEVELS = ['Advanced','Proficient','Proficient','Proficient','Basic','Basic']

function genStudents(grade, count = 32) {
  const year = 2024 - grade - 5
  const out = []
  for (let i = 0; i < count; i++) {
    const isFemale = i % 2 === 1
    const first = isFemale ? FIRST_F[i % FIRST_F.length] : FIRST_M[i % FIRST_M.length]
    const last = LAST[(i * 7 + grade) % LAST.length]
    const att = 55 + Math.floor(((i * 13 + grade * 7) % 40))
    const m = 35 + Math.floor(((i * 11 + grade * 3) % 55))
    const s = 35 + Math.floor(((i * 9 + grade * 5) % 55))
    const g = 40 + Math.floor(((i * 7 + grade * 11) % 50))
    out.push({
      id: `STU-${grade}${String(i + 1).padStart(3, '0')}`,
      name: `${first} ${last}`,
      gender: isFemale ? 'F' : 'M',
      dob: `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      guardian: `${isFemale ? FIRST_F[(i + 5) % FIRST_F.length] : FIRST_M[(i + 5) % FIRST_M.length]} ${last}`,
      phone: `98765${String(grade * 1000 + i + 1).padStart(5, '0')}`,
      attendance: att,
      risk: att < 65 ? 'high' : att < 75 ? 'medium' : 'low',
      math: m, sci: s, guj: g,
      level: m >= 80 ? 'Advanced' : m >= 60 ? 'Proficient' : 'Basic',
      namoLaxmi: i < 8 ? ['approved','approved','pending','pending','rejected','approved','pending','approved'][i] : null,
    })
  }
  return out
}

export const STUDENTS = {
  3: genStudents(3, 32),
  5: genStudents(5, 30),
  6: genStudents(6, 34),
  8: genStudents(8, 30),
}

// ── Performance data (auto-derived from students) ────────────────────────────
function gradePerf(grade) {
  const sts = STUDENTS[grade]
  const avg = (key) => Math.round(sts.reduce((s, st) => s + st[key], 0) / sts.length)
  return {
    math: avg('math'), sci: avg('sci'), guj: avg('guj'),
    students: sts.map(s => ({ name: s.name, m: s.math, s: s.sci, g: s.guj, lvl: s.level })),
  }
}
export const PERF_DATA = { 3: gradePerf(3), 5: gradePerf(5), 6: gradePerf(6), 8: gradePerf(8) }

// ── Attendance (last 7 days) ─────────────────────────────────────────────────
export const ATTENDANCE_TREND = [82, 85, 88, 80, 86, 90, 88]
export const ATTENDANCE_DAYS  = ['M', 'T', 'W', 'T', 'F', 'S', 'T']

// Attendance history per grade (last 5 days per student — for webview)
export function getAttendanceHistory(grade, days = 5) {
  const sts = STUDENTS[grade] || []
  const labels = ['Mon 7 Apr','Tue 8 Apr','Wed 9 Apr','Thu 10 Apr','Fri 11 Apr'].slice(0, days)
  return {
    labels,
    records: sts.map(s => ({
      id: s.id, name: s.name,
      days: labels.map((_, d) => {
        // deterministic pseudo-random: present unless attendance% "misses"
        const hash = ((s.id.charCodeAt(4) || 0) * 31 + d * 17 + grade) % 100
        return hash < s.attendance ? 'P' : 'A'
      }),
    })),
  }
}

// ── Risk scores ──────────────────────────────────────────────────────────────
export const AT_RISK_STUDENTS = [
  { name: 'Ravi Patel',   grade: 8, attendance: 58, score: 58, risk: 'high',   reason: 'Chronic absence + low score', days: 12 },
  { name: 'Dhruv Vaghela',grade: 8, attendance: 62, score: 45, risk: 'high',   reason: 'Poor learning outcomes',      days: 9  },
  { name: 'Harsh Bhatt',  grade: 8, attendance: 65, score: 50, risk: 'high',   reason: 'Monday absence pattern',      days: 8  },
  { name: 'Komal Patel',  grade: 8, attendance: 72, score: 68, risk: 'medium', reason: 'Declining trend (last 4 wks)',days: 5  },
  { name: 'Hetal Chauhan',grade: 8, attendance: 70, score: 65, risk: 'medium', reason: 'Subject-specific gap (Maths)',days: 4  },
  { name: 'Jay Prajapati',grade: 6, attendance: 71, score: 52, risk: 'medium', reason: 'Low LO scores in XAMTA',      days: 4  },
]

// ── Scholarship data ─────────────────────────────────────────────────────────
export const SCHOLARSHIP_DATA = [
  { name: 'Namo Laxmi Yojana', color: '#8b5cf6', eligible: 28, applied: 22, approved: 18, pending: 3, rejected: 1 },
  { name: 'DBT Scholarship',   color: '#3d5afe', eligible: 45, applied: 40, approved: 35, pending: 4, rejected: 1 },
  { name: 'EWS Admission',     color: '#059669', eligible: 12, applied: 10, approved: 9,  pending: 1, rejected: 0 },
]

// ── Districts ────────────────────────────────────────────────────────────────
export const DISTRICTS = [
  { name: 'Ahmedabad',    schools: 892, students: 128450, attendance: 87.2, riskStudents: 1842, scholarshipRate: 82.1 },
  { name: 'Surat',        schools: 654, students: 98320,  attendance: 85.8, riskStudents: 1540, scholarshipRate: 79.4 },
  { name: 'Vadodara',     schools: 578, students: 86740,  attendance: 83.4, riskStudents: 1320, scholarshipRate: 77.8 },
  { name: 'Mehsana',      schools: 342, students: 51230,  attendance: 88.6, riskStudents: 892,  scholarshipRate: 84.3 },
  { name: 'Rajkot',       schools: 498, students: 74560,  attendance: 82.1, riskStudents: 1240, scholarshipRate: 76.2 },
  { name: 'Bhavnagar',    schools: 389, students: 58420,  attendance: 81.5, riskStudents: 1120, scholarshipRate: 74.8 },
  { name: 'Gandhinagar',  schools: 256, students: 38640,  attendance: 90.2, riskStudents: 620,  scholarshipRate: 88.5 },
  { name: 'Anand',        schools: 312, students: 46890,  attendance: 86.4, riskStudents: 840,  scholarshipRate: 81.2 },
]

// ── State summary ────────────────────────────────────────────────────────────
export const STATE_SUMMARY = {
  totalSchools: 33248, totalStudents: 8240000, totalTeachers: 280000,
  avgAttendance: 85.4, avgScore: 71.2, scholarshipRate: 79.8,
  riskStudents: 182400, districtCount: 33,
}

// ── Learning outcomes (LO) ───────────────────────────────────────────────────
export const LEARNING_OUTCOMES = {
  Math: [
    { outcome: 'Number Sense',       grade3: 78, grade5: 72, grade8: 68 },
    { outcome: 'Operations',         grade3: 82, grade5: 76, grade8: 74 },
    { outcome: 'Fractions/Decimals', grade3: 65, grade5: 60, grade8: 72 },
    { outcome: 'Geometry',           grade3: 70, grade5: 68, grade8: 65 },
    { outcome: 'Problem Solving',    grade3: 60, grade5: 58, grade8: 70 },
  ],
  Science: [
    { outcome: 'Living Things',      grade3: 82, grade5: 78, grade8: 72 },
    { outcome: 'Matter & Energy',    grade3: 70, grade5: 66, grade8: 68 },
    { outcome: 'Environment',        grade3: 76, grade5: 72, grade8: 65 },
    { outcome: 'Scientific Method',  grade3: 62, grade5: 60, grade8: 70 },
    { outcome: 'Observation',        grade3: 80, grade5: 74, grade8: 68 },
  ],
}

// ── Namo Laxmi applications (full form data) ────────────────────────────────
const NL_FATHERS = ['Ramesh Patel','Jayesh Patel','Sunil Pandya','Dilip Parmar','Hitesh Barot','Kiran Bhatt','Nilam Mehta','Prashant Rao']
const NL_MOTHERS = ['Meena Patel','Kavita Patel','Jyoti Pandya','Gita Parmar','Rita Barot','Hetal Bhatt','Nisha Mehta','Priti Rao']
export const NAMO_LAXMI_APPS = (() => {
  const sts8 = STUDENTS[8] || []
  const statuses = ['approved','approved','pending','rejected','approved','pending','rejected','approved']
  const reasons  = [null, null, 'Aadhaar name mismatch — student name differs from CTS record', 'Bank account invalid — IFSC not found',
    null, 'Guardian details incomplete — mother Aadhaar missing', 'Income certificate expired (>6 months old)', null]
  const docs = [
    { aadhaar: true, pan: true, income: true, lc: true, passbook: true },
    { aadhaar: true, pan: true, income: true, lc: true, passbook: true },
    { aadhaar: true, pan: false, income: true, lc: true, passbook: true },
    { aadhaar: true, pan: true, income: true, lc: false, passbook: false },
    { aadhaar: true, pan: true, income: true, lc: true, passbook: true },
    { aadhaar: true, pan: false, income: false, lc: true, passbook: true },
    { aadhaar: true, pan: true, income: false, lc: true, passbook: true },
    { aadhaar: true, pan: true, income: true, lc: true, passbook: true },
  ]
  return sts8.slice(0, 8).map((s, i) => ({
    studentId: s.id, studentName: s.name,
    grade: 8, section: 'B',
    fatherName: NL_FATHERS[i % NL_FATHERS.length],
    motherName: NL_MOTHERS[i % NL_MOTHERS.length],
    dob: s.dob,
    phone: s.phone,
    status: statuses[i % statuses.length],
    appId: `NL2025GJ${String(i + 12).padStart(4, '0')}`,
    amount: 5000,
    reason: reasons[i % reasons.length],
    submittedDate: `0${(i % 9) + 1}/04/2026`,
    studentAadhaar: `XXXX XXXX ${String(1000 + i * 111).slice(0, 4)}`,
    motherAadhaar: `XXXX XXXX ${String(2000 + i * 222).slice(0, 4)}`,
    bankAcc: `SBIN${String(10000 + i * 1234).slice(0, 8)}`,
    ifsc: `SBIN000${1234 + i}`,
    docs: docs[i % docs.length],
  }))
})()

// ── 30-day attendance trend (per scope) — used by enhanced dashboards ───────
function gen30(seed, base, amp) {
  // Deterministic pseudo-random walk anchored around `base`.
  const out = []
  let v = base
  for (let i = 0; i < 30; i++) {
    const jitter = ((Math.sin(seed + i * 0.7) + Math.cos(seed * 1.3 + i)) * amp)
    v = Math.max(60, Math.min(98, base + jitter))
    out.push(Math.round(v * 10) / 10)
  }
  return out
}
const DAYS_30 = (() => {
  const labels = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    labels.push(`${d.getDate()}/${d.getMonth() + 1}`)
  }
  return labels
})()
export const ATTENDANCE_30D = {
  labels: DAYS_30,
  school:   gen30(11, 87, 3),
  district: gen30(7,  84, 4),
  state:    gen30(3,  85, 2),
}

// ── Subject mastery — last 12 weeks (school + district + state aggregates)
const WEEK_LABELS = (() => {
  const labels = []
  for (let i = 11; i >= 0; i--) labels.push(`W${(12 - i).toString().padStart(2, '0')}`)
  return labels
})()
export const SUBJECT_MASTERY_12W = {
  labels: WEEK_LABELS,
  Math:     [62, 64, 65, 67, 68, 67, 69, 71, 72, 71, 73, 74],
  Science:  [70, 71, 70, 72, 73, 75, 75, 76, 76, 78, 79, 80],
  Gujarati: [74, 73, 75, 76, 76, 77, 77, 78, 79, 79, 80, 81],
  English:  [60, 62, 61, 63, 64, 64, 66, 66, 68, 68, 70, 71],
}

// ── Grade enrolment + gender split (school) ────────────────────────────────
export const SCHOOL_GRADE_BREAKDOWN = [
  { grade: 'Grade 3', boys: 18, girls: 14, total: 32 },
  { grade: 'Grade 5', boys: 15, girls: 15, total: 30 },
  { grade: 'Grade 6', boys: 17, girls: 17, total: 34 },
  { grade: 'Grade 8', boys: 14, girls: 16, total: 30 },
]

// ── Top performers across the school ────────────────────────────────────
export const TOP_PERFORMERS = [
  { name: 'Aarav Shah',    grade: 3, score: 92, attendance: 96 },
  { name: 'Diya Patel',    grade: 3, score: 89, attendance: 94 },
  { name: 'Ananya Pandya', grade: 8, score: 88, attendance: 95 },
  { name: 'Vihaan Joshi',  grade: 5, score: 86, attendance: 91 },
  { name: 'Saanvi Mehta',  grade: 6, score: 85, attendance: 93 },
]

// ── Scholarship funnel (state/district) ────────────────────────────────────
export const SCHOLARSHIP_FUNNEL = {
  state: [
    { label: 'Initiated',     value: 1620000 },
    { label: 'Submitted',     value: 1545000 },
    { label: 'Auto-approved', value: 1100000 },
    { label: 'Approved',      value: 1400000 },
    { label: 'Paid',          value: 1325000 },
  ],
  district: [
    { label: 'Initiated',     value: 28400 },
    { label: 'Submitted',     value: 26800 },
    { label: 'Auto-approved', value: 21200 },
    { label: 'Approved',      value: 24500 },
    { label: 'Paid',          value: 23100 },
  ],
}

// ── Monthly disbursement (last 6 months) ─────────────────────────────────────
export const MONTHLY_DISBURSEMENT = {
  labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
  state: {
    sanctioned: [78, 82, 80, 84, 88, 86],   // ₹ Cr
    disbursed:  [70, 76, 74, 72, 79, 80],
  },
  district: {
    sanctioned: [12, 13, 13, 14, 15, 14],
    disbursed:  [11, 12, 12, 11, 13, 13],
  },
}

// ── Payment failure breakdown (PFMS) ────────────────────────────────────────
export const PAYMENT_FAILURES = [
  { reason: 'Aadhaar–bank link missing', count: 45, amount: 22500, color: '#EB5757' },
  { reason: 'Account frozen',             count: 12, amount: 6000,  color: '#F8B200' },
  { reason: 'Invalid IFSC',               count: 8,  amount: 4000,  color: '#7C3AED' },
]

// ── 14-day per-student attendance for at-risk drill ─────────────────────────
export function attendance14d(seed, attendancePct) {
  const out = []
  let streak = 0
  for (let i = 0; i < 14; i++) {
    const r = ((Math.sin(seed * 1.7 + i) + Math.cos(seed * 0.9 - i)) * 50 + 50)
    const present = r < attendancePct
    out.push(present ? 100 : 0)
    streak = present ? streak + 1 : 0
  }
  return out
}

// ── XAMTA scan results (sample) ──────────────────────────────────────────────
export const XAMTA_SAMPLE_RESULTS = [
  { student: 'Aarav Shah', grade: 3, subject: 'Math', score: 18, total: 25, lo: ['LO1: 4/5', 'LO2: 5/5', 'LO3: 3/5', 'LO4: 4/5', 'LO5: 2/5'] },
  { student: 'Diya Patel', grade: 3, subject: 'Math', score: 23, total: 25, lo: ['LO1: 5/5', 'LO2: 5/5', 'LO3: 4/5', 'LO4: 5/5', 'LO5: 4/5'] },
  { student: 'Kabir Mehta',grade: 3, subject: 'Math', score: 14, total: 25, lo: ['LO1: 3/5', 'LO2: 3/5', 'LO3: 2/5', 'LO4: 3/5', 'LO5: 3/5'] },
]

// ── User profiles (matched to demo creds) ────────────────────────────────────
export const USER_PROFILES = {
  teacher: {
    name: 'Priya Mehta', stateId: 'TCH1001', role: 'teacher', badge: 'Teacher',
    org: 'GPS Mehsana', school: 'Sardar Patel Prathmik Shala',
    district: 'Mehsana', scope: 'School', employeeId: 'EMP-GJ-10042',
    phone: '9876541001', email: 'priya.mehta@vsk.gujarat.gov.in',
    dpdpaTier: 'Tier 2 — Staff', sessionTTL: '8 hrs', lastLogin: '08/04/2026, 9:14 AM',
    tokenOrigin: 'Gujarat SSO (OIDC)', initials: 'PM', color: '#3B82F6',
    classes: [6, 8], // teacher owns these classes
  },
  principal: {
    name: 'Rakesh Joshi', stateId: 'PRI2001', role: 'principal', badge: 'Principal',
    org: 'GPS Mehsana', school: 'Sardar Patel Prathmik Shala',
    district: 'Mehsana', scope: 'School', employeeId: 'EMP-GJ-20018',
    phone: '9876542001', email: 'rakesh.joshi@vsk.gujarat.gov.in',
    dpdpaTier: 'Tier 2 — Staff', sessionTTL: '8 hrs', lastLogin: '08/04/2026, 8:52 AM',
    tokenOrigin: 'Gujarat SSO (OIDC)', initials: 'RJ', color: '#7C3AED',
  },
  deo: {
    name: 'Amit Trivedi', stateId: 'DEO3001', role: 'deo', badge: 'DEO',
    org: 'Ahmedabad District Education Office', school: null,
    district: 'Ahmedabad', scope: 'District', employeeId: 'EMP-GJ-30009',
    phone: '9876543001', email: 'amit.trivedi@deo.gujarat.gov.in',
    dpdpaTier: 'Tier 3 — Official', sessionTTL: '12 hrs', lastLogin: '08/04/2026, 7:48 AM',
    tokenOrigin: 'Gujarat SSO (SAML)', initials: 'AT', color: '#059669',
  },
  state_secretary: {
    name: 'Nidhi Shah', stateId: 'SEC4001', role: 'state_secretary', badge: 'State Secretary',
    org: 'State Education Department, Gujarat', school: null,
    district: null, scope: 'State — Gujarat', employeeId: 'IAS-GJ-0042',
    phone: '9876544001', email: 'nidhi.shah@edu.gujarat.gov.in',
    dpdpaTier: 'Tier 4 — Executive', sessionTTL: '24 hrs', lastLogin: '08/04/2026, 6:30 AM',
    tokenOrigin: 'Gujarat SSO (SAML)', initials: 'NS', color: '#DC2626',
  },
  parent: {
    name: 'Meena Patel', stateId: null, role: 'parent', badge: 'Parent',
    org: 'Parent Portal', school: 'Sardar Patel Prathmik Shala',
    district: 'Mehsana', scope: 'Student', employeeId: null,
    phone: '9876543210', email: null,
    dpdpaTier: 'Tier 1 — Citizen', sessionTTL: '4 hrs', lastLogin: '08/04/2026, 10:05 AM',
    tokenOrigin: 'Phone OTP', initials: 'MP', color: '#F59E0B',
    childName: 'Ravi Patel', childGrade: 'Class 8',
  },
  crc: {
    name: 'Mehul Parmar', stateId: 'CRC1001', role: 'crc', badge: 'CRC · Cluster Approver',
    org: 'Cluster MADHAPAR · Kachchh', school: null,
    district: 'Kachchh', scope: 'Cluster — MADHAPAR', employeeId: 'EMP-GJ-CRC-001',
    phone: '9876545001', email: 'mehul.parmar@deo.gujarat.gov.in',
    dpdpaTier: 'Tier 2 — Staff', sessionTTL: '8 hrs', lastLogin: '08/04/2026, 9:42 AM',
    tokenOrigin: 'Gujarat SSO (OIDC)', initials: 'MP', color: '#0EA5E9',
    cluster: 'MADHAPAR', approverCode: 'APR001',
  },
  pfms: {
    name: 'Farida Shaikh', stateId: 'PFMS001', role: 'pfms', badge: 'PFMS · Payment Officer',
    org: 'PFMS — Gujarat', school: null,
    district: null, scope: 'State — Gujarat (Payments)', employeeId: 'EMP-GJ-PFMS-001',
    phone: '9876546001', email: 'farida.shaikh@pfms.nic.in',
    dpdpaTier: 'Tier 3 — Official', sessionTTL: '12 hrs', lastLogin: '08/04/2026, 8:12 AM',
    tokenOrigin: 'PFMS SSO (SAML)', initials: 'FS', color: '#F97316',
  },
}
