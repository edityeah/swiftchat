// Hardcoded Ask AI response payloads, keyed by promptId.
//
// Each entry has:
//   answer    — the headline sentence
//   table     — array of row objects (column order = key insertion order)
//   insight   — single-paragraph AI Insight string
//   actions   — array of action descriptors. Each descriptor is one of:
//     { id, label, type: 'TRIGGER',   trigger, variant? }      // raw chat trigger
//     { id, label, type: 'CANVAS',    canvas: { ... }, variant? } // openCanvas ctx
//     { id, label, type: 'ASK_AI',    promptId, variant? }     // re-enter Ask AI
//
// Resolved at render time by askAiEngine + askAiActions, so prompts stay data-
// only. NEVER calls Groq / RAG — these are deterministic demo answers.

import { ASK_AI_APP_IDS } from './askAiMockData.js'

const RESPONSES = {

  // ─── Layer 1 — Access to Information ───────────────────────────────────────
  'l1.at_risk_in_class': {
    answer: '3 students in your assigned class are currently marked at-risk.',
    table: [
      { Student: 'Aarav Desai',    Class: 'Class 6', 'Risk Reason': 'Low score + irregular attendance', Attendance: '72%', 'Last XAMTA Score': '41%', 'Recommended Action': 'Parent alert' },
      { Student: 'Nisha Parma',    Class: 'Class 6', 'Risk Reason': 'Low XAMTA score',                    Attendance: '88%', 'Last XAMTA Score': '38%', 'Recommended Action': 'Remedial practice' },
      { Student: 'Harsh Vaghela',  Class: 'Class 6', 'Risk Reason': 'Attendance below threshold',         Attendance: '68%', 'Last XAMTA Score': '55%', 'Recommended Action': 'Attendance follow-up' },
    ],
    insight: 'Aarav needs the highest priority because he has both low attendance and low XAMTA performance.',
    actions: [
      { id: 'parent_alert_aarav',  label: '📨 Send parent alert to Aarav', type: 'TRIGGER', trigger: 'parent alert', variant: 'err',     payload: { student: 'Aarav Desai' } },
      { id: 'open_at_risk',        label: '🚨 Open at-risk students',       type: 'TRIGGER', trigger: 'Task: at_risk', variant: 'primary' },
      { id: 'open_class_dashboard',label: '📊 Open class dashboard',         type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  'l1.last_xamta_avg': {
    answer: 'Your Class 6 average score in the last XAMTA assessment is 59%.',
    table: [
      { Assessment: 'Fractions Readiness', Class: 'Class 6', 'Students Attempted': 30, 'Average Score': '59%', Highest: '88%', Lowest: '32%' },
    ],
    insight: 'Class performance is moderate. Fractions and word problems need reinforcement before the next chapter.',
    actions: [
      { id: 'open_xamta_results',  label: '📊 Open XAMTA results',          type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'open_class_dashboard',label: '📈 Open class dashboard',         type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
      { id: 'create_intervention', label: '🎯 Create lesson intervention',   type: 'CANVAS',  canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Fractions Readiness',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'ok' },
    ],
  },

  'l1.scholarship_not_submitted': {
    answer: '6 eligible students still do not have submitted scholarship applications.',
    table: [
      { Student: 'Vaghela Jaydeviba', Scheme: 'Namo Lakshmi',   Class: 'Class 9',           Status: 'Draft',       'Missing Item': 'Mother bank passbook', Action: 'Continue form' },
      { Student: 'Prajapati Princy',  Scheme: 'Namo Saraswati', Class: 'Class 11 Science',  Status: 'Draft',       'Missing Item': 'Class 10 marksheet',   Action: 'Continue form' },
      { Student: 'Dev Modi',          Scheme: 'Namo Saraswati', Class: 'Class 12 Science',  Status: 'Not started', 'Missing Item': 'Academic details',     Action: 'Start form' },
      { Student: 'Om Desai',          Scheme: 'Namo Saraswati', Class: 'Class 11 Science',  Status: 'Draft',       'Missing Item': 'Seat verification',    Action: 'Continue form' },
      { Student: 'Diya Shah',         Scheme: 'Namo Lakshmi',   Class: 'Class 10',          Status: 'Not started', 'Missing Item': 'Guardian details',     Action: 'Start form' },
      { Student: 'Riya Praja',        Scheme: 'Namo Lakshmi',   Class: 'Class 9',           Status: 'Draft',       'Missing Item': 'Income certificate',   Action: 'Continue form' },
    ],
    insight: 'Start with draft applications first. They can be completed faster than not-started applications.',
    actions: [
      { id: 'open_drafts',     label: '📝 Open draft applications', type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'start_nl',        label: '➕ Start Namo Lakshmi',       type: 'TRIGGER', trigger: 'dv:canvas:apply:nl',   variant: 'primary' },
      { id: 'start_ns',        label: '➕ Start Namo Saraswati',     type: 'TRIGGER', trigger: 'dv:canvas:apply:ns',   variant: 'primary' },
    ],
  },

  'l1.attendance_below_75': {
    answer: '8 students in your school are below 75% attendance this month.',
    table: [
      { Class: 'Class 6', 'Students Below 75%': 3, 'Lowest Attendance': '68%', Priority: 'High' },
      { Class: 'Class 7', 'Students Below 75%': 2, 'Lowest Attendance': '71%', Priority: 'Medium' },
      { Class: 'Class 8', 'Students Below 75%': 3, 'Lowest Attendance': '64%', Priority: 'High' },
    ],
    insight: 'Class 8 has the lowest attendance case. Parent follow-up should start there.',
    actions: [
      { id: 'open_below_attendance', label: '📅 View below attendance students', type: 'TRIGGER', trigger: 'Task: attendance', variant: 'primary' },
      { id: 'send_parent_alerts',    label: '📨 Send parent alerts',              type: 'TRIGGER', trigger: 'parent alert',    variant: 'err' },
      { id: 'open_attendance_dash',  label: '📊 Open attendance dashboard',        type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  'l1.namo_saraswati_eligible': {
    answer: '3 Science-stream students are eligible for Namo Saraswati but have not yet submitted applications.',
    table: [
      { Student: 'Dev Modi',       Class: 'Class 12', Stream: 'Science', 'Class 10 %': '76.4%', 'Application Status': 'Not started', Action: 'Start application' },
      { Student: 'Om Desai',       Class: 'Class 11', Stream: 'Science', 'Class 10 %': '68.2%', 'Application Status': 'Draft',       Action: 'Continue draft' },
      { Student: 'Harsh Vaghela',  Class: 'Class 11', Stream: 'Science', 'Class 10 %': '72.8%', 'Application Status': 'Not started', Action: 'Start application' },
    ],
    insight: 'Om Desai can be completed fastest because a draft already exists.',
    actions: [
      { id: 'start_dev',           label: '➕ Start Dev Modi application',      type: 'CANVAS', canvas: { type: 'digivritti', view: 'apply', scheme: 'namo_saraswati', studentName: 'Dev Modi' }, variant: 'primary' },
      { id: 'continue_om',         label: '✏️ Continue Om Desai draft',         type: 'CANVAS', canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.om_desai }, variant: 'ok' },
      { id: 'start_harsh',         label: '➕ Start Harsh Vaghela application',  type: 'CANVAS', canvas: { type: 'digivritti', view: 'apply', scheme: 'namo_saraswati', studentName: 'Harsh Vaghela' }, variant: 'primary' },
      { id: 'open_namo_saraswati', label: '🎓 Open Namo Saraswati',              type: 'TRIGGER', trigger: 'dv:ns:home', variant: 'primary' },
    ],
  },

  'l1.missing_documents': {
    answer: 'Mother bank passbook and mother Aadhaar are the most common missing or mismatched documents.',
    table: [
      { Document: 'Mother bank passbook', 'Missing/Mismatch Count': 8, Impact: 'Blocks DBT verification' },
      { Document: 'Mother Aadhaar',       'Missing/Mismatch Count': 6, Impact: 'Blocks guardian verification' },
      { Document: 'Income certificate',   'Missing/Mismatch Count': 5, Impact: 'Causes eligibility rejection' },
      { Document: 'Class 10 marksheet',   'Missing/Mismatch Count': 4, Impact: 'Blocks Namo Saraswati verification' },
      { Document: 'Seat verification',    'Missing/Mismatch Count': 3, Impact: 'Blocks board validation' },
    ],
    insight: 'Collecting mother bank passbooks and Aadhaar documents first will reduce the largest rejection category.',
    actions: [
      { id: 'open_rejected', label: '🚫 Open rejected applications', type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
      { id: 'send_doc_reminder', label: '📨 Send document reminder', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_digivritti', label: '🎓 Open DigiVritti', type: 'TRIGGER', trigger: 'dv:start', variant: 'primary' },
    ],
  },

  'l1.school_scholarship_summary': {
    answer: 'Your school has 87.5% scholarship coverage. 24 of 28 eligible students have submitted applications.',
    table: [
      { Scheme: 'Namo Lakshmi',   Eligible: 18, Submitted: 16, 'In Draft': 2, Approved: 13, Rejected: 1, Coverage: '88.9%' },
      { Scheme: 'Namo Saraswati', Eligible: 10, Submitted: 8,  'In Draft': 2, Approved: 6,  Rejected: 1, Coverage: '80.0%' },
    ],
    insight: 'Only 4 students remain — 2 drafts can be completed quickly to push coverage above 92%.',
    actions: [
      { id: 'open_drafts',  label: '📝 Open draft applications',  type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'open_digivritti', label: '🎓 Open DigiVritti',       type: 'TRIGGER', trigger: 'dv:start', variant: 'primary' },
    ],
  },

  'l1.parent_alerts_sent': {
    answer: '12 parent alerts were sent this week — 8 for attendance and 4 for low XAMTA scores.',
    table: [
      { Day: 'Mon 24 Apr', 'Alerts Sent': 3, Reason: 'Attendance' },
      { Day: 'Tue 25 Apr', 'Alerts Sent': 2, Reason: 'Attendance' },
      { Day: 'Wed 26 Apr', 'Alerts Sent': 4, Reason: 'XAMTA score' },
      { Day: 'Thu 27 Apr', 'Alerts Sent': 1, Reason: 'Attendance' },
      { Day: 'Fri 28 Apr', 'Alerts Sent': 2, Reason: 'Attendance' },
    ],
    insight: 'Wednesday saw the spike in XAMTA-driven alerts after the Fractions Readiness scan was reviewed.',
    actions: [
      { id: 'open_parent_alert', label: '📨 Open parent alert draft', type: 'TRIGGER', trigger: 'parent alert', variant: 'primary' },
      { id: 'open_attendance', label: '📅 Open attendance dashboard', type: 'TRIGGER', trigger: 'Task: attendance', variant: 'primary' },
    ],
  },

  'l1.xamta_pending_data_entry': {
    answer: '2 XAMTA assessments still need data entry for the current cycle.',
    table: [
      { Assessment: 'Fractions Readiness', Class: 'Class 6', 'Sheets Pending': 8,  Deadline: '02 May 2026' },
      { Assessment: 'Word Problems Quiz',  Class: 'Class 7', 'Sheets Pending': 12, Deadline: '04 May 2026' },
    ],
    insight: 'Class 7 has the larger backlog — start there to avoid missing the Class 7 deadline.',
    actions: [
      { id: 'open_xamta_scan', label: '📷 Open XAMTA Scanner', type: 'TRIGGER', trigger: 'XAMTA scan', variant: 'primary' },
      { id: 'open_xamta_results', label: '📊 Open XAMTA results', type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
    ],
  },

  // ─── Layer 2 — Monitoring & Pattern Detection ─────────────────────────────
  'l2.absent_3_or_more': {
    answer: '4 students have missed school 3 or more times this week.',
    table: [
      { Student: 'Aarav Desai',     Class: 'Class 6', 'Absences This Week': 3, 'Attendance This Month': '72%', Risk: 'High' },
      { Student: 'Harsh Vaghela',   Class: 'Class 6', 'Absences This Week': 4, 'Attendance This Month': '68%', Risk: 'High' },
      { Student: 'Tanvi Panchal',   Class: 'Class 7', 'Absences This Week': 3, 'Attendance This Month': '74%', Risk: 'Medium' },
      { Student: 'Jay Mehta',       Class: 'Class 8', 'Absences This Week': 3, 'Attendance This Month': '73%', Risk: 'Medium' },
    ],
    insight: 'Harsh needs immediate follow-up. One more absence will push him further below the attendance threshold.',
    actions: [
      { id: 'send_parent_alert', label: '📨 Send parent alert',          type: 'TRIGGER', trigger: 'parent alert', variant: 'err' },
      { id: 'open_attendance',   label: '📅 Open attendance details',     type: 'TRIGGER', trigger: 'Task: attendance', variant: 'primary' },
      { id: 'mark_followup',     label: '✅ Mark follow-up required',      type: 'REMINDER', reminder: { title: 'Follow up on chronic absences', message: 'Aarav, Harsh, Tanvi, Jay — review attendance follow-up plan.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'l2.score_drop_10': {
    answer: '3 students dropped more than 10 percentage points between the last two XAMTA assessments.',
    table: [
      { Student: 'Nisha Parma',  'Previous Score': '52%', 'Latest Score': '38%', Drop: '-14 pp', 'Weak Topic': 'Fractions' },
      { Student: 'Aarav Desai',  'Previous Score': '54%', 'Latest Score': '41%', Drop: '-13 pp', 'Weak Topic': 'Word problems' },
      { Student: 'Ishit Dabhi',  'Previous Score': '69%', 'Latest Score': '57%', Drop: '-12 pp', 'Weak Topic': 'Division' },
    ],
    insight: 'Nisha has the steepest drop and should receive remedial support before the next chapter.',
    actions: [
      { id: 'open_xamta_result', label: '📊 Open XAMTA result',         type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'create_intervention', label: '🎯 Create intervention group', type: 'CANVAS', canvas: { type: 'intervention', students: ['Nisha Parma','Aarav Desai','Ishit Dabhi'] }, variant: 'ok' },
      { id: 'open_class_dashboard', label: '📈 Open class dashboard',     type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  'l2.borderline_attendance_80': {
    answer: '5 students are one absence away from falling below 80% attendance.',
    table: [
      { Student: 'Diya Shah',     Class: 'Class 6', 'Current Attendance': '80.2%', 'Absence Risk': 'One absence below 80%', 'Suggested Action': 'Preventive parent alert' },
      { Student: 'Om Trive',      Class: 'Class 6', 'Current Attendance': '80.5%', 'Absence Risk': 'One absence below 80%', 'Suggested Action': 'Monitor' },
      { Student: 'Tanvi Panchal', Class: 'Class 7', 'Current Attendance': '80.1%', 'Absence Risk': 'One absence below 80%', 'Suggested Action': 'Parent alert' },
      { Student: 'Jay Mehta',     Class: 'Class 8', 'Current Attendance': '80.3%', 'Absence Risk': 'One absence below 80%', 'Suggested Action': 'Monitor' },
      { Student: 'Riya Praja',    Class: 'Class 9', 'Current Attendance': '80.4%', 'Absence Risk': 'One absence below 80%', 'Suggested Action': 'Reminder' },
    ],
    insight: 'Preventive alerts today can avoid future manual approval/payment issues.',
    actions: [
      { id: 'send_preventive_alerts', label: '📨 Send preventive alerts', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_attendance_list',   label: '📅 Open attendance list',   type: 'TRIGGER', trigger: 'Task: attendance', variant: 'primary' },
      { id: 'create_reminder',        label: '🔔 Create reminder',         type: 'REMINDER', reminder: { title: 'Recheck borderline attendance', message: 'Verify Diya, Tanvi, Riya before the week closes.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'l2.combined_low_attendance_score': {
    answer: '2 students have both low attendance and low XAMTA scores this month.',
    table: [
      { Student: 'Aarav Desai',   Attendance: '72%', 'XAMTA Score': '41%', 'Combined Risk': 'High', Action: 'Parent alert + remedial support' },
      { Student: 'Harsh Vaghela', Attendance: '68%', 'XAMTA Score': '55%', 'Combined Risk': 'High', Action: 'Attendance follow-up' },
    ],
    insight: 'Aarav is the highest-priority intervention case because both attendance and learning outcomes are weak.',
    actions: [
      { id: 'parent_alert_aarav',  label: '📨 Send parent alert to Aarav',   type: 'TRIGGER', trigger: 'parent alert', variant: 'err',     payload: { student: 'Aarav Desai' } },
      { id: 'create_intervention', label: '🎯 Create intervention group',     type: 'CANVAS',  canvas: { type: 'intervention', students: ['Aarav Desai','Harsh Vaghela'] }, variant: 'ok' },
      { id: 'open_at_risk',        label: '🚨 Open at-risk students',         type: 'TRIGGER', trigger: 'Task: at_risk', variant: 'primary' },
    ],
  },

  'l2.likely_rejection_drafts': {
    answer: '5 draft applications are likely to be rejected if submitted today.',
    table: [
      { Student: 'Prajapati Princy', Scheme: 'Namo Saraswati', 'Risk Reason': 'Missing marksheet',          'Likely Rejection': 'Academic verification fail', 'Fix Needed': 'Upload marksheet' },
      { Student: 'Riya Praja',       Scheme: 'Namo Lakshmi',   'Risk Reason': 'Income certificate missing', 'Likely Rejection': 'Income validation fail',     'Fix Needed': 'Upload income certificate' },
      { Student: 'Om Desai',         Scheme: 'Namo Saraswati', 'Risk Reason': 'Seat verification missing',  'Likely Rejection': 'Board validation fail',      'Fix Needed': 'Verify seat number' },
      { Student: 'Diya Shah',        Scheme: 'Namo Lakshmi',   'Risk Reason': 'Mother Aadhaar missing',     'Likely Rejection': 'Guardian validation fail',   'Fix Needed': 'Upload mother Aadhaar' },
      { Student: 'Harsh Vaghela',    Scheme: 'Namo Saraswati', 'Risk Reason': 'IFSC invalid',               'Likely Rejection': 'Bank validation fail',       'Fix Needed': 'Correct IFSC' },
    ],
    insight: 'Do not submit these drafts until missing documents are corrected. Princy and Om are highest priority for Namo Saraswati.',
    actions: [
      { id: 'open_risky_drafts', label: '⚠️ Open risky drafts',     type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'warn' },
      { id: 'continue_princy',   label: '✏️ Continue Princy draft',  type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.prajapati_princy }, variant: 'primary' },
      { id: 'continue_om',       label: '✏️ Continue Om Desai draft',type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.om_desai }, variant: 'primary' },
      { id: 'send_doc_reminder', label: '📨 Send document reminder', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
    ],
  },

  'l2.deadline_risk_drafts': {
    answer: '4 draft applications are at risk of missing the deadline this week.',
    table: [
      { Student: 'Vaghela Jaydeviba', Scheme: 'Namo Lakshmi',   Deadline: '30 Apr 2026', 'Missing Item': 'Mother bank passbook', 'Days Left': 2 },
      { Student: 'Prajapati Princy',  Scheme: 'Namo Saraswati', Deadline: '30 Apr 2026', 'Missing Item': 'Marksheet',            'Days Left': 2 },
      { Student: 'Om Desai',          Scheme: 'Namo Saraswati', Deadline: '30 Apr 2026', 'Missing Item': 'Seat verification',    'Days Left': 2 },
      { Student: 'Riya Praja',        Scheme: 'Namo Lakshmi',   Deadline: '30 Apr 2026', 'Missing Item': 'Income certificate',   'Days Left': 2 },
    ],
    insight: 'Completing these 4 drafts will improve your scholarship submission rate immediately.',
    actions: [
      { id: 'open_deadline_drafts', label: '📅 Open deadline-risk drafts', type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'warn' },
      { id: 'create_reminder',      label: '🔔 Create reminder',           type: 'REMINDER', reminder: { title: 'Complete 4 deadline-risk drafts', message: 'Vaghela Jaydeviba, Princy, Om Desai, Riya Praja — close by 30 Apr.', priority: 'high' }, variant: 'ok' },
      { id: 'send_doc_reminder',    label: '📨 Send guardian document alert', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
    ],
  },

  'l2.prerequisite_topics': {
    answer: 'Your weakest students are missing 3 prerequisite topics before the next Fractions chapter.',
    table: [
      { Topic: 'Equivalent fractions', 'Students Missing': 8, Students: 'Nisha, Aarav, Harsh, Ishit, Tanvi, Jay, Diya, Om' },
      { Topic: 'Division facts',       'Students Missing': 6, Students: 'Aarav, Harsh, Ishit, Jay, Riya, Dev' },
      { Topic: 'Word problem setup',   'Students Missing': 5, Students: 'Nisha, Aarav, Tanvi, Diya, Om' },
    ],
    insight: 'Equivalent fractions should be retaught first because it affects the largest group.',
    actions: [
      { id: 'create_intervention', label: '🎯 Create lesson intervention',  type: 'CANVAS', canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Equivalent fractions',
          students: ['Nisha Parma','Aarav Desai','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Jay Mehta','Diya Shah','Om Trive'],
        }, variant: 'ok' },
      { id: 'open_xamta_topic',    label: '📊 Open XAMTA topic report',     type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'generate_worksheet',  label: '📝 Generate practice worksheet',  type: 'CANVAS', canvas: {
          type: 'worksheet-template', subject: 'Mathematics', topic: 'Equivalent fractions',
          students: ['Nisha Parma','Aarav Desai','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'primary' },
    ],
  },

  'l2.class_with_most_atrisk': {
    answer: 'Class 6 has the highest number of at-risk students (5), driven by attendance and XAMTA score combined.',
    table: [
      { Class: 'Class 6', 'At-Risk Students': 5, 'Top Reason': 'Attendance + XAMTA',  Priority: 'High' },
      { Class: 'Class 8', 'At-Risk Students': 3, 'Top Reason': 'Attendance',          Priority: 'Medium' },
      { Class: 'Class 7', 'At-Risk Students': 2, 'Top Reason': 'XAMTA score drop',    Priority: 'Medium' },
      { Class: 'Class 9', 'At-Risk Students': 1, 'Top Reason': 'Borderline attendance', Priority: 'Low' },
    ],
    insight: 'Focus interventions on Class 6 first. A combined attendance + remediation plan will move two metrics at once.',
    actions: [
      { id: 'open_at_risk',   label: '🚨 Open at-risk students',  type: 'TRIGGER', trigger: 'Task: at_risk', variant: 'primary' },
      { id: 'open_class_dash',label: '📊 Open class dashboard',    type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  'l2.teachers_with_pending_work': {
    answer: '3 teachers have pending scholarship work this week.',
    table: [
      { Teacher: 'Priya Mehta',  Class: 'Class 6',          'Pending Drafts': 3, 'Pending Documents': 5 },
      { Teacher: 'Alpa Trivedi', Class: 'Class 8',          'Pending Drafts': 2, 'Pending Documents': 3 },
      { Teacher: 'Mehul Pandya', Class: 'Class 11 Science', 'Pending Drafts': 1, 'Pending Documents': 2 },
    ],
    insight: 'Class 6 has the largest pending workload — follow up first.',
    actions: [
      { id: 'open_drafts',    label: '📝 Open pending drafts', type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'create_reminder',label: '🔔 Remind teachers',     type: 'REMINDER', reminder: { title: 'Nudge teachers on pending scholarship drafts', message: 'Priya, Alpa, Mehul — close pending drafts before deadline.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'l2.intervention_improvers': {
    answer: '4 students improved the most after the last intervention cycle.',
    table: [
      { Student: 'Tanvi Panchal', 'Pre Score': '52%', 'Post Score': '67%', 'Δ Score': '+15 pp', 'Δ Attendance': '+6 pp' },
      { Student: 'Jay Mehta',     'Pre Score': '54%', 'Post Score': '66%', 'Δ Score': '+12 pp', 'Δ Attendance': '+4 pp' },
      { Student: 'Riya Praja',    'Pre Score': '58%', 'Post Score': '69%', 'Δ Score': '+11 pp', 'Δ Attendance': '+3 pp' },
      { Student: 'Diya Shah',     'Pre Score': '49%', 'Post Score': '60%', 'Δ Score': '+11 pp', 'Δ Attendance': '+2 pp' },
    ],
    insight: 'The intervention is working for the upper-mid band. Replicate the same plan for the next cohort of struggling students.',
    actions: [
      { id: 'open_xamta_results', label: '📊 Open XAMTA results',  type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'create_intervention', label: '🎯 Create next intervention', type: 'CANVAS', canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Continue intervention',
          students: ['Tanvi Panchal','Jay Mehta','Riya Praja','Diya Shah'],
        }, variant: 'ok' },
    ],
  },

  // ─── Layer 3 — Action & What-if ────────────────────────────────────────────
  'l3.alert_priority_today': {
    answer: 'Alert Aarav and Harsh first. They have the highest attendance risk.',
    table: [
      { Student: 'Aarav Desai',   'Missed Yesterday': 'Yes', 'Monthly Attendance': '72%',   'Risk Reason': 'Already at-risk',     'Alert Priority': 1 },
      { Student: 'Harsh Vaghela', 'Missed Yesterday': 'Yes', 'Monthly Attendance': '68%',   'Risk Reason': 'Below threshold',     'Alert Priority': 2 },
      { Student: 'Tanvi Panchal', 'Missed Yesterday': 'Yes', 'Monthly Attendance': '80.1%', 'Risk Reason': 'Borderline',          'Alert Priority': 3 },
    ],
    insight: 'Aarav and Harsh need immediate parent follow-up. Tanvi can receive a preventive reminder.',
    actions: [
      { id: 'alert_top2', label: '📨 Send alerts to top 2', type: 'TRIGGER', trigger: 'parent alert', variant: 'err',     payload: { students: ['Aarav Desai','Harsh Vaghela'] } },
      { id: 'alert_all3', label: '📨 Send alerts to all 3', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn',    payload: { students: ['Aarav Desai','Harsh Vaghela','Tanvi Panchal'] } },
      { id: 'open_parent_alert', label: '✏️ Open parent alert draft', type: 'TRIGGER', trigger: 'parent alert', variant: 'primary' },
    ],
  },

  'l3.parent_alerts_below_75': {
    answer: '8 guardians will receive attendance alerts.',
    table: [
      { Student: 'Aarav Desai',   Class: 'Class 6',           Attendance: '72%', Guardian: 'Mehul Desai',   'Alert Type': 'High priority' },
      { Student: 'Harsh Vaghela', Class: 'Class 6',           Attendance: '68%', Guardian: 'Rekha Vaghela', 'Alert Type': 'High priority' },
      { Student: 'Tanvi Panchal', Class: 'Class 7',           Attendance: '74%', Guardian: 'Pankaj Panchal','Alert Type': 'Warning' },
      { Student: 'Jay Mehta',     Class: 'Class 8',           Attendance: '73%', Guardian: 'Bhavna Mehta',  'Alert Type': 'Warning' },
      { Student: 'Diya Shah',     Class: 'Class 8',           Attendance: '71%', Guardian: 'Kiran Shah',    'Alert Type': 'Warning' },
      { Student: 'Riya Praja',    Class: 'Class 9',           Attendance: '74%', Guardian: 'Nilesh Praja',  'Alert Type': 'Warning' },
      { Student: 'Dev Modi',      Class: 'Class 12',          Attendance: '73%', Guardian: 'Ketan Modi',    'Alert Type': 'Warning' },
      { Student: 'Ishit Dabhi',   Class: 'Class 6',           Attendance: '72%', Guardian: 'Alpesh Dabhi',  'Alert Type': 'Warning' },
    ],
    insight: '2 alerts should be high priority because attendance is below 70%.',
    actions: [
      { id: 'send_parent_alerts', label: '📨 Send parent alerts',     type: 'TRIGGER', trigger: 'parent alert', variant: 'err' },
      { id: 'preview_message',    label: '👁️ Preview message',          type: 'TRIGGER', trigger: 'parent alert preview', variant: 'primary' },
      { id: 'open_attendance',    label: '📊 Open attendance dashboard', type: 'TRIGGER', trigger: 'Task: attendance', variant: 'primary' },
    ],
  },

  'l3.recoverable_rejected': {
    answer: '4 rejected applications can still be corrected and resubmitted before the deadline.',
    table: [
      { Student: 'Patel Kavya',  Scheme: 'Namo Saraswati', 'Rejection Reason': 'Mother name mismatch',     'Can Fix?': 'Yes', Action: 'Edit application' },
      { Student: 'Shah Riya',    Scheme: 'Namo Lakshmi',   'Rejection Reason': 'Blurry Aadhaar image',     'Can Fix?': 'Yes', Action: 'Re-upload Aadhaar' },
      { Student: 'Diya Shah',    Scheme: 'Namo Lakshmi',   'Rejection Reason': 'Income certificate missing','Can Fix?': 'Yes', Action: 'Upload certificate' },
      { Student: 'Ishita Nayak', Scheme: 'Namo Saraswati', 'Rejection Reason': 'Seat number mismatch',     'Can Fix?': 'Yes', Action: 'Correct seat number' },
    ],
    insight: 'All 4 can be recovered if corrected before 30 Apr 2026. Start with Patel Kavya because the fix is simple.',
    actions: [
      { id: 'edit_kavya',  label: '✏️ Edit Patel Kavya',         type: 'CANVAS', canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.patel_kavya }, variant: 'ok' },
      { id: 'open_rejected', label: '🚫 Open rejected applications', type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
      { id: 'create_reminder', label: '🔔 Create deadline reminder', type: 'REMINDER', reminder: { title: 'Resubmit 4 rejected scholarships', message: 'Kavya, Riya, Diya, Ishita — fix and resubmit before 30 Apr 2026.', priority: 'high' }, variant: 'primary' },
    ],
  },

  'l3.after_school_top5': {
    answer: 'These 5 students should be prioritized for after-school support this week. All 5 should be grouped under a Mathematics Fractions Readiness intervention.',
    table: [
      { Student: 'Aarav Desai',   Reason: 'Low marks in Mathematics — Word Problems + low attendance',           'Subject / Topic': 'Mathematics · Word Problems',         Attendance: '72%',   'XAMTA Score': '41%', Priority: 1, 'Recommended Support': 'Parent alert + remedial group' },
      { Student: 'Nisha Parma',   Reason: 'Lowest marks in Mathematics — Equivalent Fractions',                  'Subject / Topic': 'Mathematics · Equivalent Fractions',  Attendance: '88%',   'XAMTA Score': '38%', Priority: 2, 'Recommended Support': 'Fractions practice worksheet' },
      { Student: 'Harsh Vaghela', Reason: 'Low marks in Mathematics — Division Facts + attendance risk',         'Subject / Topic': 'Mathematics · Division Facts',        Attendance: '68%',   'XAMTA Score': '55%', Priority: 3, 'Recommended Support': 'Attendance follow-up + fluency drill' },
      { Student: 'Ishit Dabhi',   Reason: 'Score dropped in Mathematics — Fraction Comparison',                  'Subject / Topic': 'Mathematics · Fraction Comparison',   Attendance: '82%',   'XAMTA Score': '57%', Priority: 4, 'Recommended Support': 'Small-group practice' },
      { Student: 'Tanvi Panchal', Reason: 'Low marks in Mathematics — Word Problem Setup + borderline attendance', 'Subject / Topic': 'Mathematics · Word Problem Setup',    Attendance: '80.1%', 'XAMTA Score': '61%', Priority: 5, 'Recommended Support': 'Preventive alert + guided worksheet' },
    ],
    insight: 'Start with Aarav because he has both learning and attendance risk. Nisha needs academic intervention even though her attendance is healthy. All 5 should be grouped under a Mathematics Fractions Readiness intervention.',
    actions: [
      { id: 'create_intervention', label: '🎯 Create intervention group', type: 'CANVAS', canvas: {
          type: 'intervention',
          subject: 'Mathematics',
          topic: 'Fractions Readiness',
          groupName: 'Intervention Group — Fractions Readiness',
          duration: '1 week',
          session: 'After school',
          plan: [
            { day: 'Day 1', topic: 'Equivalent fractions recap' },
            { day: 'Day 2', topic: 'Division facts warm-up + fraction comparison' },
            { day: 'Day 3', topic: 'Word problem setup' },
            { day: 'Day 4', topic: 'Practice worksheet' },
            { day: 'Day 5', topic: 'Mini re-check' },
          ],
          students: [
            { name: 'Aarav Desai',   primaryGap: 'Word Problems',         attendance: '72%',   score: '41%', alert: 'Yes' },
            { name: 'Nisha Parma',   primaryGap: 'Equivalent Fractions',  attendance: '88%',   score: '38%', alert: 'No' },
            { name: 'Harsh Vaghela', primaryGap: 'Division Facts',         attendance: '68%',   score: '55%', alert: 'Yes' },
            { name: 'Ishit Dabhi',   primaryGap: 'Fraction Comparison',   attendance: '82%',   score: '57%', alert: 'No' },
            { name: 'Tanvi Panchal', primaryGap: 'Word Problem Setup',    attendance: '80.1%', score: '61%', alert: 'Preventive' },
          ],
        }, variant: 'ok' },
      { id: 'generate_lesson_plan', label: '📚 Generate lesson plan', type: 'CANVAS', canvas: {
          type: 'lesson-plan',
          subject: 'Mathematics',
          topic: 'Fractions Readiness',
          classId: 'Class 6',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'primary' },
      { id: 'send_parent_alerts', label: '📨 Send parent alerts',         type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_xamta_topic',   label: '📊 Open XAMTA topic report',    type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Create reminder',             type: 'REMINDER', reminder: { title: 'Run after-school intervention', message: 'Top 5: Aarav, Nisha, Harsh, Ishit, Tanvi.', priority: 'high' }, variant: 'primary' },
    ],
  },

  'l3.fastest_submission_action': {
    answer: 'The fastest action is to complete 4 draft applications that only need one missing document.',
    table: [
      { Student: 'Vaghela Jaydeviba', Scheme: 'Namo Lakshmi',   'Missing Item': 'Mother bank passbook', 'Estimated Time': '5 min', 'Submission Impact': '+1 submitted' },
      { Student: 'Prajapati Princy',  Scheme: 'Namo Saraswati', 'Missing Item': 'Marksheet',            'Estimated Time': '7 min', 'Submission Impact': '+1 submitted' },
      { Student: 'Om Desai',          Scheme: 'Namo Saraswati', 'Missing Item': 'Seat verification',    'Estimated Time': '5 min', 'Submission Impact': '+1 submitted' },
      { Student: 'Riya Praja',        Scheme: 'Namo Lakshmi',   'Missing Item': 'Income certificate',   'Estimated Time': '8 min', 'Submission Impact': '+1 submitted' },
    ],
    insight: 'Completing these 4 drafts can raise your submission rate from 87.5% to 95.8% today.',
    actions: [
      { id: 'open_drafts',         label: '📝 Open draft applications',     type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'continue_first',      label: '✏️ Continue first draft',         type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.vaghela_jaydeviba }, variant: 'ok' },
      { id: 'send_doc_reminders',  label: '📨 Send document reminders',      type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
    ],
  },

  'l3.mother_name_what_if': {
    answer: '3 of 4 applications can become eligible again after correcting the mother-name mismatch.',
    table: [
      { Student: 'Patel Kavya',  Scheme: 'Namo Saraswati', 'Current Issue': 'Mother name mismatch',                       'After Correction': 'Eligible for re-review',  Action: 'Edit application' },
      { Student: 'Shah Riya',    Scheme: 'Namo Lakshmi',   'Current Issue': 'Mother name mismatch',                       'After Correction': 'Eligible for re-review',  Action: 'Edit application' },
      { Student: 'Diya Shah',    Scheme: 'Namo Lakshmi',   'Current Issue': 'Mother name mismatch',                       'After Correction': 'Eligible for re-review',  Action: 'Edit application' },
      { Student: 'Ishita Nayak', Scheme: 'Namo Saraswati', 'Current Issue': 'Mother name mismatch + missing passbook',    'After Correction': 'Still needs document',    Action: 'Edit application' },
    ],
    insight: 'Correcting the name mismatch recovers 3 applications immediately. Ishita still needs passbook upload.',
    actions: [
      { id: 'edit_kavya',    label: '✏️ Edit Patel Kavya',           type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.patel_kavya }, variant: 'ok' },
      { id: 'edit_riya',     label: '✏️ Edit Shah Riya',             type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.shah_riya }, variant: 'ok' },
      { id: 'edit_diya',     label: '✏️ Edit Diya Shah',             type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.diya_shah }, variant: 'ok' },
      { id: 'edit_ishita',   label: '✏️ Edit Ishita Nayak',          type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.ishita_nayak }, variant: 'primary' },
      { id: 'open_rejected', label: '🚫 Open rejected applications', type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
    ],
  },

  'l3.lesson_plan_intervention': {
    answer: '6 students need a lesson plan intervention before the Fractions test.',
    table: [
      { Student: 'Nisha Parma',   'Weak Topic': 'Equivalent fractions', 'Current Score': '38%', 'Intervention Need': 'High' },
      { Student: 'Aarav Desai',   'Weak Topic': 'Word problems',        'Current Score': '41%', 'Intervention Need': 'High' },
      { Student: 'Harsh Vaghela', 'Weak Topic': 'Division facts',       'Current Score': '55%', 'Intervention Need': 'Medium' },
      { Student: 'Ishit Dabhi',   'Weak Topic': 'Fraction comparison',  'Current Score': '57%', 'Intervention Need': 'Medium' },
      { Student: 'Tanvi Panchal', 'Weak Topic': 'Word problem setup',   'Current Score': '61%', 'Intervention Need': 'Medium' },
      { Student: 'Diya Shah',     'Weak Topic': 'Equivalent fractions', 'Current Score': '62%', 'Intervention Need': 'Medium' },
    ],
    insight: 'Group students by topic instead of teaching individually. Start with equivalent fractions and word problem setup.',
    actions: [
      { id: 'create_intervention',  label: '🎯 Create intervention group', type: 'CANVAS', canvas: {
          type: 'intervention',
          subject: 'Mathematics',
          topic: 'Fractions Readiness',
          groupName: 'Intervention Group — Fractions Readiness',
          duration: '1 week',
          students: ['Nisha Parma','Aarav Desai','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Diya Shah'],
        }, variant: 'ok' },
      { id: 'generate_lesson_plan', label: '📚 Generate lesson plan',       type: 'CANVAS', canvas: {
          type: 'lesson-plan',
          subject: 'Mathematics',
          topic: 'Fractions Readiness',
          classId: 'Class 6',
          students: ['Nisha Parma','Aarav Desai','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'primary' },
      { id: 'generate_worksheet',   label: '📝 Generate practice worksheet', type: 'CANVAS', canvas: {
          type: 'worksheet-template',
          subject: 'Mathematics',
          topic: 'Fractions Readiness',
          students: ['Nisha Parma','Aarav Desai','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Diya Shah'],
        }, variant: 'primary' },
      { id: 'open_xamta_topic',     label: '📊 Open XAMTA topic report',    type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
    ],
  },

  'l3.what_first_today': {
    answer: 'Start with parent alerts for Aarav and Harsh — both attendance and learning are at risk.',
    table: [
      { 'Action #': 1, Action: 'Send parent alerts to Aarav + Harsh', 'Time Needed': '5 min', Impact: 'Reduce dropout risk' },
      { 'Action #': 2, Action: 'Complete Vaghela Jaydeviba draft',     'Time Needed': '7 min', Impact: '+1 submitted' },
      { 'Action #': 3, Action: 'Plan equivalent-fractions intervention','Time Needed': '12 min', Impact: 'Help 8 students' },
    ],
    insight: 'Tackle parent alerts first because they take the least time and address the highest-priority risk.',
    actions: [
      { id: 'send_parent_alerts',  label: '📨 Send parent alerts',         type: 'TRIGGER', trigger: 'parent alert', variant: 'err' },
      { id: 'continue_first_draft',label: '✏️ Continue first draft',       type: 'CANVAS',  canvas: { type: 'digivritti', view: 'edit', appId: ASK_AI_APP_IDS.vaghela_jaydeviba }, variant: 'ok' },
      { id: 'create_intervention', label: '🎯 Plan intervention',          type: 'CANVAS', canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Equivalent fractions',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Jay Mehta','Diya Shah','Om Trive'],
        }, variant: 'primary' },
    ],
  },

  'l3.complete_drafts_rate': {
    answer: 'Completing all draft applications today will raise your submission rate from 87.5% to 96.4%.',
    table: [
      { Metric: 'Eligible students',       Current: 28, 'After Drafts Submitted': 28 },
      { Metric: 'Submitted applications',  Current: 24, 'After Drafts Submitted': 27 },
      { Metric: 'Submission rate',         Current: '87.5%', 'After Drafts Submitted': '96.4%' },
    ],
    insight: 'Closing 3 of 4 drafts today is enough to cross the 95% threshold required for the school score card.',
    actions: [
      { id: 'open_drafts', label: '📝 Open draft applications', type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'create_reminder', label: '🔔 Schedule completion reminder', type: 'REMINDER', reminder: { title: 'Push submission rate above 95%', message: 'Close pending drafts today to clear school score card.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'l3.top3_risk_actions': {
    answer: 'These 3 actions will reduce the most risk this week.',
    table: [
      { 'Rank': 1, Action: 'Send parent alerts for below-75% attendance students',   Impact: 'Reduces 8 students at attendance risk',     Effort: 'Low' },
      { 'Rank': 2, Action: 'Resubmit 4 rejected scholarship applications',           Impact: 'Recovers ₹40,000+ in disbursement',         Effort: 'Medium' },
      { 'Rank': 3, Action: 'Run equivalent-fractions intervention for 8 students',   Impact: 'Lifts XAMTA scores before the next chapter', Effort: 'Medium' },
    ],
    insight: 'Doing all 3 this week clears the biggest items from your at-risk, scholarship, and learning-outcomes queues.',
    actions: [
      { id: 'send_parent_alerts',  label: '📨 Send parent alerts',           type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_rejected',       label: '🚫 Resubmit rejected apps',        type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
      { id: 'create_intervention', label: '🎯 Plan intervention',             type: 'CANVAS', canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Equivalent fractions',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Jay Mehta','Diya Shah','Om Trive'],
        }, variant: 'ok' },
    ],
  },

  // ─── Teacher — "What should I teach my weakest students next?" ─────────────
  'l3.weakest_topics_next': {
    answer: 'Teach 3 prerequisite topics in this order to lift your weakest students before the next chapter.',
    table: [
      { Topic: 'Equivalent fractions', 'Students Affected': 8, 'Why It Matters': 'Required before next fractions chapter', 'Suggested Activity': 'Number line + matching activity', 'Time Needed': '25 min' },
      { Topic: 'Division facts',       'Students Affected': 6, 'Why It Matters': 'Blocks fraction simplification',          'Suggested Activity': 'Quick fluency drill',           'Time Needed': '15 min' },
      { Topic: 'Word problem setup',   'Students Affected': 5, 'Why It Matters': 'Causes multi-step mistakes',              'Suggested Activity': 'Read-draw-solve routine',       'Time Needed': '20 min' },
    ],
    insight: 'Equivalent fractions affects the largest group, so teach it first — Aarav, Nisha, Harsh, Ishit, Tanvi, Jay, Diya, Om all need it before the next chapter test.',
    actions: [
      { id: 'generate_lesson_plan', label: '📚 Generate lesson plan', type: 'CANVAS', canvas: {
          type: 'lesson-plan', subject: 'Mathematics', topic: 'Equivalent fractions', classId: 'Class 6',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'primary' },
      { id: 'create_intervention',  label: '🎯 Create intervention group', type: 'CANVAS', canvas: {
          type: 'intervention', subject: 'Mathematics', topic: 'Equivalent fractions', duration: '1 week',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal','Jay Mehta','Diya Shah','Om Trive'],
        }, variant: 'ok' },
      { id: 'generate_worksheet',   label: '📝 Generate practice worksheet', type: 'CANVAS', canvas: {
          type: 'worksheet-template', subject: 'Mathematics', topic: 'Equivalent fractions',
          students: ['Aarav Desai','Nisha Parma','Harsh Vaghela','Ishit Dabhi','Tanvi Panchal'],
        }, variant: 'primary' },
      { id: 'open_xamta_report',    label: '📊 Open XAMTA topic report', type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
    ],
  },

  // ─── Principal extras ──────────────────────────────────────────────────────
  'pr.lowest_avg_class': {
    answer: 'Class 6 has the lowest XAMTA average (59%), driven by fraction-related topics.',
    table: [
      { Class: 'Class 6', 'XAMTA Average': '59%', 'Lowest Topic': 'Equivalent fractions', 'At-Risk Count': 5 },
      { Class: 'Class 8', 'XAMTA Average': '64%', 'Lowest Topic': 'Linear equations',     'At-Risk Count': 3 },
      { Class: 'Class 7', 'XAMTA Average': '67%', 'Lowest Topic': 'Word problems',         'At-Risk Count': 2 },
      { Class: 'Class 9', 'XAMTA Average': '69%', 'Lowest Topic': 'Quadratic basics',     'At-Risk Count': 1 },
    ],
    insight: 'Investing in Class 6 lifts both at-risk count and XAMTA average. Schedule a teacher review for the Fractions block.',
    actions: [
      { id: 'open_xamta_report',  label: '📊 Open XAMTA report',     type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'open_class_dash',    label: '📈 Open class dashboard',  type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Schedule teacher review', type: 'REMINDER', reminder: { title: 'Class 6 fractions review', message: 'Walk through fractions block with Class 6 teacher.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'pr.parent_followup_week': {
    answer: '11 students need parent follow-up this week — split between attendance and scholarship reasons.',
    table: [
      { Reason: 'Attendance below 75%',  Count: 8, 'Highest Priority': 'Aarav Desai · Class 6',      'Suggested Channel': 'WhatsApp + SMS' },
      { Reason: 'Rejected scholarship',  Count: 3, 'Highest Priority': 'Patel Kavya · Class 11 Sci', 'Suggested Channel': 'Phone call' },
    ],
    insight: 'Attendance follow-ups are bulk; scholarship follow-ups need a personal call. Split between the two channels.',
    actions: [
      { id: 'send_attendance_alerts', label: '📨 Send attendance alerts', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_rejected',          label: '🚫 Open rejected apps',     type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
      { id: 'open_school_dashboard',  label: '📊 Open school dashboard',  type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  'pr.school_priority_today': {
    answer: 'Prioritize the 8 attendance alerts and the 6 pending scholarship drafts today — both are time-sensitive.',
    table: [
      { 'Priority': 1, Action: 'Send 8 attendance parent alerts',          Owner: 'Class teachers',  'Time Needed': '15 min' },
      { 'Priority': 2, Action: 'Close 6 pending scholarship drafts',       Owner: 'Class teachers',  'Time Needed': '40 min' },
      { 'Priority': 3, Action: 'Re-review 3 resubmitted applications',     Owner: 'Principal',       'Time Needed': '20 min' },
    ],
    insight: 'Two of the three actions can be delegated to teachers. Run a quick standup before lunch to coordinate.',
    actions: [
      { id: 'send_parent_alerts', label: '📨 Send parent alerts',          type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_drafts',        label: '📝 Open draft applications',     type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'open_school_dash',   label: '📊 Open school dashboard',       type: 'TRIGGER', trigger: 'Task: dashboard', variant: 'primary' },
    ],
  },

  // ─── CRC prompts ───────────────────────────────────────────────────────────
  'crc.cluster_pending_review': {
    answer: '12 applications are pending your review in MADHAPAR cluster.',
    table: [
      { Scheme: 'Namo Lakshmi',   Pending: 7, 'Oldest Wait': '4 days', 'SLA Status': 'Approaching breach' },
      { Scheme: 'Namo Saraswati', Pending: 5, 'Oldest Wait': '2 days', 'SLA Status': 'On track' },
    ],
    insight: 'Two Namo Lakshmi cases are about to breach the 5-day SLA. Review them first.',
    actions: [
      { id: 'open_pending_reviews', label: '📋 Open pending reviews',  type: 'TRIGGER', trigger: 'dv:canvas:review', variant: 'primary' },
      { id: 'create_reminder',      label: '🔔 SLA reminder',           type: 'REMINDER', reminder: { title: 'Clear MADHAPAR review backlog', message: '7 NL + 5 NS pending — clear before SLA breach.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'crc.resubmitted_apps': {
    answer: '3 resubmitted applications need re-review — all corrected within the last 48 hours.',
    table: [
      { Student: 'Patel Kavya',   Scheme: 'Namo Saraswati', 'Original Reason': 'Mother name mismatch', 'Resubmitted': '12 hours ago' },
      { Student: 'Shah Riya',     Scheme: 'Namo Lakshmi',   'Original Reason': 'Blurry Aadhaar',       'Resubmitted': '36 hours ago' },
      { Student: 'Pandya Komal',  Scheme: 'Namo Saraswati', 'Original Reason': 'Income certificate',  'Resubmitted': '20 hours ago' },
    ],
    insight: 'Re-reviews are typically 30% faster than first reviews — finish all 3 in one sitting today.',
    actions: [
      { id: 'open_resub_queue', label: '🔄 Open re-review queue', type: 'TRIGGER', trigger: 'dv:canvas:review:resub', variant: 'primary' },
      { id: 'open_kavya',       label: '👤 Open Patel Kavya',     type: 'CANVAS',  canvas: { type: 'digivritti', view: 'review', appId: ASK_AI_APP_IDS.patel_kavya, cluster: 'MADHAPAR' }, variant: 'ok' },
    ],
  },

  'crc.schools_delaying': {
    answer: '3 schools in your cluster are delaying scholarship submissions.',
    table: [
      { School: 'GPS Madhapar',          UDISE: '24010515912', 'Pending Drafts': 14, 'Days Behind Median': 6 },
      { School: 'GPS Bhuj East',         UDISE: '24010512204', 'Pending Drafts': 9,  'Days Behind Median': 4 },
      { School: 'Smt. P V High School',  UDISE: '24010518023', 'Pending Drafts': 6,  'Days Behind Median': 3 },
    ],
    insight: 'GPS Madhapar accounts for half the cluster backlog. A targeted reminder to that school will move the cluster average.',
    actions: [
      { id: 'send_school_alert', label: '📨 Send school reminder', type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
      { id: 'open_drafts',       label: '📝 Open pending drafts',  type: 'TRIGGER', trigger: 'dv:canvas:list:draft', variant: 'primary' },
      { id: 'create_reminder',   label: '🔔 Cluster review reminder', type: 'REMINDER', reminder: { title: 'Cluster school review', message: 'Review GPS Madhapar pending drafts.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'crc.common_rejection_reasons': {
    answer: 'Mother name mismatch and missing mother bank passbook account for 60% of cluster rejections.',
    table: [
      { Reason: 'Mother name mismatch',     Count: 9, 'Share': '34%', 'Fix Type': 'Edit application' },
      { Reason: 'Missing mother passbook',  Count: 7, 'Share': '26%', 'Fix Type': 'Document upload' },
      { Reason: 'Income certificate stale', Count: 5, 'Share': '19%', 'Fix Type': 'Re-upload certificate' },
      { Reason: 'IFSC invalid',             Count: 3, 'Share': '11%', 'Fix Type': 'Correct bank field' },
      { Reason: 'Seat number mismatch',     Count: 3, 'Share': '11%', 'Fix Type': 'Correct seat number' },
    ],
    insight: 'A 30-min cluster training on mother-record matching will prevent the top two rejection categories from recurring.',
    actions: [
      { id: 'open_rejected', label: '🚫 Open rejected applications', type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
      { id: 'create_reminder', label: '🔔 Schedule cluster training', type: 'REMINDER', reminder: { title: 'Cluster training on mother record matching', message: 'Train teachers to verify mother name + passbook before submission.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'crc.likely_rejected_cluster': {
    answer: '5 cluster applications are likely to be rejected if approved as-is.',
    table: [
      { Student: 'Vyas Hetal',     Scheme: 'Namo Lakshmi',   'Risk Reason': 'Mother name not matching bank',  'Likely Outcome': 'Reject' },
      { Student: 'Solanki Mira',   Scheme: 'Namo Saraswati', 'Risk Reason': 'Marksheet image unclear',         'Likely Outcome': 'Reject' },
      { Student: 'Joshi Aarav',    Scheme: 'Namo Lakshmi',   'Risk Reason': 'Passbook page missing',           'Likely Outcome': 'Reject' },
      { Student: 'Modi Bhumi',     Scheme: 'Namo Saraswati', 'Risk Reason': 'Seat number not in board list',   'Likely Outcome': 'Reject' },
      { Student: 'Trivedi Ishan',  Scheme: 'Namo Lakshmi',   'Risk Reason': 'Income certificate expired',       'Likely Outcome': 'Reject' },
    ],
    insight: 'Send these back for fix-and-resubmit instead of approving — saves a re-review cycle later.',
    actions: [
      { id: 'open_pending_reviews', label: '📋 Open pending reviews', type: 'TRIGGER', trigger: 'dv:canvas:review', variant: 'primary' },
      { id: 'open_rejected',        label: '🚫 Open rejected apps',   type: 'TRIGGER', trigger: 'dv:canvas:list:rejected', variant: 'err' },
    ],
  },

  'crc.review_first_today': {
    answer: 'Review the 2 SLA-breaching cases first, then the 3 resubmitted applications.',
    table: [
      { 'Order': 1, Action: 'Clear 2 SLA-breaching reviews',         'Time Needed': '15 min', Impact: 'Avoids escalation' },
      { 'Order': 2, Action: 'Re-review 3 resubmitted applications',  'Time Needed': '20 min', Impact: 'Restores 3 students into pipeline' },
      { 'Order': 3, Action: 'Send GPS Madhapar reminder',            'Time Needed': '5 min',  Impact: 'Reduces cluster backlog' },
    ],
    insight: 'Doing the 3 actions in order takes ~40 minutes and resolves the cluster\'s biggest queues.',
    actions: [
      { id: 'open_pending_reviews', label: '📋 Open pending reviews', type: 'TRIGGER', trigger: 'dv:canvas:review', variant: 'primary' },
      { id: 'open_resub_queue',     label: '🔄 Open resubmitted queue', type: 'TRIGGER', trigger: 'dv:canvas:review:resub', variant: 'primary' },
      { id: 'send_reminder',        label: '📨 Send school reminder',  type: 'TRIGGER', trigger: 'parent alert', variant: 'warn' },
    ],
  },

  // ─── DEO / BRC prompts ─────────────────────────────────────────────────────
  'deo.cluster_pending_approvals': {
    answer: 'MADHAPAR and BHUJ EAST clusters have the highest pending approvals in your district.',
    table: [
      { Cluster: 'MADHAPAR',  Pending: 142, 'SLA Breaches': 18, 'Lead CRC': 'Mehul Parmar' },
      { Cluster: 'BHUJ EAST', Pending: 108, 'SLA Breaches': 11, 'Lead CRC': 'Hetal Joshi' },
      { Cluster: 'NAKHATRANA', Pending: 76,  'SLA Breaches': 4,  'Lead CRC': 'Pankaj Solanki' },
      { Cluster: 'ANJAR',     Pending: 64,  'SLA Breaches': 2,  'Lead CRC': 'Bhavna Modi' },
    ],
    insight: 'MADHAPAR drives most SLA breaches — escalate CRC review there before the cycle closes.',
    actions: [
      { id: 'open_district_dash', label: '🏛 Open district dashboard',  type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Escalate CRC review',       type: 'REMINDER', reminder: { title: 'Escalate MADHAPAR backlog', message: 'CRC Mehul Parmar — 18 SLA breaches need clearing this week.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'deo.schools_low_coverage': {
    answer: '4 schools in your district have scholarship coverage below 80%.',
    table: [
      { School: 'GPS Tappar',         Block: 'Bhuj',     Coverage: '68%', 'Eligible Students': 28 },
      { School: 'GPS Khombhdi',       Block: 'Anjar',    Coverage: '72%', 'Eligible Students': 22 },
      { School: 'GPS Kotda',          Block: 'Mandvi',   Coverage: '76%', 'Eligible Students': 19 },
      { School: 'GPS Naliya',         Block: 'Nakhatrana', Coverage: '78%', 'Eligible Students': 17 },
    ],
    insight: 'These 4 schools together represent 86 students who are eligible but not yet covered. A targeted teacher campaign can lift coverage by 12 pp.',
    actions: [
      { id: 'open_district_dash', label: '🏛 Open district dashboard', type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Coverage campaign',        type: 'REMINDER', reminder: { title: 'Low-coverage schools campaign', message: 'GPS Tappar / Khombhdi / Kotda / Naliya — push scholarship submissions.', priority: 'normal' }, variant: 'ok' },
    ],
  },

  'deo.blocks_attendance_risk': {
    answer: '3 blocks have monthly attendance below 80% — Mandvi is the most concerning.',
    table: [
      { Block: 'Mandvi',  Attendance: '74%', 'Schools Below 75%': 12, 'Top Reason': 'Monsoon disruption' },
      { Block: 'Anjar',   Attendance: '78%', 'Schools Below 75%': 7,  'Top Reason': 'Transport gaps' },
      { Block: 'Bhuj',    Attendance: '79%', 'Schools Below 75%': 6,  'Top Reason': 'Migration window' },
    ],
    insight: 'Monsoon disruption explains Mandvi\'s drop — coordinate with the BEO before the next cycle.',
    actions: [
      { id: 'open_district_dash', label: '🏛 Open district dashboard', type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Coordinate with BEO',       type: 'REMINDER', reminder: { title: 'BEO sync: Mandvi attendance', message: 'Discuss monsoon attendance impact with Mandvi BEO.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'deo.xamta_pending': {
    answer: '17 schools in your district have XAMTA data entry pending past the deadline.',
    table: [
      { Block: 'Bhuj',      'Pending Schools': 6, 'Top Class': 'Class 6', 'Sheets Outstanding': 142 },
      { Block: 'Anjar',     'Pending Schools': 4, 'Top Class': 'Class 7', 'Sheets Outstanding': 96 },
      { Block: 'Mandvi',    'Pending Schools': 4, 'Top Class': 'Class 5', 'Sheets Outstanding': 88 },
      { Block: 'Nakhatrana', 'Pending Schools': 3, 'Top Class': 'Class 8', 'Sheets Outstanding': 64 },
    ],
    insight: 'Bhuj block is responsible for the largest sheet backlog — a one-day data-entry drive there clears half the district queue.',
    actions: [
      { id: 'open_xamta_results', label: '📊 Open XAMTA results',     type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 Plan data-entry drive',  type: 'REMINDER', reminder: { title: 'Bhuj XAMTA data-entry drive', message: 'Coordinate with BEO Bhuj for XAMTA backlog clearance.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'deo.crc_backlog': {
    answer: 'CRC Mehul Parmar (MADHAPAR cluster) has the highest backlog — 18 SLA breaches.',
    table: [
      { CRC: 'Mehul Parmar',   Cluster: 'MADHAPAR',   Pending: 142, 'SLA Breaches': 18 },
      { CRC: 'Hetal Joshi',    Cluster: 'BHUJ EAST',  Pending: 108, 'SLA Breaches': 11 },
      { CRC: 'Pankaj Solanki', Cluster: 'NAKHATRANA', Pending: 76,  'SLA Breaches': 4 },
      { CRC: 'Bhavna Modi',    Cluster: 'ANJAR',      Pending: 64,  'SLA Breaches': 2 },
    ],
    insight: 'Redirecting one CRC from ANJAR to MADHAPAR for 2 days clears the SLA breaches without slowing the rest of the district.',
    actions: [
      { id: 'open_district_dash', label: '🏛 Open district dashboard', type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 CRC capacity plan',        type: 'REMINDER', reminder: { title: 'CRC capacity rebalance', message: 'Borrow Bhavna Modi for 2 days to clear MADHAPAR backlog.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'deo.district_action_today': {
    answer: 'Two district actions today: clear MADHAPAR SLA breaches and run a Bhuj XAMTA data-entry drive.',
    table: [
      { 'Priority': 1, Action: 'Escalate 18 SLA breaches in MADHAPAR',  Owner: 'CRC Mehul Parmar', 'Time Needed': '60 min', Impact: 'Avoids state escalation' },
      { 'Priority': 2, Action: 'Run XAMTA data-entry drive in Bhuj',     Owner: 'BEO Bhuj',         'Time Needed': 'Full day', Impact: 'Clears 142-sheet backlog' },
      { 'Priority': 3, Action: 'Send coverage reminders to 4 schools',   Owner: 'DEO Office',       'Time Needed': '15 min',  Impact: 'Lifts district coverage by 12 pp' },
    ],
    insight: 'Items 1 and 3 are quick wins. Schedule the XAMTA drive for tomorrow if today is full.',
    actions: [
      { id: 'open_district_dash', label: '🏛 Open district dashboard',  type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_broadcast',   label: '📣 Send district reminder',    type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'District action briefing', category: 'announcement', targetRoles: ['crc','principal'], priority: 'high' } }, variant: 'ok' },
      { id: 'create_reminder',    label: '🔔 Plan XAMTA drive',           type: 'REMINDER', reminder: { title: 'Bhuj XAMTA data-entry drive', message: 'Plan with BEO Bhuj and CRC Hetal Joshi.', priority: 'high' }, variant: 'ok' },
    ],
  },

  // ─── PFMS prompts ──────────────────────────────────────────────────────────
  'pfms.failed_payments_week': {
    answer: '34 payments failed this week — 8 are retry-eligible after correction.',
    table: [
      { 'Failure Reason': 'Aadhaar-bank mismatch',  Count: 14, 'Retry Eligible': 8 },
      { 'Failure Reason': 'IFSC invalid',           Count: 8,  'Retry Eligible': 0 },
      { 'Failure Reason': 'Account frozen',         Count: 6,  'Retry Eligible': 0 },
      { 'Failure Reason': 'Beneficiary mismatch',   Count: 4,  'Retry Eligible': 0 },
      { 'Failure Reason': 'NPCI seeding pending',    Count: 2,  'Retry Eligible': 0 },
    ],
    insight: 'Aadhaar-bank mismatches dominate. Trigger an Aadhaar-bank seeding campaign to recover 8 disbursements this week.',
    actions: [
      { id: 'open_failed_queue',  label: '🔻 Open failed payments',  type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
      { id: 'create_reminder',    label: '🔔 Aadhaar seeding push',   type: 'REMINDER', reminder: { title: 'Aadhaar-bank seeding campaign', message: 'Coordinate with district teams for the 8 retry-eligible cases.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'pfms.retry_eligible': {
    answer: '8 payment failures are retry-eligible after the latest correction batch.',
    table: [
      { Student: 'Patel Nidhi',     Scheme: 'Namo Lakshmi',   'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'Bank record updated', 'Retry Window': 'Today' },
      { Student: 'Joshi Aarav',     Scheme: 'Namo Lakshmi',   'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'Bank record updated', 'Retry Window': 'Today' },
      { Student: 'Modi Bhumi',      Scheme: 'Namo Saraswati', 'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'NPCI confirmed',      'Retry Window': 'Today' },
      { Student: 'Trivedi Ishan',   Scheme: 'Namo Lakshmi',   'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'Bank record updated', 'Retry Window': 'Today' },
      { Student: 'Vyas Hetal',      Scheme: 'Namo Lakshmi',   'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'Bank record updated', 'Retry Window': 'Today' },
      { Student: 'Pandya Komal',    Scheme: 'Namo Saraswati', 'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'NPCI confirmed',      'Retry Window': 'Today' },
      { Student: 'Solanki Mira',    Scheme: 'Namo Saraswati', 'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'NPCI confirmed',      'Retry Window': 'Today' },
      { Student: 'Desai Aarav',     Scheme: 'Namo Lakshmi',   'Failure Reason': 'Aadhaar-bank mismatch', 'Correction': 'Bank record updated', 'Retry Window': 'Today' },
    ],
    insight: 'Run all 8 retries today — the correction window closes in 36 hours and successful retries clear ₹2.4 L of pending disbursement.',
    actions: [
      { id: 'open_payment_queue', label: '🏦 Open payment queue', type: 'TRIGGER', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
      { id: 'open_failed_queue',  label: '🔻 Open failed payments', type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
    ],
  },

  'pfms.lowest_success_districts': {
    answer: 'Dahod, Banaskantha, and Dang have the lowest payment success rates.',
    table: [
      { District: 'Dahod',       'Success Rate': '90.9%', 'Failed Last 7d': 64, 'Top Reason': 'Aadhaar-bank mismatch' },
      { District: 'Banaskantha', 'Success Rate': '92.4%', 'Failed Last 7d': 51, 'Top Reason': 'Beneficiary mismatch' },
      { District: 'Dang',        'Success Rate': '93.1%', 'Failed Last 7d': 22, 'Top Reason': 'Account frozen' },
      { District: 'Panchmahals', 'Success Rate': '93.6%', 'Failed Last 7d': 28, 'Top Reason': 'IFSC invalid' },
    ],
    insight: 'Dahod\'s root cause is Aadhaar-bank seeding gaps — the same campaign that helps the state-level retry queue applies here.',
    actions: [
      { id: 'open_failed_queue',  label: '🔻 Open failed payments',  type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
      { id: 'create_broadcast',   label: '📣 Send district campaign', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Aadhaar-bank seeding campaign', category: 'payment', targetRoles: ['deo','principal'], priority: 'high' } }, variant: 'ok' },
    ],
  },

  'pfms.batches_attention': {
    answer: '2 disbursement batches need attention before EOD.',
    table: [
      { 'Batch ID': 'BATCH-2026-04-014', Total: 412, Failed: 8,  'Status': 'Awaiting retry queue' },
      { 'Batch ID': 'BATCH-2026-04-015', Total: 386, Failed: 12, 'Status': 'NPCI mapping pending' },
    ],
    insight: 'Batch 014 is unblocked — push retries now. Batch 015 needs NPCI confirmation; raise a ticket with NPCI desk.',
    actions: [
      { id: 'open_payment_queue', label: '🏦 Open payment queue',     type: 'TRIGGER', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
      { id: 'open_failed_queue',  label: '🔻 Open failed payments',  type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
      { id: 'create_reminder',    label: '🔔 NPCI follow-up',          type: 'REMINDER', reminder: { title: 'NPCI mapping for BATCH-2026-04-015', message: 'Follow up with NPCI desk before EOD.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'pfms.pending_disbursement': {
    answer: '₹3.42 Cr is pending disbursement across the state — split between approved-not-paid and retry-eligible.',
    table: [
      { Bucket: 'Approved · queued for batch', Amount: '₹2.18 Cr', 'Avg Wait': '1.2 days' },
      { Bucket: 'Failed · retry eligible',     Amount: '₹0.24 Cr', 'Avg Wait': '4.6 days' },
      { Bucket: 'Failed · awaiting correction', Amount: '₹0.68 Cr', 'Avg Wait': '6.1 days' },
      { Bucket: 'Approved · seeding pending',  Amount: '₹0.32 Cr', 'Avg Wait': '3.5 days' },
    ],
    insight: 'Awaiting correction is the slowest bucket. Coordinate with district teams to push correction throughput.',
    actions: [
      { id: 'open_payment_queue', label: '🏦 Open payment queue',  type: 'TRIGGER', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
      { id: 'create_broadcast',   label: '📣 Notify districts',     type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Pending disbursement summary', category: 'payment', targetRoles: ['deo'], priority: 'high' } }, variant: 'ok' },
    ],
  },

  'pfms.payment_action_today': {
    answer: 'Run the 8 retry-eligible Aadhaar-bank cases and resolve Batch 014 before noon.',
    table: [
      { 'Priority': 1, Action: 'Run 8 retries (Aadhaar-bank seeded)', 'Time Needed': '20 min', Impact: 'Clears ₹2.4 L disbursement' },
      { 'Priority': 2, Action: 'Close Batch 014',                     'Time Needed': '15 min', Impact: 'Frees pipeline for next batch' },
      { 'Priority': 3, Action: 'Raise NPCI ticket for Batch 015',     'Time Needed': '10 min', Impact: 'Unblocks 12 stuck payments' },
    ],
    insight: 'All three actions complete in under 1 hour and clear the queue ahead of EOD reconciliation.',
    actions: [
      { id: 'open_failed_queue',  label: '🔻 Open failed payments',  type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
      { id: 'open_payment_queue', label: '🏦 Open payment queue',     type: 'TRIGGER', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
      { id: 'create_reminder',    label: '🔔 NPCI ticket reminder',    type: 'REMINDER', reminder: { title: 'NPCI ticket for BATCH-2026-04-015', message: 'Follow up at 11 AM.', priority: 'high' }, variant: 'ok' },
    ],
  },

  // ─── State prompts ─────────────────────────────────────────────────────────
  'state.scholarship_funnel': {
    answer: 'State scholarship funnel shows 81.8% end-to-end conversion from initiated to paid.',
    table: [
      { Stage: 'Initiated',     Count: '16,20,000', 'Drop-off': '—',                'Action Needed': 'Monitor' },
      { Stage: 'Submitted',     Count: '15,45,000', 'Drop-off': '75,000',           'Action Needed': 'Deadline reminders' },
      { Stage: 'Auto-rejected', Count: '78,000',    'Drop-off': '5.0%',             'Action Needed': 'Data correction campaign' },
      { Stage: 'Approved',      Count: '14,00,000', 'Drop-off': '1,45,000 pending', 'Action Needed': 'Approval backlog review' },
      { Stage: 'Paid',          Count: '13,25,000', 'Drop-off': '75,000 gap',       'Action Needed': 'PFMS failure cleanup' },
    ],
    insight: 'The largest actionable gap is between approved and paid. Payment failures and pending cycles should be reviewed with PFMS.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard',     type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'send_district_reminders', label: '📣 Send district reminders', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Funnel cleanup — district reminders', category: 'announcement', targetRoles: ['deo'], priority: 'high' } }, variant: 'ok' },
      { id: 'open_payment_queue',   label: '🏦 PFMS failure summary',     type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
    ],
  },

  'state.highest_risk_districts': {
    answer: '5 districts have distinct, high-priority risks needing different interventions.',
    table: [
      { District: 'Dahod',       'Risk Type': 'Payment success low',         Metric: '90.9%',           'Priority Action': 'Aadhaar-bank campaign' },
      { District: 'Banaskantha', 'Risk Type': 'Approval backlog',            Metric: '5,790 stuck',     'Priority Action': 'Escalate CRC review' },
      { District: 'Dang',        'Risk Type': 'Monsoon attendance impact',   Metric: '60% manual approvals', 'Priority Action': 'Policy threshold review' },
      { District: 'Kachchh',     'Risk Type': 'Pending approvals',           Metric: '4,780 stuck',     'Priority Action': 'Cluster follow-up' },
      { District: 'Panchmahals', 'Risk Type': 'Auto rejection high',         Metric: '7.2%',            'Priority Action': 'Document correction drive' },
    ],
    insight: 'Dahod, Banaskantha, and Dang need different interventions: payment cleanup, approval escalation, and monsoon policy handling.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open district comparison', type: 'TRIGGER', trigger: 'Task: district_dashboard', variant: 'primary' },
      { id: 'create_broadcast',     label: '📣 Create state notification', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'High-risk district interventions', category: 'announcement', targetRoles: ['deo'], priority: 'high' } }, variant: 'ok' },
      { id: 'open_monsoon',         label: '🌧 Open monsoon analysis',     type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
    ],
  },

  'state.deadline_reminders': {
    answer: '5 districts should receive deadline reminders this week.',
    table: [
      { District: 'Banaskantha', 'Pending Drafts': '8,420', 'Deadline Risk': 'High',   'Recommended Target': 'Teachers + CRC' },
      { District: 'Kachchh',     'Pending Drafts': '6,130', 'Deadline Risk': 'High',   'Recommended Target': 'Teachers' },
      { District: 'Dahod',       'Pending Drafts': '5,880', 'Deadline Risk': 'High',   'Recommended Target': 'BRC + Teachers' },
      { District: 'Panchmahals', 'Pending Drafts': '4,760', 'Deadline Risk': 'Medium', 'Recommended Target': 'Teachers' },
      { District: 'Narmada',     'Pending Drafts': '3,920', 'Deadline Risk': 'Medium', 'Recommended Target': 'CRC' },
    ],
    insight: 'Deadline reminders should target teachers first, then CRC/BRC for districts with approval backlogs.',
    actions: [
      { id: 'create_broadcast',           label: '📣 Create state broadcast',  type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Scholarship deadline reminder', category: 'namo_deadline', targetRoles: ['teacher','principal','crc'], priority: 'high' } }, variant: 'primary' },
      { id: 'target_teachers',            label: '👩‍🏫 Target teachers',          type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Scholarship deadline — teachers', category: 'namo_deadline', targetRoles: ['teacher'], priority: 'high' } }, variant: 'ok' },
      { id: 'target_not_state',           label: '👥 Target not-state users',    type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Scholarship deadline — not-state', category: 'namo_deadline', targetRoles: ['not_state'], priority: 'high' } }, variant: 'ok' },
      { id: 'open_notifications_center',  label: '🔔 Open notification center', type: 'CANVAS', canvas: { type: 'notifications', view: 'list' }, variant: 'primary' },
    ],
  },

  'state.lowest_payment_success': {
    answer: 'Dahod, Banaskantha, and Dang are the bottom 3 on payment success this cycle.',
    table: [
      { District: 'Dahod',       'Success Rate': '90.9%', 'Top Failure Reason': 'Aadhaar-bank mismatch', 'Failed Volume': 64 },
      { District: 'Banaskantha', 'Success Rate': '92.4%', 'Top Failure Reason': 'Beneficiary mismatch',   'Failed Volume': 51 },
      { District: 'Dang',        'Success Rate': '93.1%', 'Top Failure Reason': 'Account frozen',         'Failed Volume': 22 },
    ],
    insight: 'A targeted Aadhaar-bank seeding campaign in Dahod will move the state average by 0.8 pp on its own.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard',     type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'create_pfms_broadcast', label: '📣 Notify PFMS + DEOs',     type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Aadhaar-bank seeding campaign', category: 'payment', targetRoles: ['deo','pfms'], priority: 'high' } }, variant: 'ok' },
      { id: 'open_failed_queue',    label: '🔻 Open PFMS failure summary', type: 'TRIGGER', trigger: 'dv:canvas:payment-queue:failed', variant: 'err' },
    ],
  },

  'state.xamta_data_entry_districts': {
    answer: '6 districts are behind on XAMTA data entry — Bhuj is the largest backlog.',
    table: [
      { District: 'Kachchh (Bhuj)', 'Schools Pending': 17, 'Sheets Outstanding': 422, 'Risk': 'High' },
      { District: 'Banaskantha',    'Schools Pending': 14, 'Sheets Outstanding': 341, 'Risk': 'High' },
      { District: 'Panchmahals',    'Schools Pending': 11, 'Sheets Outstanding': 268, 'Risk': 'Medium' },
      { District: 'Dahod',          'Schools Pending': 9,  'Sheets Outstanding': 204, 'Risk': 'Medium' },
      { District: 'Narmada',        'Schools Pending': 7,  'Sheets Outstanding': 162, 'Risk': 'Medium' },
      { District: 'Dang',           'Schools Pending': 5,  'Sheets Outstanding': 98,  'Risk': 'Low' },
    ],
    insight: 'A two-day data-entry drive in Kachchh + Banaskantha clears 60% of state backlog.',
    actions: [
      { id: 'open_xamta_results', label: '📊 Open XAMTA report',     type: 'TRIGGER', trigger: 'Task: learning_outcomes', variant: 'primary' },
      { id: 'create_broadcast',   label: '📣 District XAMTA reminder', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'XAMTA data entry — clear backlog', category: 'xamta_data_entry', targetRoles: ['deo','principal'], priority: 'high' } }, variant: 'ok' },
    ],
  },

  'state.approval_backlog_districts': {
    answer: 'Banaskantha and Kachchh together hold 39% of state approval backlog.',
    table: [
      { District: 'Banaskantha', 'Pending Approvals': 5790, 'SLA Breaches': 412, 'Lead CRCs': 8 },
      { District: 'Kachchh',     'Pending Approvals': 4780, 'SLA Breaches': 318, 'Lead CRCs': 7 },
      { District: 'Dahod',       'Pending Approvals': 3920, 'SLA Breaches': 264, 'Lead CRCs': 6 },
      { District: 'Panchmahals', 'Pending Approvals': 3110, 'SLA Breaches': 192, 'Lead CRCs': 5 },
    ],
    insight: 'Borrowing 2 CRCs from low-load districts to Banaskantha for one week clears the SLA breach cluster.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard',  type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'create_broadcast',     label: '📣 Escalate to DEOs',       type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Approval backlog escalation', category: 'approval', targetRoles: ['deo','crc'], priority: 'urgent' } }, variant: 'err' },
    ],
  },

  'state.nl_vs_ns_performance': {
    answer: 'Namo Lakshmi outperforms Namo Saraswati on both submission and approval rates.',
    table: [
      { Scheme: 'Namo Lakshmi',   'Submission Rate': '94.6%', 'Approval Rate': '92.1%', 'Payment Success': '94.8%', 'Top Risk': 'Mother bank passbook' },
      { Scheme: 'Namo Saraswati', 'Submission Rate': '88.4%', 'Approval Rate': '85.3%', 'Payment Success': '91.7%', 'Top Risk': 'Seat verification' },
    ],
    insight: 'Namo Saraswati lags on submission — invest in marksheet + seat verification campaigns to close the gap.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard', type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'create_broadcast',     label: '📣 NS document campaign',  type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Namo Saraswati document drive', category: 'namo_deadline', targetRoles: ['teacher','principal'], priority: 'high' } }, variant: 'ok' },
    ],
  },

  'state.monsoon_impact': {
    answer: 'Monsoon districts show a 9-12 pp drop in attendance and 8-15% rise in manual approvals.',
    table: [
      { District: 'Dang',         'Attendance Δ': '-12 pp', 'Manual Approval Δ': '+15%', 'Payment Eligibility': 'Pressured' },
      { District: 'Valsad',       'Attendance Δ': '-10 pp', 'Manual Approval Δ': '+12%', 'Payment Eligibility': 'Pressured' },
      { District: 'Tapi',         'Attendance Δ': '-9 pp',  'Manual Approval Δ': '+10%', 'Payment Eligibility': 'Watch' },
      { District: 'Navsari',      'Attendance Δ': '-9 pp',  'Manual Approval Δ': '+8%',  'Payment Eligibility': 'Watch' },
    ],
    insight: 'Consider relaxing the attendance threshold by 5 pp for monsoon-affected districts during the cycle to avoid mass payment ineligibility.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard',     type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'create_broadcast',     label: '📣 Notify monsoon districts', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Monsoon policy threshold review', category: 'announcement', targetRoles: ['deo'], priority: 'high' } }, variant: 'ok' },
    ],
  },

  'state.top3_state_actions': {
    answer: '3 state actions this week will move the largest needles in scholarship and attendance.',
    table: [
      { 'Priority': 1, Action: 'Aadhaar-bank seeding campaign (Dahod, Banaskantha, Dang)', 'Owner': 'PFMS + DEO', Impact: 'Recovers ₹0.24 Cr disbursement' },
      { 'Priority': 2, Action: 'Approval backlog escalation (Banaskantha, Kachchh)',        'Owner': 'DEO + CRC',  Impact: 'Clears 9,500+ pending approvals' },
      { 'Priority': 3, Action: 'Monsoon attendance policy threshold review',                 'Owner': 'State Sec.', Impact: 'Avoids mass payment ineligibility' },
    ],
    insight: 'Items 1 and 2 are tactical (assign + monitor). Item 3 is policy — schedule a state cabinet review note.',
    actions: [
      { id: 'open_state_dashboard', label: '🏛 Open state dashboard', type: 'TRIGGER', trigger: 'Task: state_dashboard', variant: 'primary' },
      { id: 'create_broadcast',     label: '📣 Send state notification', type: 'CANVAS',  canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Top 3 state actions this week', category: 'announcement', targetRoles: ['deo','pfms'], priority: 'urgent' } }, variant: 'err' },
      { id: 'create_reminder',      label: '🔔 Schedule policy review',  type: 'REMINDER', reminder: { title: 'Monsoon policy threshold review', message: 'Cabinet briefing — relax attendance threshold for monsoon districts.', priority: 'high' }, variant: 'ok' },
    ],
  },

  'state.broadcast_recipients': {
    answer: 'Recommend a state broadcast to teachers + CRC for the deadline reminder, and to DEO + PFMS for the seeding campaign.',
    table: [
      { 'Broadcast': 'Scholarship deadline',         'Recommended Target': 'Teachers + CRC', 'Estimated Recipients': '5.4 lakh' },
      { 'Broadcast': 'Aadhaar-bank seeding campaign','Recommended Target': 'DEO + PFMS',     'Estimated Recipients': '188' },
      { 'Broadcast': 'Monsoon policy review',         'Recommended Target': 'DEO',            'Estimated Recipients': '33' },
    ],
    insight: 'Three broadcasts cover this week\'s state priorities. The deadline reminder should be the first one out.',
    actions: [
      { id: 'broadcast_deadline',  label: '📣 Deadline reminder', type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Scholarship deadline reminder', category: 'namo_deadline', targetRoles: ['teacher','crc'], priority: 'high' } }, variant: 'primary' },
      { id: 'broadcast_seeding',   label: '📣 Seeding campaign',  type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Aadhaar-bank seeding campaign', category: 'payment', targetRoles: ['deo','pfms'], priority: 'high' } }, variant: 'ok' },
      { id: 'broadcast_monsoon',   label: '📣 Monsoon review',     type: 'CANVAS', canvas: { type: 'notifications', view: 'broadcast', broadcastPrefill: { title: 'Monsoon policy threshold review', category: 'announcement', targetRoles: ['deo'], priority: 'high' } }, variant: 'ok' },
      { id: 'open_notifications',  label: '🔔 Open notifications', type: 'CANVAS', canvas: { type: 'notifications', view: 'list' }, variant: 'primary' },
    ],
  },
}

export function getResponse(promptId) {
  return RESPONSES[promptId] || null
}

export function getAllResponseIds() {
  return Object.keys(RESPONSES)
}
