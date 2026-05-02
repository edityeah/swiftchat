// Role-permission guard for the global NLP layer.
//
// Both module-level (broad) and action-level (fine-grained) checks. Returns
// either { allowed: true } or { allowed: false, reason } so callers can show
// the user a polite refusal.

import { MODULE_BY_ID } from './moduleRegistry.js'
import { getAction } from './actionRegistry.js'

export function canRoleUseModule(role, moduleId) {
  const mod = MODULE_BY_ID[moduleId]
  if (!mod) return { allowed: false, reason: `Module "${moduleId}" not registered.` }
  if (!mod.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `${mod.label} is not available for your role.`,
    }
  }
  return { allowed: true, module: mod }
}

export function canRoleUseAction(role, actionId) {
  const action = getAction(actionId)
  if (!action) return { allowed: false, reason: `Action "${actionId}" not registered.` }
  if (!action.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `You don't have permission to "${action.label}".`,
    }
  }
  // Module-level cross-check — keeps action allowedRoles and module
  // allowedRoles in sync.
  const m = canRoleUseModule(role, action.module)
  if (!m.allowed) return m
  return { allowed: true, action }
}
