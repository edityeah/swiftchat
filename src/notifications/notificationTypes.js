// Notification type/shape definitions for SwiftChat.
//
// Notification = {
//   id, type, title, message, category, priority,
//   module?, createdBy, createdByRole,
//   targetRoles, targetUserIds?,
//   scheduledAt?, deliveredAt?, expiresAt?,
//   action?: { label, type, payload? },
//   readBy: [], dismissedBy: [],
//   createdAt, updatedAt,
// }
//
// Reminder = same shape with type = 'reminder' and targetUserIds = [self].
// System = same shape with type = 'system'.
// Broadcast = same shape with type = 'broadcast'.

export const NOTIFICATION_TYPES = ['broadcast', 'reminder', 'system']

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent']

// Stable list of user-facing categories. Keep in sync with the broadcast form.
export const NOTIFICATION_CATEGORIES = [
  { id: 'namo_deadline',    label: 'Namo Lakshmi / Saraswati Deadline' },
  { id: 'xamta_data_entry', label: 'XAMTA Data Entry' },
  { id: 'holiday',          label: 'Holiday' },
  { id: 'announcement',     label: 'Important Announcement' },
  { id: 'payment',          label: 'Payment / PFMS' },
  { id: 'attendance',       label: 'Attendance' },
  { id: 'approval',         label: 'Approval' },
  { id: 'application',      label: 'Application' },
  { id: 'reminder',         label: 'Reminder' },
  { id: 'general',          label: 'General' },
]

export const NOTIFICATION_MODULES = [
  { id: 'digivritti',  label: 'DigiVritti' },
  { id: 'xamta',       label: 'XAMTA' },
  { id: 'attendance',  label: 'Attendance' },
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'reports',     label: 'Reports' },
  { id: 'general',     label: 'General' },
]

// Roles that can receive broadcast notifications.
export const BROADCAST_TARGET_ROLES = [
  { id: 'all',        label: 'All users' },
  { id: 'teacher',    label: 'Teachers' },
  { id: 'state',      label: 'State' },
  { id: 'brc',        label: 'BRC' },
  { id: 'crc',        label: 'CRC' },
  { id: 'principal',  label: 'Principal' },
  { id: 'pfms',       label: 'PFMS' },
  { id: 'deo',        label: 'DEO' },
  { id: 'not_state',  label: 'Not a State' },
]

// Roles considered "state" for targeting purposes.
export const STATE_ROLES = new Set(['state', 'state_secretary'])

export function categoryLabel(id) {
  const c = NOTIFICATION_CATEGORIES.find(x => x.id === id)
  return c ? c.label : id || ''
}

export function priorityTone(priority) {
  switch (priority) {
    case 'urgent': return { bg: '#FFEBEE', fg: '#C62828', label: 'Urgent' }
    case 'high':   return { bg: '#FFF4E5', fg: '#B45309', label: 'High' }
    case 'normal': return { bg: '#EEF2FF', fg: '#345CCC', label: 'Normal' }
    case 'low':
    default:       return { bg: '#F3F4F6', fg: '#4B5563', label: 'Low' }
  }
}

// Generate a stable-ish id without depending on a uuid lib.
export function newNotificationId() {
  return `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
