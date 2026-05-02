import React, { useState } from 'react'
import { Mic, MicOff, Send } from 'lucide-react'

export default function ChatInput({ onSend, onMicToggle, micActive = false, placeholder = 'Message Swift…' }) {
  const [val, setVal] = useState('')

  const send = () => {
    if (!val.trim()) return
    onSend(val.trim())
    setVal('')
  }

  return (
    <div className="px-2 py-1.5 bg-white border-t border-bdr-light flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={onMicToggle}
        className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
          micActive ? 'text-danger bg-danger-light' : 'text-txt-secondary'
        }`}
      >
        {micActive ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder={placeholder}
        className="flex-1 px-3.5 py-2.5 rounded-[22px] bg-[#F5F5F5] border-none text-sm text-txt-primary outline-none placeholder:text-txt-tertiary focus:bg-[#EEEEEE] transition-colors"
      />
      <button
        onClick={send}
        disabled={!val.trim()}
        className="w-[42px] h-[42px] rounded-full bg-primary text-white flex items-center justify-center transition-all active:scale-90 disabled:bg-txt-tertiary flex-shrink-0"
      >
        <Send size={18} />
      </button>
    </div>
  )
}
