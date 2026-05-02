// One-time demo seed for prototype. Runs only when the seeded sentinel is
// absent — refreshes never duplicate.

import {
  addManyNotifications, isSeeded, markSeeded,
} from './notificationStore.js'

function isoFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function isoNow() {
  return new Date().toISOString()
}

// Demo notifications. Schedule windows mostly already-delivered so the demo
// shows realistic content the moment the bell is opened. Two are scheduled in
// the near future so the scheduler firing can be observed.
function seedNotifications() {
  return [
    // ── Teacher ────────────────────────────────────────────────────────────
    {
      type: 'broadcast',
      title: 'Namo Lakshmi deadline is tomorrow',
      message: 'Submit pending Namo Lakshmi applications by tomorrow 6:00 PM. Late submissions will not be accepted in this cycle.',
      category: 'namo_deadline',
      priority: 'urgent',
      module: 'digivritti',
      createdBy: 'state-secretary-demo',
      createdByRole: 'state_secretary',
      targetRoles: ['teacher', 'principal'],
      scheduledAt: isoFromNow(-60 * 24),
      deliveredAt: isoFromNow(-60 * 24),
      action: { label: 'Open DigiVritti', type: 'OPEN_DIGIVRITTI_HOME' },
    },
    {
      type: 'system',
      title: "Patel Kavya's application was approved",
      message: 'Namo Saraswati application NS2025GJ0010 has been approved by the cluster approver. Payment will be initiated by PFMS.',
      category: 'approval',
      priority: 'normal',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['teacher'],
      scheduledAt: isoFromNow(-60 * 6),
      deliveredAt: isoFromNow(-60 * 6),
      action: { label: 'View application', type: 'OPEN_APPLICATION_LIST', payload: { scheme: 'ns' } },
    },
    // ── Rejected-application deep-link — clicking the action opens the
    // student's rejected app inside the DigiVritti edit canvas so the teacher
    // can fix the documents and resubmit. NL2025GJ0014 is a real seeded
    // rejected app (blurry Aadhaar) so the deep link lands on a populated
    // form. See data/digivritti/applications.js.
    {
      type: 'system',
      title: "Shah Riya's Namo Lakshmi application was rejected",
      message: 'Application NL2025GJ0014 was rejected. Reason: Aadhaar card image is unclear/blurry — please re-upload a clearer photo. Open the application to update the rejected document and resubmit.',
      category: 'application',
      priority: 'high',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['teacher'],
      scheduledAt: isoFromNow(-60 * 2),
      deliveredAt: isoFromNow(-60 * 2),
      action: {
        label: 'Open application',
        type: 'OPEN_APPLICATION_EDIT',
        payload: { appId: 'NL2025GJ0014' },
      },
      meta: { appId: 'NL2025GJ0014', studentName: 'Shah Riya', scheme: 'nl', reason: 'Aadhaar image blurry' },
    },
    {
      type: 'broadcast',
      title: 'XAMTA data entry pending for Class 6',
      message: 'Class 6 XAMTA assessment data is pending entry for the August cycle. Please scan answer sheets and upload before EOD Friday.',
      category: 'xamta_data_entry',
      priority: 'high',
      module: 'xamta',
      createdBy: 'state-secretary-demo',
      createdByRole: 'state_secretary',
      targetRoles: ['teacher'],
      scheduledAt: isoFromNow(-60 * 18),
      deliveredAt: isoFromNow(-60 * 18),
      action: { label: 'Open XAMTA', type: 'OPEN_XAMTA_SCAN' },
    },
    {
      type: 'system',
      title: 'Attendance not submitted for Class 8',
      message: 'Daily attendance has not been marked for Class 8 today. Please mark before 5:00 PM so parent alerts can dispatch.',
      category: 'attendance',
      priority: 'high',
      module: 'attendance',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['teacher'],
      scheduledAt: isoFromNow(-30),
      deliveredAt: isoFromNow(-30),
      action: { label: 'Mark attendance', type: 'OPEN_MARK_ATTENDANCE', payload: { class: '8' } },
    },

    // ── CRC ───────────────────────────────────────────────────────────────
    {
      type: 'system',
      title: '12 applications pending review',
      message: '12 Namo Lakshmi / Saraswati applications are pending your approval in MADHAPAR cluster. SLA target: 48 hours.',
      category: 'approval',
      priority: 'high',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['crc'],
      scheduledAt: isoFromNow(-60 * 4),
      deliveredAt: isoFromNow(-60 * 4),
      action: { label: 'Open pending reviews', type: 'OPEN_CRC_PENDING_REVIEWS' },
    },
    {
      type: 'system',
      title: '3 resubmitted applications need re-review',
      message: 'Three rejected applications have been resubmitted by teachers and require your re-review.',
      category: 'approval',
      priority: 'normal',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['crc'],
      scheduledAt: isoFromNow(-60 * 12),
      deliveredAt: isoFromNow(-60 * 12),
      action: { label: 'Open re-review queue', type: 'OPEN_CRC_RESUBMITTED_REVIEWS' },
    },

    // ── PFMS ──────────────────────────────────────────────────────────────
    {
      type: 'system',
      title: '8 failed payments are retry-eligible',
      message: 'Eight Namo Lakshmi disbursements failed Aadhaar-bank verification and are eligible for retry after correction.',
      category: 'payment',
      priority: 'high',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['pfms'],
      scheduledAt: isoFromNow(-60 * 3),
      deliveredAt: isoFromNow(-60 * 3),
      action: { label: 'Open payment queue', type: 'OPEN_PAYMENT_QUEUE', payload: { paymentFilter: 'failed' } },
    },
    {
      type: 'system',
      title: 'Batch BATCH-2025-08-001 completed with failures',
      message: 'Disbursement batch BATCH-2025-08-001 closed with 8 failed transactions out of 234. Reconciliation report attached.',
      category: 'payment',
      priority: 'normal',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['pfms'],
      scheduledAt: isoFromNow(-60 * 14),
      deliveredAt: isoFromNow(-60 * 14),
      action: { label: 'Open payment queue', type: 'OPEN_PAYMENT_QUEUE', payload: { paymentFilter: 'failed' } },
    },

    // ── State ─────────────────────────────────────────────────────────────
    {
      type: 'reminder',
      title: 'State dashboard review reminder',
      message: 'Weekly review of state dashboard KPIs scheduled for 4:00 PM today.',
      category: 'reminder',
      priority: 'normal',
      module: 'dashboard',
      createdBy: 'state-secretary-demo',
      createdByRole: 'state_secretary',
      // Target the state-secretary by both id (via the IAS-GJ-0042 employee id
      // surfaced in mock data) and role token, so it lands regardless of how
      // the user descriptor is built.
      targetRoles: ['state'],
      targetUserIds: ['IAS-GJ-0042'],
      scheduledAt: isoFromNow(-60 * 2),
      deliveredAt: isoFromNow(-60 * 2),
      action: { label: 'Open state dashboard', type: 'OPEN_STATE_DASHBOARD' },
    },
    {
      type: 'system',
      title: 'Monsoon manual approval workload crossed threshold',
      message: 'Manual approval queue volume is 38% above 4-week average. Consider redirecting CRC capacity for the next 5 days.',
      category: 'announcement',
      priority: 'high',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['state'],
      scheduledAt: isoFromNow(-60 * 8),
      deliveredAt: isoFromNow(-60 * 8),
      action: { label: 'Open DigiVritti analytics', type: 'OPEN_DIGIVRITTI_AI' },
    },

    // ── Principal ─────────────────────────────────────────────────────────
    {
      type: 'system',
      title: 'School scholarship coverage report ready',
      message: 'Your school’s consolidated Namo Lakshmi / Saraswati coverage report is ready for review.',
      category: 'announcement',
      priority: 'normal',
      module: 'reports',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['principal'],
      scheduledAt: isoFromNow(-60 * 5),
      deliveredAt: isoFromNow(-60 * 5),
      action: { label: 'Open school dashboard', type: 'OPEN_SCHOOL_DASHBOARD' },
    },
    {
      type: 'system',
      title: 'Teachers have 6 pending scholarship drafts',
      message: 'Six DigiVritti applications are stuck in draft state across your teachers. Nudge them to submit before the cycle closes.',
      category: 'application',
      priority: 'normal',
      module: 'digivritti',
      createdBy: 'system',
      createdByRole: 'system',
      targetRoles: ['principal'],
      scheduledAt: isoFromNow(-60 * 22),
      deliveredAt: isoFromNow(-60 * 22),
      action: { label: 'Open application list', type: 'OPEN_APPLICATION_LIST' },
    },
  ]
}

export function runSeedIfNeeded() {
  if (isSeeded()) return false
  addManyNotifications(seedNotifications())
  markSeeded()
  return true
}

// Re-exported for tests and admin tools.
export const _seedFactory = seedNotifications
