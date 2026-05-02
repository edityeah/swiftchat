// Workflow-friendly helpers for emitting notifications from any module.
//
// Use `createSystemNotification(...)` for arbitrary system events, or one of
// the named helpers below (`notifyApplicationApproved`, `notifyApplicationRejected`,
// etc.) that pre-fill title/category/action so the call-site stays terse.

import { addNotification } from './notificationStore.js'
import { fireImmediateDelivery } from './notificationScheduler.js'

// Generic system-notification factory. When `currentUser` is provided and the
// notification targets them, the toast/sound/animation cycle fires immediately;
// otherwise the notification just lands silently and the next scheduler tick
// will pick it up for the matching user.
export function createSystemNotification(input, currentUser = null) {
  const created = addNotification(
    {
      type: 'system',
      priority: 'normal',
      ...input,
      // Always normalise the createdBy fields so workflow code can be terse.
      createdBy: input.createdBy || 'system',
      createdByRole: input.createdByRole || 'system',
    },
    { type: 'system' },
  )
  fireImmediateDelivery(created, currentUser)
  return created
}

// ── Curated workflow templates ──────────────────────────────────────────────

export function notifyApplicationApproved({ teacherUserId, studentName, scheme, appId, currentUser }) {
  const schemeLabel = scheme === 'ns' || scheme === 'namo_saraswati' ? 'Namo Saraswati' : 'Namo Lakshmi'
  return createSystemNotification({
    title: `${studentName}'s ${schemeLabel} application was approved`,
    message: `Application ${appId} has been approved. Payment will be initiated by PFMS shortly.`,
    category: 'approval',
    priority: 'normal',
    module: 'digivritti',
    targetUserIds: teacherUserId ? [teacherUserId] : [],
    targetRoles: teacherUserId ? [] : ['teacher'],
    action: { label: 'View application', type: 'OPEN_APPLICATION_LIST', payload: { scheme: scheme === 'ns' ? 'ns' : 'nl' } },
  }, currentUser)
}

export function notifyApplicationRejected({ teacherUserId, studentName, scheme, appId, reason, currentUser }) {
  const schemeLabel = scheme === 'ns' || scheme === 'namo_saraswati' ? 'Namo Saraswati' : 'Namo Lakshmi'
  return createSystemNotification({
    title: `${studentName}'s ${schemeLabel} application was rejected`,
    message: reason
      ? `Application ${appId} was rejected. Reason: ${reason}. Open the application to fix the documents and resubmit.`
      : `Application ${appId} was rejected. Open the application to update the rejected documents and resubmit.`,
    category: 'application',
    priority: 'high',
    module: 'digivritti',
    targetUserIds: teacherUserId ? [teacherUserId] : [],
    targetRoles: teacherUserId ? [] : ['teacher'],
    action: { label: 'Open application', type: 'OPEN_APPLICATION_EDIT', payload: { appId } },
    meta: { appId, studentName, scheme, reason },
  }, currentUser)
}

export function notifyApplicationResubmitted({ crcUserId, studentName, appId, currentUser }) {
  return createSystemNotification({
    title: `${studentName}'s application was resubmitted`,
    message: `Application ${appId} has been corrected by the teacher and is ready for re-review.`,
    category: 'approval',
    priority: 'normal',
    module: 'digivritti',
    targetUserIds: crcUserId ? [crcUserId] : [],
    targetRoles: crcUserId ? [] : ['crc'],
    action: { label: 'Open re-review queue', type: 'OPEN_CRC_RESUBMITTED_REVIEWS' },
  }, currentUser)
}

export function notifyPaymentFailed({ pfmsUserId, count, batchId, currentUser }) {
  return createSystemNotification({
    title: count ? `${count} payment failures need review` : 'Payment failed',
    message: batchId
      ? `Disbursement batch ${batchId} reported payment failures. Open the payment queue to review and retry.`
      : 'A payment has failed. Open the payment queue to review and retry.',
    category: 'payment',
    priority: 'high',
    module: 'digivritti',
    targetUserIds: pfmsUserId ? [pfmsUserId] : [],
    targetRoles: pfmsUserId ? [] : ['pfms'],
    action: { label: 'Open payment queue', type: 'OPEN_PAYMENT_QUEUE', payload: { paymentFilter: 'failed' } },
  }, currentUser)
}

export function notifyPaymentRetrySuccess({ pfmsUserId, count, currentUser }) {
  return createSystemNotification({
    title: count ? `${count} payment retries succeeded` : 'Payment retry succeeded',
    message: 'Recent retried disbursements have completed successfully. UTRs are available in the payment queue.',
    category: 'payment',
    priority: 'normal',
    module: 'digivritti',
    targetUserIds: pfmsUserId ? [pfmsUserId] : [],
    targetRoles: pfmsUserId ? [] : ['pfms'],
    action: { label: 'Open payment queue', type: 'OPEN_PAYMENT_QUEUE', payload: { paymentFilter: 'success' } },
  }, currentUser)
}

export function notifyXamtaScanCompleted({ teacherUserId, classLabel, currentUser }) {
  return createSystemNotification({
    title: `XAMTA scan completed${classLabel ? ` for ${classLabel}` : ''}`,
    message: 'Scanning is complete. Open XAMTA results to review learning-outcome scores.',
    category: 'xamta_data_entry',
    priority: 'normal',
    module: 'xamta',
    targetUserIds: teacherUserId ? [teacherUserId] : [],
    targetRoles: teacherUserId ? [] : ['teacher'],
    action: { label: 'Open XAMTA results', type: 'OPEN_XAMTA_RESULTS' },
  }, currentUser)
}

export function notifyAttendanceNotSubmitted({ teacherUserId, classLabel, currentUser }) {
  return createSystemNotification({
    title: `Attendance not submitted${classLabel ? ` for ${classLabel}` : ''}`,
    message: 'Daily attendance is pending. Mark attendance before EOD so parent alerts dispatch on time.',
    category: 'attendance',
    priority: 'high',
    module: 'attendance',
    targetUserIds: teacherUserId ? [teacherUserId] : [],
    targetRoles: teacherUserId ? [] : ['teacher'],
    action: { label: 'Mark attendance', type: 'OPEN_MARK_ATTENDANCE' },
  }, currentUser)
}
