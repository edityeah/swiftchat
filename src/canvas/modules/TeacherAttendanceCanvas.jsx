import React, { useMemo, useState } from 'react'
import { Check, X, Coffee, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { teachersInDistrict, titleCase } from '../../data/registries'

const FONT = 'Montserrat, sans-serif'

// Map: teacherCode → 'present' | 'absent' | 'leave' | undefined
const TONE = {
  present: { bg: '#D1FAE5', fg: '#065F46', label: 'Present' },
  absent:  { bg: '#FEE2E2', fg: '#B91C1C', label: 'Absent' },
  leave:   { bg: '#FEF3C7', fg: '#92400E', label: 'Leave' },
}

function SummaryChip({ value, label, color }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FAFBFC', border: '1px solid #D5D8DF' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: FONT }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function TeacherAttendanceCanvas({ context }) {
  const { userProfile, showToast } = useApp()
  const profile = userProfile || {}

  // Principal marks attendance for teachers in their school. We don't have
  // teacher data scoped to "GPS Mehsana" specifically, so we draw from the
  // district sample and cap to a believable school size.
  const teachers = useMemo(() => {
    const district = profile?.district || 'Mehsana'
    return teachersInDistrict(district).slice(0, 18)  // ≈ school staff size
  }, [profile?.district])

  const [marks, setMarks] = useState({})           // teacherCode → status
  const [query, setQuery] = useState('')

  const filtered = teachers.filter(t =>
    !query.trim() ||
    String(t.name || '').toLowerCase().includes(query.toLowerCase()) ||
    String(t.designation || '').toLowerCase().includes(query.toLowerCase()),
  )

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, leave: 0, unmarked: 0 }
    teachers.forEach(t => {
      const s = marks[t.teacherCode]
      if (s === 'present') c.present++
      else if (s === 'absent') c.absent++
      else if (s === 'leave') c.leave++
      else c.unmarked++
    })
    return c
  }, [marks, teachers])

  function mark(code, status) {
    setMarks(m => ({ ...m, [code]: m[code] === status ? undefined : status }))
  }

  function submit() {
    const total = teachers.length
    const unmarked = counts.unmarked
    if (unmarked > 0) {
      showToast?.(`${unmarked} teacher${unmarked === 1 ? '' : 's'} still unmarked.`, 'warn')
      return
    }
    showToast?.(`Attendance submitted for ${total} teachers ✓`, 'ok')
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="p-5">
        {/* Header */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {profile?.school || 'Sardar Patel Prathmik Shala'} · {titleCase(profile?.district || 'Mehsana')}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E0E0E', lineHeight: '26px', marginTop: 2 }}>
          Teacher attendance · Today
        </h2>

        {/* Summary chips */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <SummaryChip value={String(teachers.length)}     label="Total"    color="#0E0E0E" />
          <SummaryChip value={String(counts.present)}      label="Present"  color="#065F46" />
          <SummaryChip value={String(counts.absent)}       label="Absent"   color="#B91C1C" />
          <SummaryChip value={String(counts.leave)}        label="Leave"    color="#92400E" />
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2" style={{ border: '1px solid #D5D8DF', borderRadius: 999 }}>
          <Search size={14} className="text-txt-tertiary" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or designation…"
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: 13, color: '#0E0E0E', fontFamily: FONT }}
          />
        </div>

        {/* Teacher list */}
        <div className="mt-3" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.map((t, idx) => {
            const status = marks[t.teacherCode]
            const tone = TONE[status]
            return (
              <div
                key={t.teacherCode}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #F1F5F9',
                  background: status ? tone.bg + '55' : '#FFFFFF',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0E0E0E', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#7383A5', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.designation || '—'}{t.classTaught ? ` · ${t.classTaught}` : ''}
                  </div>
                </div>

                {/* Status pill (if marked) */}
                {tone && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: tone.bg, color: tone.fg, letterSpacing: '0.02em',
                  }}>
                    {tone.label}
                  </span>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => mark(t.teacherCode, 'present')}
                    title="Present"
                    style={{
                      width: 30, height: 30, borderRadius: 999,
                      background: status === 'present' ? '#065F46' : '#F1F5F9',
                      color: status === 'present' ? '#FFFFFF' : '#065F46',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => mark(t.teacherCode, 'absent')}
                    title="Absent"
                    style={{
                      width: 30, height: 30, borderRadius: 999,
                      background: status === 'absent' ? '#B91C1C' : '#F1F5F9',
                      color: status === 'absent' ? '#FFFFFF' : '#B91C1C',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => mark(t.teacherCode, 'leave')}
                    title="On leave"
                    style={{
                      width: 30, height: 30, borderRadius: 999,
                      background: status === 'leave' ? '#92400E' : '#F1F5F9',
                      color: status === 'leave' ? '#FFFFFF' : '#92400E',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Coffee size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#7383A5', fontSize: 13 }}>
              No teachers match the search.
            </div>
          )}
        </div>

        {/* Bulk actions */}
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const next = {}
              teachers.forEach(t => { next[t.teacherCode] = 'present' })
              setMarks(next)
            }}
            style={{
              padding: '8px 14px', borderRadius: 999,
              background: '#FFFFFF', border: '1px solid #065F46', color: '#065F46',
              fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            Mark all present
          </button>
          <button
            onClick={() => setMarks({})}
            style={{
              padding: '8px 14px', borderRadius: 999,
              background: '#FFFFFF', border: '1px solid #D5D8DF', color: '#0E0E0E',
              fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          className="w-full mt-4 active:scale-[0.98] transition-all"
          style={{
            padding: '12px 16px', borderRadius: 999,
            background: '#386AF6', color: '#FFFFFF',
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: FONT,
          }}
        >
          Submit attendance →
        </button>

        <div className="mt-3" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          {counts.unmarked > 0
            ? `${counts.unmarked} teacher${counts.unmarked === 1 ? '' : 's'} still unmarked. Tap a row's status button or use "Mark all present" to finish.`
            : 'All teachers marked. Tap submit to lock today\'s attendance.'}
        </div>
      </div>
    </div>
  )
}
