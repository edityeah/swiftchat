// CRC / Cluster Approver data — refactored from demo.jsx (Approver category).

export const APPROVER_PENDING = [
  {
    appId: 'NL2025GJ0042', studentName: 'Vaghela Jaydeviba', grade: 'Class 9', section: 'B',
    scheme: 'Namo Lakshmi', school: '24010515912', cluster: 'MADHAPAR',
    submittedDate: '15/07/2025', status: 'APPROVER_PENDING', daysWaiting: 12,
    docs: { aadhaar: 'ok', motherAadhaar: 'ok', income: 'ok', lcr: 'ok', bank: 'ok' },
    nameMatch: true,
    mother: { aadhaarName: 'Vaghela Gaytriba Ajitsinh', bankName: 'Vaghela Gaytriba' },
  },
  {
    appId: 'NL2025GJ0043', studentName: 'Shah Riya', grade: 'Class 10', section: 'A',
    scheme: 'Namo Lakshmi', school: '24010515908', cluster: 'MADHAPAR',
    submittedDate: '18/07/2025', status: 'RESUBMITTED', daysWaiting: 4,
    docs: { aadhaar: 'ok', motherAadhaar: 'ok', income: 'ok', lcr: 'ok', bank: 'ok' },
    nameMatch: true,
    note: 'Resubmission #2 — clearer aadhaar uploaded.',
    mother: { aadhaarName: 'Shah Reena', bankName: 'Shah Reena' },
  },
  {
    appId: 'NS2025GJ0011', studentName: 'Patel Kavya', grade: 'Class 11', section: 'A',
    scheme: 'Namo Saraswati', school: '24010515903', cluster: 'MADHAPAR',
    submittedDate: '20/07/2025', status: 'APPROVER_PENDING', daysWaiting: 7,
    docs: { aadhaar: 'ok', motherAadhaar: 'ok', income: 'ok', lcr: 'ok', bank: 'warn' },
    nameMatch: false,
    mismatchReason: 'Mother name mismatch: Aadhaar "Patel Sunita Rameshbhai" vs Bank "Patel S Rameshbhai".',
    mother: { aadhaarName: 'Patel Sunita Rameshbhai', bankName: 'Patel S Rameshbhai' },
  },
  {
    appId: 'NL2025GJ0044', studentName: 'Solanki Hetal', grade: 'Class 9', section: 'C',
    scheme: 'Namo Lakshmi', school: '24010515912', cluster: 'MADHAPAR',
    submittedDate: '21/07/2025', status: 'APPROVER_PENDING', daysWaiting: 6,
    docs: { aadhaar: 'ok', motherAadhaar: 'ok', income: 'ok', lcr: 'ok', bank: 'ok' },
    nameMatch: true,
    mother: { aadhaarName: 'Solanki Falguni', bankName: 'Solanki Falguni' },
  },
]

export const APPROVER_DECIDED = [
  { appId: 'NL2025GJ0030', studentName: 'Mehta Aastha',  scheme: 'Namo Lakshmi',  status: 'APPROVED', date: '08/07/2025' },
  { appId: 'NL2025GJ0031', studentName: 'Joshi Krupa',   scheme: 'Namo Lakshmi',  status: 'APPROVED', date: '09/07/2025' },
  { appId: 'NS2025GJ0009', studentName: 'Pandya Komal',  scheme: 'Namo Saraswati', status: 'REJECTED', date: '10/07/2025', reason: 'Income certificate expired' },
  { appId: 'NL2025GJ0032', studentName: 'Trivedi Mira',  scheme: 'Namo Lakshmi',  status: 'APPROVED', date: '11/07/2025' },
]

export const APPROVER_METRICS = {
  pending: APPROVER_PENDING.length,
  approvedThisMonth: 156,
  rejectedThisMonth: 12,
  approvalRate: 92.9,
  oldestWaitingDays: 12,
}

export const APPROVER_AI_QUERIES = [
  {
    q: 'How many applications are pending in my cluster?',
    answer: 'You have **38 pending applications** across MADHAPAR (23) and ANJAR (15). MADHAPAR has the larger backlog.',
    metric: { value: '38', label: 'Pending review', tone: 'warning' },
  },
  {
    q: 'What is my approval rate?',
    answer: '**92.9%** — 156 approved vs 12 rejected. Most rejections are document-quality issues.',
    metric: { value: '92.9%', label: 'Approval rate', tone: 'success' },
  },
  {
    q: 'Which school has the most pending?',
    answer: 'School **24010515912** has 11 pending applications — prioritise verification there.',
    metric: { value: '11', label: 'Pending · top school', tone: 'info' },
  },
]
