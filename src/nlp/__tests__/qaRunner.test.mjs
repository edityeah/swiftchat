// SwiftChat global NLP/RAG — multilingual QA test runner.
//
// Layered execution:
//   Layer 1 — local pattern matcher (routeIntentSync). Always runs.
//   Layer 2 — remote /message endpoint (Groq + Supabase RAG). Runs only when
//             VITE_SWIFTCHAT_AI_API_URL (or SWIFTCHAT_AI_API_URL) is set,
//             AND the case is either RAG-only OR local returned 'unknown'.
//
// Usage:
//   # local-only
//   node src/nlp/__tests__/qaRunner.test.mjs
//
//   # with remote (start the backend first; see server/swiftchat-ai/README.md)
//   VITE_SWIFTCHAT_AI_API_URL=http://localhost:8787 node src/nlp/__tests__/qaRunner.test.mjs
//
// Each case has the canonical shape:
//   {
//     id, module, language, input, role,
//     expect: {
//       responseType: 'action'|'answer'|'clarify'|'confirm'|'denied'|'unknown',
//       actionId,                  // required when responseType='action' or 'confirm'
//       entities,                  // partial subset; only listed keys are checked
//       answerSource,              // single expected source filename (RAG)
//       answerSourceAnyOf,         // OR — array; any one match passes
//       shouldRequireConfirmation,
//       shouldBeDenied
//     },
//     needsRemote                  // optional. true → cases that legitimately need Groq.
//   }
//
// Output: per-case PASS/FAIL/SKIP with the resolution layer (local | remote).
// Final summary: pass / fail / skipped counts. Exit code = number of failures.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { routeIntentSync } from '../globalIntentRouter.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CASES_PATH = path.resolve(__dirname, 'qaCases.json')

const REMOTE_URL = (process.env.VITE_SWIFTCHAT_AI_API_URL || process.env.SWIFTCHAT_AI_API_URL || '').trim() || null
const REMOTE_TIMEOUT_MS = 10000   // RAG can take a couple of seconds for first cold request

// ── kind → responseType mapping (router → test contract) ───────────────────
function localKindToResponseType(kind) {
  switch (kind) {
    case 'execute':           return 'action'
    case 'answer':            return 'answer'
    case 'clarify':           return 'clarify'
    case 'confirm':           return 'confirm'
    case 'denied':            return 'denied'
    case 'module-fallback':   return 'unknown'
    case 'unknown':
    default:                  return 'unknown'
  }
}

// ── shape comparators ──────────────────────────────────────────────────────
function checkEntities(actual = {}, expected = {}) {
  for (const [k, v] of Object.entries(expected)) {
    if (actual?.[k] !== v) {
      return { ok: false, reason: `entities.${k} expected="${v}" got="${actual?.[k]}"` }
    }
  }
  return { ok: true }
}

function checkActionId(actualId, expectedId) {
  if (!expectedId) return { ok: true }
  if (actualId !== expectedId) {
    return { ok: false, reason: `actionId expected="${expectedId}" got="${actualId}"` }
  }
  return { ok: true }
}

function checkAnswerSource(citations, expect) {
  if (!citations || citations.length === 0) {
    return { ok: false, reason: 'no citations on answer response' }
  }
  const sources = citations.map(c => c.source)
  if (expect.answerSource) {
    if (!sources.includes(expect.answerSource)) {
      return { ok: false, reason: `expected source "${expect.answerSource}" not in citations [${sources.join(', ')}]` }
    }
  }
  if (Array.isArray(expect.answerSourceAnyOf) && expect.answerSourceAnyOf.length) {
    if (!expect.answerSourceAnyOf.some(s => sources.includes(s))) {
      return { ok: false, reason: `expected one of [${expect.answerSourceAnyOf.join(', ')}], got [${sources.join(', ')}]` }
    }
  }
  return { ok: true }
}

// Compare a normalized (responseType, actionId, entities, citations[]) tuple
// against the expectation. Used by both the local and remote paths.
function compareTuple({ responseType, actionId, entities, citations }, expect) {
  if (expect.responseType !== responseType) {
    return { ok: false, reason: `responseType expected="${expect.responseType}" got="${responseType}"` }
  }
  // shouldBeDenied is implied by responseType='denied' but enforce both for clarity.
  if (expect.shouldBeDenied && responseType !== 'denied') {
    return { ok: false, reason: `expected denial but got "${responseType}"` }
  }
  if (expect.shouldRequireConfirmation && responseType !== 'confirm') {
    return { ok: false, reason: `expected confirm but got "${responseType}"` }
  }

  if (responseType === 'action' || responseType === 'confirm' || responseType === 'clarify') {
    const a = checkActionId(actionId, expect.actionId)
    if (!a.ok) return a
    const e = checkEntities(entities, expect.entities || {})
    if (!e.ok) return e
  }

  if (responseType === 'answer') {
    const c = checkAnswerSource(citations, expect)
    if (!c.ok) return c
  }
  return { ok: true }
}

// ── local resolver ─────────────────────────────────────────────────────────
function runLocal(c) {
  const r = routeIntentSync({ text: c.input, role: c.role })
  return {
    responseType: localKindToResponseType(r.kind),
    actionId: r.action?.id || (r.pendingAction?.actionId || null),
    entities: r.entities || {},
    citations: [],
    raw: r,
  }
}

// ── remote resolver ────────────────────────────────────────────────────────
async function runRemote(c) {
  if (!REMOTE_URL) return null
  const url = REMOTE_URL.replace(/\/$/, '') + '/message'
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), REMOTE_TIMEOUT_MS)
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: c.input, role: c.role, language: c.language || 'auto' }),
      signal: ctl.signal,
    })
    if (!resp.ok) {
      // Surface the server's error body so failures are diagnosable.
      const body = await resp.text().catch(() => '')
      return { error: `HTTP ${resp.status}${body ? ` — ${body.slice(0, 200)}` : ''}` }
    }
    const json = await resp.json()
    if (!json) return { error: 'no JSON' }

    if (json.responseType === 'answer') {
      return {
        responseType: 'answer',
        actionId: null,
        entities: {},
        citations: Array.isArray(json.citations) ? json.citations : [],
        raw: json,
      }
    }
    // action shape — also covers confirm + denied + clarify-equivalents
    let responseType = 'action'
    if (!json.intent)                    responseType = 'unknown'
    else if (json.requiresConfirmation)  responseType = 'confirm'
    return {
      responseType,
      actionId: json.intent || null,
      entities: json.entities || {},
      citations: [],
      raw: json,
    }
  } catch (err) {
    return { error: err?.message || String(err) }
  } finally {
    clearTimeout(t)
  }
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const cases = JSON.parse(await readFile(CASES_PATH, 'utf8'))
  console.log(`Running ${cases.length} cases${REMOTE_URL ? ` (remote: ${REMOTE_URL})` : ' (local-only)'}\n`)

  const tally = { pass: 0, fail: 0, skip: 0, byLayer: { local: 0, remote: 0 } }
  const failures = []

  for (const c of cases) {
    const tag = `[${c.module.padEnd(15)} · ${c.language.padEnd(5)}] ${c.id.padEnd(34)} "${truncate(c.input, 48)}"`

    // ── Layer 1: local ──
    const local = runLocal(c)
    let cmp = compareTuple(local, c.expect)
    if (cmp.ok) {
      console.log(`✅ ${tag}  [local]`)
      tally.pass++
      tally.byLayer.local++
      continue
    }

    // ── Layer 2: remote ──
    if (!REMOTE_URL) {
      // Local missed AND no remote configured.
      if (c.needsRemote) {
        console.log(`⏭  ${tag}  [skipped — needs remote, no URL]`)
        tally.skip++
        continue
      }
      console.log(`❌ ${tag}  [local] ${cmp.reason}`)
      tally.fail++
      failures.push({ id: c.id, layer: 'local', reason: cmp.reason })
      continue
    }

    const remote = await runRemote(c)
    if (!remote || remote.error) {
      console.log(`❌ ${tag}  [remote] ${remote?.error || 'no response'}`)
      tally.fail++
      failures.push({ id: c.id, layer: 'remote', reason: remote?.error || 'no response' })
      continue
    }
    cmp = compareTuple(remote, c.expect)
    if (cmp.ok) {
      console.log(`✅ ${tag}  [remote]`)
      tally.pass++
      tally.byLayer.remote++
    } else {
      console.log(`❌ ${tag}  [remote] ${cmp.reason}`)
      tally.fail++
      failures.push({ id: c.id, layer: 'remote', reason: cmp.reason })
    }
  }

  console.log('')
  console.log('───────────────────────────────────────────────────────────────────────')
  console.log(`Results — pass: ${tally.pass}   fail: ${tally.fail}   skipped: ${tally.skip}`)
  console.log(`         local-resolved: ${tally.byLayer.local}    remote-resolved: ${tally.byLayer.remote}`)
  if (!REMOTE_URL && tally.skip > 0) {
    console.log('')
    console.log('To exercise the skipped (RAG / remote-only) cases:')
    console.log('  1. cd server/swiftchat-ai && cp .env.example .env && npm install && npm run dev')
    console.log('  2. (one-time) run rag/schema.sql in Supabase, then `npm run ingest` in the backend')
    console.log('  3. VITE_SWIFTCHAT_AI_API_URL=http://localhost:8787 node src/nlp/__tests__/qaRunner.test.mjs')
  }
  if (failures.length) {
    console.log('')
    console.log('Failures:')
    for (const f of failures) console.log(`  · ${f.id}  [${f.layer}]  ${f.reason}`)
  }

  process.exit(tally.fail === 0 ? 0 : 1)
}

function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

main().catch(err => {
  console.error(err)
  process.exit(1)
})
