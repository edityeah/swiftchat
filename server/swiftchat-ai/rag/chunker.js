// Markdown → chunk[] for embedding.
//
// Strategy:
//  - Split each .md by `## ` headings — every section becomes one chunk.
//  - If a section is bigger than MAX_CHARS, split further by paragraphs so
//    each chunk fits inside the embedding model's input window.
//  - Carry section titles and source filename forward so retrieval can show
//    proper citations.
//
// Each chunk: { content, source, section, module, role_scope }

const MAX_CHARS = 1800   // ~450 tokens — well below text-embedding-004's 2048
const MIN_CHARS = 80     // skip tiny scraps

// Front-matter conventions for the markdown files. We keep them implicit so
// the writer doesn't have to add YAML headers — derive `module` from the
// filename and let `role_scope` default to global.
const SOURCE_TO_MODULE = {
  'swiftchat_overview.md':         null,
  'attendance_workflows.md':       'attendance',
  'xamta_workflows.md':            'xamta',
  'class_dashboard_workflows.md':  'class_dashboard',
  'digivritti_overview.md':        'digivritti',
  'namo_lakshmi_policy.md':        'digivritti',
  'namo_saraswati_policy.md':      'digivritti',
  'pfms_payment_process.md':       'digivritti',
  'role_action_matrix.md':         null,
  'faq.md':                        null,
}

export function chunkMarkdown({ source, text }) {
  const module = SOURCE_TO_MODULE[source] ?? null
  const role_scope = []   // global by default

  // Split on `## ` headings, keeping the heading text with the section body.
  const sections = []
  const lines = text.split(/\r?\n/)
  let current = { section: null, body: [] }
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current.body.length) sections.push(current)
      current = { section: line.replace(/^##\s+/, '').trim(), body: [] }
    } else if (/^#\s+/.test(line)) {
      // Top-level title — skip (filename + section already capture this).
    } else {
      current.body.push(line)
    }
  }
  if (current.body.length) sections.push(current)

  const out = []
  for (const sec of sections) {
    const body = sec.body.join('\n').trim()
    if (body.length < MIN_CHARS) continue
    if (body.length <= MAX_CHARS) {
      out.push({
        content: prefixedContent(source, sec.section, body),
        source, section: sec.section, module, role_scope,
      })
    } else {
      // Sub-chunk by paragraph.
      const paragraphs = body.split(/\n{2,}/)
      let buf = []
      let bufLen = 0
      for (const p of paragraphs) {
        const ps = p.trim()
        if (!ps) continue
        if (bufLen + ps.length > MAX_CHARS && buf.length) {
          out.push({
            content: prefixedContent(source, sec.section, buf.join('\n\n')),
            source, section: sec.section, module, role_scope,
          })
          buf = []
          bufLen = 0
        }
        buf.push(ps)
        bufLen += ps.length + 2
      }
      if (buf.length) {
        out.push({
          content: prefixedContent(source, sec.section, buf.join('\n\n')),
          source, section: sec.section, module, role_scope,
        })
      }
    }
  }

  return out
}

// Prefix the chunk's actual content with a tiny header so the embedding
// captures the section context, and so retrieval prompts can show "[source · section] body".
function prefixedContent(source, section, body) {
  const tag = `[${source}${section ? ' · ' + section : ''}]`
  return `${tag}\n${body}`
}
