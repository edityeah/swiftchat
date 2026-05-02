// Global action registry.
//
// Each action describes:
//  - id                    : stable identifier
//  - module                : owning module id
//  - label                 : user-facing label
//  - allowedRoles          : roles that may invoke it
//  - requiredEntities      : extracted slots needed before execution
//  - fallbackClarification : prompt + chips when entity is missing
//  - requiresConfirmation  : if true, router emits a confirm step first
//  - run(ctx)              : returns a directive consumed by handleSend
//
// `run()` returns one of:
//   { trigger: '<existing trigger string>' }
//                           — re-enters handleSend with an existing trigger.
//   { canvas: { type, view, ... } }
//                           — opens a canvas directly via openCanvas().
//   { reply: { text, html?, actions? } }
//                           — adds a bot bubble inline (for inline-only actions).
//
// We deliberately re-use existing triggers (`Task: <flow>`, `dv:*`) so
// existing canvas + chat flows stay the source of truth. NLP only translates.

const CLASS_CHIPS = ['Class 6', 'Class 7', 'Class 8', 'Class 9']

// ─── Shared helpers ──────────────────────────────────────────────────────────
const askClass = {
  prompt: 'Which class would you like to use?',
  chips: CLASS_CHIPS,
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export const ACTIONS = {
  // Attendance ────────────────────────────────────────────────────────────
  OPEN_MARK_ATTENDANCE: {
    id: 'OPEN_MARK_ATTENDANCE',
    module: 'attendance',
    label: 'Open Mark Attendance',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: ['class'],
    fallbackClarification: askClass,
    requiresConfirmation: false,
    run: ({ entities }) => ({
      trigger: 'Task: attendance',
      preset: { grade: entities.class },
    }),
  },
  OPEN_ATTENDANCE_HISTORY: {
    id: 'OPEN_ATTENDANCE_HISTORY',
    module: 'attendance',
    label: 'View Attendance History',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: attendance' }),
  },
  SHOW_ABSENT_STUDENTS: {
    id: 'SHOW_ABSENT_STUDENTS',
    module: 'attendance',
    label: 'Show Absent Students',
    allowedRoles: ['teacher', 'principal', 'crc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: attendance' }),
  },

  // XAMTA ─────────────────────────────────────────────────────────────────
  OPEN_XAMTA_SCAN: {
    id: 'OPEN_XAMTA_SCAN',
    module: 'xamta',
    label: 'Open XAMTA Scanner',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: [],
    requiresConfirmation: false,
    // The existing chat handler keys off the substring "xamta".
    run: () => ({ trigger: 'XAMTA scan' }),
  },
  OPEN_XAMTA_RESULTS: {
    id: 'OPEN_XAMTA_RESULTS',
    module: 'xamta',
    label: 'View XAMTA Results',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: learning_outcomes' }),
  },

  // Class / school / district / state dashboards ──────────────────────────
  OPEN_CLASS_DASHBOARD: {
    id: 'OPEN_CLASS_DASHBOARD',
    module: 'class_dashboard',
    label: 'Open Class Dashboard',
    allowedRoles: ['teacher', 'principal', 'crc'],
    requiredEntities: ['class'],
    fallbackClarification: askClass,
    requiresConfirmation: false,
    run: ({ entities }) => ({
      trigger: 'Task: class_performance',
      preset: { grade: entities.class },
    }),
  },
  OPEN_SCHOOL_DASHBOARD: {
    id: 'OPEN_SCHOOL_DASHBOARD',
    module: 'class_dashboard',
    label: 'Open School Dashboard',
    allowedRoles: ['teacher', 'principal', 'crc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: dashboard' }),
  },
  OPEN_DISTRICT_DASHBOARD: {
    id: 'OPEN_DISTRICT_DASHBOARD',
    module: 'class_dashboard',
    label: 'Open District Dashboard',
    allowedRoles: ['deo', 'state_secretary'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: district_dashboard' }),
  },
  OPEN_STATE_DASHBOARD: {
    id: 'OPEN_STATE_DASHBOARD',
    module: 'class_dashboard',
    label: 'Open State Dashboard',
    allowedRoles: ['state_secretary'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: state_dashboard' }),
  },

  // DigiVritti ────────────────────────────────────────────────────────────
  OPEN_DIGIVRITTI_HOME: {
    id: 'OPEN_DIGIVRITTI_HOME',
    module: 'digivritti',
    label: 'Open DigiVritti',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:start' }),
  },
  OPEN_NAMO_LAKSHMI: {
    id: 'OPEN_NAMO_LAKSHMI',
    module: 'digivritti',
    label: 'Open Namo Lakshmi',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:nl:home' }),
  },
  OPEN_NAMO_SARASWATI: {
    id: 'OPEN_NAMO_SARASWATI',
    module: 'digivritti',
    label: 'Open Namo Saraswati',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:ns:home' }),
  },
  OPEN_APPLICATION_LIST: {
    id: 'OPEN_APPLICATION_LIST',
    module: 'digivritti',
    label: 'Open Application List',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: ({ entities }) => {
      const f = entities.scheme === 'ns' ? 'ns' : entities.scheme === 'nl' ? 'nl' : null
      return { trigger: f ? `dv:canvas:list:${f}` : 'dv:canvas:list' }
    },
  },
  OPEN_REJECTED_APPLICATIONS: {
    id: 'OPEN_REJECTED_APPLICATIONS',
    module: 'digivritti',
    label: 'Show Rejected Applications',
    allowedRoles: ['teacher', 'principal', 'crc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:canvas:list:rejected' }),
  },
  OPEN_PAYMENT_QUEUE: {
    id: 'OPEN_PAYMENT_QUEUE',
    module: 'digivritti',
    label: 'Open Payment Queue',
    allowedRoles: ['pfms', 'state_secretary'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: ({ entities }) => {
      const filter = entities.paymentFilter || 'pending'
      return { trigger: `dv:canvas:payment-queue:${filter}` }
    },
  },
  OPEN_DIGIVRITTI_AI: {
    id: 'OPEN_DIGIVRITTI_AI',
    module: 'digivritti',
    label: 'Ask DigiVritti AI',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:ai:menu' }),
  },
  RUN_DIGIVRITTI_QUERY: {
    id: 'RUN_DIGIVRITTI_QUERY',
    module: 'digivritti',
    label: 'Run DigiVritti Query',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: ['question'],
    requiresConfirmation: false,
    run: ({ entities }) => ({
      trigger: `dv:ai:ask:${entities.question}`,
    }),
  },

  // Reports & analytics ───────────────────────────────────────────────────
  OPEN_STUDENT_REPORT: {
    id: 'OPEN_STUDENT_REPORT',
    module: 'reports',
    label: 'Open Student Report',
    allowedRoles: ['teacher', 'principal', 'crc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: class_performance' }),
  },
  OPEN_REPORT_CARD: {
    id: 'OPEN_REPORT_CARD',
    module: 'reports',
    label: 'Generate Report Card',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: report_card' }),
  },
  RUN_GLOBAL_ANALYTICS_QUERY: {
    id: 'RUN_GLOBAL_ANALYTICS_QUERY',
    module: 'reports',
    label: 'Run Analytics Query',
    allowedRoles: ['principal', 'crc', 'deo', 'state_secretary'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'dv:ai:menu' }),
  },

  // Ask AI ────────────────────────────────────────────────────────────────
  OPEN_ASK_AI: {
    id: 'OPEN_ASK_AI',
    module: 'ask_ai',
    label: 'Open Ask AI',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'Task: ask_ai' }),
  },
  ASK_AI_MORE_PROMPTS: {
    id: 'ASK_AI_MORE_PROMPTS',
    module: 'ask_ai',
    label: 'Show all Ask AI prompts',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ trigger: 'ask_ai:more' }),
  },
  ASK_AI_RUN_PROMPT: {
    id: 'ASK_AI_RUN_PROMPT',
    module: 'ask_ai',
    label: 'Run Ask AI prompt',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    // Defers to handleSend's free-form Ask AI matcher by re-emitting the
    // user's literal question. The matcher resolves it deterministically.
    run: ({ entities }) => ({ trigger: entities.askAiPrompt || entities.question || 'Task: ask_ai' }),
  },
  ASK_AI_OPEN_RECOMMENDED_ACTION: {
    id: 'ASK_AI_OPEN_RECOMMENDED_ACTION',
    module: 'ask_ai',
    label: 'Open Ask AI recommended action',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: ({ entities }) => ({ trigger: entities.askAiActionTrigger || 'Task: ask_ai' }),
  },

  // Notifications & reminders ─────────────────────────────────────────────
  OPEN_NOTIFICATIONS: {
    id: 'OPEN_NOTIFICATIONS',
    module: 'notifications',
    label: 'Open Notifications',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms', 'parent', 'brc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ notification: { view: 'list' } }),
  },
  CREATE_REMINDER: {
    id: 'CREATE_REMINDER',
    module: 'notifications',
    label: 'Add Reminder',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms', 'parent', 'brc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: ({ entities }) => ({
      notification: {
        view: 'reminder',
        prefill: {
          title: entities.reminderTitle || '',
          scheduledAtHint: entities.reminderWhen || null,
        },
      },
    }),
  },
  CREATE_BROADCAST_NOTIFICATION: {
    id: 'CREATE_BROADCAST_NOTIFICATION',
    module: 'notifications',
    label: 'Create Broadcast',
    allowedRoles: ['state_secretary', 'state'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: ({ entities }) => ({
      notification: {
        view: 'broadcast',
        prefill: {
          title: entities.broadcastTitle || '',
          category: entities.broadcastCategory || 'announcement',
          targetRoles: entities.broadcastTargets || [],
          module: entities.broadcastModule || 'general',
        },
      },
    }),
  },
  MARK_ALL_NOTIFICATIONS_READ: {
    id: 'MARK_ALL_NOTIFICATIONS_READ',
    module: 'notifications',
    label: 'Mark all notifications read',
    allowedRoles: ['teacher', 'principal', 'crc', 'deo', 'state_secretary', 'pfms', 'parent', 'brc'],
    requiredEntities: [],
    requiresConfirmation: false,
    run: () => ({ notification: { markAllRead: true } }),
  },

  // Parent alerts (state-changing → confirm) ──────────────────────────────
  SEND_PARENT_ALERT: {
    id: 'SEND_PARENT_ALERT',
    module: 'parent_alerts',
    label: 'Send Parent Alert',
    allowedRoles: ['teacher', 'principal'],
    requiredEntities: [],
    requiresConfirmation: true,
    run: () => ({ trigger: 'parent alert' }),
  },
}

export function getAction(id) {
  return ACTIONS[id] || null
}

export function getActionsForModule(moduleId) {
  return Object.values(ACTIONS).filter(a => a.module === moduleId)
}
