// SwiftChat NLP — sample-case test runner.
//
// No test framework dependency — runnable directly with:
//   node src/nlp/__tests__/intentRouter.test.mjs
//
// Asserts that the deterministic local pattern matcher (Layer 1 of the NLP
// pipeline) classifies the spec's five sample phrases correctly without
// involving Groq. Phrases that legitimately need the LLM are marked as
// expected-fallthrough — the test passes when local returns `unknown` for
// those, since that's exactly the trigger to call Groq.

import { routeIntentSync } from '../globalIntentRouter.js'

const CASES = [
  {
    label: 'Mere rejected students dikhao',
    role: 'teacher',
    expect: { kind: 'execute', actionId: 'OPEN_REJECTED_APPLICATIONS' },
  },
  {
    label: 'Class 7 ni hajri mark karvi chhe',
    role: 'teacher',
    // Local pattern catches "hajri" → OPEN_MARK_ATTENDANCE; entity.class=7 is
    // pre-extracted so the action runs without a clarify step.
    expect: { kind: 'execute', actionId: 'OPEN_MARK_ATTENDANCE', entities: { class: '7' } },
  },
  {
    label: 'Kavya ka form fix karna hai',
    role: 'teacher',
    // No deterministic keyword fires here. Local SHOULD return unknown so
    // Groq can take over and infer OPEN_REJECTED_APPLICATIONS.
    expect: { kind: 'unknown', remoteIntent: 'OPEN_REJECTED_APPLICATIONS' },
  },
  {
    label: 'PFMS failed payments batao',
    role: 'pfms',
    expect: { kind: 'execute', actionId: 'OPEN_PAYMENT_QUEUE', entities: { paymentFilter: 'failed' } },
  },
  {
    label: 'Monsoon impact analysis dikhao',
    role: 'state_secretary',
    // Local maps any "scholarship/digivritti"-flavoured ask to the AI menu;
    // the deep-dive itself is then accessible from the menu chip. The Groq
    // path can route it directly to RUN_DIGIVRITTI_QUERY.
    expect: { kind: 'unknown', remoteIntent: 'RUN_DIGIVRITTI_QUERY' },
  },
]

let pass = 0, fail = 0
for (const c of CASES) {
  const r = routeIntentSync({ text: c.label, role: c.role })
  const ok = matches(r, c.expect)
  if (ok) {
    pass++
    console.log(`✅ "${c.label}" [${c.role}]`)
    console.log(`   kind=${r.kind}` + (r.action ? ` action=${r.action.id}` : '') +
      (r.entities && Object.keys(r.entities).length ? ` entities=${JSON.stringify(r.entities)}` : ''))
  } else {
    fail++
    console.log(`❌ "${c.label}" [${c.role}]`)
    console.log('   expected', c.expect)
    console.log('   got     ', summarize(r))
  }
}

console.log('')
console.log(`${pass}/${CASES.length} passed${fail ? ` (${fail} failed)` : ''}`)
console.log('')
console.log('Cases marked "remoteIntent" intentionally fall through to Groq.')
console.log('To exercise the Groq path end-to-end:')
console.log('  1. cd server/swiftchat-ai && cp .env.example .env && npm install && npm run dev')
console.log('  2. echo "VITE_SWIFTCHAT_AI_API_URL=http://localhost:8787" >> .env  (project root)')
console.log('  3. npm run dev (project root)')
console.log('  4. Type the phrase in the SwiftChat composer.')

process.exit(fail === 0 ? 0 : 1)

// ── helpers ────────────────────────────────────────────────────────────────
function matches(r, expect) {
  if (expect.kind && r.kind !== expect.kind) return false
  if (expect.actionId) {
    if (!r.action || r.action.id !== expect.actionId) return false
  }
  if (expect.entities) {
    for (const [k, v] of Object.entries(expect.entities)) {
      if (!r.entities || r.entities[k] !== v) return false
    }
  }
  return true
}

function summarize(r) {
  return {
    kind: r.kind,
    action: r.action?.id,
    entities: r.entities,
    reason: r.reason,
  }
}
