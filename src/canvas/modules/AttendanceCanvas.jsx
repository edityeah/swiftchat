import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Users, Calendar } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// ── Data ─────────────────────────────────────────────────────────────────────

const CLASSES = ['6-A', '6-B', '7-A', '7-B', '8-A', '8-B']

const STUDENTS_BY_CLASS = {
  '6-A': [
    { id: 1, name: 'Anand Patel',   roll: '01', risk: false },
    { id: 2, name: 'Bharti Shah',   roll: '02', risk: false },
    { id: 3, name: 'Chirag Mehta',  roll: '03', risk: true  },
    { id: 4, name: 'Divya Joshi',   roll: '04', risk: false },
    { id: 5, name: 'Ekta Desai',    roll: '05', risk: false },
    { id: 6, name: 'Farhan Khan',   roll: '06', risk: false },
    { id: 7, name: 'Geeta Bhatt',   roll: '07', risk: false },
    { id: 8, name: 'Hitesh Rawat',  roll: '08', risk: false },
    { id: 9, name: 'Isha Kumar',    roll: '09', risk: false },
    { id: 10, name: 'Jayesh Modi',  roll: '10', risk: false },
    { id: 11, name: 'Kavya Parmar', roll: '11', risk: false },
    { id: 12, name: 'Lalit Solanki',roll: '12', risk: false },
  ],
  '6-B': [
    { id: 1, name: 'Ravi Patel',     roll: '01', risk: true },
    { id: 2, name: 'Komal Shah',     roll: '02', risk: true },
    { id: 3, name: 'Isha Trivedi',   roll: '03', risk: false },
    { id: 4, name: 'Mehul Joshi',    roll: '04', risk: false },
    { id: 5, name: 'Priya Mehta',    roll: '05', risk: false },
    { id: 6, name: 'Anil Kumar',     roll: '06', risk: false },
    { id: 7, name: 'Sonal Desai',    roll: '07', risk: false },
    { id: 8, name: 'Vijay Rajput',   roll: '08', risk: false },
    { id: 9, name: 'Meena Bhatt',    roll: '09', risk: false },
    { id: 10, name: 'Hema Vasava',   roll: '10', risk: false },
    { id: 11, name: 'Raju Parmar',   roll: '11', risk: false },
    { id: 12, name: 'Anita Solanki', roll: '12', risk: false },
    { id: 13, name: 'Tara Gamit',    roll: '13', risk: false },
    { id: 14, name: 'Mohan Lad',     roll: '14', risk: false },
    { id: 15, name: 'Geeta Koli',    roll: '15', risk: false },
    { id: 16, name: 'Ramesh Vaghela',roll: '16', risk: false },
  ],
  '7-A': [
    { id: 1,  name: 'Aditya Shah',   roll: '01', risk: false },
    { id: 2,  name: 'Bhavna Modi',   roll: '02', risk: false },
    { id: 3,  name: 'Chandni Trivedi',roll: '03', risk: true  },
    { id: 4,  name: 'Dipak Patel',   roll: '04', risk: false },
    { id: 5,  name: 'Esha Bhatt',    roll: '05', risk: false },
    { id: 6,  name: 'Faiz Khan',     roll: '06', risk: false },
    { id: 7,  name: 'Gauri Joshi',   roll: '07', risk: false },
    { id: 8,  name: 'Hardik Mehta',  roll: '08', risk: false },
    { id: 9,  name: 'Indra Lad',     roll: '09', risk: false },
    { id: 10, name: 'Jaya Solanki',  roll: '10', risk: false },
    { id: 11, name: 'Kunal Desai',   roll: '11', risk: false },
    { id: 12, name: 'Leela Vasava',  roll: '12', risk: false },
    { id: 13, name: 'Manav Parmar',  roll: '13', risk: false },
    { id: 14, name: 'Niraj Bhatt',   roll: '14', risk: false },
  ],
  '7-B': [
    { id: 1, name: 'Tanvi Panchal',  roll: '01', risk: true },
    { id: 2, name: 'Om Trive',       roll: '02', risk: false },
    { id: 3, name: 'Priti Bhoi',     roll: '03', risk: false },
    { id: 4, name: 'Qaid Sayed',     roll: '04', risk: false },
    { id: 5, name: 'Rina Patel',     roll: '05', risk: false },
    { id: 6, name: 'Sahil Shah',     roll: '06', risk: false },
    { id: 7, name: 'Tina Vasava',    roll: '07', risk: false },
    { id: 8, name: 'Urvi Joshi',     roll: '08', risk: false },
    { id: 9, name: 'Vivek Lad',      roll: '09', risk: false },
    { id: 10, name: 'Wahida Khan',   roll: '10', risk: false },
    { id: 11, name: 'Xena Modi',     roll: '11', risk: false },
    { id: 12, name: 'Yash Mehta',    roll: '12', risk: false },
    { id: 13, name: 'Zeel Trivedi',  roll: '13', risk: false },
  ],
  '8-A': [
    { id: 1, name: 'Aarav Desai',   roll: '01', risk: true  },
    { id: 2, name: 'Bhavik Shah',   roll: '02', risk: false },
    { id: 3, name: 'Chetan Lad',    roll: '03', risk: false },
    { id: 4, name: 'Diya Patel',    roll: '04', risk: false },
    { id: 5, name: 'Eshaan Modi',   roll: '05', risk: false },
    { id: 6, name: 'Falguni Joshi', roll: '06', risk: false },
    { id: 7, name: 'Gopal Bhatt',   roll: '07', risk: false },
    { id: 8, name: 'Heena Vasava',  roll: '08', risk: false },
    { id: 9, name: 'Inder Mehta',   roll: '09', risk: false },
    { id: 10, name: 'Jay Mehta',    roll: '10', risk: true  },
    { id: 11, name: 'Khushi Khan',  roll: '11', risk: false },
    { id: 12, name: 'Lavish Solanki',roll: '12', risk: false },
    { id: 13, name: 'Manisha Trivedi',roll: '13', risk: false },
    { id: 14, name: 'Naveen Parmar',roll: '14', risk: false },
    { id: 15, name: 'Ojas Lad',     roll: '15', risk: false },
    { id: 16, name: 'Priti Patel',  roll: '16', risk: false },
  ],
  '8-B': [
    { id: 1,  name: 'Quresh Sayed', roll: '01', risk: false },
    { id: 2,  name: 'Riya Praja',   roll: '02', risk: true  },
    { id: 3,  name: 'Saumya Joshi', roll: '03', risk: false },
    { id: 4,  name: 'Tarun Lad',    roll: '04', risk: false },
    { id: 5,  name: 'Uma Vasava',   roll: '05', risk: false },
    { id: 6,  name: 'Vansh Modi',   roll: '06', risk: false },
    { id: 7,  name: 'Wani Mehta',   roll: '07', risk: false },
    { id: 8,  name: 'Xavier Bhatt', roll: '08', risk: false },
    { id: 9,  name: 'Yamini Trivedi',roll: '09', risk: false },
    { id: 10, name: 'Zubin Parmar', roll: '10', risk: false },
    { id: 11, name: 'Aryan Khan',   roll: '11', risk: false },
    { id: 12, name: 'Bhumi Patel',  roll: '12', risk: false },
    { id: 13, name: 'Chirag Solanki',roll: '13', risk: false },
    { id: 14, name: 'Devika Joshi', roll: '14', risk: false },
  ],
}

// Resolve an arbitrary classId / grade hint into a canonical key in
// STUDENTS_BY_CLASS. Accepts '8', 'Class 8', '8-A', '8-B', etc. Falls back to
// the matching grade's '-A' section when only the grade number is provided.
function resolveClassKey(input) {
  if (!input) return '6-B'
  const raw = String(input).trim()
  if (STUDENTS_BY_CLASS[raw]) return raw
  // Strip "Class " prefix.
  const cleaned = raw.replace(/^class\s*/i, '').trim()
  if (STUDENTS_BY_CLASS[cleaned]) return cleaned
  // Numeric grade like "8" → "8-A" if the grade exists.
  const m = cleaned.match(/^(\d{1,2})$/)
  if (m) {
    const grade = m[1]
    const candidates = [`${grade}-A`, `${grade}-B`]
    for (const c of candidates) {
      if (STUDENTS_BY_CLASS[c]) return c
    }
  }
  return CLASSES.find(c => c.startsWith(cleaned)) || '6-B'
}

function fallbackStudents() {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, name: `Student ${i + 1}`, roll: String(i + 1).padStart(2, '0'), risk: false,
  }))
}

function getStudents(classKey) {
  return STUDENTS_BY_CLASS[classKey] || fallbackStudents()
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Components ────────────────────────────────────────────────────────────────

function StudentCard({ student, present, onToggle }) {
  return (
    <button
      onClick={() => onToggle(student.id)}
      className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl border-[1.5px] transition-all duration-150 active:scale-95 select-none ${
        present
          ? 'bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32]'
          : 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]'
      }`}
    >
      {student.risk && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-warn" />
      )}
      <span className="text-[9px] font-bold text-txt-tertiary mb-0.5">#{student.roll}</span>
      <span className={`text-base leading-none mb-1 ${present ? '' : 'opacity-60'}`}>
        {present ? '✓' : '✗'}
      </span>
      <span className="text-[9.5px] font-bold text-center leading-tight line-clamp-2">
        {student.name.split(' ')[0]}
      </span>
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AttendanceCanvas({ context }) {
  const { showToast, closeCanvas } = useApp()

  // The notification CTA can pass classId in any form ('8', 'Class 8', '6-B').
  // Normalise once on mount and again when the context flips.
  const initialClass = useMemo(() => resolveClassKey(context?.classId), [context?.classId])
  const [selectedClass, setSelectedClass] = useState(initialClass)
  useEffect(() => { setSelectedClass(initialClass) }, [initialClass])

  const [showClassPicker, setShowClassPicker] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const students = getStudents(selectedClass)
  const [attendance, setAttendance] = useState(() =>
    Object.fromEntries(students.map((s, i) => [s.id, i >= 2]))
  )

  // Reset when class changes
  const handleClassChange = cls => {
    setSelectedClass(cls)
    setShowClassPicker(false)
    setSubmitted(false)
    const st = getStudents(cls)
    setAttendance(Object.fromEntries(st.map((s, i) => [s.id, i >= 1])))
  }

  const toggleStudent = id => setAttendance(p => ({ ...p, [id]: !p[id] }))
  const markAll = val => setAttendance(Object.fromEntries(students.map(s => [s.id, val])))

  const presentCount = Object.values(attendance).filter(Boolean).length
  const absentCount = students.length - presentCount
  const pct = students.length ? Math.round((presentCount / students.length) * 100) : 0

  const handleSubmit = () => {
    setSubmitted(true)
    showToast?.('Attendance submitted · Parent alerts queued for 5 PM ✓', 'ok')
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-ok-light flex items-center justify-center text-4xl mb-4 shadow-card">
            ✅
          </div>
          <div className="text-[20px] font-bold text-txt-primary mb-1">
            Attendance Submitted!
          </div>
          <div className="text-[14px] text-txt-secondary mb-5 leading-relaxed">
            Class {selectedClass}: <strong>{presentCount}/{students.length} present</strong>
            <br />Parent alerts for {absentCount} absent students queued for 5 PM
          </div>

          {/* Summary chips */}
          <div className="flex gap-2 mb-6 flex-wrap justify-center">
            <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-ok-light text-ok">
              ✓ {presentCount} Present
            </span>
            <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-danger-light text-danger">
              ✗ {absentCount} Absent
            </span>
            <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-primary-light text-primary">
              {pct}%
            </span>
          </div>

          {/* Absent list */}
          {absentCount > 0 && (
            <div className="w-full bg-danger-light rounded-2xl p-3 mb-5 text-left">
              <div className="text-[11px] font-bold text-danger mb-2">Absent today:</div>
              <div className="flex flex-wrap gap-1.5">
                {students.filter(s => !attendance[s.id]).map(s => (
                  <span key={s.id} className="px-2 py-1 bg-white rounded-xl text-[11px] font-bold text-danger border border-[#FFCDD2]">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setSubmitted(false); setAttendance(Object.fromEntries(students.map((s,i)=>[s.id,i>=2]))) }}
              className="flex-1 h-11 rounded-2xl border-[1.5px] border-primary text-primary font-bold text-[14px] active:bg-primary-light transition-colors"
            >
              Edit
            </button>
            <button
              onClick={closeCanvas}
              className="flex-1 h-11 rounded-2xl bg-primary text-white font-bold text-[14px] active:opacity-80 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main attendance form ──
  return (
    <div className="flex flex-col h-full">

      {/* Class selector + date row */}
      <div className="px-3.5 py-3 border-b border-bdr-light bg-surface-secondary flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Class picker */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowClassPicker(p => !p)}
              className="w-full flex items-center justify-between h-10 px-3.5 bg-white rounded-xl border border-bdr text-[14px] font-bold text-txt-primary"
            >
              <div className="flex items-center gap-2">
                <Users size={15} className="text-primary" />
                <span>Class {selectedClass}</span>
              </div>
              <ChevronDown size={15} className="text-txt-tertiary" />
            </button>
            {showClassPicker && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-bdr rounded-xl shadow-modal z-10 overflow-hidden animate-fade-in">
                {CLASSES.map(cls => (
                  <button
                    key={cls}
                    onClick={() => handleClassChange(cls)}
                    className={`w-full px-3.5 py-2 text-[13px] font-bold text-left transition-colors border-b border-bdr-light last:border-0 ${
                      cls === selectedClass ? 'bg-primary-light text-primary' : 'text-txt-primary hover:bg-surface-secondary'
                    }`}
                  >
                    Class {cls}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Date chip */}
          <div className="flex items-center gap-1.5 bg-white px-3 h-10 rounded-xl border border-bdr flex-shrink-0">
            <Calendar size={13} className="text-primary" />
            <span className="text-[12px] font-semibold text-txt-secondary">Today</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-2 mt-2.5">
          <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-bdr">
            <div
              className="h-full bg-ok rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[12px] font-bold text-ok">{presentCount}/{students.length}</span>
          <span className="text-[12px] font-bold text-txt-tertiary">{pct}%</span>
        </div>
      </div>

      {/* Mark all row */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-bdr-light flex-shrink-0 bg-white">
        <span className="text-[12px] font-bold text-txt-secondary">
          {todayLabel()}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => markAll(true)}
            className="px-2.5 py-1 rounded-lg bg-ok-light text-ok text-[11px] font-bold active:opacity-70"
          >
            All Present
          </button>
          <button
            onClick={() => markAll(false)}
            className="px-2.5 py-1 rounded-lg bg-danger-light text-danger text-[11px] font-bold active:opacity-70"
          >
            All Absent
          </button>
        </div>
      </div>

      {/* Student grid */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 bg-surface-secondary">
        <div className="grid grid-cols-4 gap-2">
          {students.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              present={!!attendance[student.id]}
              onToggle={toggleStudent}
            />
          ))}
        </div>

        {/* At-risk note */}
        {students.some(s => s.risk) && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-warn-light border border-[#FFE082] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-warn flex-shrink-0" />
            <span className="text-[11px] font-semibold text-[#856A00]">
              Orange dot = at-risk for Namo Laxmi (below 80%)
            </span>
          </div>
        )}
      </div>

      {/* Submit footer */}
      <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <div className="flex-1 bg-ok-light rounded-xl p-2 text-center">
            <div className="text-[18px] font-bold text-ok">{presentCount}</div>
            <div className="text-[10px] text-ok/80 font-semibold">Present</div>
          </div>
          <div className="flex-1 bg-danger-light rounded-xl p-2 text-center">
            <div className="text-[18px] font-bold text-danger">{absentCount}</div>
            <div className="text-[10px] text-danger/80 font-semibold">Absent</div>
          </div>
          <div className="flex-1 bg-primary-light rounded-xl p-2 text-center">
            <div className="text-[18px] font-bold text-primary">{pct}%</div>
            <div className="text-[10px] text-primary/80 font-semibold">Att. Rate</div>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-[15px] active:opacity-80 transition-opacity flex items-center justify-center gap-2"
        >
          ✅ Submit Attendance
        </button>
      </div>
    </div>
  )
}

export { resolveClassKey }
