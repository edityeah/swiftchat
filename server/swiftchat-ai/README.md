# SwiftChat AI Backend

Express server for the SwiftChat NLP layer. Two responsibilities:

1. **Action intent classification** (Phase 2) — turns natural-language messages into safe action IDs the frontend dispatches via `permissionGuard` + `actionRegistry`.
2. **RAG-grounded answers** (Phase 3) — answers explanation/help/policy questions from a Supabase pgvector knowledge base, with citations.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/message` | Orchestrator. Picks action OR answer based on the input. **The frontend uses this.** |
| `POST` | `/interpret` | Action intent only (Phase 2). |
| `POST` | `/rag/query` | RAG only (Phase 3). |
| `GET`  | `/healthz` | Health check. |

### `/message` request
```json
{ "text": "Namo Saraswati eligibility kya hai?", "role": "teacher", "language": "auto" }
```

### `/message` responses
```jsonc
// Action shape
{
  "responseType": "action",
  "intent": "OPEN_REJECTED_APPLICATIONS",
  "module": "digivritti",
  "entities": { "question": "..." },
  "confidence": 0.92,
  "assistantText": "...",
  "requiresConfirmation": false,
  "chips": [],
  "language": "hi-en"
}

// Answer shape (RAG)
{
  "responseType": "answer",
  "assistantText": "Namo Saraswati requires Class 10 ≥ 50% with Science stream...",
  "language": "hi-en",
  "citations": [
    { "source": "namo_saraswati_policy.md", "section": "Eligibility" },
    { "source": "digivritti_overview.md",   "section": "Application lifecycle" }
  ]
}
```

The frontend re-validates every `intent` against `actionRegistry` and runs it through `permissionGuard` before executing — the LLM never executes anything itself. Answers are render-only; no actions fire.

---

## One-time setup

### 1. Install backend deps
```bash
cd server/swiftchat-ai
cp .env.example .env
# Edit .env — set GROQ_API_KEY, GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
npm install
```

### 2. Create the Supabase schema
Open the Supabase SQL editor for your project and paste the contents of `rag/schema.sql`. This:
- enables `pgvector`
- creates the `knowledge_chunks` table (768-dim embeddings)
- creates the `match_knowledge_chunks(...)` retrieval RPC

### 3. Ingest the knowledge base
```bash
npm run ingest
# or:  node rag/ingest.js          (full re-ingest, truncates first)
# or:  node rag/ingest.js --append (append without truncating)
```

This reads every `.md` under `data/knowledge/`, splits each section into ~450-token chunks, embeds each chunk with Gemini `text-embedding-004`, and inserts into `knowledge_chunks`. Re-run any time you edit the markdown.

### 4. Start the backend
```bash
npm run dev
```
Listens on `http://localhost:8787`. Hit `GET /healthz` to confirm.

### 5. Wire the frontend
At the project root (alongside `package.json`):
```
VITE_SWIFTCHAT_AI_API_URL=http://localhost:8787
```
Then `npm run dev` from the project root. The frontend's `aiBootstrap` registers this URL with `registerRemoteInterpreter()`.

If the env var is absent or the server is unreachable, the frontend silently falls back to local-only NLP — nothing breaks.

---

## Testing

### Local NLP (no backend required)
```bash
node src/nlp/__tests__/intentRouter.test.mjs
```

### End-to-end RAG (requires backend)
With the backend running and the knowledge base ingested, type these in the SwiftChat chat composer (any role):

- "Namo Saraswati eligibility kya hai?" → answers from `namo_saraswati_policy.md`
- "PFMS retry process explain karo" → answers from `pfms_payment_process.md`
- "Attendance kaise mark karu?" → answers from `attendance_workflows.md`
- "XAMTA scan kya karta hai?" → answers from `xamta_workflows.md`
- "Mother Aadhaar kyun required hai?" → answers from `faq.md` + `namo_lakshmi_policy.md`
- "CRC approval ka process kya hai?" → answers from `digivritti_overview.md` + `role_action_matrix.md`

You should see a knowledge card with the answer body + a "Sources" chip strip below.

### Direct backend tests
```bash
# action intent
curl -s http://localhost:8787/interpret -H 'content-type: application/json' \
  -d '{"text":"Mere rejected students dikhao","role":"teacher"}' | jq

# RAG answer
curl -s http://localhost:8787/rag/query -H 'content-type: application/json' \
  -d '{"question":"Namo Saraswati eligibility kya hai?","role":"teacher","language":"auto"}' | jq

# orchestrator (recommended)
curl -s http://localhost:8787/message -H 'content-type: application/json' \
  -d '{"text":"PFMS retry process explain karo","role":"pfms","language":"auto"}' | jq
```

---

## Knowledge base

Source markdowns under `data/knowledge/`:

| File | Topic |
|---|---|
| `swiftchat_overview.md` | What SwiftChat is, roles, modules, navigation |
| `attendance_workflows.md` | How to mark attendance, multilingual phrasings |
| `xamta_workflows.md` | XAMTA scanner workflow + privacy |
| `class_dashboard_workflows.md` | Class / school / district / state dashboards |
| `digivritti_overview.md` | DigiVritti application lifecycle + roles |
| `namo_lakshmi_policy.md` | Namo Lakshmi scheme details |
| `namo_saraswati_policy.md` | Namo Saraswati scheme details |
| `pfms_payment_process.md` | PFMS payment lifecycle, failures, retry |
| `role_action_matrix.md` | Role × action permission matrix |
| `faq.md` | Common questions |

Edit any file → run `npm run ingest` → answers refresh.

## Architecture

```
user message
  └─► /message orchestrator
        ├─► looks-like-question?  ─yes─►  RAG (Gemini embed → Supabase ANN → Groq synthesize)
        └─► no
              ├─► /interpret (Groq classifier, grounded in catalog)
              ├─► confidence ≥ 0.6 → return action
              └─► else → RAG fallback
```

**Hard guarantees**
- LLM never executes anything. It only proposes an `intent` (validated by frontend) or an `assistantText` (rendered as an answer card).
- Backend unreachable → frontend continues on local-only NLP.
- RAG below similarity floor (`MIN_SIMILARITY = 0.55`) → "I don't have enough information yet" rather than hallucinated content.
- Role gating happens twice: once in the Groq prompt (action catalog filtered by role), once in the frontend's `permissionGuard`.
