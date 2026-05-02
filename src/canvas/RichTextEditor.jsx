import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'

const TOOLBAR = [
  { cmd: 'bold',             icon: 'B',  title: 'Bold'          },
  { cmd: 'italic',           icon: 'I',  title: 'Italic'        },
  { cmd: 'underline',        icon: 'U',  title: 'Underline'     },
  { cmd: 'insertOrderedList',icon: '1.', title: 'Ordered list'  },
  { cmd: 'insertUnorderedList',icon:'•', title: 'Bullet list'   },
]

export default function RichTextEditor({ context }) {
  const { showToast } = useApp()
  const editorRef = useRef(null)
  const [title, setTitle] = useState(context?.botName ? `${context.botName} — Notes` : 'Untitled Note')
  const [saved, setSaved] = useState(false)

  const exec = cmd => { document.execCommand(cmd, false, null); editorRef.current?.focus() }

  const save = () => {
    setSaved(true)
    showToast('Note saved ✓', 'ok')
    setTimeout(() => setSaved(false), 3000)
  }

  const print = () => {
    const html = editorRef.current?.innerHTML || ''
    const win = window.open('', '_blank')
    if (!win) { showToast('Allow popups to print', 'e'); return }
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:auto;color:#1A1F36}h1{font-size:20px;margin-bottom:20px;font-weight:700}p,li{font-size:14px;line-height:1.7}</style>
      </head><body><h1>${title}</h1>${html}</body></html>`)
    win.print()
    win.close()
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full text-[14px] font-bold text-txt-primary bg-transparent border-none outline-none border-b border-bdr pb-1.5"
        placeholder="Note title…"
      />

      {/* Toolbar */}
      <div className="flex gap-1 flex-wrap">
        {TOOLBAR.map(btn => (
          <button
            key={btn.cmd}
            onMouseDown={e => { e.preventDefault(); exec(btn.cmd) }}
            title={btn.title}
            className="w-8 h-8 rounded-lg border border-bdr text-[12px] font-bold text-txt-secondary hover:bg-surface-secondary hover:border-primary hover:text-primary transition-colors"
          >
            {btn.icon}
          </button>
        ))}
        <button
          onMouseDown={e => { e.preventDefault(); exec('formatBlock') }}
          className="px-2 h-8 rounded-lg border border-bdr text-[10px] font-bold text-txt-secondary hover:bg-surface-secondary transition-colors"
        >
          H2
        </button>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Start writing your notes here…"
        className="flex-1 min-h-[160px] text-[13px] text-txt-primary leading-relaxed outline-none border border-bdr rounded-xl p-3 focus:border-primary transition-colors"
      />

      <div className="flex gap-2">
        <button
          onClick={save}
          className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${
            saved ? 'bg-ok text-white' : 'bg-primary text-white active:opacity-80'
          }`}
        >
          {saved ? '✅ Saved' : '💾 Save'}
        </button>
        <button
          onClick={print}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold border border-primary text-primary active:bg-primary-light transition-colors"
        >
          🖨 Print PDF
        </button>
      </div>
    </div>
  )
}
