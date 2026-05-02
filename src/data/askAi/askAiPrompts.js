// Ask AI prompt catalogue.
//
// `layer` is retained on each prompt as a semantic label for the result-card
// category chip (Access / Monitoring / What-if). The Ask AI chat UI no longer
// surfaces layer headings — prompts are revealed progressively as bubble
// chips driven by ROLE_PROMPT_ORDER below.
//
// Each prompt:
//   id           — stable, also keys the response in askAiResponses.js
//   layer        — 1 | 2 | 3 (used only for the card category badge)
//   text         — canonical prompt shown to the user (also the chat trigger)
//   roles        — list of roles allowed to see/run it (filtered at runtime)
//   tokens       — extra keywords used by askAiMatcher (Hinglish/Gujarati,
//                  domain shorthands). Matching is loose — additive only.
//   category     — display chip on the AI card (Access / Monitoring / What-if).

const TEACHER_ROLES = ['teacher', 'principal']

export const ASK_AI_PROMPTS = [
  // ── Layer 1 ───────────────────────────────────────────────────────────────
  {
    id: 'l1.at_risk_in_class',
    layer: 1,
    category: 'Access',
    text: 'Which students are currently at-risk?',
    roles: TEACHER_ROLES,
    tokens: [
      'at risk', 'at-risk', 'mere class ke at risk students', 'high risk students',
      'risk students', 'risk wale students', 'at risk kaun hai', 'at risk khoj',
      'class na at risk students', 'જોખમ', 'जोखिम वाले',
      'which students in my class are currently marked at-risk',
      'which students in my class are at-risk',
    ],
  },
  {
    id: 'l1.last_xamta_avg',
    layer: 1,
    category: 'Access',
    text: 'What is the average score in my class?',
    roles: TEACHER_ROLES,
    tokens: [
      'xamta average', 'class ka average', 'average score xamta', 'class average kya hai',
      'class no average', 'last assessment ka average', 'xamta marks',
      'what is the average score in my class for the last xamta assessment',
      'last xamta average',
    ],
  },
  {
    id: 'l1.scholarship_not_submitted',
    layer: 1,
    category: 'Access',
    text: 'Which scholarship applications need action?',
    roles: ['teacher', 'principal'],
    tokens: [
      'scholarship pending', 'not submitted', 'application submit nahi hua',
      'submitted nahi hai', 'scholarship apply nahi kiya', 'kis student ka apply nahi',
      'pending scholarship', 'submission missing', 'pending application',
      'which students haven\'t had their scholarship application submitted yet',
      'which students haven\'t submitted scholarship applications',
      'which applications need action', 'scholarship apply pending',
    ],
  },
  {
    id: 'l1.attendance_below_75',
    layer: 1,
    category: 'Access',
    text: 'Which students have below 75% attendance?',
    roles: ['teacher', 'principal', 'crc', 'deo'],
    tokens: [
      '75%', '75 percent', 'below attendance', 'kitne students below attendance',
      'below 75', 'attendance kam', 'low attendance students', 'attendance threshold',
      'haajri kam', 'haajri 75', 'अटेंडेंस कम',
      'how many students in my school have below 75% attendance this month',
      'students below 75 attendance',
    ],
  },
  {
    id: 'l1.namo_saraswati_eligible',
    layer: 1,
    category: 'Access',
    text: 'Which students are eligible for Namo Saraswati but haven\'t applied?',
    roles: ['teacher', 'principal'],
    tokens: [
      'namo saraswati eligible', 'science stream eligible', 'haven\'t applied saraswati',
      'science students saraswati', 'eligible namo saraswati', 'class 11 12 science eligible',
    ],
  },
  {
    id: 'l1.missing_documents',
    layer: 1,
    category: 'Access',
    text: 'What documents are most commonly missing in rejected scholarship applications?',
    roles: ['teacher', 'principal', 'crc'],
    tokens: [
      'missing documents', 'document missing', 'rejection documents', 'common missing',
      'kya document missing hai', 'documents required', 'document gaayab', 'rejection wajah',
    ],
  },
  {
    id: 'l1.school_scholarship_summary',
    layer: 1,
    category: 'Access',
    text: 'Show my school scholarship coverage summary',
    roles: ['teacher', 'principal'],
    tokens: [
      'school scholarship coverage', 'coverage summary', 'scholarship summary',
      'school ka scholarship', 'school scholarship status',
    ],
  },
  {
    id: 'l1.parent_alerts_sent',
    layer: 1,
    category: 'Access',
    text: 'How many parent alerts were sent this week?',
    roles: TEACHER_ROLES,
    tokens: [
      'parent alerts sent', 'alerts is week', 'this week alerts', 'parent alert count',
      'parent alert kitne bheje', 'alert sent count',
    ],
  },
  {
    id: 'l1.xamta_pending_data_entry',
    layer: 1,
    category: 'Access',
    text: 'Which XAMTA assessments are pending data entry?',
    roles: TEACHER_ROLES,
    tokens: [
      'xamta data entry pending', 'xamta pending', 'xamta entry baki',
      'xamta sheets pending', 'xamta pending entry',
    ],
  },

  // ── Layer 2 ───────────────────────────────────────────────────────────────
  {
    id: 'l2.absent_3_or_more',
    layer: 2,
    category: 'Monitoring',
    text: 'Who missed school 3 or more times this week?',
    roles: TEACHER_ROLES,
    tokens: [
      '3 absences', 'missed 3', 'absent 3 or more', 'kis student ne 3 baar miss kiya',
      'jada absent', 'frequent absent', '3 din absent', 'three or more absences',
      'which students have missed school 3 or more times this week',
    ],
  },
  {
    id: 'l2.score_drop_10',
    layer: 2,
    category: 'Monitoring',
    text: 'Which students dropped more than 10% in scores?',
    roles: TEACHER_ROLES,
    tokens: [
      'score dropped 10', 'score drop', 'marks gir gaye', 'score gir gaya',
      'score gir gaye', 'score 10 percent kam', 'marks down', 'score decline',
      'who in my class dropped more than 10% in scores between the last two assessments',
    ],
  },
  {
    id: 'l2.borderline_attendance_80',
    layer: 2,
    category: 'Monitoring',
    text: 'Which students are one absence away from below 80%?',
    roles: TEACHER_ROLES,
    tokens: [
      'borderline attendance', 'borderline 80', 'one absence away',
      'attendance threshold 80', 'border line students', '80 ke kareeb',
    ],
  },
  {
    id: 'l2.combined_low_attendance_score',
    layer: 2,
    category: 'Monitoring',
    text: 'Are there students with both low attendance and low scores this month?',
    roles: TEACHER_ROLES,
    tokens: [
      'low attendance and low scores', 'attendance and score both low',
      'dono kam', 'attendance bhi kam score bhi kam',
    ],
  },
  {
    id: 'l2.likely_rejection_drafts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which applications may get rejected if submitted today?',
    roles: ['teacher', 'principal', 'crc'],
    tokens: [
      'likely rejected', 'reject hone wale', 'kis application reject hogi',
      'risky drafts', 'likely rejection', 'scholarship rejection risk',
    ],
  },
  {
    id: 'l2.deadline_risk_drafts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which draft applications may miss the deadline?',
    roles: TEACHER_ROLES,
    tokens: [
      'deadline miss', 'deadline risk', 'deadline ke pehle', 'deadline khatam',
      'is hafte ki deadline', 'samay seema', 'last date pass',
    ],
  },
  {
    id: 'l2.prerequisite_topics',
    layer: 2,
    category: 'Monitoring',
    text: 'Which prerequisite topics are my weakest students still missing before the next chapter?',
    roles: TEACHER_ROLES,
    tokens: [
      'prerequisite topics', 'weak topics', 'prerequisite missing',
      'commando topic', 'topics weak students', 'agle chapter ke pehle',
    ],
  },
  {
    id: 'l2.class_with_most_atrisk',
    layer: 2,
    category: 'Monitoring',
    text: 'Which class has the highest number of at-risk students?',
    roles: ['principal', 'crc', 'deo'],
    tokens: [
      'most at risk class', 'highest at risk', 'kis class me sabse zyada at risk',
      'top class at risk', 'most risky class',
    ],
  },
  {
    id: 'l2.teachers_with_pending_work',
    layer: 2,
    category: 'Monitoring',
    text: 'Which teachers have pending scholarship work?',
    roles: ['principal', 'crc', 'deo'],
    tokens: [
      'teachers pending work', 'teacher pending scholarship', 'teacher pending drafts',
      'kis teacher ka kaam pending',
    ],
  },
  {
    id: 'l2.intervention_improvers',
    layer: 2,
    category: 'Monitoring',
    text: 'Which students improved the most after the last intervention?',
    roles: TEACHER_ROLES,
    tokens: [
      'intervention ke baad sudhaar', 'improved after intervention', 'most improved',
      'intervention impact', 'sudhre students',
    ],
  },

  // ── Layer 3 ───────────────────────────────────────────────────────────────
  {
    id: 'l3.alert_priority_today',
    layer: 3,
    category: 'What-if',
    text: 'Who needs parent follow-up this week?',
    roles: TEACHER_ROLES,
    tokens: [
      'who to alert first', 'priority alerts', 'kal absent hue', 'kis ko pehle alert',
      'parent alert priority', 'alert priority today',
      '3 students missed school yesterday — which parents should i alert first',
      'who needs parent follow up this week', 'parent followup',
    ],
  },
  {
    id: 'l3.parent_alerts_below_75',
    layer: 3,
    category: 'What-if',
    text: 'If I send parent alerts below 75%, who gets notified?',
    roles: TEACHER_ROLES,
    tokens: [
      'parent alert below 75', 'send alert below 75', 'parent ko alert 75',
      'who gets alert below 75', 'aaj parent alert',
    ],
  },
  {
    id: 'l3.recoverable_rejected',
    layer: 3,
    category: 'What-if',
    text: 'Which rejected applications can still be corrected and resubmitted before the deadline?',
    roles: ['teacher', 'principal', 'crc'],
    tokens: [
      'rejected resubmit', 'fix rejected', 'rejected ko correct karna',
      'rejected applications fix', 'resubmit before deadline', 'recover rejected',
    ],
  },
  {
    id: 'l3.after_school_top5',
    layer: 3,
    category: 'What-if',
    text: 'Which 5 students need after-school support?',
    roles: TEACHER_ROLES,
    tokens: [
      'after school session', 'after-school session', 'extra class', 'remedial session',
      'kisko after school dena hai', 'after school session kisko dena hai',
      'top 5 students for support', 'extra class kaun chahiye',
    ],
  },
  {
    id: 'l3.fastest_submission_action',
    layer: 3,
    category: 'What-if',
    text: 'What\'s the fastest action I can take today to improve my scholarship submission rate?',
    roles: TEACHER_ROLES,
    tokens: [
      'fastest submission action', 'submit rate badhao', 'submission rate improve',
      'scholarship submit rate', 'scholarship submit rate badhana hai',
      'submission rate improvement', 'fastest scholarship action',
    ],
  },
  {
    id: 'l3.mother_name_what_if',
    layer: 3,
    category: 'What-if',
    text: 'If I correct mother-name mismatch, how many applications become eligible?',
    roles: ['teacher', 'principal', 'crc'],
    tokens: [
      'mother name mismatch', 'mother name fix', 'mother name correction',
      'mother name mismatch fix karu to kya hoga', 'mother name what if',
      'mother name change', 'mom name mismatch',
      'if i correct the mother\'s name mismatch on these 4 applications',
    ],
  },
  {
    id: 'l3.lesson_plan_intervention',
    layer: 3,
    category: 'What-if',
    text: 'Which students need a lesson plan intervention before the next test?',
    roles: TEACHER_ROLES,
    tokens: [
      'lesson plan intervention', 'fractions test', 'intervention before test',
      'lesson plan kis student ke liye', 'fractions ke liye intervention',
    ],
  },
  {
    id: 'l3.what_first_today',
    layer: 3,
    category: 'What-if',
    text: 'What should I do first today?',
    roles: ['teacher', 'principal', 'crc'],
    tokens: [
      'what should i do first', 'pehle kya karu', 'aaj kya karu pehle',
      'kya karna chahiye sabse pehle', 'priority today',
    ],
  },
  {
    id: 'l3.complete_drafts_rate',
    layer: 3,
    category: 'What-if',
    text: 'If I complete all draft applications today, what will my submission rate become?',
    roles: TEACHER_ROLES,
    tokens: [
      'complete drafts rate', 'submission rate after drafts', 'drafts complete kar di to',
      'drafts complete what if',
    ],
  },
  {
    id: 'l3.top3_risk_actions',
    layer: 3,
    category: 'What-if',
    text: 'Which 3 actions will reduce the most risk this week?',
    roles: ['teacher', 'principal', 'crc', 'deo'],
    tokens: [
      'top 3 actions', '3 actions to reduce risk', 'sabse zyada risk kam',
      'risk reduce actions', 'top three actions',
    ],
  },

  // ── Teacher extra ─────────────────────────────────────────────────────────
  {
    id: 'l3.weakest_topics_next',
    layer: 3,
    category: 'What-if',
    text: 'What should I teach my weakest students next?',
    roles: TEACHER_ROLES,
    tokens: [
      'what to teach next', 'weak topics next', 'weakest students next', 'next chapter',
      'agle chapter ke pehle', 'kya padhao', 'lesson plan next',
    ],
  },

  // ── Principal extras ──────────────────────────────────────────────────────
  {
    id: 'pr.lowest_avg_class',
    layer: 2,
    category: 'Monitoring',
    text: 'Which class has the lowest average score?',
    roles: ['principal'],
    tokens: ['lowest average class', 'class with lowest score', 'kis class ka average kam'],
  },
  {
    id: 'pr.parent_followup_week',
    layer: 3,
    category: 'What-if',
    text: 'Which students need parent follow-up this week?',
    roles: ['principal'],
    tokens: ['parent follow up week', 'parent followup', 'is hafte parent follow'],
  },
  {
    id: 'pr.school_priority_today',
    layer: 3,
    category: 'What-if',
    text: 'What should the school prioritize today?',
    roles: ['principal'],
    tokens: ['school priority today', 'aaj school priority', 'today school action'],
  },

  // ── CRC prompts ───────────────────────────────────────────────────────────
  {
    id: 'crc.cluster_pending_review',
    layer: 1,
    category: 'Access',
    text: 'Which applications are pending review in my cluster?',
    roles: ['crc'],
    tokens: ['cluster pending review', 'pending in cluster', 'mere cluster ke pending'],
  },
  {
    id: 'crc.resubmitted_apps',
    layer: 1,
    category: 'Access',
    text: 'Which resubmitted applications need re-review?',
    roles: ['crc'],
    tokens: ['resubmitted applications', 're-review queue', 'resub queue'],
  },
  {
    id: 'crc.schools_delaying',
    layer: 2,
    category: 'Monitoring',
    text: 'Which schools are delaying scholarship submissions?',
    roles: ['crc'],
    tokens: ['schools delaying', 'school delay submission', 'cluster school late'],
  },
  {
    id: 'crc.common_rejection_reasons',
    layer: 2,
    category: 'Monitoring',
    text: 'Which rejection reasons are most common?',
    roles: ['crc'],
    tokens: ['common rejection reasons', 'rejection reasons', 'kis wajah se reject'],
  },
  {
    id: 'crc.likely_rejected_cluster',
    layer: 2,
    category: 'Monitoring',
    text: 'Which applications are likely to be rejected?',
    roles: ['crc'],
    tokens: ['likely rejected cluster', 'cluster reject hone wale', 'pending will reject'],
  },
  {
    id: 'crc.review_first_today',
    layer: 3,
    category: 'What-if',
    text: 'What should I review first today?',
    roles: ['crc'],
    tokens: ['review first today', 'pehle kya review karu'],
  },

  // ── DEO / BRC prompts ─────────────────────────────────────────────────────
  {
    id: 'deo.cluster_pending_approvals',
    layer: 1,
    category: 'Access',
    text: 'Which clusters have the highest pending approvals?',
    roles: ['deo', 'brc'],
    tokens: ['highest pending approvals', 'cluster backlog approvals', 'cluster pending'],
  },
  {
    id: 'deo.schools_low_coverage',
    layer: 1,
    category: 'Access',
    text: 'Which schools have low scholarship coverage?',
    roles: ['deo', 'brc'],
    tokens: ['low scholarship coverage', 'schools low coverage', 'kis school ka coverage kam'],
  },
  {
    id: 'deo.blocks_attendance_risk',
    layer: 2,
    category: 'Monitoring',
    text: 'Which blocks have attendance risk?',
    roles: ['deo', 'brc'],
    tokens: ['blocks attendance risk', 'block level attendance', 'attendance block risk'],
  },
  {
    id: 'deo.xamta_pending',
    layer: 2,
    category: 'Monitoring',
    text: 'Which XAMTA data entry is pending?',
    roles: ['deo', 'brc'],
    tokens: ['xamta data entry pending district', 'district xamta pending'],
  },
  {
    id: 'deo.crc_backlog',
    layer: 2,
    category: 'Monitoring',
    text: 'Which CRC has the highest backlog?',
    roles: ['deo', 'brc'],
    tokens: ['crc highest backlog', 'crc backlog', 'kis crc ka backlog'],
  },
  {
    id: 'deo.district_action_today',
    layer: 3,
    category: 'What-if',
    text: 'What district action should be taken today?',
    roles: ['deo', 'brc'],
    tokens: ['district action today', 'aaj district kya kare', 'today district action'],
  },

  // ── PFMS prompts ──────────────────────────────────────────────────────────
  {
    id: 'pfms.failed_payments_week',
    layer: 1,
    category: 'Access',
    text: 'Which payments failed this week?',
    roles: ['pfms'],
    tokens: ['failed payments week', 'payments failed this week', 'is hafte failed'],
  },
  {
    id: 'pfms.retry_eligible',
    layer: 1,
    category: 'Access',
    text: 'Which payment failures are retry eligible?',
    roles: ['pfms'],
    tokens: ['retry eligible', 'retry payments', 'kaun retry ho sakta'],
  },
  {
    id: 'pfms.lowest_success_districts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which districts have the lowest payment success rate?',
    roles: ['pfms', 'state_secretary'],
    tokens: ['lowest payment success', 'low payment success districts', 'payment success rate'],
  },
  {
    id: 'pfms.batches_attention',
    layer: 2,
    category: 'Monitoring',
    text: 'Which payment batches need attention?',
    roles: ['pfms'],
    tokens: ['payment batches attention', 'batch attention', 'batch problem'],
  },
  {
    id: 'pfms.pending_disbursement',
    layer: 1,
    category: 'Access',
    text: 'What is the pending disbursement amount?',
    roles: ['pfms', 'state_secretary'],
    tokens: ['pending disbursement amount', 'pending disbursement', 'how much pending'],
  },
  {
    id: 'pfms.payment_action_today',
    layer: 3,
    category: 'What-if',
    text: 'What payment action should I take first today?',
    roles: ['pfms'],
    tokens: ['payment action today', 'aaj payment kya kare', 'first payment action'],
  },

  // ── State prompts ─────────────────────────────────────────────────────────
  {
    id: 'state.scholarship_funnel',
    layer: 1,
    category: 'Access',
    text: 'Show state-level scholarship funnel',
    roles: ['state_secretary'],
    tokens: ['state scholarship funnel', 'state funnel', 'scholarship funnel state'],
  },
  {
    id: 'state.highest_risk_districts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which districts have the highest risk?',
    roles: ['state_secretary'],
    tokens: ['highest risk districts', 'risky districts state', 'state district risk'],
  },
  {
    id: 'state.deadline_reminders',
    layer: 3,
    category: 'What-if',
    text: 'Which districts should receive deadline reminders?',
    roles: ['state_secretary'],
    tokens: ['districts deadline reminders', 'deadline reminders state', 'district reminder'],
  },
  {
    id: 'state.lowest_payment_success',
    layer: 2,
    category: 'Monitoring',
    text: 'Which districts have lowest payment success rate?',
    roles: ['state_secretary'],
    tokens: ['state lowest payment success', 'state payment success', 'state district payment'],
  },
  {
    id: 'state.xamta_data_entry_districts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which districts need XAMTA data-entry follow-up?',
    roles: ['state_secretary'],
    tokens: ['xamta data entry follow up', 'state xamta', 'xamta district follow'],
  },
  {
    id: 'state.approval_backlog_districts',
    layer: 2,
    category: 'Monitoring',
    text: 'Which districts have high approval backlog?',
    roles: ['state_secretary'],
    tokens: ['state approval backlog', 'district approval backlog', 'approval backlog state'],
  },
  {
    id: 'state.nl_vs_ns_performance',
    layer: 1,
    category: 'Access',
    text: 'Show Namo Lakshmi vs Namo Saraswati performance',
    roles: ['state_secretary'],
    tokens: ['namo lakshmi vs namo saraswati', 'nl vs ns', 'scheme comparison'],
  },
  {
    id: 'state.monsoon_impact',
    layer: 2,
    category: 'Monitoring',
    text: 'Show monsoon impact on attendance/payment eligibility',
    roles: ['state_secretary'],
    tokens: ['monsoon impact', 'monsoon attendance', 'monsoon payment'],
  },
  {
    id: 'state.top3_state_actions',
    layer: 3,
    category: 'What-if',
    text: 'What are the top 3 state actions this week?',
    roles: ['state_secretary'],
    tokens: ['top 3 state actions', 'state action week', 'top state actions'],
  },
  {
    id: 'state.broadcast_recipients',
    layer: 3,
    category: 'What-if',
    text: 'Which users should get a state broadcast notification?',
    roles: ['state_secretary'],
    tokens: ['state broadcast recipients', 'who to broadcast', 'kis ko broadcast'],
  },
]

export function getPromptById(id) {
  return ASK_AI_PROMPTS.find(p => p.id === id) || null
}

export function getPromptsForRole(role) {
  return ASK_AI_PROMPTS.filter(p => !p.roles || p.roles.includes(role))
}

// Role-specific ordering for the bubble-chip reveal. The first slice is the
// initial visible set; subsequent slices are revealed when the user taps
// "More Prompts". Layer headings are NEVER shown — these orderings
// deliberately mix Access / Monitoring / What-if prompts so each batch feels
// useful on its own.
export const ROLE_PROMPT_ORDER = {
  teacher: [
    // Initial set — broad classroom + scholarship + day plan.
    'l1.at_risk_in_class',
    'l1.last_xamta_avg',
    'l1.scholarship_not_submitted',
    'l3.alert_priority_today',
    'l3.what_first_today',
    'l3.after_school_top5',
    // Reveal #1
    'l1.attendance_below_75',
    'l1.namo_saraswati_eligible',
    'l1.missing_documents',
    'l2.absent_3_or_more',
    'l2.score_drop_10',
    'l2.borderline_attendance_80',
    // Reveal #2
    'l2.combined_low_attendance_score',
    'l2.likely_rejection_drafts',
    'l2.deadline_risk_drafts',
    'l3.weakest_topics_next',
    'l3.parent_alerts_below_75',
    'l3.mother_name_what_if',
    // Reveal #3
    'l3.recoverable_rejected',
    'l3.fastest_submission_action',
    'l3.lesson_plan_intervention',
    'l3.complete_drafts_rate',
    'l3.top3_risk_actions',
    'l2.prerequisite_topics',
  ],
  principal: [
    // Initial set
    'l1.school_scholarship_summary',
    'l2.class_with_most_atrisk',
    'l2.teachers_with_pending_work',
    'l1.parent_alerts_sent',
    'pr.school_priority_today',
    'pr.lowest_avg_class',
    // Reveal #1
    'l1.xamta_pending_data_entry',
    'pr.parent_followup_week',
    'l3.recoverable_rejected',
    'l2.likely_rejection_drafts',
    'l3.top3_risk_actions',
    'l2.intervention_improvers',
  ],
  crc: [
    'crc.cluster_pending_review',
    'crc.resubmitted_apps',
    'crc.common_rejection_reasons',
    'crc.likely_rejected_cluster',
    'crc.schools_delaying',
    'crc.review_first_today',
    // Reveal #1
    'l3.recoverable_rejected',
    'l3.mother_name_what_if',
    'l1.missing_documents',
    'l2.likely_rejection_drafts',
    'l3.top3_risk_actions',
  ],
  deo: [
    'deo.cluster_pending_approvals',
    'deo.schools_low_coverage',
    'deo.blocks_attendance_risk',
    'deo.xamta_pending',
    'deo.crc_backlog',
    'deo.district_action_today',
    // Reveal #1
    'l3.top3_risk_actions',
    'pfms.lowest_success_districts',
    'pfms.pending_disbursement',
  ],
  brc: [
    'deo.cluster_pending_approvals',
    'deo.schools_low_coverage',
    'deo.blocks_attendance_risk',
    'deo.xamta_pending',
    'deo.crc_backlog',
    'deo.district_action_today',
  ],
  pfms: [
    'pfms.failed_payments_week',
    'pfms.retry_eligible',
    'pfms.lowest_success_districts',
    'pfms.batches_attention',
    'pfms.pending_disbursement',
    'pfms.payment_action_today',
  ],
  state_secretary: [
    'state.scholarship_funnel',
    'state.highest_risk_districts',
    'state.lowest_payment_success',
    'state.xamta_data_entry_districts',
    'state.nl_vs_ns_performance',
    'state.top3_state_actions',
    // Reveal #1
    'state.deadline_reminders',
    'state.approval_backlog_districts',
    'state.monsoon_impact',
    'state.broadcast_recipients',
    'pfms.pending_disbursement',
  ],
}

export function getOrderedPromptsForRole(role) {
  const ids = ROLE_PROMPT_ORDER[role]
  if (ids && ids.length) {
    const out = []
    for (const id of ids) {
      const p = getPromptById(id)
      if (p && (!p.roles || p.roles.includes(role))) out.push(p)
    }
    if (out.length) return out
  }
  // Fallback: anything available to this role, in catalogue order.
  return getPromptsForRole(role)
}

// Returns the first `count` prompts for the role's chip pool.
export function getInitialChipsForRole(role, count = 6) {
  return getOrderedPromptsForRole(role).slice(0, count)
}

// Returns the next `count` prompts after `alreadyShownIds` (a Set or Array).
// When the role pool is exhausted, returns an empty array — the caller should
// hide / replace the "More Prompts" chip.
export function getNextChipsForRole(role, alreadyShownIds, count = 6) {
  const seen = alreadyShownIds instanceof Set ? alreadyShownIds : new Set(alreadyShownIds || [])
  const ordered = getOrderedPromptsForRole(role)
  const remaining = ordered.filter(p => !seen.has(p.id))
  return remaining.slice(0, count)
}

export function getRolePromptCount(role) {
  return getOrderedPromptsForRole(role).length
}
