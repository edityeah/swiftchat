import React, { useState } from 'react'

const LOGS = [
  { id: 1, time: '9:05 AM',  type: 'ok',   icon: '📅', text: 'Attendance submitted — Class 6-B: 34/38 present'             },
  { id: 2, time: '9:20 AM',  type: 'warn',  icon: '⚠️', text: 'EWS alert: Ravi Patel attendance 74%'                        },
  { id: 3, time: '10:15 AM', type: 'info',  icon: '🏅', text: 'Namo Laxmi: 3 students at risk — action required'            },
  { id: 4, time: '11:00 AM', type: 'ok',   icon: '📝', text: 'XAMTA scan complete — 38 papers graded, avg 67%'              },
  { id: 5, time: '12:30 PM', type: 'info',  icon: '📨', text: "Parent alert sent to Ravi's guardian (Suresh Patel)"          },
  { id: 6, time: '2:45 PM',  type: 'danger',icon: '🔴', text: 'DBT blocked — Komal: attendance below 80% threshold'        },
  { id: 7, time: '3:00 PM',  type: 'ok',   icon: '✅', text: 'Namo Laxmi application submitted for Priya Patel (9-A)'      },
]

const STYLES = {
  ok:     'bg-ok-light   text-[#1B5E20] border-[#C8E6C9]',
  warn:   'bg-warn-light  text-[#E65100] border-[#FFE082]',
  info:   'bg-primary-light text-primary border-[#BBDEFB]',
  danger: 'bg-danger-light text-danger   border-[#FFCDD2]',
}

const FILTERS = ['all', 'ok', 'warn', 'danger', 'info']

export default function ActivityLog() {
  const [logs, setLogs] = useState(LOGS)
  const [filter, setFilter] = useState('all')

  const visible = filter === 'all' ? logs : logs.filter(l => l.type === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Filter */}
      <div className="p-3 border-b border-bdr-light flex gap-1.5 flex-wrap items-center">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors capitalize ${
              filter === f ? 'bg-primary text-white border-primary' : 'bg-white text-txt-secondary border-bdr hover:border-primary'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={() => setLogs([])}
          className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold border border-danger text-danger hover:bg-danger-light transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {visible.length === 0 ? (
          <div className="text-center text-txt-tertiary text-sm py-10">No activity logged</div>
        ) : visible.map(log => (
          <div key={log.id} className={`p-2.5 rounded-xl border text-[11.5px] flex gap-2 items-start ${STYLES[log.type] || STYLES.info}`}>
            <span className="text-base flex-shrink-0 mt-0.5">{log.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium leading-snug">{log.text}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{log.time}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-bdr-light flex items-center gap-1.5 text-[11px] text-txt-secondary flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-ok animate-live inline-block" />
        Live · {logs.length} events today
      </div>
    </div>
  )
}
