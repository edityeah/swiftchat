// Teacher-side DigiVritti scenarios — refactored from demo.jsx (Teacher category).
// Each flow describes a chat-driven submission journey.

export const TEACHER_FLOWS = [
  {
    id: 'new_namo_lakshmi',
    icon: '👧',
    name: 'New student — Namo Lakshmi',
    desc: 'Class 9 girl · mother\'s bank · all docs',
    steps: [
      { kind: 'bot', text: 'Welcome Priya! You\'re verified for Sardar Patel Prathmik Shala (24010515912). Pick a student to register for scholarship.' },
      { kind: 'user', text: 'Vaghela Jaydeviba — Class 9, Section B' },
      { kind: 'bot', text: 'Student found in the State Registry ✓\n\nName: Vaghela Jaydeviba Ajitsinh\nGender: Female · Class 9 · Section B\nMother: Gayatri · Father: Ajitsinh\n\nEligible scheme: **Namo Lakshmi Yojana** (auto-selected). Should we proceed?' },
      { kind: 'user', text: 'Yes, opt in' },
      { kind: 'form', title: 'Aadhaar details', fields: [
        { label: 'Wants scholarship', value: 'Yes', state: 'success' },
        { label: 'Aadhaar name',  value: 'Vaghela Jaydeviba Ajitsinh' },
        { label: 'Aadhaar no.',   value: 'XXXX XXXX 1234' },
        { label: 'Aadhaar front', value: 'Uploaded', state: 'success' },
        { label: 'Aadhaar back',  value: 'Uploaded', state: 'success' },
      ] },
      { kind: 'form', title: 'Income & guardian', fields: [
        { label: 'Family annual income', value: '₹4,50,000' },
        { label: 'Income certificate',   value: 'Not required (below threshold)' },
        { label: 'Guardian mobile',      value: '98765 43210' },
      ] },
      { kind: 'form', title: 'Mother\'s account (DBT)', fields: [
        { label: 'Mother name',     value: 'Gayatri' },
        { label: 'Mother Aadhaar',  value: 'XXXX XXXX 5678' },
        { label: 'Bank',            value: 'Baroda Gujarat Gramin Bank' },
        { label: 'Account',         value: 'XXXXX789' },
        { label: 'IFSC',            value: 'BARB0BGGBXX' },
        { label: 'Name in bank',    value: 'Vaghela Gaytriba', state: 'success' },
        { label: 'Cancelled cheque', value: 'Uploaded', state: 'success' },
      ] },
      { kind: 'bot', text: 'LCR / birth certificate uploaded ✓\nAll required fields complete. Ready to submit?' },
      { kind: 'user', text: 'Submit' },
      { kind: 'bot', text: '🎉 Application submitted!\n\nApp ID: NL2025GJ0042\nStatus: SUBMITTED · auto-checks running.', status: 'SUBMITTED' },
    ],
  },
  {
    id: 'new_namo_saraswati',
    icon: '🧪',
    name: 'New student — Namo Saraswati',
    desc: 'Class 11 Science · 92% in Class 10',
    steps: [
      { kind: 'bot', text: 'Student: Prajapati Princy Jitendrabhai · Class 11 · Section A' },
      { kind: 'bot', text: '⚡ Dual eligible:\n• Namo Lakshmi Yojana ✓\n• Namo Saraswati Yojana ✓\n\nWhich scheme should we file?' },
      { kind: 'user', text: 'Namo Saraswati Vigyan Sadhana Yojana' },
      { kind: 'form', title: 'Academic verification', fields: [
        { label: 'Stream',          value: 'Science', state: 'success' },
        { label: 'Seat number',     value: 'A12345' },
        { label: 'Seat verified',   value: 'Verified via Exam Board API', state: 'success' },
        { label: 'Class 10 %',      value: '92.17%', state: 'success' },
        { label: 'Marksheet',       value: 'Uploaded', state: 'success' },
      ] },
      { kind: 'bot', text: '🎉 Namo Saraswati application submitted!\nClass 10: 92.17% · Seat verified · Status: SUBMITTED.', status: 'SUBMITTED' },
    ],
  },
  {
    id: 'opt_out',
    icon: '🚫',
    name: 'Student opt-out',
    desc: 'Declaration letter uploaded',
    steps: [
      { kind: 'bot', text: 'Does this student want the scholarship?' },
      { kind: 'user', text: 'No — student declined' },
      { kind: 'bot', text: 'Please upload a declaration letter from the student.' },
      { kind: 'user', text: '📎 Declaration letter uploaded' },
      { kind: 'bot', text: 'Marked as **NOT_WANTED**. You can reopen this application later if the student changes their mind.', status: 'NOT_WANTED' },
    ],
  },
  {
    id: 'dual_eligible',
    icon: '⚡',
    name: 'Dual-eligible selection',
    desc: 'Both schemes available — pick one',
    steps: [
      { kind: 'bot', text: '⚡ This student qualifies for **two** schemes:\n\n1. Namo Lakshmi · ₹50,000 over 4 years (Class 9–12 girls)\n2. Namo Saraswati · ₹25,000 over 2 years (Science, Class 11–12)\n\nWhich one would you like to file?' },
      { kind: 'user', text: 'Namo Saraswati (higher per-year benefit)' },
      { kind: 'bot', text: 'Selected Namo Saraswati ✓ — proceeding with stream + seat number fields.' },
    ],
  },
  {
    id: 'draft_resume',
    icon: '💾',
    name: 'Draft → resume → submit',
    desc: 'Save partial, return later',
    steps: [
      { kind: 'user', text: 'Save as draft — I\'ll upload documents tomorrow' },
      { kind: 'bot', text: '💾 Saved as **DRAFT**\n\n✓ Aadhaar details filled\n✓ Income filled\n✗ Documents pending\n✗ Mother\'s bank pending', status: 'DRAFT' },
      { kind: 'user', text: 'Continue draft for Vaghela Jaydeviba' },
      { kind: 'bot', text: 'Draft loaded. Pending: Aadhaar images · mother\'s bank · LCR.' },
      { kind: 'user', text: '📎 Uploaded all remaining documents · submit' },
      { kind: 'bot', text: 'Submitted! Submission #2 · status SUBMITTED.', status: 'SUBMITTED' },
    ],
  },
  {
    id: 'returning_student',
    icon: '🔁',
    name: 'Returning student (Year 2)',
    desc: 'Class 11 → 12 · previously approved',
    steps: [
      { kind: 'form', title: 'Pre-filled from 2024-25', fields: [
        { label: 'Previous grade', value: 'Class 11', state: 'info' },
        { label: 'Previous status', value: 'APPROVED', state: 'success' },
        { label: 'Current grade', value: 'Class 12 (auto-progressed)' },
        { label: 'School', value: '24010515912 (unchanged)' },
      ] },
      { kind: 'user', text: 'Confirm & submit' },
      { kind: 'bot', text: '🎉 Submitted as a returning student. Progression details preserved.', status: 'SUBMITTED' },
    ],
  },
  {
    id: 'correction_resubmit',
    icon: '🔄',
    name: 'Correction & resubmission',
    desc: 'Rejected → corrected → re-submitted → approved',
    steps: [
      { kind: 'bot', text: '⚠️ Application for **Shah Riya** was rejected.\nReason: Aadhaar card image is unclear. Please re-upload a clearer image.' },
      { kind: 'user', text: '📎 New aadhaar image uploaded' },
      { kind: 'bot', text: 'Updated. Submission #2 · status RESUBMITTED.', status: 'RESUBMITTED' },
      { kind: 'bot', text: 'Approver review complete · ✅ APPROVED on resubmission.', status: 'APPROVED' },
    ],
  },
]

// Quick replies that drive the chat experience.
export const TEACHER_CHIPS = [
  { label: '👧 New — Namo Lakshmi', flow: 'new_namo_lakshmi' },
  { label: '🧪 New — Namo Saraswati', flow: 'new_namo_saraswati' },
  { label: '⚡ Dual eligibility', flow: 'dual_eligible' },
  { label: '🚫 Student opt-out', flow: 'opt_out' },
  { label: '💾 Resume draft', flow: 'draft_resume' },
  { label: '🔁 Returning student', flow: 'returning_student' },
  { label: '🔄 Correction & resubmit', flow: 'correction_resubmit' },
]

// AI queries the teacher can ask the bot — answers drawn from local data.
export const TEACHER_AI_QUERIES = [
  {
    q: 'How many students have I submitted this year?',
    answer: 'You\'ve submitted **42 applications** in 2025-26 across both schemes.',
    metric: { value: '42', label: 'Submitted', tone: 'info' },
  },
  {
    q: 'How many are approved in my school?',
    answer: '**38 students** are approved in your school for the current year.',
    metric: { value: '38', label: 'Approved', tone: 'success' },
  },
  {
    q: 'Show rejected students and reasons',
    answer: '2 rejections found:\n• Patel Kavya (Class 9) — Mother name mismatch\n• Shah Riya (Class 10) — Blurry Aadhaar image\n\nBoth can be corrected and resubmitted.',
    metric: { value: '2', label: 'Rejected · fixable', tone: 'error' },
  },
  {
    q: 'What is my submission rate?',
    answer: '**87.5%** submission rate — 42 of 48 students submitted; 6 still in draft.',
    metric: { value: '87.5%', label: 'Submission rate', tone: 'info' },
  },
]
