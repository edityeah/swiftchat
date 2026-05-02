// ─────────────────────────────────────────────────────────────────────────────
// VSK Gujarat Role Configuration — RBAC
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  teacher:         'Teacher',
  principal:       'Principal',
  deo:             'DEO',
  state_secretary: 'State Secretary',
  parent:          'Parent',
  crc:             'CRC · Cluster Approver',
  pfms:            'PFMS · Payment Officer',
}

export const ROLE_SCOPES = {
  teacher:         'School',
  principal:       'School',
  deo:             'District',
  state_secretary: 'State',
  parent:          'Student',
  crc:             'Cluster',
  pfms:            'State (Payments)',
}

// Bot list per role
export const ROLE_BOTS = {
  teacher: [
    'VSK Gujarat',
    'Shikshak Sahayak',
    'Assessment Bot',
    'Remediation Bot',
    'Parent Connect',
  ],
  principal: [
    'VSK Gujarat',
    'School Monitor',
    'Compliance Bot',
    'Parent Connect',
    'Report Generator',
  ],
  deo: [
    'VSK Gujarat',
    'District Analyst',
    'DBT Monitor',
    'Intervention Bot',
    'War Room',
  ],
  state_secretary: [
    'VSK Gujarat',
    'State Intelligence',
    'Scheme Analytics',
    'District Drilldown',
    'Policy Advisor',
  ],
  parent: [
    'VSK Gujarat',
    'Parent Assistant',
  ],
  crc: [
    'VSK Gujarat',
    'DigiVritti Approver',
    'Cluster Console',
  ],
  pfms: [
    'VSK Gujarat',
    'DigiVritti Payments',
    'PFMS Console',
  ],
}

// Suggested starter prompts per role
export const ROLE_SUGGESTIONS = {
  teacher: [
    'Mark attendance for Class 8',
    'Lesson plan for fractions — Class 6',
    'Show at-risk students',
    'Generate report cards',
    'Namo Laxmi scholarship status',
    'Create quiz for Science Class 5',
    'Notify parents of absent students',
  ],
  principal: [
    'School attendance summary',
    'Show at-risk students across school',
    'Teacher activity report',
    'Parent outreach status',
    'Scholarship pending approvals',
    'Generate school performance PDF',
    'War room — anomaly alerts',
  ],
  deo: [
    'District attendance overview',
    'Block-wise risk analysis',
    'DBT scholarship bottlenecks',
    'War room — district anomalies',
    'School comparison report',
    'Escalation queue',
    'Critical alert schools',
  ],
  state_secretary: [
    'State attendance summary',
    'District drilldown — Ahmedabad',
    'Namo Laxmi scheme analytics',
    'Statewide dropout risk signals',
    'Top and bottom performing districts',
    'DBT disbursement status',
    'Strategic intervention map',
  ],
  parent: [
    "Ravi's attendance this month",
    'Homework assignments due',
    'Scholarship status — Namo Laxmi',
    'Message to class teacher',
    'Download report card',
    'Upcoming school events',
  ],
  crc: [
    'Pending applications in MADHAPAR',
    'Resubmitted applications to re-review',
    'Approval rate this month',
    'Open DigiVritti scholarships',
    'Show rejected with reasons',
  ],
  pfms: [
    'Failed payments last month',
    'Retry Aadhaar-bank failures',
    'District payment success rate',
    'Sanctioned vs disbursed',
    'Open DigiVritti payments',
  ],
}

// Canvas modules accessible per role
export const ROLE_CANVASES = {
  teacher: [
    'attendance', 'lesson_plan', 'quiz', 'homework', 'report_card',
    'at_risk', 'remediation', 'parent_notify', 'brc_visit', 'peer_buddy',
    'namo_laxmi', 'scholarship', 'learning_outcomes', 'xamta_scan',
  ],
  principal: [
    'attendance', 'school_dashboard', 'at_risk', 'parent_notify',
    'teacher_activity', 'report_card', 'scholarship', 'learning_outcomes',
  ],
  deo: [
    'district_dashboard', 'attendance', 'scholarship', 'war_room',
    'block_analysis', 'report_card', 'at_risk',
  ],
  state_secretary: [
    'state_dashboard', 'district_dashboard', 'scholarship', 'war_room',
    'intervention_map', 'scheme_analytics', 'report_card',
  ],
  parent: [
    'attendance', 'scholarship', 'report_card', 'homework',
  ],
}

// Notification permissions per role.
//   canCreateBroadcast — only state users can broadcast to other roles.
//   canCreateReminder  — every authenticated user can set personal reminders.
//   canViewNotifications — every authenticated user can read their inbox.
export const NOTIFICATION_PERMISSIONS = {
  teacher:         { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  principal:       { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  deo:             { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  state_secretary: { canCreateBroadcast: true,  canCreateReminder: true, canViewNotifications: true  },
  state:           { canCreateBroadcast: true,  canCreateReminder: true, canViewNotifications: true  },
  parent:          { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  crc:             { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  brc:             { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
  pfms:            { canCreateBroadcast: false, canCreateReminder: true, canViewNotifications: true  },
}

export function getNotificationPermissions(role) {
  return NOTIFICATION_PERMISSIONS[role] || { canCreateBroadcast: false, canCreateReminder: false, canViewNotifications: false }
}

// Feature flags per role
export const ROLE_PERMISSIONS = {
  teacher: {
    canMarkAttendance: true,
    canViewAllStudents: true,     // own class only
    canCreateContent: true,
    canViewDistrict: false,
    canViewState: false,
    canApproveScholarship: false,
    canViewTeacherData: false,
  },
  principal: {
    canMarkAttendance: false,
    canViewAllStudents: true,     // whole school
    canCreateContent: false,
    canViewDistrict: false,
    canViewState: false,
    canApproveScholarship: true,
    canViewTeacherData: true,
  },
  deo: {
    canMarkAttendance: false,
    canViewAllStudents: true,     // district
    canCreateContent: false,
    canViewDistrict: true,
    canViewState: false,
    canApproveScholarship: true,
    canViewTeacherData: true,
  },
  state_secretary: {
    canMarkAttendance: false,
    canViewAllStudents: true,     // state
    canCreateContent: false,
    canViewDistrict: true,
    canViewState: true,
    canApproveScholarship: true,
    canViewTeacherData: true,
  },
  parent: {
    canMarkAttendance: false,
    canViewAllStudents: false,    // own child only
    canCreateContent: false,
    canViewDistrict: false,
    canViewState: false,
    canApproveScholarship: false,
    canViewTeacherData: false,
  },
  crc: {
    canMarkAttendance: false,
    canViewAllStudents: false,    // cluster-scoped only
    canCreateContent: false,
    canViewDistrict: false,
    canViewState: false,
    canApproveScholarship: true,
    canViewTeacherData: false,
  },
  pfms: {
    canMarkAttendance: false,
    canViewAllStudents: false,    // payment records only
    canCreateContent: false,
    canViewDistrict: true,        // payment-perspective drilldown
    canViewState: true,
    canApproveScholarship: false, // PFMS does not approve eligibility
    canViewTeacherData: false,
  },
}
