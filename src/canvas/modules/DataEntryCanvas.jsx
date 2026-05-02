import React, { useState } from 'react'
import { CheckCircle, ChevronDown, User, Phone, MapPin, BookOpen, AlertCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'

// ── Field components ──────────────────────────────────────────────────────────

function FieldGroup({ title, icon }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-base">{icon}</span>
      <span className="text-[12px] font-bold text-txt-secondary uppercase tracking-wide">{title}</span>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, required, error, type = 'text' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-txt-secondary">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 px-3 rounded-xl border text-[13px] text-txt-primary placeholder-txt-tertiary outline-none transition-all bg-white ${
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-bdr focus:border-primary focus:ring-2 focus:ring-primary/15'
        }`}
      />
      {error && (
        <span className="text-[10px] text-danger flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </span>
      )}
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-txt-secondary">
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-10 pl-3 pr-8 rounded-xl border border-bdr bg-white text-[13px] text-txt-primary outline-none appearance-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
        >
          <option value="">Select…</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
      </div>
    </div>
  )
}

// ── Options ───────────────────────────────────────────────────────────────────

const CLASS_OPTS = ['6-A','6-B','7-A','7-B','8-A','8-B','9-A','9-B','10-A','10-B'].map(c=>({value:c,label:`Class ${c}`}))
const GENDER_OPTS = [{value:'M',label:'Male'},{value:'F',label:'Female'},{value:'O',label:'Other'}]
const CASTE_OPTS = [{value:'GEN',label:'General'},{value:'OBC',label:'OBC'},{value:'SC',label:'SC'},{value:'ST',label:'ST'}]
const TALUKA_OPTS = ['Mehsana','Visnagar','Kadi','Becharaji','Vijapur','Jotana'].map(t=>({value:t,label:t}))

// ── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'student', label: 'New Student', icon: '👤' },
  { id: 'update',  label: 'Update',      icon: '✏️' },
  { id: 'program', label: 'Program',     icon: '📋' },
]

export default function DataEntryCanvas({ context }) {
  const { showToast, closeCanvas } = useApp()
  const [tab, setTab] = useState('student')
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  // Form state
  const [form, setForm] = useState({
    firstName: '', lastName: '', rollNo: '', classId: '', gender: '',
    dob: '', caste: '', aadhaarLast4: '',
    fatherName: '', motherName: '', phone: '', altPhone: '',
    village: '', taluka: '', district: 'Mehsana',
    enrollDate: '', prevSchool: '',
  })

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim())  e.firstName = 'First name required'
    if (!form.lastName.trim())   e.lastName  = 'Last name required'
    if (!form.classId)           e.classId   = 'Class required'
    if (!form.gender)            e.gender    = 'Gender required'
    if (!form.phone.trim())      e.phone     = 'Phone required'
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = 'Enter 10-digit mobile'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitted(true)
    showToast(`Student ${form.firstName} ${form.lastName} saved ✓`, 'ok')
  }

  // ── Success ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-ok-light flex items-center justify-center text-4xl mb-4 shadow-card">
          ✅
        </div>
        <div className="text-[20px] font-bold text-txt-primary mb-1">Student Saved!</div>
        <div className="text-[14px] text-txt-secondary mb-6 leading-relaxed">
          <strong>{form.firstName} {form.lastName}</strong><br />
          Class {form.classId} · {form.gender === 'M' ? 'Male' : form.gender === 'F' ? 'Female' : 'Other'}<br />
          Parent: {form.fatherName || '—'} · {form.phone}
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => { setSubmitted(false); setForm({firstName:'',lastName:'',rollNo:'',classId:'',gender:'',dob:'',caste:'',aadhaarLast4:'',fatherName:'',motherName:'',phone:'',altPhone:'',village:'',taluka:'',district:'Mehsana',enrollDate:'',prevSchool:''}) }}
            className="flex-1 h-11 rounded-2xl border-[1.5px] border-primary text-primary font-bold text-[14px] active:bg-primary-light"
          >
            Add Another
          </button>
          <button
            onClick={closeCanvas}
            className="flex-1 h-11 rounded-2xl bg-primary text-white font-bold text-[14px] active:opacity-80"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-bdr-light bg-white flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-semibold transition-colors ${
              tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-txt-secondary'
            }`}
          >
            <span className="text-[15px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form body */}
      {tab === 'student' && (
        <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-surface-secondary space-y-5">

          {/* Student Info */}
          <div className="bg-white rounded-2xl p-3.5 border border-bdr-light shadow-card space-y-3">
            <FieldGroup title="Student Information" icon="👤" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="First Name" value={form.firstName} onChange={v=>set('firstName',v)} placeholder="e.g. Ravi" required error={errors.firstName} />
              <TextField label="Last Name"  value={form.lastName}  onChange={v=>set('lastName',v)}  placeholder="e.g. Patel"  required error={errors.lastName} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Roll Number" value={form.rollNo} onChange={v=>set('rollNo',v)} placeholder="01" />
              <SelectField label="Class" value={form.classId} onChange={v=>set('classId',v)} options={CLASS_OPTS} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Gender" value={form.gender} onChange={v=>set('gender',v)} options={GENDER_OPTS} required />
              <TextField label="Date of Birth" value={form.dob} onChange={v=>set('dob',v)} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Caste Category" value={form.caste} onChange={v=>set('caste',v)} options={CASTE_OPTS} />
              <TextField label="Aadhaar (last 4)" value={form.aadhaarLast4} onChange={v=>set('aadhaarLast4',v)} placeholder="XXXX" />
            </div>
          </div>

          {/* Parent Info */}
          <div className="bg-white rounded-2xl p-3.5 border border-bdr-light shadow-card space-y-3">
            <FieldGroup title="Parent / Guardian" icon="👨‍👩‍👧" />
            <TextField label="Father's Name" value={form.fatherName} onChange={v=>set('fatherName',v)} placeholder="e.g. Suresh Patel" />
            <TextField label="Mother's Name" value={form.motherName} onChange={v=>set('motherName',v)} placeholder="e.g. Meena Patel" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Mobile" value={form.phone} onChange={v=>set('phone',v)} placeholder="9876543210" type="tel" required error={errors.phone} />
              <TextField label="Alternate" value={form.altPhone} onChange={v=>set('altPhone',v)} placeholder="Optional" type="tel" />
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl p-3.5 border border-bdr-light shadow-card space-y-3">
            <FieldGroup title="Address" icon="📍" />
            <TextField label="Village / Area" value={form.village} onChange={v=>set('village',v)} placeholder="e.g. Modhera" />
            <div className="grid grid-cols-2 gap-2">
              <SelectField label="Taluka" value={form.taluka} onChange={v=>set('taluka',v)} options={TALUKA_OPTS} />
              <TextField label="District" value={form.district} onChange={v=>set('district',v)} placeholder="Mehsana" />
            </div>
          </div>

          {/* Enrollment */}
          <div className="bg-white rounded-2xl p-3.5 border border-bdr-light shadow-card space-y-3">
            <FieldGroup title="Enrollment" icon="📚" />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Enrollment Date" value={form.enrollDate} onChange={v=>set('enrollDate',v)} type="date" />
              <TextField label="Previous School" value={form.prevSchool} onChange={v=>set('prevSchool',v)} placeholder="If applicable" />
            </div>
          </div>

          <div className="h-2" />
        </div>
      )}

      {tab === 'update' && (
        <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-surface-secondary">
          <div className="bg-white rounded-2xl p-4 border border-bdr-light shadow-card text-center">
            <span className="text-4xl">🔍</span>
            <div className="text-[14px] font-bold text-txt-primary mt-2 mb-1">Search Student</div>
            <div className="text-[12px] text-txt-secondary mb-4">Enter name or roll number to update</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name or roll number…"
                className="flex-1 h-10 px-3 rounded-xl border border-bdr bg-surface-secondary text-[13px] outline-none focus:border-primary"
              />
              <button className="px-4 h-10 bg-primary text-white rounded-xl text-[13px] font-bold active:opacity-80">
                Find
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'program' && (
        <div className="flex-1 overflow-y-auto px-3.5 py-4 bg-surface-secondary space-y-3">
          {[
            { icon: '🏅', title: 'Namo Laxmi Eligibility', desc: 'Update scholarship status and attendance threshold', color: '#F3E5F5' },
            { icon: '🍱', title: 'Mid-Day Meal Record', desc: 'Log daily meal attendance and count', color: '#E8F5E9' },
            { icon: '📚', title: 'Textbook Distribution', desc: 'Track textbook issuance per student', color: '#FFF8E1' },
            { icon: '💉', title: 'Health Records', desc: 'Vaccination status and health screenings', color: '#E3F2FD' },
          ].map((item, i) => (
            <button
              key={i}
              className="w-full flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-bdr-light shadow-card text-left active:opacity-80"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: item.color }}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-txt-primary">{item.title}</div>
                <div className="text-[11px] text-txt-secondary mt-0.5">{item.desc}</div>
              </div>
              <span className="text-txt-tertiary text-[16px]">›</span>
            </button>
          ))}
        </div>
      )}

      {/* Submit footer (student tab only) */}
      {tab === 'student' && (
        <div className="px-3.5 py-3 border-t border-bdr-light bg-white flex gap-2 flex-shrink-0">
          <button
            onClick={() => setForm({firstName:'',lastName:'',rollNo:'',classId:'',gender:'',dob:'',caste:'',aadhaarLast4:'',fatherName:'',motherName:'',phone:'',altPhone:'',village:'',taluka:'',district:'Mehsana',enrollDate:'',prevSchool:''})}
            className="w-12 h-12 flex items-center justify-center rounded-2xl border border-bdr text-txt-secondary active:bg-surface-secondary"
          >
            ↺
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold text-[15px] active:opacity-80 transition-opacity"
          >
            Save Student →
          </button>
        </div>
      )}
    </div>
  )
}
