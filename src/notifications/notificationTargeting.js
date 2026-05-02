// Targeting rules for notifications.
//
// matchesNotificationTarget(notification, user) → boolean
//
// Rules (any-of):
//   - targetUserIds includes user.id
//   - targetRoles includes 'all'
//   - targetRoles includes 'not_state' AND user is not a state user
//   - targetRoles includes user.role
//   - targetRoles includes 'state' AND user is a state user
//   - targetRoles includes 'teacher' AND user.role === 'teacher'
//   - …etc. Role aliases (e.g. state ↔ state_secretary) are normalised.

import { STATE_ROLES } from './notificationTypes.js'

function isStateRole(role) {
  return STATE_ROLES.has(role)
}

export function userIdFor(user) {
  if (!user) return null
  return user.id || user.employeeId || user.stateId || user.role || null
}

// True when the given role token (from targetRoles) admits this user.
function roleTokenMatches(token, user) {
  if (!token || !user?.role) return false
  if (token === 'all') return true
  if (token === 'not_state') return !isStateRole(user.role)
  if (token === 'state') return isStateRole(user.role)
  // Direct role match (teacher, principal, crc, brc, deo, pfms, parent,
  // state_secretary).
  if (token === user.role) return true
  // Common aliasing — e.g. 'state' broadcast should also reach
  // `state_secretary` profile, and `state_secretary` should match a
  // 'state' targeting token.
  if (token === 'state_secretary' && user.role === 'state_secretary') return true
  return false
}

export function matchesNotificationTarget(notification, user) {
  if (!notification || !user) return false
  const uid = userIdFor(user)
  if (uid && Array.isArray(notification.targetUserIds) && notification.targetUserIds.includes(uid)) {
    return true
  }
  const roles = notification.targetRoles || []
  for (const token of roles) {
    if (roleTokenMatches(token, user)) return true
  }
  return false
}

// Convenience: build a user descriptor from the AppContext role+profile.
// Used by notificationStore + scheduler to evaluate targeting consistently.
export function describeUser(role, profile) {
  if (!role) return null
  return {
    id: userIdFor({ ...(profile || {}), role }),
    role,
    name: profile?.name,
    employeeId: profile?.employeeId,
    stateId: profile?.stateId,
  }
}
