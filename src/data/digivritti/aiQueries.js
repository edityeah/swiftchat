// DigiVritti AI — role-scoped query catalog + deep-dive scenarios.
//
// Every entry includes: id, q (NL), sql (engine view), result (table rows),
// insight (one-line takeaway), category (for chip grouping), followups
// (suggested next question ids).
//
// Sourced from demo.jsx PERSONA_QUERIES + AI_SCENARIOS, plus the additional
// questions called out in digivritti_ai_query_improvement_claude_prompt.md.

// ─── Teacher ─────────────────────────────────────────────────────────────────
const TEACHER = [
  {
    id: 'tq1',
    category: 'Submissions',
    q: 'How many students have I submitted this year?',
    sql:
`SELECT COUNT(*) AS submitted
FROM student_application
WHERE "teacherCode" = 'TCH001'
  AND status NOT IN ('DRAFT','NOT_WANTED')
  AND academic_year = '2025-26'`,
    result: [{ submitted: 42 }],
    insight: "You've submitted 42 applications this year across both schemes.",
    followups: ['tq2', 'tq4', 'tq5'],
  },
  {
    id: 'tq2',
    category: 'Approvals',
    q: 'Kitne students approved hain mere school mein?',
    sql:
`SELECT COUNT(DISTINCT "studentId") AS approved
FROM student_application
WHERE "schoolCode" = '24010515912'
  AND status = 'APPROVED'
  AND academic_year = '2025-26'`,
    result: [{ approved: 38 }],
    insight: '38 students are approved in your school for the current year.',
    followups: ['tq4', 'tq3'],
  },
  {
    id: 'tq3',
    category: 'Rejections',
    q: 'Show me rejected students and reasons',
    sql:
`SELECT "data"->>'name' AS student,
  "data"->>'grade' AS grade,
  "rejectionReasons" AS reason
FROM student_application
WHERE "teacherCode" = 'TCH001'
  AND status = 'REJECTED'
  AND academic_year = '2025-26'`,
    result: [
      { student: 'Patel Kavya', grade: 'Class 9',  reason: 'Mother name mismatch' },
      { student: 'Shah Riya',   grade: 'Class 10', reason: 'Blurry aadhaar image' },
    ],
    insight: '2 rejections found. Both can be corrected and resubmitted.',
    followups: ['tq6', 'tq5'],
  },
  {
    id: 'tq4',
    category: 'Submissions',
    q: 'What is my submission rate?',
    sql:
`SELECT COUNT(*) FILTER (WHERE status NOT IN ('DRAFT','NOT_WANTED')) AS submitted,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE status NOT IN ('DRAFT','NOT_WANTED'))*100.0/NULLIF(COUNT(*),0),1) AS rate
FROM student_application
WHERE "teacherCode" = 'TCH001'
  AND academic_year = '2025-26'`,
    result: [{ submitted: 42, total: 48, rate: '87.5%' }],
    insight: '87.5% submission rate — 6 drafts remaining to complete.',
    followups: ['tq5', 'tq1'],
  },
  {
    id: 'tq5',
    category: 'Drafts',
    q: 'Which students still have draft applications?',
    sql:
`SELECT "data"->>'name' AS student, scheme_id AS scheme,
  "data"->>'grade' AS grade, "missingDocuments" AS missing
FROM student_application
WHERE "teacherCode" = 'TCH001'
  AND status = 'DRAFT'
  AND academic_year = '2025-26'`,
    result: [
      { student: 'Vaghela Jaydeviba', scheme: 'Namo Lakshmi',   grade: 'Class 9',  missing: 'Mother bank passbook' },
      { student: 'Prajapati Princy',  scheme: 'Namo Saraswati', grade: 'Class 11', missing: 'Class 10 marksheet' },
      { student: 'Nisha Prajapati',   scheme: 'Namo Lakshmi',   grade: 'Class 10', missing: 'Income certificate' },
    ],
    insight: '3 draft applications need teacher action. Prioritize Princy because Namo Saraswati requires academic verification before CRC review.',
    followups: ['tq6', 'tq4'],
  },
  {
    id: 'tq6',
    category: 'Documents',
    q: 'Which documents are most commonly missing?',
    sql:
`SELECT document, COUNT(*) AS missing_count
FROM application_document
WHERE "teacherCode" = 'TCH001'
  AND status = 'MISSING'
GROUP BY document
ORDER BY missing_count DESC`,
    result: [
      { document: 'Mother bank passbook', missing_count: 8 },
      { document: 'Income certificate',   missing_count: 5 },
      { document: 'Class 10 marksheet',   missing_count: 4 },
      { document: 'LC / Birth certificate', missing_count: 2 },
    ],
    insight: 'Mother bank passbook is the top missing document. A reminder to guardians can clear most pending drafts.',
    followups: ['tq5', 'tq3'],
  },
  {
    id: 'tq7',
    category: 'Eligibility',
    q: 'Show students eligible for Namo Saraswati but not submitted',
    sql:
`SELECT s.name AS student, s.class, s.percentage, sa.status
FROM student s
LEFT JOIN student_application sa
  ON sa."studentId" = s.id AND sa.scheme_id = 'namo_saraswati'
WHERE s."teacherCode" = 'TCH001'
  AND s.stream = 'Science'
  AND s.percentage >= 50
  AND (sa.status IS NULL OR sa.status = 'DRAFT')`,
    result: [
      { student: 'Dev Modi',      class: '12 Science', percentage: '76.4%', status: 'Not started' },
      { student: 'Om Desai',      class: '11 Science', percentage: '68.2%', status: 'Draft' },
      { student: 'Harsh Vaghela', class: '11 Science', percentage: '72.8%', status: 'Not started' },
    ],
    insight: '3 science students are still not submitted for Namo Saraswati. Om Desai already has a draft and can be completed fastest.',
    followups: ['tq5', 'tq6'],
  },
]

// ─── CRC / Cluster Approver ──────────────────────────────────────────────────
const CRC = [
  {
    id: 'cq1',
    category: 'Backlog',
    q: 'How many applications are pending in my cluster?',
    sql:
`SELECT cluster, COUNT(*) AS pending
FROM student_application
WHERE "approverCode" = 'APR001'
  AND status = 'APPROVER_PENDING'
  AND academic_year = '2025-26'
GROUP BY cluster`,
    result: [
      { cluster: 'MADHAPAR', pending: 23 },
      { cluster: 'ANJAR',    pending: 15 },
    ],
    insight: '38 total pending across 2 clusters — MADHAPAR has the larger backlog.',
    followups: ['cq3', 'cq4'],
  },
  {
    id: 'cq2',
    category: 'Performance',
    q: "What's my approval vs rejection rate?",
    sql:
`SELECT
  COUNT(*) FILTER (WHERE status='APPROVED') AS approved,
  COUNT(*) FILTER (WHERE status='REJECTED') AS rejected,
  ROUND(COUNT(*) FILTER (WHERE status='APPROVED')*100.0/
    NULLIF(COUNT(*),0),1) AS approval_rate
FROM student_application
WHERE "approverCode" = 'APR001'
  AND status IN ('APPROVED','REJECTED')`,
    result: [{ approved: 156, rejected: 12, approval_rate: '92.9%' }],
    insight: '92.9% approval rate — 12 rejections, mostly document issues.',
    followups: ['cq5', 'cq1'],
  },
  {
    id: 'cq3',
    category: 'Backlog',
    q: 'Show pending applications school-wise',
    sql:
`SELECT "schoolCode", COUNT(*) AS pending
FROM student_application
WHERE "approverCode" = 'APR001'
  AND status = 'APPROVER_PENDING'
GROUP BY "schoolCode"
ORDER BY pending DESC`,
    result: [
      { schoolCode: '24010515912', pending: 11 },
      { schoolCode: '24010515908', pending: 8  },
      { schoolCode: '24010515903', pending: 4  },
    ],
    insight: 'School 24010515912 has the most pending — prioritize verification there.',
    followups: ['cq4', 'cq1'],
  },
  {
    id: 'cq4',
    category: 'Backlog',
    q: 'Which pending applications are older than 7 days?',
    sql:
`SELECT s.name AS student, sa.school, sa.days_pending, sa.scheme_id AS scheme
FROM student_application sa
JOIN student s ON s.id = sa."studentId"
WHERE sa."approverCode" = 'APR001'
  AND sa.status = 'APPROVER_PENDING'
  AND sa.days_pending > 7
ORDER BY sa.days_pending DESC`,
    result: [
      { student: 'Patel Kavya', school: 'Sardar Patel Prathmik Shala', days_pending: 11, scheme: 'Namo Saraswati' },
      { student: 'Shah Riya',   school: 'Govt. Sec. School Madhapar',  days_pending: 9,  scheme: 'Namo Lakshmi'  },
      { student: 'Diya Shah',   school: 'Bhuj Girls School',           days_pending: 8,  scheme: 'Namo Lakshmi'  },
    ],
    insight: '3 applications are older than 7 days. Patel Kavya should be reviewed first because her payment eligibility is blocked.',
    followups: ['cq3', 'cq5'],
  },
  {
    id: 'cq5',
    category: 'Rejections',
    q: 'What are the top rejection reasons in my cluster?',
    sql:
`SELECT "rejectionReasons" AS reason, COUNT(*) AS count
FROM student_application
WHERE "approverCode" = 'APR001'
  AND status = 'REJECTED'
GROUP BY "rejectionReasons"
ORDER BY count DESC`,
    result: [
      { reason: 'Mother name mismatch',     count: 7 },
      { reason: 'Blurry Aadhaar image',     count: 4 },
      { reason: 'Income certificate missing', count: 3 },
      { reason: 'Bank details invalid',     count: 2 },
    ],
    insight: 'Mother name mismatch is the leading rejection reason. Teacher guidance on Aadhaar-bank name matching can reduce rework.',
    followups: ['cq2', 'cq4'],
  },
]

// ─── DEO / District ──────────────────────────────────────────────────────────
const DEO = [
  {
    id: 'dq1',
    category: 'Approvals',
    q: 'What is the approval rate in Kachchh district?',
    sql:
`SELECT
  COUNT(*) FILTER (WHERE status='APPROVED') AS approved,
  COUNT(*) FILTER (WHERE status IN ('APPROVED','REJECTED')) AS verified,
  ROUND(COUNT(*) FILTER (WHERE status='APPROVED')*100.0/
    NULLIF(COUNT(*) FILTER (WHERE status IN ('APPROVED','REJECTED')),0),1) AS rate
FROM student_application
WHERE district = 'KACHCHH'
  AND academic_year = '2025-26'`,
    result: [{ approved: 4250, verified: 4580, rate: '92.8%' }],
    insight: 'Kachchh has 92.8% approval rate with 4,250 beneficiaries.',
    followups: ['dq4', 'dq5'],
  },
  {
    id: 'dq2',
    category: 'Payments',
    q: 'How many payments failed last month?',
    sql:
`SELECT failure_reason, COUNT(*) AS count
FROM payment_log
WHERE payment_status = 'FAIL'
  AND payment_month = '2025-07'
GROUP BY failure_reason
ORDER BY count DESC`,
    result: [
      { failure_reason: 'Aadhaar-bank link missing', count: 45 },
      { failure_reason: 'Account frozen',            count: 12 },
      { failure_reason: 'Invalid IFSC',              count: 8  },
    ],
    insight: '65 failures in July — aadhaar-bank linking is the #1 issue. Consider aadhaar edit campaign.',
    followups: ['dq5', 'dq3'],
  },
  {
    id: 'dq3',
    category: 'Attendance',
    q: 'Students with low attendance affecting payment',
    sql:
`SELECT sa.block, COUNT(*) AS below_80,
  COUNT(*) FILTER (WHERE mpc.eligibility_status='REJECTED') AS denied
FROM monthly_payment_cycle mpc
JOIN student_application sa ON mpc.student_id = sa."studentId"
WHERE mpc.attendance_percentage < 80
  AND mpc.is_first_month = false
GROUP BY sa.block
ORDER BY below_80 DESC`,
    result: [
      { block: 'BHUJ',   below_80: 89, denied: 23 },
      { block: 'ANJAR',  below_80: 45, denied: 11 },
      { block: 'MANDVI', below_80: 32, denied: 8  },
    ],
    insight: 'BHUJ block has the most students below 80% attendance — 23 denied payment.',
    followups: ['dq2', 'dq4'],
  },
  {
    id: 'dq4',
    category: 'Backlog',
    q: 'Which CRC has the highest pending backlog?',
    sql:
`SELECT u.name AS crc, sa.cluster, COUNT(*) AS pending,
  MAX(sa.days_pending) AS oldest_days
FROM student_application sa
JOIN approver u ON u.code = sa."approverCode"
WHERE sa.district = 'KACHCHH'
  AND sa.status = 'APPROVER_PENDING'
GROUP BY u.name, sa.cluster
ORDER BY pending DESC`,
    result: [
      { crc: 'Mehul Parmar', cluster: 'MADHAPAR', pending: 23, oldest_days: 11 },
      { crc: 'Anil Rathod',  cluster: 'ANJAR',    pending: 15, oldest_days: 9  },
      { crc: 'Rupa Joshi',   cluster: 'MANDVI',   pending: 12, oldest_days: 7  },
    ],
    insight: 'MADHAPAR has the highest backlog. Escalate to Mehul Parmar and prioritize applications older than 7 days.',
    followups: ['dq1', 'dq3'],
  },
  {
    id: 'dq5',
    category: 'Payments',
    q: 'Show district payment gap by scheme',
    sql:
`SELECT scheme_id AS scheme,
  COUNT(*) FILTER (WHERE sa.status='APPROVED') AS approved,
  COUNT(DISTINCT pl.student_id) FILTER (WHERE pl.payment_status='SUCCESS') AS paid
FROM student_application sa
LEFT JOIN payment_log pl ON pl.student_id = sa."studentId"
WHERE sa.district = 'KACHCHH'
GROUP BY scheme_id`,
    result: [
      { scheme: 'Namo Lakshmi',   approved: 4250, paid: 3980, gap: 270 },
      { scheme: 'Namo Saraswati', approved: 1180, paid: 1075, gap: 105 },
    ],
    insight: 'Namo Lakshmi has a larger absolute payment gap, but both schemes need Aadhaar-bank failure cleanup.',
    followups: ['dq2', 'dq1'],
  },
]

// ─── State Secretary ─────────────────────────────────────────────────────────
const STATE = [
  {
    id: 'sq1',
    category: 'Beneficiaries',
    q: 'Total beneficiaries by scheme',
    sql:
`SELECT scheme_id, COUNT(DISTINCT "studentId") AS beneficiaries
FROM student_application
WHERE status = 'APPROVED'
  AND academic_year = '2025-26'
GROUP BY scheme_id`,
    result: [
      { scheme_id: 'namo_lakshmi',  beneficiaries: '10,52,000' },
      { scheme_id: 'namo_saraswati', beneficiaries: '3,48,000'  },
    ],
    insight: '14 lakh total beneficiaries — 10.52L NamoLakshmi (Class 9-12 girls) + 3.48L NamoSaraswati (Class 11-12 Science).',
    followups: ['sq2', 'sq4'],
  },
  {
    id: 'sq2',
    category: 'Funnel',
    q: 'Full funnel from registration to payment',
    sql:
`SELECT
  COUNT(*) AS initiated,
  COUNT(*) FILTER (WHERE status NOT IN ('DRAFT','NOT_WANTED')) AS submitted,
  COUNT(*) FILTER (WHERE status='AUTO-REJECTED') AS auto_rejected,
  COUNT(*) FILTER (WHERE status='APPROVED') AS approved,
  (SELECT COUNT(DISTINCT student_id)
   FROM payment_log WHERE payment_status='SUCCESS') AS paid
FROM student_application
WHERE academic_year = '2025-26'`,
    result: [{
      initiated: '16,20,000',
      submitted: '15,45,000',
      auto_rejected: '78,000',
      approved: '14,00,000',
      paid: '13,25,000',
    }],
    insight: '81.8% end-to-end conversion (initiated→paid). 78K auto-rejected, 75K gap between approved and paid (payment failures + pending cycles).',
    followups: ['sq3', 'sq4'],
  },
  {
    id: 'sq3',
    category: 'Payments',
    q: 'Payment success rate across districts',
    sql:
`SELECT sa.district,
  COUNT(*) FILTER (WHERE pl.payment_status='SUCCESS') AS success,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE pl.payment_status='SUCCESS')*100.0/
    NULLIF(COUNT(*),0),1) AS rate
FROM payment_log pl
JOIN payment_request pr ON pl.payment_request_id=pr.payment_request_id
JOIN student_application sa ON pr.student_id=sa."studentId"
GROUP BY sa.district
ORDER BY rate ASC
LIMIT 5`,
    result: [
      { district: 'DAHOD',       success: '1,89,000', total: '2,08,000', rate: '90.9%' },
      { district: 'PANCHMAHALS', success: '2,12,000', total: '2,30,000', rate: '92.2%' },
      { district: 'NARMADA',     success: '98,500',   total: '1,06,000', rate: '92.9%' },
      { district: 'SABARKANTHA', success: '2,85,000', total: '3,02,000', rate: '94.4%' },
      { district: 'BANASKANTHA', success: '3,92,000', total: '4,12,000', rate: '95.1%' },
    ],
    insight: 'DAHOD has the lowest payment success rate (90.9%) — investigate aadhaar linking issues. Most districts are above 94%.',
    followups: ['sq2', 'sq4'],
  },
  {
    id: 'sq4',
    category: 'Disbursement',
    q: 'Sanctioned vs disbursed vs pending amount',
    sql:
`SELECT
  SUM(mpc.amount) AS sanctioned,
  COALESCE(SUM(CASE WHEN pl.payment_status='SUCCESS'
    THEN pl.amount END),0) AS disbursed,
  SUM(mpc.amount)-COALESCE(SUM(CASE WHEN pl.payment_status='SUCCESS'
    THEN pl.amount END),0) AS pending
FROM monthly_payment_cycle mpc
LEFT JOIN payment_request pr ON mpc.cycle_id=pr.cycle_id
LEFT JOIN payment_log pl ON pr.payment_request_id=pl.payment_request_id
WHERE mpc.eligibility_status IN ('AUTO_APPROVED','APPROVED')`,
    result: [{
      sanctioned: '₹485 Cr',
      disbursed:  '₹428 Cr',
      pending:    '₹57 Cr',
    }],
    insight: '₹57 Cr pending disbursement — 88.2% of sanctioned amount already paid. Gap primarily from payment failures and recent monthly cycles not yet processed.',
    followups: ['sq3', 'sq2'],
  },
]

// ─── PFMS / Payment Officer ──────────────────────────────────────────────────
const PFMS = [
  {
    id: 'pq1',
    category: 'Failures',
    q: 'Show failed payments for July',
    sql:
`SELECT failure_reason, COUNT(*) AS count, SUM(amount) AS amount_blocked
FROM payment_log
WHERE payment_status = 'FAIL'
  AND payment_month = '2025-07'
GROUP BY failure_reason
ORDER BY count DESC`,
    result: [
      { failure_reason: 'Aadhaar-bank link missing', count: 45, amount_blocked: '₹22,500' },
      { failure_reason: 'Account frozen',            count: 12, amount_blocked: '₹6,000'  },
      { failure_reason: 'Invalid IFSC',              count: 8,  amount_blocked: '₹4,000'  },
    ],
    insight: '65 July payments failed. Aadhaar-bank linking accounts for 69% of failures and should be prioritized first.',
    followups: ['pq3', 'pq2'],
  },
  {
    id: 'pq2',
    category: 'Disbursement',
    q: 'How much amount is pending for disbursement?',
    sql:
`SELECT scheme_id AS scheme,
  SUM(amount) AS pending_amount,
  COUNT(DISTINCT student_id) AS pending_students
FROM payment_request
WHERE status = 'PENDING'
GROUP BY scheme_id`,
    result: [
      { scheme: 'Namo Lakshmi',   pending_amount: '₹42 Cr', pending_students: '62,000' },
      { scheme: 'Namo Saraswati', pending_amount: '₹15 Cr', pending_students: '13,000' },
      { scheme: 'TOTAL',          pending_amount: '₹57 Cr', pending_students: '75,000' },
    ],
    insight: '₹57 Cr is pending across both schemes. Most of the gap is from payment failures and newly approved cycles awaiting PFMS processing.',
    followups: ['pq1', 'pq4'],
  },
  {
    id: 'pq3',
    category: 'Retry',
    q: 'Show payment retry eligible records',
    sql:
`SELECT pl.payment_id, s.name AS student,
  sa.scheme_id AS scheme, pl.failure_reason AS reason, pl.retry_count
FROM payment_log pl
JOIN student_application sa ON pl.student_id = sa."studentId"
JOIN student s ON s.id = pl.student_id
WHERE pl.payment_status = 'FAIL'
  AND pl.retry_count < 3
ORDER BY pl.payment_month`,
    result: [
      { payment_id: 'PAY2025070001', student: 'Patel Kavya',        scheme: 'Namo Saraswati', reason: 'Aadhaar-bank link missing', retry_count: 0 },
      { payment_id: 'PAY2025070002', student: 'Shah Riya',          scheme: 'Namo Lakshmi',   reason: 'Invalid IFSC',              retry_count: 1 },
      { payment_id: 'PAY2025080001', student: 'Vaghela Jaydeviba',  scheme: 'Namo Lakshmi',   reason: 'Account frozen',            retry_count: 0 },
    ],
    insight: '3 payments are eligible for retry. PAY2025070001 should be retried after Aadhaar-bank linking is corrected.',
    followups: ['pq1', 'pq4'],
  },
  {
    id: 'pq4',
    category: 'Batches',
    q: 'What is PFMS batch status this month?',
    sql:
`SELECT batch_id, total_records AS records, success_count AS success,
  failure_count AS failed, batch_status AS status
FROM pfms_batch
WHERE batch_month >= '2025-07'
ORDER BY batch_id DESC`,
    result: [
      { batch_id: 'BATCH-2025-07-001', records: 500, success: 462, failed: 38, status: 'Completed' },
      { batch_id: 'BATCH-2025-08-001', records: 750, success: 710, failed: 40, status: 'Completed with failures' },
      { batch_id: 'BATCH-2025-09-001', records: 620, success: 0,   failed: 0,  status: 'Processing' },
    ],
    insight: 'August has the highest failure count. Current September batch is still processing, so no retry decision should be made yet.',
    followups: ['pq1', 'pq3'],
  },
]

// ─── Principal (school-level read-only) ──────────────────────────────────────
const PRINCIPAL = [
  {
    id: 'prq1',
    category: 'Summary',
    q: 'Show my school scholarship summary',
    sql:
`SELECT scheme_id AS scheme,
  COUNT(*) FILTER (WHERE eligible) AS eligible,
  COUNT(*) FILTER (WHERE status NOT IN ('DRAFT','NOT_WANTED')) AS applied,
  COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved
FROM student_application
WHERE "schoolCode" = '24010515912'
  AND academic_year = '2025-26'
GROUP BY scheme_id`,
    result: [
      { scheme: 'Namo Lakshmi',    eligible: 28, applied: 22, approved: 18 },
      { scheme: 'Namo Saraswati',  eligible: 11, applied: 8,  approved: 6  },
      { scheme: 'DBT Scholarship', eligible: 45, applied: 40, approved: 35 },
    ],
    insight: 'Namo Lakshmi has the largest eligible pool, but 6 students are still not applied. Teacher follow-up is required.',
    followups: ['prq2'],
  },
  {
    id: 'prq2',
    category: 'Action',
    q: 'Which students are pending teacher action?',
    sql:
`SELECT s.name AS student, sa.scheme_id AS scheme, sa."missingDocuments" AS pending_action
FROM student_application sa
JOIN student s ON s.id = sa."studentId"
WHERE sa."schoolCode" = '24010515912'
  AND sa.status = 'DRAFT'`,
    result: [
      { student: 'Prajapati Princy', scheme: 'Namo Saraswati', pending_action: 'Upload marksheet' },
      { student: 'Nisha Prajapati',  scheme: 'Namo Lakshmi',   pending_action: 'Income certificate' },
      { student: 'Diya Shah',        scheme: 'Namo Lakshmi',   pending_action: 'Mother bank passbook' },
    ],
    insight: '3 students need teacher action. These should be followed up before the submission deadline.',
    followups: ['prq1'],
  },
]

export const AI_QUERIES_BY_ROLE = {
  teacher: TEACHER,
  crc: CRC,
  deo: DEO,
  state_secretary: STATE,
  pfms: PFMS,
  principal: PRINCIPAL,
}

// Role labels & "Ask … AI" CTAs (per spec).
export const AI_ROLE_META = {
  teacher:         { label: 'Ask DigiVritti AI', persona: 'Teacher',         shortRole: 'Teacher' },
  crc:             { label: 'Ask Review AI',     persona: 'Cluster Approver', shortRole: 'CRC' },
  deo:             { label: 'Ask District AI',   persona: 'District Officer', shortRole: 'DEO' },
  pfms:            { label: 'Ask Payment AI',    persona: 'Payment Officer',  shortRole: 'PFMS' },
  state_secretary: { label: 'Ask State AI',      persona: 'State Admin',      shortRole: 'State' },
  principal:       { label: 'Ask School AI',     persona: 'Principal',        shortRole: 'Principal' },
}

// Multi-turn deep-dive scenarios. Available to DEO + State only.
export const AI_DEEP_DIVE_SCENARIOS = [
  {
    id: 'delayed_payments',
    title: 'Delayed Payments — Approval Backlog',
    entryLabel: '⏳ Delayed Payments — Approval Backlog',
    persona: 'District Officer',
    description: 'Investigate payment delays caused by pending bot approvals.',
    roles: ['deo', 'state_secretary'],
    turns: [
      {
        q: 'How many students have pending approvals that are delaying their payments?',
        sql:
`SELECT district,
  SUM(CASE WHEN status='APPROVER_PENDING' THEN 1 ELSE 0 END) AS pending_approval,
  SUM(CASE WHEN status='RESUBMITTED' THEN 1 ELSE 0 END) AS resubmitted,
  SUM(CASE WHEN status='AWAITING_CHECK' THEN 1 ELSE 0 END) AS awaiting_check,
  COUNT(*) AS total_stuck
FROM student_application
WHERE status IN ('APPROVER_PENDING','RESUBMITTED','AWAITING_CHECK')
GROUP BY district
ORDER BY total_stuck DESC
LIMIT 5`,
        result: [
          { district: 'BANASKANTHA', pending_approval: 4820, resubmitted: 680, awaiting_check: 290, total_stuck: 5790 },
          { district: 'KACHCHH',     pending_approval: 3980, resubmitted: 545, awaiting_check: 255, total_stuck: 4780 },
          { district: 'PATAN',       pending_approval: 2870, resubmitted: 395, awaiting_check: 140, total_stuck: 3405 },
          { district: 'SABARKANTHA', pending_approval: 2650, resubmitted: 310, awaiting_check: 135, total_stuck: 3095 },
          { district: 'DAHOD',       pending_approval: 2190, resubmitted: 285, awaiting_check: 125, total_stuck: 2600 },
        ],
        insight: '25,550 students are stuck in the approval pipeline across the top 8 districts alone. BANASKANTHA leads with 5,790 students waiting.',
        followup: "What's the total payment amount stuck because of these pending approvals?",
      },
      {
        q: "What's the total payment amount stuck because of these pending approvals?",
        sql:
`SELECT scheme_id AS scheme,
  COUNT(*) AS stuck,
  SUM(monthly_amount) AS monthly_blocked,
  SUM(monthly_amount) * 3 AS if_3_months
FROM student_application
WHERE status IN ('APPROVER_PENDING','RESUBMITTED','AWAITING_CHECK')
GROUP BY scheme_id`,
        result: [
          { scheme: 'NamoLakshmi',   stuck: '38,200', monthly_blocked: '₹2.10 Cr/month', if_3_months: '₹6.30 Cr' },
          { scheme: 'NamoSaraswati', stuck: '8,450',  monthly_blocked: '₹82.5 L/month',  if_3_months: '₹2.47 Cr' },
          { scheme: 'TOTAL',         stuck: '46,650', monthly_blocked: '₹2.93 Cr/month', if_3_months: '₹8.77 Cr' },
        ],
        insight: '₹2.93 Cr per month is blocked because 46,650 students haven\'t been approved yet.',
        followup: 'Which specific clusters and approvers have the worst backlog? I need to escalate.',
      },
      {
        q: 'Which specific clusters and approvers have the worst backlog? I need to escalate.',
        sql:
`SELECT district, cluster, "approverCode" AS approver,
  COUNT(*) AS pending,
  MIN(submitted_at) AS oldest_since,
  CURRENT_DATE - MIN(submitted_at) AS days_waiting
FROM student_application
WHERE status = 'APPROVER_PENDING'
GROUP BY district, cluster, "approverCode"
ORDER BY pending DESC
LIMIT 3`,
        result: [
          { district: 'BANASKANTHA', cluster: 'K.M.CHOKSI', approver: 'APR045', pending: 1385, oldest_since: '2025-07-08', days_waiting: 42 },
          { district: 'BANASKANTHA', cluster: 'DHANERA',    approver: 'APR078', pending: 1090, oldest_since: '2025-07-15', days_waiting: 35 },
          { district: 'KACHCHH',     cluster: 'MADHAPAR',   approver: 'APR001', pending: 945,  oldest_since: '2025-07-20', days_waiting: 30 },
        ],
        insight: 'Cluster K.M.CHOKSI in BANASKANTHA has 1,385 students waiting for 42 days. Approver APR045 needs immediate escalation.',
        followup: null,
      },
    ],
    completion: '✅ Analysis Complete — 3 conversational queries answered with full context retention.',
  },
  {
    id: 'monsoon_impact',
    title: 'Monsoon Impact on Payment Eligibility',
    entryLabel: '🌧️ Monsoon Impact Analysis',
    persona: 'State Admin',
    description: "Investigate how monsoon season's low attendance affects IPMS payment approvals.",
    roles: ['deo', 'state_secretary'],
    turns: [
      {
        q: 'Which districts were most affected by monsoon for payment approvals in July-September?',
        sql:
`SELECT sa.district,
  COUNT(*) AS monsoon_total,
  COUNT(*) FILTER (WHERE mpc.eligibility_status='MANUAL') AS monsoon_manual,
  ROUND(COUNT(*) FILTER (WHERE mpc.eligibility_status='MANUAL')*100.0/COUNT(*),1) AS monsoon_pct,
  ROUND(non_monsoon_manual*100.0/non_monsoon_total,1) AS non_monsoon_pct,
  ROUND(monsoon_pct - non_monsoon_pct,1) AS increase
FROM monthly_payment_cycle mpc
JOIN student_application sa ON mpc.student_id = sa."studentId"
WHERE mpc.payment_month BETWEEN '2025-07' AND '2025-09'
GROUP BY sa.district
ORDER BY monsoon_pct DESC
LIMIT 8`,
        result: [
          { district: 'DANG',        monsoon_total: '28,500', monsoon_manual: '17,100', monsoon_pct: '60.0%', non_monsoon_pct: '14.2%', increase: '+45.8 pp' },
          { district: 'TAPI',        monsoon_total: '38,400', monsoon_manual: '21,100', monsoon_pct: '55.0%', non_monsoon_pct: '12.8%', increase: '+42.2 pp' },
          { district: 'NAVSARI',     monsoon_total: '52,800', monsoon_manual: '26,400', monsoon_pct: '50.0%', non_monsoon_pct: '11.5%', increase: '+38.5 pp' },
          { district: 'VALSAD',      monsoon_total: '61,200', monsoon_manual: '27,500', monsoon_pct: '45.0%', non_monsoon_pct: '10.8%', increase: '+34.2 pp' },
          { district: 'SURAT',       monsoon_total: '74,500', monsoon_manual: '29,800', monsoon_pct: '40.0%', non_monsoon_pct: '9.5%',  increase: '+30.5 pp' },
          { district: 'BHARUCH',     monsoon_total: '46,200', monsoon_manual: '17,100', monsoon_pct: '37.0%', non_monsoon_pct: '8.9%',  increase: '+28.1 pp' },
          { district: 'NARMADA',     monsoon_total: '22,800', monsoon_manual: '8,000',  monsoon_pct: '35.1%', non_monsoon_pct: '8.5%',  increase: '+26.6 pp' },
          { district: 'PANCHMAHALS', monsoon_total: '52,400', monsoon_manual: '17,300', monsoon_pct: '33.0%', non_monsoon_pct: '8.2%',  increase: '+24.8 pp' },
        ],
        insight: 'South Gujarat districts show a massive monsoon spike. DANG jumps from 14.2% manual approvals in non-monsoon months to 60% during Jul-Sep — a 45.8 percentage point increase. This proves the attendance drop is seasonal and monsoon-driven, not systemic.',
        followup: 'Show me the manual to auto approval ratio in those top affected districts — month by month',
      },
      {
        q: 'Show me the manual to auto approval ratio in those top affected districts — month by month',
        sql:
`SELECT sa.district, EXTRACT(MONTH FROM mpc.payment_month) AS month,
  COUNT(*) FILTER (WHERE mpc.eligibility_status='AUTO_APPROVED') AS auto,
  COUNT(*) FILTER (WHERE mpc.eligibility_status='MANUAL') AS manual,
  ROUND(COUNT(*) FILTER (WHERE mpc.eligibility_status='MANUAL')*1.0/
    NULLIF(COUNT(*) FILTER (WHERE mpc.eligibility_status='AUTO_APPROVED'),0),2) AS ratio
FROM monthly_payment_cycle mpc
JOIN student_application sa ON mpc.student_id = sa."studentId"
WHERE sa.district IN ('DANG','TAPI','NAVSARI','VALSAD')
GROUP BY sa.district, month`,
        result: [
          { district: 'DANG',    month: 'Jul', auto: '3,200', manual: '6,300', ratio: '1.97' },
          { district: 'DANG',    month: 'Aug', auto: '3,600', manual: '5,900', ratio: '1.64' },
          { district: 'DANG',    month: 'Sep', auto: '4,600', manual: '4,900', ratio: '1.07' },
          { district: 'TAPI',    month: 'Jul', auto: '4,800', manual: '8,000', ratio: '1.67' },
          { district: 'TAPI',    month: 'Aug', auto: '5,500', manual: '7,200', ratio: '1.31' },
          { district: 'TAPI',    month: 'Sep', auto: '7,000', manual: '5,900', ratio: '0.84' },
          { district: 'NAVSARI', month: 'Jul', auto: '7,800', manual: '9,800', ratio: '1.26' },
          { district: 'NAVSARI', month: 'Aug', auto: '8,800', manual: '9,000', ratio: '1.02' },
          { district: 'NAVSARI', month: 'Sep', auto: '9,800', manual: '7,600', ratio: '0.78' },
          { district: 'VALSAD',  month: 'Jul', auto: '9,700', manual: '10,800', ratio: '1.11' },
          { district: 'VALSAD',  month: 'Aug', auto: '11,200', manual: '9,300', ratio: '0.83' },
          { district: 'VALSAD',  month: 'Sep', auto: '12,800', manual: '7,400', ratio: '0.58' },
        ],
        insight: 'July is the worst — DANG has 1.97 manual approvals for every auto, meaning nearly 2x more students need manual review.',
        followup: 'What if we reduce the attendance threshold by 10% — from 80% to 70% — during monsoon months? How would manual approvals change?',
      },
      {
        q: 'What if we reduce the attendance threshold by 10% — from 80% to 70% — during monsoon months? How would manual approvals change?',
        sql:
`-- Simulation
SELECT district,
  manual_at_80, auto_at_80,
  manual_at_70, auto_at_70,
  (manual_at_80 - manual_at_70) AS shifted,
  ROUND((manual_at_80 - manual_at_70) * 100.0 / NULLIF(manual_at_80,0),1) AS reduction_pct
FROM threshold_simulation
WHERE district IN ('DANG','TAPI','NAVSARI','VALSAD')`,
        result: [
          { district: 'DANG',    auto_80: '11,400', manual_80: '17,100', auto_70: '20,805', manual_70: '7,695',  shifted: '9,405',  reduction: '55.0%' },
          { district: 'TAPI',    auto_80: '17,300', manual_80: '21,100', auto_70: '28,905', manual_70: '9,495',  shifted: '11,605', reduction: '55.0%' },
          { district: 'NAVSARI', auto_80: '26,400', manual_80: '26,400', auto_70: '39,600', manual_70: '13,200', shifted: '13,200', reduction: '50.0%' },
          { district: 'VALSAD',  auto_80: '33,700', manual_80: '27,500', auto_70: '46,350', manual_70: '14,850', shifted: '12,650', reduction: '46.0%' },
        ],
        insight: 'Reducing threshold from 80% to 70% during monsoon would cut manual approvals by 46-55% across affected districts. Total manual workload drops significantly.',
        followup: null,
      },
    ],
    completion: '✅ Analysis Complete — 3 conversational queries answered with full context retention.',
  },
]

// Custom-question keyword routing — used when a teacher / DEO etc types a free
// question instead of clicking a chip. Picks the best matching query for the
// caller's role.
export const AI_KEYWORDS = [
  { match: /pending|backlog|stuck/i,         queries: { teacher: 'tq5', crc: 'cq1', deo: 'dq4', state_secretary: 'sq2', pfms: 'pq2', principal: 'prq2' } },
  { match: /failed.*payment|payment.*fail/i, queries: { deo: 'dq2', state_secretary: 'sq3', pfms: 'pq1' } },
  { match: /approved|approval.*rate/i,       queries: { teacher: 'tq2', crc: 'cq2', deo: 'dq1', state_secretary: 'sq1', principal: 'prq1' } },
  { match: /draft/i,                         queries: { teacher: 'tq5', principal: 'prq2' } },
  { match: /rejected|rejection/i,            queries: { teacher: 'tq3', crc: 'cq5' } },
  { match: /document.*missing|missing.*doc/i, queries: { teacher: 'tq6', principal: 'prq2' } },
  { match: /retry/i,                         queries: { pfms: 'pq3' } },
  { match: /batch/i,                         queries: { pfms: 'pq4' } },
  { match: /attendance/i,                    queries: { deo: 'dq3' } },
  { match: /funnel|registration/i,           queries: { state_secretary: 'sq2' } },
  { match: /sanction|disbursed|disbursement/i, queries: { state_secretary: 'sq4', pfms: 'pq2' } },
  { match: /submission/i,                    queries: { teacher: 'tq4' } },
  { match: /eligible|saraswati/i,            queries: { teacher: 'tq7' } },
]

// Deep-dive keyword shortcuts.
export const AI_DEEP_DIVE_KEYWORDS = [
  { match: /monsoon|attendance threshold|policy simulation/i, scenarioId: 'monsoon_impact' },
  { match: /delayed.*payment|approval.*delay|escalat/i,       scenarioId: 'delayed_payments' },
]
