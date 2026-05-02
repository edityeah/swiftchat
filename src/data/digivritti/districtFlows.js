// District officer DigiVritti data — refactored from demo.jsx (Payment + Bonus + District AI).

export const DISTRICT_METRICS = {
  beneficiaries: 4250,
  approvalRate: 92.8,
  paymentSuccessRate: 90.9,
  pendingApprovalEscalations: 5790,
  monthlyDisbursed: '₹2.10 Cr',
  monthlyBlocked: '₹2.93 Cr',
}

export const DISTRICT_FAILED_PAYMENTS = [
  { reason: 'Aadhaar–bank link missing', count: 45, share: 69 },
  { reason: 'Account frozen', count: 12, share: 18 },
  { reason: 'Invalid IFSC', count: 8, share: 13 },
]

export const DISTRICT_BELOW_ATTENDANCE = [
  { block: 'BHUJ',   below80: 89, denied: 23 },
  { block: 'ANJAR',  below80: 45, denied: 11 },
  { block: 'MANDVI', below80: 32, denied: 8 },
  { block: 'GANDHIDHAM', below80: 21, denied: 5 },
]

export const DISTRICT_FIRST_MONTH_PENDING = [
  { studentName: 'Vaghela Jaydeviba', school: '24010515912', scheme: 'Namo Lakshmi', amount: 500 },
  { studentName: 'Shah Riya',         school: '24010515908', scheme: 'Namo Lakshmi', amount: 500 },
  { studentName: 'Solanki Hetal',     school: '24010515912', scheme: 'Namo Lakshmi', amount: 500 },
  { studentName: 'Patel Kavya',       school: '24010515903', scheme: 'Namo Saraswati', amount: 833 },
  { studentName: 'Mehta Aastha',      school: '24010515912', scheme: 'Namo Lakshmi', amount: 500 },
]

export const DISTRICT_AADHAAR_FREEZE = [
  { studentId: 'STU006', studentName: 'Patel Kavya', currentAadhaar: 'XXXX 5678', issue: 'Aadhaar–bank link missing', failedRetries: 2 },
  { studentId: 'STU012', studentName: 'Joshi Anaya', currentAadhaar: 'XXXX 8821', issue: 'Account frozen', failedRetries: 1 },
  { studentId: 'STU019', studentName: 'Bhatt Manav', currentAadhaar: 'XXXX 4533', issue: 'Invalid IFSC', failedRetries: 1 },
]

export const DISTRICT_AI_QUERIES = [
  {
    q: 'What is the approval rate in Kachchh district?',
    answer: 'Kachchh has a **92.8% approval rate** with 4,250 beneficiaries (4,580 verified, 4,250 approved).',
    metric: { value: '92.8%', label: 'Approval rate', tone: 'success' },
  },
  {
    q: 'How many payments failed last month?',
    answer: '65 failures in July — Aadhaar–bank linking is the #1 cause (45 cases). Consider an Aadhaar correction campaign.',
    metric: { value: '65', label: 'Failed payments', tone: 'error' },
  },
  {
    q: 'Which blocks have low attendance affecting payments?',
    answer: 'BHUJ has 89 students below 80% — 23 were denied payment. ANJAR and MANDVI follow.',
    metric: { value: '89', label: 'Below 80% · top block', tone: 'warning' },
  },
  {
    q: 'How many students are stuck in approval?',
    answer: '**5,790 students** in Kachchh are stuck in approver_pending — ₹2.93 Cr in monthly disbursements is blocked.',
    metric: { value: '5,790', label: 'Stuck in approval', tone: 'warning' },
  },
]
