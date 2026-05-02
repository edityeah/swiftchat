// Action catalog mirror — kept in lockstep with src/nlp/actionRegistry.js +
// src/nlp/moduleRegistry.js. Backend uses this to ground Groq's classifier
// in the *real* action IDs the frontend can dispatch. The frontend
// re-validates everything via permissionGuard before executing, so even if
// this drifts the worst case is a "denied" reply.
//
// Update this file whenever you add a new action or module on the frontend.

export const MODULES = [
  { id: 'attendance',      label: 'Mark Attendance',      roles: ['teacher', 'principal', 'crc', 'deo'] },
  { id: 'xamta',           label: 'XAMTA Scan',           roles: ['teacher', 'principal'] },
  { id: 'class_dashboard', label: 'Class Dashboard',      roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'] },
  { id: 'digivritti',      label: 'DigiVritti',           roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'] },
  { id: 'reports',         label: 'Reports & Analytics',  roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'] },
  { id: 'parent_alerts',   label: 'Parent Alerts',        roles: ['teacher', 'principal'] },
]

// id → { module, description, requiredEntities, requiresConfirmation, roles }
export const ACTIONS = {
  // Attendance
  OPEN_MARK_ATTENDANCE:      { module: 'attendance',      description: 'Open the attendance register to mark students present/absent.', requiredEntities: ['class'], requiresConfirmation: false, roles: ['teacher', 'principal'] },
  OPEN_ATTENDANCE_HISTORY:   { module: 'attendance',      description: 'View past attendance records.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo'] },
  SHOW_ABSENT_STUDENTS:      { module: 'attendance',      description: 'List absentee students for a class today.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc'] },

  // XAMTA
  OPEN_XAMTA_SCAN:           { module: 'xamta',           description: 'Open the XAMTA scanner to scan/upload OMR sheets.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal'] },
  OPEN_XAMTA_RESULTS:        { module: 'xamta',           description: 'View past XAMTA scan results / learning outcomes.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo'] },

  // Dashboards
  OPEN_CLASS_DASHBOARD:      { module: 'class_dashboard', description: 'Open per-class performance dashboard.', requiredEntities: ['class'], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc'] },
  OPEN_SCHOOL_DASHBOARD:     { module: 'class_dashboard', description: 'Open the whole-school KPI dashboard.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc'] },
  OPEN_DISTRICT_DASHBOARD:   { module: 'class_dashboard', description: 'Open district-wide KPI dashboard.', requiredEntities: [], requiresConfirmation: false, roles: ['deo', 'state_secretary'] },
  OPEN_STATE_DASHBOARD:      { module: 'class_dashboard', description: 'Open the state command-centre dashboard.', requiredEntities: [], requiresConfirmation: false, roles: ['state_secretary'] },

  // DigiVritti
  OPEN_DIGIVRITTI_HOME:      { module: 'digivritti',      description: 'Open the DigiVritti scholarship hub for the current role.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'] },
  OPEN_NAMO_LAKSHMI:         { module: 'digivritti',      description: 'Open Namo Lakshmi (Class 9-12 girls) scheme home.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal'] },
  OPEN_NAMO_SARASWATI:       { module: 'digivritti',      description: 'Open Namo Saraswati (Class 11-12 Science) scheme home.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal'] },
  OPEN_APPLICATION_LIST:     { module: 'digivritti',      description: 'Open scholarship application list. Optional entity.scheme = nl|ns.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'] },
  OPEN_REJECTED_APPLICATIONS:{ module: 'digivritti',      description: 'Show rejected scholarship applications that need correction.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc'] },
  OPEN_PAYMENT_QUEUE:        { module: 'digivritti',      description: 'Open the PFMS payment queue. Optional entity.paymentFilter = pending|failed|success|all.', requiredEntities: [], requiresConfirmation: false, roles: ['pfms', 'state_secretary'] },
  OPEN_DIGIVRITTI_AI:        { module: 'digivritti',      description: 'Open the DigiVritti AI assistant menu (role-scoped questions + deep dives).', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'] },
  RUN_DIGIVRITTI_QUERY:      { module: 'digivritti',      description: 'Send a free-form question into DigiVritti AI. entity.question = the original user question.', requiredEntities: ['question'], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'] },

  // Reports
  OPEN_STUDENT_REPORT:       { module: 'reports',         description: 'Open per-student performance report.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal', 'crc'] },
  OPEN_REPORT_CARD:          { module: 'reports',         description: 'Generate a student report card PDF.', requiredEntities: [], requiresConfirmation: false, roles: ['teacher', 'principal'] },
  RUN_GLOBAL_ANALYTICS_QUERY:{ module: 'reports',         description: 'Run a free-form analytics question via DigiVritti AI.', requiredEntities: [], requiresConfirmation: false, roles: ['principal', 'crc', 'deo', 'state_secretary'] },

  // Parent alerts (state-changing → confirm)
  SEND_PARENT_ALERT:         { module: 'parent_alerts',   description: 'Send WhatsApp/SMS alerts to parents (state-changing — must be confirmed).', requiredEntities: [], requiresConfirmation: true, roles: ['teacher', 'principal'] },
}

export function actionsForRole(role) {
  return Object.entries(ACTIONS)
    .filter(([, a]) => a.roles.includes(role))
    .map(([id, a]) => ({ id, ...a }))
}
