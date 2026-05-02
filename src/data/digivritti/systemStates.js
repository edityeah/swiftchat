// Background system status definitions used as chips/timeline updates across views.

export const SYSTEM_STATUS = {
  DRAFT:             { label: 'Draft',             tone: 'neutral', icon: '💾', desc: 'Saved — not yet submitted' },
  NOT_WANTED:        { label: 'Not wanted',        tone: 'neutral', icon: '🚫', desc: 'Student declined the scholarship' },
  SUBMITTED:         { label: 'Submitted',         tone: 'info',    icon: '📤', desc: 'In auto-eligibility checks' },
  AUTO_REJECTED:     { label: 'Auto-rejected',     tone: 'error',   icon: '⚠️', desc: 'Failed automatic eligibility (income / seat / docs)' },
  APPROVER_PENDING:  { label: 'Approver pending',  tone: 'warning', icon: '⏳', desc: 'Awaiting cluster approver review' },
  RESUBMITTED:       { label: 'Resubmitted',       tone: 'info',    icon: '🔄', desc: 'Corrected and re-sent for review' },
  APPROVED:          { label: 'Approved',          tone: 'success', icon: '✅', desc: 'Cleared by approver — moves to payment' },
  REJECTED:          { label: 'Rejected',          tone: 'error',   icon: '❌', desc: 'Approver rejected — fix and resubmit' },
  PAYMENT_PENDING:   { label: 'Payment pending',   tone: 'info',    icon: '🏦', desc: 'In IPMS queue for disbursement' },
  PAYMENT_SUCCESS:   { label: 'Payment success',   tone: 'success', icon: '💰', desc: 'UTR generated, amount credited' },
  PAYMENT_FAIL:      { label: 'Payment failed',    tone: 'error',   icon: '🔻', desc: 'Bank-side failure — eligible for retry' },
  BONUS:             { label: 'Bonus',             tone: 'success', icon: '🎓', desc: 'Board exam passed — bonus credited' },
  EXCLUDED:          { label: 'Excluded',          tone: 'neutral', icon: '🚷', desc: 'Failed board exam — exits the scheme' },
}

// Timeline of system events for a single application (used in the teacher detail panel).
export const SAMPLE_TIMELINE = [
  { code: 'SUBMITTED',        timestamp: '15/07/2025 10:30', actor: 'You' },
  { code: 'APPROVER_PENDING', timestamp: '15/07/2025 10:32', actor: 'System · auto-checks passed' },
  { code: 'APPROVED',         timestamp: '17/07/2025 14:08', actor: 'Cluster approver · APR001' },
  { code: 'PAYMENT_PENDING',  timestamp: '17/07/2025 14:10', actor: 'System → IPMS sync' },
  { code: 'PAYMENT_SUCCESS',  timestamp: '20/07/2025 06:30', actor: 'UTR · UTR202507200001 · ₹500' },
]
