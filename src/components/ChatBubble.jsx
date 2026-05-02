import React from 'react'
import { useApp } from '../context/AppContext'
import Logo from './Logo'

function ActionBtn({ label, chatId, action, canvas }) {
  const { navigate, showToast, openCanvas } = useApp()
  const handle = () => {
    if (chatId) return navigate('chat_' + chatId)
    if (canvas) return openCanvas(canvas)
    const toasts = {
      notify_ravi:    ["Alert sent to Ravi's parent ✓", 'ok'],
      notify_all:     ['All parents notified ✓', 'ok'],
      schedule_visit: ['BRC visit scheduled: Apr 8 ✓', 'ok'],
      gen_report:     ['Report generated ✓', 'ok'],
      scan_papers:    ['Camera launched ✓', 'info'],
      open_att:       ['Opening attendance…', 'info'],
    }
    const [msg, type] = toasts[action] || ['Done ✓', 'ok']
    showToast(msg, type)
  }
  return (
    <button
      onClick={handle}
      className="px-3 py-1.5 rounded-full text-[11.5px] font-bold border-[1.5px] border-primary text-primary bg-white transition-colors active:bg-primary active:text-white"
    >
      {label}
    </button>
  )
}

export default function ChatBubble({ message }) {
  const isBot = message.type === 'bot'
  return (
    <div className={`flex gap-1.5 max-w-[85%] animate-bubble-in ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 self-end">
          <Logo size={16} />
        </div>
      )}
      <div>
        <div
          className={`px-3 py-2.5 rounded-2xl text-[13.5px] leading-[1.55] ${
            isBot
              ? 'bg-white text-txt-primary rounded-bl-[4px] shadow-card'
              : 'bg-primary text-white rounded-br-[4px]'
          }`}
          {...(isBot
            ? { dangerouslySetInnerHTML: { __html: message.html } }
            : { children: message.text })}
        />
        {isBot && message.actions?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.actions.map((a, i) => <ActionBtn key={i} {...a} />)}
          </div>
        )}
        <div className="text-[11px] text-txt-tertiary mt-0.5 px-1">{message.time}</div>
      </div>
    </div>
  )
}
