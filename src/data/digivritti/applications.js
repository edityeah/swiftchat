// DigiVritti — comprehensive mock data layer.
// Single source of truth for students, applications, documents, payments
// shown across the chat dispatcher and the embedded canvas.
//
// Includes a hard-coded record for `NS2025GJ0011` (Patel Kavya, REJECTED —
// mother name mismatch) so the chat-driven "Fix & resubmit" deep link never
// 404s.

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────
export const SCHEMES = {
  namo_lakshmi: {
    id: 'namo_lakshmi',
    code: 'NL',
    name: 'Namo Lakshmi Yojana',
    short: 'Namo Lakshmi',
    description: '₹50,000 over 4 years for girl students in Class 9–12.',
    eligibility: 'Female · Class 9–12 · Family income ≤ ₹6,00,000',
    grades: [9, 10, 11, 12],
    monthlyAmount: { 9: 500, 10: 500, 11: 750, 12: 750 },
  },
  namo_saraswati: {
    id: 'namo_saraswati',
    code: 'NS',
    name: 'Namo Saraswati Vigyan Sadhana Yojana',
    short: 'Namo Saraswati',
    description: '₹25,000 over 2 years for Science stream girls in Class 11–12.',
    eligibility: 'Female · Class 11–12 · Science · Class 10 ≥ 50%',
    grades: [11, 12],
    monthlyAmount: { 11: 833, 12: 1250 },
  },
}

// Application lifecycle — matches IPMS / SwiftChat bot statuses.
export const APPLICATION_STATUS = {
  DRAFT:             { label: 'Draft',             tone: 'neutral', icon: '💾' },
  SUBMITTED:         { label: 'Submitted',         tone: 'info',    icon: '📤' },
  AUTO_REJECTED:     { label: 'Auto-rejected',     tone: 'error',   icon: '⚠️' },
  APPROVER_PENDING:  { label: 'Approver pending',  tone: 'warning', icon: '⏳' },
  RESUBMITTED:       { label: 'Resubmitted',       tone: 'info',    icon: '🔄' },
  APPROVED:          { label: 'Approved',          tone: 'success', icon: '✅' },
  REJECTED:          { label: 'Rejected',          tone: 'error',   icon: '❌' },
  PAYMENT_PENDING:   { label: 'Payment pending',   tone: 'info',    icon: '🏦' },
  PAYMENT_SUCCESS:   { label: 'Payment success',   tone: 'success', icon: '💰' },
  PAYMENT_FAILED:    { label: 'Payment failed',    tone: 'error',   icon: '🔻' },
  NOT_WANTED:        { label: 'Not wanted',        tone: 'neutral', icon: '🚫' },
}

// "Bucket" used by the application list filter — collapses lifecycle states.
export function statusBucket(status) {
  if (['APPROVED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS'].includes(status)) return 'approved'
  if (['REJECTED', 'AUTO_REJECTED', 'PAYMENT_FAILED'].includes(status)) return 'rejected'
  if (['DRAFT', 'NOT_WANTED'].includes(status)) return 'draft'
  if (status === 'RESUBMITTED') return 'resubmitted'
  return 'pending' // SUBMITTED + APPROVER_PENDING
}

// Document keys per scheme.
export const DOC_DEFINITIONS = {
  namo_lakshmi: [
    { key: 'aadhaar',       label: 'Student Aadhaar' },
    { key: 'motherAadhaar', label: 'Mother Aadhaar' },
    { key: 'income',        label: 'Income certificate' },
    { key: 'lcr',           label: 'LCR / birth certificate' },
    { key: 'passbook',      label: 'Mother bank passbook' },
  ],
  namo_saraswati: [
    { key: 'aadhaar',   label: 'Student Aadhaar' },
    { key: 'marksheet', label: 'Class 10 marksheet' },
    { key: 'income',    label: 'Income certificate' },
    { key: 'seat',      label: 'Seat verification' },
    { key: 'passbook',  label: 'Mother bank passbook' },
  ],
}

// Document states beyond uploaded/missing — used to drive review banners.
export const DOC_STATE = {
  uploaded: { label: 'Uploaded', tone: 'success' },
  verified: { label: 'Verified', tone: 'success' },
  missing:  { label: 'Missing',  tone: 'error' },
  blurry:   { label: 'Blurry',   tone: 'warning' },
  mismatch: { label: 'Mismatch', tone: 'error' },
}

// Scope metadata — districts → blocks → clusters → schools.
// Covers the full set of districts/blocks/clusters/schools required by the
// QA workflow checklist (KACHCHH, BANASKANTHA, PATAN, SABARKANTHA, DAHOD,
// SURAT, DANG, TAPI, NAVSARI, VALSAD; blocks BHUJ/ANJAR/MANDVI/PALANPUR/
// DHANERA/CHANASMA; clusters MADHAPAR/ANJAR/K.M.CHOKSI/DHANERA/IDAR).
export const DISTRICTS_META = [
  { district: 'Kachchh',     block: 'Bhuj',         cluster: 'MADHAPAR',   school: 'Govt. Sec. School, Madhapar', schoolCode: '24010515912' },
  { district: 'Kachchh',     block: 'Anjar',        cluster: 'ANJAR',      school: 'Anjar Primary School',         schoolCode: '24010515908' },
  { district: 'Kachchh',     block: 'Mandvi',       cluster: 'MADHAPAR',   school: 'Bhuj Girls School',            schoolCode: '24010516001' },
  { district: 'Banaskantha', block: 'Dhanera',      cluster: 'DHANERA',    school: 'GHSS Dhanera',                 schoolCode: '24070801023' },
  { district: 'Banaskantha', block: 'Palanpur',     cluster: 'K.M.CHOKSI', school: 'GHS K.M.Choksi',               schoolCode: '24070101005' },
  { district: 'Patan',       block: 'Chanasma',     cluster: 'K.M.CHOKSI', school: 'Shree Kanya Vidyalaya',        schoolCode: '24060201007' },
  { district: 'Sabarkantha', block: 'Idar',         cluster: 'IDAR',       school: 'Sardar Patel Prathmik Shala',  schoolCode: '24050201001' },
  { district: 'Dahod',       block: 'Dahod',        cluster: 'DAHOD',      school: 'GHSS Dahod',                   schoolCode: '24090111001' },
  { district: 'Surat',       block: 'Surat City',   cluster: 'SURAT',      school: 'GHS Athwa',                    schoolCode: '24080115001' },
  { district: 'Dang',        block: 'Ahwa',         cluster: 'IDAR',       school: 'GHS Ahwa',                     schoolCode: '24110115002' },
  { district: 'Tapi',        block: 'Vyara',        cluster: 'IDAR',       school: 'GHS Vyara',                    schoolCode: '24120111003' },
  { district: 'Navsari',     block: 'Navsari',      cluster: 'IDAR',       school: 'GHS Navsari',                  schoolCode: '24130118008' },
  { district: 'Valsad',      block: 'Valsad',       cluster: 'IDAR',       school: 'GHS Valsad',                   schoolCode: '24140119010' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Students (50+) — required-named students hand-rolled at the head of the
// list, then a deterministic generator fills the long tail.
// ─────────────────────────────────────────────────────────────────────────────
const FIRST_F = ['Jaydeviba','Riya','Ananya','Khushi','Pari','Ishita','Aastha','Tanvi','Princy','Hetal','Mira','Diya','Krupa','Bhumi','Komal','Sara','Vaishali','Nidhi','Charmi','Aanya','Zara','Gauri','Riddhi','Pooja','Sneha','Neha','Priti','Urvi','Myra','Geeta','Kavya','Manvi']
const FIRST_M = ['Aarav','Veer','Dev','Kabir','Om','Arjun','Harsh','Pranav','Jay','Siddh','Dhruv','Ishaan','Kian','Reyansh','Vivaan','Yash','Neel','Raj','Krish','Aditya']
const LAST = ['Vaghela','Shah','Patel','Mehta','Joshi','Trivedi','Pandya','Solanki','Bhatt','Rathod','Parmar','Prajapati','Desai','Modi','Vasava','Nayak','Rajput','Chauhan','Barot','Thakkar','Panchal','Praja']
const FATHERS = ['Ajitsinh','Rakesh','Mahesh','Sunil','Dilip','Hitesh','Kiran','Pravin','Jayesh','Bhavesh','Nilesh','Manish','Naresh','Hemant','Prakash','Jitendrabhai','Bhaveshbhai','Sunilbhai','Rameshbhai']
const MOTHERS_FORMAL = ['Gayatri','Reena','Sunita','Meena','Kavita','Jyoti','Gita','Rita','Hetal','Nisha','Priti','Geeta','Anjali','Vandana','Bhavna','Falguni']

function deterministicAadhaar(seed) {
  const tail = String(1000 + (seed * 1117) % 9000)
  return `XXXX XXXX ${tail}`
}
function deterministicAccount(seed) { return `SBIN${String(10000000 + (seed * 17) % 90000000)}` }
function deterministicIfsc(seed) {
  const banks = ['SBIN0001234','BARB0BGGBXX','HDFC0001234','PNB0010234','BARB0BAGGBA']
  return banks[seed % banks.length]
}

// Hand-curated required students from the QA checklist. Index 0 is always
// Vaghela Jaydeviba so existing seeded apps that reference STUDENTS[0]
// continue to point at her record.
const REQUIRED_STUDENTS = [
  { idSuffix: '0001', name: 'Vaghela Jaydeviba Ajitsinh',     gender: 'F', grade: 9,  section: 'B', stream: null,      father: 'Ajitsinh Vaghela',      mother: 'Gayatri Vaghela',      district: 0 },
  { idSuffix: '0002', name: 'Shah Riya Bhaveshbhai',          gender: 'F', grade: 10, section: 'A', stream: null,      father: 'Bhaveshbhai Shah',      mother: 'Reena Shah',           district: 1 },
  { idSuffix: '0003', name: 'Patel Kavya Sunilbhai',          gender: 'F', grade: 11, section: 'A', stream: 'Science', father: 'Sunilbhai Patel',       mother: 'Sunita Patel',         district: 0, tenthPct: 78.5, seatNumber: 'A12346' },
  { idSuffix: '0004', name: 'Prajapati Princy Jitendrabhai',  gender: 'F', grade: 11, section: 'A', stream: 'Science', father: 'Jitendrabhai Prajapati',mother: 'Geeta Prajapati',      district: 4, tenthPct: 92.17, seatNumber: 'A12345' },
  { idSuffix: '0005', name: 'Nisha Prajapati',                gender: 'F', grade: 8,  section: 'B', stream: null,      father: 'Mahesh Prajapati',      mother: 'Bhavna Prajapati',     district: 2 },
  { idSuffix: '0006', name: 'Om Desai',                       gender: 'M', grade: 11, section: 'B', stream: 'Science', father: 'Hitesh Desai',          mother: 'Falguni Desai',        district: 3, tenthPct: 81.4, seatNumber: 'A12390' },
  { idSuffix: '0007', name: 'Dev Modi',                       gender: 'M', grade: 12, section: 'B', stream: 'Science', father: 'Pravin Modi',           mother: 'Hetal Modi',           district: 4, tenthPct: 76.9, seatNumber: 'A12391' },
  { idSuffix: '0008', name: 'Ishita Nayak',                   gender: 'F', grade: 8,  section: 'B', stream: null,      father: 'Naresh Nayak',          mother: 'Anjali Nayak',         district: 6 },
  { idSuffix: '0009', name: 'Aarav Desai',                    gender: 'M', grade: 9,  section: 'B', stream: null,      father: 'Bhavesh Desai',         mother: 'Priti Desai',          district: 5 },
  { idSuffix: '0010', name: 'Tanvi Panchal',                  gender: 'F', grade: 10, section: 'A', stream: null,      father: 'Manish Panchal',        mother: 'Vandana Panchal',      district: 7 },
  { idSuffix: '0011', name: 'Jay Mehta',                      gender: 'M', grade: 12, section: 'A', stream: 'Science', father: 'Hemant Mehta',          mother: 'Nisha Mehta',          district: 8, tenthPct: 70.0, seatNumber: 'A12392' },
  { idSuffix: '0012', name: 'Harsh Vaghela',                  gender: 'M', grade: 11, section: 'C', stream: 'Science', father: 'Prakash Vaghela',       mother: 'Geeta Vaghela',        district: 9, tenthPct: 65.5, seatNumber: 'A12393' },
  { idSuffix: '0013', name: 'Diya Shah',                      gender: 'F', grade: 9,  section: 'A', stream: null,      father: 'Rakesh Shah',           mother: 'Kavita Shah',          district: 10 },
  { idSuffix: '0014', name: 'Riya Praja',                     gender: 'F', grade: 10, section: 'B', stream: null,      father: 'Sunil Praja',           mother: 'Gita Praja',           district: 11 },
]

function buildRequiredStudent(s, baseIdx) {
  const district = DISTRICTS_META[s.district % DISTRICTS_META.length]
  const dobYear = 2010 - (s.grade - 9)
  return {
    id: `STU-2025-${s.idSuffix}`,
    name: s.name,
    fatherName: s.father,
    motherName: s.mother,
    grade: s.grade,
    section: s.section,
    gender: s.gender,
    dob: `${dobYear}-04-${String((baseIdx % 28) + 1).padStart(2, '0')}`,
    phone: `987654${String(1000 + baseIdx).slice(-4)}`,
    studentAadhaar: deterministicAadhaar(baseIdx + 11),
    motherAadhaar:  deterministicAadhaar(baseIdx + 41),
    bankAcc: deterministicAccount(baseIdx + 23),
    ifsc:    deterministicIfsc(baseIdx + 5),
    bankName: ['Baroda Gujarat Gramin Bank', 'State Bank of India', 'HDFC Bank', 'Punjab National Bank'][baseIdx % 4],
    stream: s.stream,
    tenthPct: s.tenthPct ?? (s.stream === 'Science' ? Math.round((55 + (baseIdx * 7) % 40) * 100) / 100 : null),
    seatNumber: s.seatNumber ?? (s.stream === 'Science' ? `A${10000 + baseIdx * 13}` : null),
    ...district,
  }
}

function buildStudent(i) {
  // Mix male/female ~30/70 (male every 3rd index) so Namo Saraswati can
  // legitimately surface boys.
  const isMale = i % 3 === 2
  const grade = [9, 10, 11, 12][i % 4]
  const sectionIdx = i % 3
  const section = ['A', 'B', 'C'][sectionIdx]
  const first = isMale ? FIRST_M[i % FIRST_M.length] : FIRST_F[i % FIRST_F.length]
  const last  = LAST[(i * 7) % LAST.length]
  const father = FATHERS[i % FATHERS.length]
  const motherFirst = MOTHERS_FORMAL[i % MOTHERS_FORMAL.length]
  const district = DISTRICTS_META[i % DISTRICTS_META.length]
  const stream = grade >= 11 ? (i % 3 === 0 ? 'Science' : i % 3 === 1 ? 'Commerce' : 'Arts') : null
  const dobYear = 2010 - (grade - 9)
  return {
    id: `STU-2025-${String(2000 + i).padStart(4, '0')}`,
    name: `${last} ${first}`,
    fatherName: `${father} ${last}`,
    motherName: `${motherFirst} ${last}`,
    grade,
    section,
    gender: isMale ? 'M' : 'F',
    dob: `${dobYear}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    phone: `987654${String(1000 + i).slice(-4)}`,
    studentAadhaar: deterministicAadhaar(i + 11),
    motherAadhaar:  deterministicAadhaar(i + 41),
    bankAcc: deterministicAccount(i + 23),
    ifsc:    deterministicIfsc(i + 5),
    bankName: ['Baroda Gujarat Gramin Bank', 'State Bank of India', 'HDFC Bank', 'Punjab National Bank'][i % 4],
    stream,
    tenthPct: stream === 'Science' ? Math.round((55 + (i * 7) % 40) * 100) / 100 : null,
    seatNumber: stream === 'Science' ? `A${10000 + i * 13}` : null,
    ...district,
  }
}

const REQUIRED_BUILT = REQUIRED_STUDENTS.map((s, i) => buildRequiredStudent(s, i))
const GENERATED = Array.from({ length: 40 }, (_, i) => buildStudent(i))
export const STUDENTS = [...REQUIRED_BUILT, ...GENERATED]
export const STUDENT_BY_ID = Object.fromEntries(STUDENTS.map(s => [s.id, s]))

// ─────────────────────────────────────────────────────────────────────────────
// Applications (40+) — generated then enriched with explicit edge cases.
// Each scheme uses a separate ID prefix.
// ─────────────────────────────────────────────────────────────────────────────
const REJECTION_REASONS = [
  'Mother name mismatch — Aadhaar name differs from bank passbook.',
  'Aadhaar card image is unclear/blurry — please re-upload.',
  'Income certificate has expired (>6 months old).',
  'Bank account invalid — IFSC not found.',
  'LCR / birth certificate is missing.',
  'Guardian Aadhaar is missing.',
  'Class 10 percentage below 50% — does not qualify for NS.',
  'Seat number not found in Exam Board records.',
]

function makeApp(scheme, idx, student, status, overrides = {}) {
  const code = SCHEMES[scheme].code
  const appId = overrides.appId || `${code}2025GJ${String(idx).padStart(4, '0')}`
  const docs = (DOC_DEFINITIONS[scheme] || []).reduce((acc, def) => {
    // Default: most docs are uploaded. Inject failures based on overrides.
    const fail = overrides.docState?.[def.key]
    acc[def.key] = fail || (Math.random() < 0.05 ? 'missing' : 'verified')
    return acc
  }, {})
  // Deterministic doc state: rely on overrides only — don't randomise so list
  // re-renders are stable across navigation.
  for (const key of Object.keys(docs)) {
    docs[key] = overrides.docState?.[key] || 'verified'
  }
  const submittedAt = overrides.submittedAt || `2025-${String(((idx % 9) + 1)).padStart(2, '0')}-${String(((idx % 25) + 1)).padStart(2, '0')}`
  return {
    appId,
    schemeId: scheme,
    studentId: student.id,
    studentName: student.name,
    fatherName: student.fatherName,
    motherName: overrides.motherName ?? student.motherName,
    motherNameInBank: overrides.motherNameInBank ?? student.motherName,
    grade: student.grade,
    section: student.section,
    dob: student.dob,
    phone: student.phone,
    studentAadhaar: student.studentAadhaar,
    motherAadhaar: student.motherAadhaar,
    bankAcc: student.bankAcc,
    ifsc: student.ifsc,
    bankName: student.bankName,
    schoolCode: student.schoolCode,
    school: student.school,
    cluster: student.cluster,
    block: student.block,
    district: student.district,
    stream: student.stream,
    tenthPct: student.tenthPct,
    seatNumber: student.seatNumber,
    docs,
    status,
    rejectionReason: overrides.rejectionReason || null,
    submittedAt,
    submittedDate: submittedAt.split('-').reverse().slice(0, 2).concat(submittedAt.slice(0, 4)).join('/'),
    resubmissionCount: overrides.resubmissionCount ?? (status === 'RESUBMITTED' ? 2 : 1),
    nextStep: overrides.nextStep || null,
    monthlyAmount: SCHEMES[scheme].monthlyAmount[student.grade] || 500,
    payment: overrides.payment || null,
    ...overrides.extra,
  }
}

// Hand-curated applications that drive specific demo scenarios.
// `NS2025GJ0011` is required by the chat dispatcher's Fix & resubmit link.
const SEED_APPS = []

// ── NS2025GJ0011 — exact spec from the brief ────────────────────────────────
const KAVYA = {
  id: 'STU-FIXED-001',
  name: 'Patel Kavya',
  fatherName: 'Rameshbhai Patel',
  motherName: 'Patel Sunita Rameshbhai',
  grade: 11,
  section: 'A',
  gender: 'F',
  dob: '2008-08-21',
  phone: '9876549922',
  studentAadhaar: 'XXXX XXXX 7702',
  motherAadhaar:  'XXXX XXXX 4421',
  bankAcc: 'BARB00045612',
  ifsc:    'BARB0BGGBXX',
  bankName: 'Bank of Baroda',
  stream: 'Science',
  tenthPct: 78.5,
  seatNumber: 'A12346',
  district: 'Kachchh', block: 'Bhuj', cluster: 'MADHAPAR',
  school: 'Govt. Sec. School, Madhapar', schoolCode: '24010515912',
}
SEED_APPS.push(makeApp('namo_saraswati', 11, KAVYA, 'REJECTED', {
  appId: 'NS2025GJ0011',
  motherName: 'Patel Sunita Rameshbhai',
  motherNameInBank: 'Patel S Rameshbhai',
  rejectionReason: 'Mother name mismatch between Aadhaar and bank',
  resubmissionCount: 1,
  nextStep: 'Fix mother name to match bank, then resubmit',
  docState: { aadhaar: 'verified', marksheet: 'verified', income: 'verified', seat: 'verified', passbook: 'mismatch' },
  submittedAt: '2025-05-12',
}))

// ── A handful of other curated edge cases (specific reasons, doc states) ────
// Index map after the required-students reorder:
//   0=Vaghela Jaydeviba (F,9), 1=Shah Riya (F,10), 2=Patel Kavya (F,11 Sci),
//   3=Princy (F,11 Sci), 5=Om Desai (M,11 Sci), 6=Dev Modi (M,12 Sci),
//   9=Tanvi Panchal (F,10), 10=Jay Mehta (M,12 Sci), 11=Harsh Vaghela (M,11 Sci),
//   12=Diya Shah (F,9), 13=Riya Praja (F,10).
SEED_APPS.push(makeApp('namo_lakshmi', 14, STUDENTS[1], 'REJECTED', {
  appId: 'NL2025GJ0014',
  rejectionReason: 'Aadhaar card image is unclear/blurry — please re-upload.',
  docState: { aadhaar: 'blurry', motherAadhaar: 'verified', income: 'verified', lcr: 'verified', passbook: 'verified' },
}))
SEED_APPS.push(makeApp('namo_lakshmi', 15, STUDENTS[9], 'REJECTED', {
  appId: 'NL2025GJ0015',
  rejectionReason: 'Bank account invalid — IFSC not found.',
  docState: { aadhaar: 'verified', motherAadhaar: 'verified', income: 'verified', lcr: 'verified', passbook: 'mismatch' },
}))
SEED_APPS.push(makeApp('namo_lakshmi', 18, STUDENTS[12], 'REJECTED', {
  appId: 'NL2025GJ0018',
  rejectionReason: 'Income certificate has expired (>6 months old).',
  docState: { aadhaar: 'verified', motherAadhaar: 'verified', income: 'mismatch', lcr: 'verified', passbook: 'verified' },
}))
SEED_APPS.push(makeApp('namo_lakshmi', 22, STUDENTS[13], 'AUTO_REJECTED', {
  appId: 'NL2025GJ0022',
  rejectionReason: 'Family income ₹7,50,000 exceeds ₹6,00,000 threshold.',
}))
// Namo Saraswati seat-not-found case (boy, grade 11 Science).
SEED_APPS.push(makeApp('namo_saraswati', 9, STUDENTS[5], 'AUTO_REJECTED', {
  appId: 'NS2025GJ0009',
  rejectionReason: 'Seat number B99999 not found in Exam Board records.',
  docState: { aadhaar: 'verified', marksheet: 'verified', income: 'verified', seat: 'missing', passbook: 'verified' },
}))
// Namo Saraswati resubmitted case (boy, grade 12 Science).
SEED_APPS.push(makeApp('namo_saraswati', 12, STUDENTS[10], 'RESUBMITTED', {
  appId: 'NS2025GJ0012',
  resubmissionCount: 2,
  nextStep: 'Approver re-review',
  rejectionReason: null,
}))
// Drafts — explicit completion gaps so "Continue Draft" UX has work to do.
SEED_APPS.push(makeApp('namo_lakshmi', 30, STUDENTS[0], 'DRAFT', {
  appId: 'NL2025GJ0030',
  docState: { aadhaar: 'uploaded', motherAadhaar: 'missing', income: 'uploaded', lcr: 'missing', passbook: 'missing' },
  nextStep: 'Upload mother Aadhaar + LCR + passbook to submit',
}))
SEED_APPS.push(makeApp('namo_saraswati', 30, STUDENTS[11], 'DRAFT', {
  appId: 'NS2025GJ0030',
  docState: { aadhaar: 'uploaded', marksheet: 'missing', income: 'uploaded', seat: 'missing', passbook: 'missing' },
  nextStep: 'Upload marksheet + verify seat number',
}))
// Returning student — Princy progressed from Class 11 → 12 with prior approval.
SEED_APPS.push(makeApp('namo_saraswati', 50, STUDENTS[3], 'APPROVED', {
  appId: 'NS2025GJ0050',
  resubmissionCount: 1,
  nextStep: 'Returning beneficiary · Class 11 → 12 progression on file',
  extra: {
    returning: true,
    previousGrade: 11,
    previousStatus: 'APPROVED',
    previousAppId: 'NS2024GJ0011',
  },
}))
// Opt-out / NOT_WANTED examples so the list view's bucket has data.
SEED_APPS.push(makeApp('namo_lakshmi', 60, STUDENTS[7], 'NOT_WANTED', {
  appId: 'NL2025GJ0060',
  optOutReason: 'Already receiving other scholarship',
  declarationFile: { name: 'declaration_ishita.pdf' },
  nextStep: 'Eligible to reopen if the student changes their mind.',
}))
SEED_APPS.push(makeApp('namo_lakshmi', 61, STUDENTS[8], 'NOT_WANTED', {
  appId: 'NL2025GJ0061',
  optOutReason: 'Guardian declined',
  declarationFile: { name: 'declaration_aarav.pdf' },
  nextStep: 'Eligible to reopen if the student changes their mind.',
}))

// ── Generated bulk to reach 60+ applications ────────────────────────────────
// Cycle covers every status the QA workflow expects to see in the list.
const STATUS_CYCLE = [
  'APPROVED', 'APPROVED', 'APPROVER_PENDING', 'APPROVED', 'PAYMENT_SUCCESS',
  'PAYMENT_PENDING', 'PAYMENT_FAILED', 'SUBMITTED', 'APPROVED', 'APPROVER_PENDING',
  'RESUBMITTED', 'NOT_WANTED', 'AUTO_REJECTED',
]
const FAILURE_REASONS = [
  'Aadhaar–bank link missing',
  'Account frozen',
  'Invalid IFSC',
]
function generateBulk() {
  const bulk = []
  let nlCounter = 100
  let nsCounter = 100
  let payCounter = 0
  STUDENTS.forEach((stu, i) => {
    // Boys can only be on Namo Saraswati; girls on either.
    const eligibleNS = stu.grade >= 11 && stu.stream === 'Science'
    let scheme
    if (stu.gender === 'M') {
      if (!eligibleNS) return            // boys without NS eligibility get no app
      scheme = 'namo_saraswati'
    } else {
      scheme = (eligibleNS && i % 2 === 0) ? 'namo_saraswati' : 'namo_lakshmi'
    }
    const counter = scheme === 'namo_saraswati' ? nsCounter++ : nlCounter++
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length]
    let paymentInfo = null
    if (status === 'PAYMENT_SUCCESS') {
      payCounter++
      paymentInfo = {
        paymentId: `PAY2025${String(70 + (payCounter % 3)).padStart(2, '0')}${String(payCounter).padStart(4, '0')}`,
        batchId:   payCounter % 2 === 0 ? 'BATCH-2025-07-001' : 'BATCH-2025-08-001',
        utr:       `UTR2025${String(700000 + i).slice(-7)}`,
        amount:    SCHEMES[scheme].monthlyAmount[stu.grade],
        month:     payCounter % 2 === 0 ? '2025-07' : '2025-08',
        creditedAt:'2025-08-15 06:30',
        state:     'PAYMENT_SUCCESS',
      }
    } else if (status === 'PAYMENT_FAILED') {
      payCounter++
      paymentInfo = {
        paymentId: `PAY2025${String(70 + (payCounter % 3)).padStart(2, '0')}${String(payCounter).padStart(4, '0')}`,
        batchId:   'BATCH-2025-07-001',
        amount:    SCHEMES[scheme].monthlyAmount[stu.grade],
        month:     '2025-07',
        failureReason: FAILURE_REASONS[i % FAILURE_REASONS.length],
        retryEligible: true,
        retryCount: 0,
        state:     'PAYMENT_FAILED',
      }
    } else if (status === 'PAYMENT_PENDING') {
      paymentInfo = {
        amount: SCHEMES[scheme].monthlyAmount[stu.grade],
        month:  '2025-08',
        state:  'PAYMENT_PENDING',
      }
    }
    bulk.push(makeApp(scheme, counter, stu, status, { payment: paymentInfo }))
  })
  return bulk
}

// Hand-pinned payment / batch IDs required by the QA spec — overwrites the
// payment block of the corresponding generated apps so the IDs are stable.
function pinRequiredPayments(apps) {
  const required = [
    { paymentId: 'PAY2025070001', batchId: 'BATCH-2025-07-001', month: '2025-07', success: true },
    { paymentId: 'PAY2025070002', batchId: 'BATCH-2025-07-001', month: '2025-07', success: false },
    { paymentId: 'PAY2025080001', batchId: 'BATCH-2025-08-001', month: '2025-08', success: true },
  ]
  let r = 0
  for (const app of apps) {
    if (r >= required.length) break
    if (app.payment) {
      const want = required[r]
      app.payment = {
        ...app.payment,
        paymentId: want.paymentId,
        batchId:   want.batchId,
        month:     want.month,
        state:     want.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        ...(want.success
          ? { utr: `UTR${want.paymentId}`, creditedAt: '2025-08-15 06:30', failureReason: null }
          : { failureReason: 'Aadhaar–bank link missing', retryEligible: true, retryCount: 0, utr: null }),
      }
      app.status = want.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED'
      r++
    }
  }
}

const __bulk = generateBulk()
pinRequiredPayments(__bulk)
export const APPLICATIONS = [...SEED_APPS, ...__bulk]

// Lookup tables — case-insensitive on appId so deep-links from chat triggers
// (which may have been lowercased during routing) still resolve.
const APP_INDEX = (() => {
  const idx = {}
  for (const a of APPLICATIONS) idx[a.appId.toUpperCase()] = a
  return idx
})()

export function getApplicationById(appId) {
  if (!appId) return null
  return APP_INDEX[String(appId).toUpperCase()] || null
}

export function getApplications({ scheme, statusBucket: bucket, schoolCode, district } = {}) {
  return APPLICATIONS.filter(a =>
    (!scheme || scheme === 'all' || a.schemeId === scheme) &&
    (!bucket || statusBucket(a.status) === bucket) &&
    (!schoolCode || a.schoolCode === schoolCode) &&
    (!district  || a.district === district)
  )
}

export function appCounts(scheme) {
  const all = scheme && scheme !== 'all' ? APPLICATIONS.filter(a => a.schemeId === scheme) : APPLICATIONS
  return all.reduce((m, a) => {
    const b = statusBucket(a.status)
    m[b] = (m[b] || 0) + 1
    m.total = (m.total || 0) + 1
    return m
  }, {})
}

// Apply a resubmission in-place — used by the canvas to mutate state when the
// user clicks "Save & resubmit".
export function applyResubmission(appId, patch = {}) {
  const app = getApplicationById(appId)
  if (!app) return null
  app.status = 'RESUBMITTED'
  app.resubmissionCount = (app.resubmissionCount || 1) + 1
  app.nextStep = 'Approver re-review'
  app.rejectionReason = null
  Object.assign(app, patch)
  return app
}

// Append a freshly created application — used when canvas Apply view submits.
export function addApplication(app) {
  APPLICATIONS.unshift(app)
  APP_INDEX[app.appId.toUpperCase()] = app
  return app
}
