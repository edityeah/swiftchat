// Ingest: read every .md under data/knowledge → chunk → embed → upsert into
// `knowledge_chunks`.
//
// Usage:
//   cd server/swiftchat-ai
//   node rag/ingest.js                 # full re-ingest (truncates table first)
//   node rag/ingest.js --append        # append without truncating
//
// Required env (server/swiftchat-ai/.env):
//   SUPABASE_URL=https://xxxxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
//   GEMINI_API_KEY=xxxxx

import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { chunkMarkdown } from './chunker.js'
import { embedBatch } from './embeddings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_DIR = path.resolve(__dirname, '..', 'data', 'knowledge')

function sb() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  // service-role bypasses RLS — only use server-side.
  return createClient(url, key, { auth: { persistSession: false } })
}

async function main() {
  const append = process.argv.includes('--append')
  const supabase = sb()

  // Read all .md files from the knowledge dir.
  const files = (await readdir(KNOWLEDGE_DIR)).filter(f => f.endsWith('.md')).sort()
  if (files.length === 0) {
    console.error('No .md files found under', KNOWLEDGE_DIR)
    process.exit(1)
  }

  console.log(`Reading ${files.length} markdown files…`)
  const allChunks = []
  for (const file of files) {
    const text = await readFile(path.join(KNOWLEDGE_DIR, file), 'utf8')
    const chunks = chunkMarkdown({ source: file, text })
    console.log(`  · ${file} → ${chunks.length} chunks`)
    allChunks.push(...chunks)
  }
  console.log(`Total chunks: ${allChunks.length}`)

  if (!append) {
    console.log('Truncating knowledge_chunks…')
    const { error } = await supabase.from('knowledge_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw new Error('truncate failed: ' + error.message)
  }

  // Embed in batches of 100 (Gemini's batchEmbedContents limit).
  console.log('Embedding via Gemini…')
  const vectors = await embedBatch(allChunks.map(c => c.content), { role: 'document' })
  if (vectors.length !== allChunks.length) {
    throw new Error(`Embedding count mismatch: chunks=${allChunks.length} vectors=${vectors.length}`)
  }
  console.log(`  · got ${vectors.length} vectors of dim ${vectors[0]?.length}`)

  // Insert in pages of 50 to keep the request size reasonable.
  console.log('Upserting into Supabase…')
  const PAGE = 50
  for (let i = 0; i < allChunks.length; i += PAGE) {
    const slice = allChunks.slice(i, i + PAGE).map((c, j) => ({
      content: c.content,
      source: c.source,
      section: c.section,
      module: c.module,
      role_scope: c.role_scope,
      embedding: vectors[i + j],
    }))
    const { error } = await supabase.from('knowledge_chunks').insert(slice)
    if (error) throw new Error(`insert page failed: ${error.message}`)
    console.log(`  · ${Math.min(i + PAGE, allChunks.length)}/${allChunks.length}`)
  }

  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
