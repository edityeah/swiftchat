// DigiVritti — mock backend.
// Pure functions that mutate the in-memory APPLICATIONS array (via helpers
// from data/digivritti/applications.js) and return a result envelope so the
// canvas/chat layer can render appropriate confirmations.

import {
  SCHEMES,
  applyResubmission,
  addApplication,
  getApplicationById,
} from '../data/digivritti/applications'

// ── Eligibility ────────────────────────────────────────────────────────────
// Runs scheme-specific auto-checks on a draft application payload. Returns
// `{ passed, reasons }` where reasons are short failure strings ready to show
// in chat.
export function runEligibilityChecks(scheme, payload) {
  const reasons = []
  const isNL = scheme === 'namo_lakshmi'
  const isNS = scheme === 'namo_saraswati'

  if (!payload.studentName) reasons.push('Student name is missing.')
  if (!payload.motherAadhaar && !payload.bankAcc) reasons.push("Mother's Aadhaar or bank account is required.")
  if (!payload.ifsc) reasons.push('IFSC is missing.')

  if (isNL) {
    const income = Number(String(payload.income || '0').replace(/[^0-9]/g, ''))
    if (income > 600000) reasons.push(`Family income ₹${income.toLocaleString('en-IN')} exceeds ₹6,00,000 threshold.`)
    if (![9, 10, 11, 12].includes(Number(payload.grade))) reasons.push('Class must be 9–12 for Namo Lakshmi.')
    if (payload.gender && payload.gender !== 'F') reasons.push('Namo Lakshmi is for female students only.')
  }
  if (isNS) {
    if (![11, 12].includes(Number(payload.grade))) reasons.push('Class must be 11 or 12 for Namo Saraswati.')
    if (payload.stream && payload.stream !== 'Science') reasons.push('Stream must be Science.')
    const pct = Number(payload.tenthPct)
    if (!isFinite(pct) || pct < 50) reasons.push('Class 10 percentage must be ≥ 50%.')
    if (!payload.seatNumber) reasons.push('Seat number is missing.')
  }

  // Document checks — at least the spec'd minimums.
  const docs = payload.docs || {}
  const required = isNS
    ? ['aadhaar', 'marksheet', 'income', 'seat', 'passbook']
    : ['aadhaar', 'motherAadhaar', 'income', 'lcr', 'passbook']
  for (const key of required) {
    if (!docs[key]) reasons.push(`Document '${key}' is missing.`)
  }

  return { passed: reasons.length === 0, reasons }
}

// ── Approver assignment ────────────────────────────────────────────────────
export function assignApprover(application) {
  // In this prototype every application from MADHAPAR cluster lands on
  // Mehul Parmar. Simple but matches the demo dataset.
  return {
    cluster: application.cluster || 'MADHAPAR',
    approverCode: 'APR001',
    approverName: 'Mehul Parmar',
  }
}

// ── Mutations ──────────────────────────────────────────────────────────────
export function submitApplication(application) {
  const checks = runEligibilityChecks(application.schemeId, application)
  if (!checks.passed) {
    return {
      ok: false, status: 'AUTO_REJECTED', reasons: checks.reasons,
    }
  }
  const approver = assignApprover(application)
  application.status = 'APPROVER_PENDING'
  application.assignedTo = approver
  addApplication(application)
  return { ok: true, status: 'APPROVER_PENDING', approver }
}

export function resubmitApplication(applicationId, patch) {
  const updated = applyResubmission(applicationId, patch || {})
  if (!updated) return { ok: false, error: 'Application not found.' }
  return { ok: true, status: updated.status, resubmissionCount: updated.resubmissionCount }
}

export function approveApplication(applicationId) {
  const app = getApplicationById(applicationId)
  if (!app) return { ok: false, error: 'Application not found.' }
  app.status = 'APPROVED'
  app.rejectionReason = null
  app.nextStep = 'Synced to IPMS for first-month payment.'
  return { ok: true, status: 'APPROVED', appId: app.appId }
}

export function rejectApplication(applicationId, reason) {
  const app = getApplicationById(applicationId)
  if (!app) return { ok: false, error: 'Application not found.' }
  app.status = 'REJECTED'
  app.rejectionReason = reason || 'Other'
  app.nextStep = 'Teacher to correct & resubmit.'
  return { ok: true, status: 'REJECTED', appId: app.appId, reason }
}

export function markOptOut(applicationOrPayload) {
  const { studentName, scheme, declarationFile, reason, appId } = applicationOrPayload
  const code = SCHEMES[scheme]?.code || 'NL'
  const newId = appId || `${code}2025OPT${Math.floor(Math.random() * 9000) + 1000}`
  const app = {
    appId: newId,
    schemeId: scheme,
    studentName,
    studentId: applicationOrPayload.studentId || null,
    fatherName: '—', motherName: '—', motherNameInBank: '—',
    grade: applicationOrPayload.grade || null,
    section: applicationOrPayload.section || null,
    dob: null, phone: '—',
    studentAadhaar: '—', motherAadhaar: '—',
    bankAcc: '—', ifsc: '—', bankName: '—',
    schoolCode: applicationOrPayload.schoolCode || null,
    school: applicationOrPayload.school || null,
    cluster: applicationOrPayload.cluster || null,
    block: applicationOrPayload.block || null,
    district: applicationOrPayload.district || null,
    docs: declarationFile ? { declaration: 'uploaded' } : {},
    status: 'NOT_WANTED',
    rejectionReason: null,
    optOutReason: reason || 'Student declined',
    declarationFile: declarationFile || null,
    submittedAt: new Date().toISOString().slice(0, 10),
    submittedDate: new Date().toLocaleDateString('en-GB'),
    resubmissionCount: 1,
    nextStep: 'Eligible to reopen if the student changes their mind.',
    monthlyAmount: 0,
    payment: null,
  }
  addApplication(app)
  return { ok: true, status: 'NOT_WANTED', appId: newId }
}

// ── Payment side ───────────────────────────────────────────────────────────
export function syncToPayment(applicationId) {
  const app = getApplicationById(applicationId)
  if (!app) return { ok: false, error: 'Application not found.' }
  if (app.status !== 'APPROVED') return { ok: false, error: 'Application is not in APPROVED state.' }
  app.status = 'PAYMENT_PENDING'
  app.payment = { ...(app.payment || {}), state: 'PAYMENT_PENDING', amount: app.monthlyAmount }
  return { ok: true, status: 'PAYMENT_PENDING', appId: app.appId, amount: app.monthlyAmount }
}

export function processPayment(applicationId) {
  const app = getApplicationById(applicationId)
  if (!app) return { ok: false, error: 'Application not found.' }
  // Simulate ~85% success rate driven by seeded dataset, but for prototype
  // always succeed unless the mock said otherwise.
  app.status = 'PAYMENT_SUCCESS'
  const utr = `UTR2025${String(700000 + Math.floor(Math.random() * 99999)).slice(-7)}`
  app.payment = {
    ...(app.payment || {}),
    state: 'PAYMENT_SUCCESS',
    utr,
    amount: app.monthlyAmount,
    creditedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  }
  return { ok: true, status: 'PAYMENT_SUCCESS', utr, appId: app.appId }
}

export function retryPayment(applicationId) {
  const app = getApplicationById(applicationId)
  if (!app) return { ok: false, error: 'Application not found.' }
  app.status = 'PAYMENT_SUCCESS'
  const utr = `UTR2025${String(800000 + Math.floor(Math.random() * 99999)).slice(-7)}`
  app.payment = {
    ...(app.payment || {}),
    state: 'PAYMENT_SUCCESS',
    isRetry: true,
    retryCount: (app.payment?.retryCount || 0) + 1,
    utr,
    amount: app.monthlyAmount,
    creditedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    failureReason: null,
  }
  return { ok: true, status: 'PAYMENT_SUCCESS', utr, appId: app.appId, isRetry: true }
}
