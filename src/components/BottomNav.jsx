import React from 'react'
import { MessageCircle, Bell, User, Newspaper } from 'lucide-react'
import { useApp } from '../context/AppContext'

const TABS = [
  { id: 'home',    Icon: MessageCircle, label: 'Chats'   },
  { id: 'posts',   Icon: Newspaper,     label: 'Posts'   },
  { id: 'updates', Icon: Bell,          label: 'Updates', badge: 3 },
  { id: 'profile', Icon: User,          label: 'Profile' },
]

export default function BottomNav() {
  const { screen, navigate } = useApp()

  return (
    <div className="h-14 border-t border-bdr-light flex items-stretch flex-shrink-0 bg-white shadow-bottom">
      {TABS.map(tab => {
        const active = screen === tab.id
        const { Icon } = tab
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg mx-0.5 my-0.5 transition-colors relative ${
              active ? '' : 'active:bg-primary-light'
            }`}
          >
            <Icon size={20} className={active ? 'text-primary' : 'text-txt-tertiary'} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-txt-tertiary'}`}>
              {tab.label}
            </span>
            {tab.badge && !active && (
              <span className="absolute top-1 right-1.5 min-w-[16px] h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-white">
                {tab.badge}
              </span>
            )}
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
