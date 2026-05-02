import React from 'react'
import { Search, PanelRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBar from '../components/StatusBar'
import BottomNav from '../components/BottomNav'
import Logo from '../components/Logo'
import { getBotList } from '../utils/chatData'

function ChatItem({ bot, onPress }) {
  return (
    <div
      onClick={onPress}
      className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer border-b border-bdr-light transition-colors active:bg-surface-secondary"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] flex-shrink-0"
        style={{ background: bot.bg }}
      >
        {bot.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-[15px] font-bold text-txt-primary truncate pr-2">{bot.name}</span>
          <span className="text-[12px] text-txt-tertiary flex-shrink-0">{bot.time}</span>
        </div>
        <div className="text-[12.5px] text-txt-secondary truncate">{bot.msg}</div>
      </div>
      {bot.unread > 0 && (
        <div className="min-w-[19px] h-[19px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
          {bot.unread}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { role, navigate, openCanvas, showToast } = useApp()

  const roleLabel = {
    teacher:   'Teacher · GPS Mehsana',
    principal: 'Principal · GPS Mehsana',
    deo:       'DEO · Ahmedabad',
    parent:    'Parent · Ravi Patel',
  }[role] || ''

  const bots = getBotList(role)

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      {/* Home topbar */}
      <div className="h-14 px-3.5 flex items-center gap-2 border-b border-bdr-light bg-white flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Logo size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-txt-primary">SwiftChat</div>
          <div className="text-[11px] text-txt-secondary truncate">{roleLabel}</div>
        </div>
        <div className="flex">
          <button
            onClick={() => showToast('Search', 'info')}
            className="w-11 h-11 flex items-center justify-center rounded-full text-txt-primary active:bg-surface-secondary"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => openCanvas({ type: 'home', role })}
            className="w-11 h-11 flex items-center justify-center rounded-full text-primary active:bg-primary-light"
            title="Open Canvas"
          >
            <PanelRight size={20} />
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto bg-white">
        {bots.map(bot => (
          <ChatItem
            key={bot.id}
            bot={bot}
            onPress={() => navigate('chat_' + bot.id)}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
