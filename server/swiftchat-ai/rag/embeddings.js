// Gemini embedding wrapper (REST — no extra SDK).
//
// embed(text)         → number[OUTPUT_DIM]
// embedBatch(texts[]) → number[OUTPUT_DIM][]
//
// Default model: `gemini-embedding-001` — Google's current production
// embedding model (the older `text-embedding-004` is deprecated for newer
// API keys and returns 404). It natively returns 3072 dims; we ask for 768
// via `outputDimensionality` so the schema's `vector(768)` column stays
// compatible without re-running the migration.
//
// To override the model or dim, set in .env:
//   GEMINI_EMBEDDING_MODEL=gemini-embedding-001
//   GEMINI_EMBEDDING_DIM=768

const MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
const OUTPUT_DIM = Number(process.env.GEMINI_EMBEDDING_DIM || 768)
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`
const BATCH_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`

function apiKey() {
  const k = process.env.GEMINI_API_KEY
  if (!k) throw new Error('GEMINI_API_KEY missing')
  return k
}

// Different task types can improve retrieval quality. The query side uses a
// different prefix than the document side at training time.
function taskType(role) {
  return role === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
}

// `output_dimensionality` is supported by gemini-embedding-001. The older
// embedding-001 ignores the field, which is fine — it just returns 768 dims.
function singleBody(text, role) {
  return {
    content: { parts: [{ text }] },
    taskType: taskType(role),
    outputDimensionality: OUTPUT_DIM,
  }
}

function batchEntry(text, role) {
  return {
    model: `models/${MODEL}`,
    content: { parts: [{ text }] },
    taskType: taskType(role),
    outputDimensionality: OUTPUT_DIM,
  }
}

export async function embed(text, { role = 'document' } = {}) {
  const resp = await fetch(`${ENDPOINT}?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(singleBody(text, role)),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Gemini embed failed: ${resp.status} ${body}`)
  }
  const data = await resp.json()
  const values = data?.embedding?.values
  if (!Array.isArray(values)) throw new Error('Gemini embed: missing values')
  return values
}

// Embed many strings in batches of 100.
export async function embedBatch(texts, { role = 'document' } = {}) {
  const out = []
  const BATCH = 100
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const requests = slice.map(t => batchEntry(t, role))
    const resp = await fetch(`${BATCH_ENDPOINT}?key=${apiKey()}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Gemini batchEmbed failed: ${resp.status} ${body}`)
    }
    const data = await resp.json()
    const embeddings = data?.embeddings || []
    for (const e of embeddings) {
      if (!Array.isArray(e?.values)) throw new Error('Gemini batchEmbed: missing values')
      out.push(e.values)
    }
  }
  return out
}
