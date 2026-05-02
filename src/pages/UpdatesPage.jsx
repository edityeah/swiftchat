import React from 'react'
import { useApp } from '../context/AppContext'
import StatusBar from '../components/StatusBar'
import BottomNav from '../components/BottomNav'

const NOTIFS = [
  { id: 1, icon: '🏅', bg: '#F3E5F5', title: 'Namo Laxmi Alert',       body: 'Ravi Patel (6-B) attendance 74% — scholarship at risk. Ensure full attendance in April.',              time: '5 min ago',  unread: true  },
  { id: 2, icon: '📅', bg: '#E8F5E9', title: 'Attendance Submitted',    body: 'Class 6-B saved for today. 4 parent alerts queued for 5 PM.',                                          time: '9:05 AM',    unread: true  },
  { id: 3, icon: '📝', bg: '#EEF2FF', title: 'XAMTA Report Ready',      body: 'March Science grading complete. Avg: 72%. 6 students below 40%.',                                      time: 'Yesterday',  unread: false },
  { id: 4, icon: '⚠️', bg: '#FFEBEE', title: 'EWS Alert — 3 Students', body: 'Ravi, Komal, Isha flagged for dropout risk. BRC visit recommended.',                                   time: 'Mar 28',     unread: false },
  { id: 5, icon: '💰', bg: '#FFF8E1', title: 'DBT Update',              body: 'Namo Laxmi: 97% disbursed. 1,128 students blocked — attendance below 80%. Escalation required.',      time: 'Mar 25',     unread: false },
  { id: 6, icon: '📨', bg: '#E3F2FD', title: 'Parent Callback Request', body: "Suresh Patel (Ravi's father) requested a callback at 5 PM today.",                                    time: 'Mar 24',     unread: false },
]

export default function UpdatesPage() {
  const { showToast } = useApp()

  return (
    <div className="flex flex-col h-full bg-surface-secondary">
      <StatusBar />
      <div className="h-14 px-3.5 flex items-center bg-white border-b border-bdr-light flex-shrink-0">
        <h1 className="text-[17px] font-bold text-txt-primary flex-1">Updates</h1>
        <button
          onClick={() => showToast('All marked as read ✓', 'ok')}
          className="text-primary text-[13px] font-semibold active:opacity-70"
        >
          Mark all read
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {NOTIFS.map(n => (
          <div
            key={n.id}
            onClick={() => showToast('Opening…', 'info')}
            className={`bg-white rounded-card border p-3 shadow-card cursor-pointer transition-colors active:bg-surface-secondary ${
              n.unread ? 'border-l-[3px] border-l-primary border-bdr-light' : 'border-bdr-light'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                style={{ background: n.bg }}
              >
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-bold mb-0.5 text-txt-primary">{n.title}</div>
                <div className="text-[11.5px] text-txt-secondary leading-[1.45]">{n.body}</div>
                <div className="text-[11px] text-txt-tertiary mt-1.5">{n.time}</div>
              </div>
              {n.unread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
