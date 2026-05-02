// Hardcoded mock data shared across Ask AI responses.
//
// Kept as a tiny, self-contained set so prompts that mention the same student
// resolve to the same record (e.g. Aarav Desai always appears with attendance
// 72 / XAMTA 41). This lets demo storytelling stay coherent across prompts.
//
// IMPORTANT: This data is *only* used by Ask AI hardcoded responses. It is
// intentionally separate from the broader STUDENTS / mockData arrays — the
// goal is deterministic, demo-ready answers, not coverage of real records.

export const ASK_AI_TODAY = '30 Apr 2026'

// Application IDs used by Ask AI deep links (spec § 8.6 mapping).
export const ASK_AI_APP_IDS = {
  patel_kavya:    'NS2025GJ0011',
  shah_riya:      'NL2025GJ0007',
  diya_shah:      'NL2025GJ0012',
  ishita_nayak:   'NS2025GJ0018',
  vaghela_jaydeviba: 'NL2025GJ0019',
  prajapati_princy:  'NS2025GJ0020',
  dev_modi:          'NS2025GJ0021',
  om_desai:          'NS2025GJ0010',
  riya_praja:        'NL2025GJ0022',
  harsh_vaghela:     'NS2025GJ0023',
}

// Compact student shape used inside Ask AI responses. `class` is the user-
// facing class label (string); `appId` is optional and points at the canonical
// student application id when one exists.
export const ASK_AI_STUDENTS = {
  aarav_desai:        { name: 'Aarav Desai',        klass: 'Class 6',          attendance: 72, xamta: 41, risk: 'High' },
  nisha_parma:        { name: 'Nisha Parma',        klass: 'Class 6',          attendance: 88, xamta: 38, risk: 'High' },
  harsh_vaghela:      { name: 'Harsh Vaghela',      klass: 'Class 11 Science', attendance: 68, xamta: 55, risk: 'High',   appId: ASK_AI_APP_IDS.harsh_vaghela },
  ishit_dabhi:        { name: 'Ishit Dabhi',        klass: 'Class 6',          attendance: 82, xamta: 57, risk: 'Medium' },
  tanvi_panchal:      { name: 'Tanvi Panchal',      klass: 'Class 7',          attendance: 80.1, xamta: 61, risk: 'Medium' },
  jay_mehta:          { name: 'Jay Mehta',          klass: 'Class 8',          attendance: 73, xamta: 64, risk: 'Medium' },
  diya_shah:          { name: 'Diya Shah',          klass: 'Class 10',         attendance: 71, xamta: 62, risk: 'Medium', appId: ASK_AI_APP_IDS.diya_shah },
  riya_praja:         { name: 'Riya Praja',         klass: 'Class 9',          attendance: 74, xamta: 60, risk: 'Medium', appId: ASK_AI_APP_IDS.riya_praja },
  dev_modi:           { name: 'Dev Modi',           klass: 'Class 12 Science', attendance: 73, xamta: 70, risk: 'Medium', appId: ASK_AI_APP_IDS.dev_modi },
  om_desai:           { name: 'Om Desai',           klass: 'Class 11 Science', attendance: 86, xamta: 64, risk: 'Low',    appId: ASK_AI_APP_IDS.om_desai },
  vaghela_jaydeviba:  { name: 'Vaghela Jaydeviba',  klass: 'Class 9',          attendance: 82, xamta: 67, risk: 'Low',    appId: ASK_AI_APP_IDS.vaghela_jaydeviba },
  prajapati_princy:   { name: 'Prajapati Princy',   klass: 'Class 11 Science', attendance: 84, xamta: 65, risk: 'Low',    appId: ASK_AI_APP_IDS.prajapati_princy },
  patel_kavya:        { name: 'Patel Kavya',        klass: 'Class 11 Science', attendance: 89, xamta: 78, risk: 'Low',    appId: ASK_AI_APP_IDS.patel_kavya },
  shah_riya:          { name: 'Shah Riya',          klass: 'Class 10',         attendance: 86, xamta: 72, risk: 'Low',    appId: ASK_AI_APP_IDS.shah_riya },
  ishita_nayak:       { name: 'Ishita Nayak',       klass: 'Class 12 Science', attendance: 82, xamta: 73, risk: 'Low',    appId: ASK_AI_APP_IDS.ishita_nayak },
  om_trive:           { name: 'Om Trive',           klass: 'Class 6',          attendance: 80.5, xamta: 66, risk: 'Low' },
}

// Convenience lookup by friendly name (case-insensitive).
export function findStudentByName(query) {
  if (!query) return null
  const q = String(query).trim().toLowerCase()
  return Object.values(ASK_AI_STUDENTS).find(s => s.name.toLowerCase() === q) || null
}
