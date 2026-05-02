// State Admin DigiVritti data — refactored from demo.jsx (State AI + funnel + bulk).

export const STATE_METRICS = {
  totalBeneficiaries: '14,00,000',
  namoLakshmi: '10,52,000',
  namoSaraswati: '3,48,000',
  approvalRate: 92.5,
  paymentSuccessRate: 94.2,
  sanctioned: '₹485 Cr',
  disbursed: '₹428 Cr',
  pending: '₹57 Cr',
}

export const STATE_FUNNEL = [
  { stage: 'Initiated',     count: '16,20,000', color: '#84A2F4' },
  { stage: 'Submitted',     count: '15,45,000', color: '#386AF6' },
  { stage: 'Auto-rejected', count: '78,000',    color: '#EB5757', flag: true },
  { stage: 'Approved',      count: '14,00,000', color: '#00BA34' },
  { stage: 'Paid',          count: '13,25,000', color: '#007B22' },
]

export const STATE_DISTRICT_PAYMENT = [
  { district: 'DAHOD',        success: '1,89,000', total: '2,08,000', rate: 90.9 },
  { district: 'PANCHMAHALS',  success: '2,12,000', total: '2,30,000', rate: 92.2 },
  { district: 'NARMADA',      success: '98,500',   total: '1,06,000', rate: 92.9 },
  { district: 'SABARKANTHA',  success: '2,85,000', total: '3,02,000', rate: 94.4 },
  { district: 'BANASKANTHA',  success: '3,92,000', total: '4,12,000', rate: 95.1 },
]

export const STATE_BULK_QUEUES = [
  { district: 'KACHCHH',     pending: 1250, amount: '₹6.25 L' },
  { district: 'BANASKANTHA', pending: 2100, amount: '₹12.80 L' },
  { district: 'PATAN',       pending: 890,  amount: '₹4.45 L' },
  { district: '+ 30 districts', pending: 41760, amount: '₹21.5 Cr' },
]

export const STATE_MONSOON_SCENARIOS = [
  { district: 'DANG',    monsoonManual: 60.0, nonMonsoon: 14.2, increase: '+45.8 pp' },
  { district: 'TAPI',    monsoonManual: 55.0, nonMonsoon: 12.8, increase: '+42.2 pp' },
  { district: 'NAVSARI', monsoonManual: 50.0, nonMonsoon: 11.5, increase: '+38.5 pp' },
  { district: 'VALSAD',  monsoonManual: 45.0, nonMonsoon: 10.8, increase: '+34.2 pp' },
  { district: 'SURAT',   monsoonManual: 40.0, nonMonsoon: 9.5,  increase: '+30.5 pp' },
]

export const STATE_AI_QUERIES = [
  {
    q: 'Total beneficiaries by scheme',
    answer: '14 lakh beneficiaries: **10.52L Namo Lakshmi** (Class 9–12 girls) + **3.48L Namo Saraswati** (Class 11–12 Science).',
    metric: { value: '14L', label: 'Beneficiaries', tone: 'success' },
  },
  {
    q: 'Full funnel — registration → payment',
    answer: '16.2L initiated → 15.45L submitted → 78K auto-rejected → 14L approved → 13.25L paid. End-to-end conversion: **81.8%**.',
    metric: { value: '81.8%', label: 'End-to-end', tone: 'info' },
  },
  {
    q: 'Payment success rate by district',
    answer: 'DAHOD lowest at **90.9%** — investigate Aadhaar linking. Most districts are above 94%.',
    metric: { value: '90.9%', label: 'Worst district', tone: 'warning' },
  },
  {
    q: 'Sanctioned vs disbursed vs pending',
    answer: 'Sanctioned ₹485 Cr · Disbursed ₹428 Cr (88.2%) · Pending ₹57 Cr — gap from payment failures and recent cycles.',
    metric: { value: '₹57 Cr', label: 'Pending disbursal', tone: 'warning' },
  },
  {
    q: 'Monsoon impact (what-if 70% threshold)',
    answer: 'Reducing the attendance threshold from 80% to 70% during Jul–Sep would cut manual approvals **by 46–55%** in DANG, TAPI, NAVSARI, VALSAD — total workload halves.',
    metric: { value: '−50%', label: 'Manual workload', tone: 'success' },
  },
]
