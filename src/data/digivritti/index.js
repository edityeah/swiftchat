// Single barrel for DigiVritti role-segregated data.
export * from './teacherFlows'
export * from './approverFlows'
export * from './districtFlows'
export * from './stateFlows'
export * from './systemStates'

// Maps SwiftChat role → which DigiVritti view to render.
// Principal acts as the in-school approver for prototype purposes.
export const ROLE_TO_DIGIVRITTI = {
  teacher:         'teacher',
  principal:       'approver',
  deo:             'district',
  state_secretary: 'state',
  parent:          'teacher', // parent sees a read-only chat fallback
}
