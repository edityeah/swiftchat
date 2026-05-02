import React from 'react'
import {
  School, BookOpen, BadgeCheck, Phone, Globe, Bell, Lock,
  HelpCircle, ChevronRight, ShieldCheck, Clock, MapPin,
  User, Mail, Building2, Key, LogOut,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBar from '../components/StatusBar'
import BottomNav from '../components/BottomNav'
import { ROLE_LABELS, ROLE_SCOPES } from '../roles/roleConfig'

// DPDPA tier color
function tierColor(tier = '') {
  if (tier.includes('4')) return { bg: '#FEF2F2', fg: '#DC2626', border: '#FECACA' }
  if (tier.includes('3')) return { bg: '#FFF7ED', fg: '#D97706', border: '#FDE68A' }
  if (tier.includes('2')) return { bg: '#EEF2FF', fg: '#4338CA', border: '#C7D2FE' }
  return { bg: '#F0FDF4', fg: '#16A34A', border: '#BBF7D0' }
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-bdr-light">
      <Icon size={16} className="text-txt-tertiary flex-shrink-0" />
      <span className="text-[12px] text-txt-secondary w-28 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-txt-primary flex-1 text-right">{value}</span>
    </div>
  )
}

function ActionRow({ icon: Icon, label, value, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 bg-white border-b border-bdr-light cursor-pointer active:bg-surface-secondary transition-colors"
    >
      <Icon size={16} className="text-txt-secondary flex-shrink-0" />
      <span className="text-[13px] font-medium flex-1 text-txt-primary">{label}</span>
      {value && <span className="text-[11px] text-txt-secondary">{value}</span>}
      <ChevronRight size={15} className="text-txt-tertiary flex-shrink-0" />
    </div>
  )
}

export default function ProfilePage() {
  const { role, userProfile, signOut, showToast } = useApp()

  // Fallback profile if userProfile not loaded
  const p = userProfile || {
    name: 'User', initials: 'U', color: '#386AF6',
    badge: ROLE_LABELS[role] || 'User',
    org: 'Gujarat Education', scope: ROLE_SCOPES[role] || 'Unknown',
    dpdpaTier: 'Tier 1 — Citizen', sessionTTL: '4 hrs',
    tokenOrigin: 'Unknown', lastLogin: '—',
  }

  const tc = tierColor(p.dpdpaTier)

  return (
    <div className="flex flex-col h-full bg-surface-secondary">
      <StatusBar />

      {/* Profile header */}
      <div
        className="px-4 pt-6 pb-6 flex flex-col items-center text-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${p.color}dd 0%, ${p.color}99 100%)` }}
      >
        <div
          className="w-16 h-16 rounded-full border-[3px] border-white/50 flex items-center justify-center mb-3 shadow-lg"
          style={{ background: p.color }}
        >
          <span className="text-white font-bold text-[22px]">{p.initials}</span>
        </div>
        <div className="text-[20px] font-bold text-white">{p.name}</div>
        <div className="text-[12px] text-white/80 mt-0.5">{p.org}</div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold text-white">
            <ShieldCheck size={11} /> {p.tokenOrigin}
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold text-white">
            <MapPin size={11} /> {p.scope}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Session & DPDPA card */}
        <div className="mx-4 mt-4 mb-2 rounded-2xl overflow-hidden border" style={{ borderColor: tc.border }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: tc.bg }}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} style={{ color: tc.fg }} />
              <span className="text-[12px] font-bold" style={{ color: tc.fg }}>{p.dpdpaTier}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: tc.fg }}>
              <Clock size={12} />
              <span>Session: {p.sessionTTL}</span>
            </div>
          </div>
          <div className="bg-white px-4 py-2 flex items-center gap-2 border-t" style={{ borderColor: tc.border }}>
            <Key size={12} className="text-txt-tertiary" />
            <span className="text-[11px] text-txt-secondary">Auth: {p.tokenOrigin}</span>
            <span className="ml-auto text-[11px] text-txt-tertiary">Last login: {p.lastLogin}</span>
          </div>
        </div>

        {/* Identity section */}
        <div className="bg-white mt-2 mb-1">
          <div className="px-4 py-2 bg-surface-secondary">
            <span className="text-[10px] font-bold text-txt-tertiary tracking-[0.8px]">IDENTITY</span>
          </div>
          <InfoRow icon={User}     label="Full Name"   value={p.name} />
          <InfoRow icon={BadgeCheck} label="Role"      value={p.badge} />
          {p.stateId && <InfoRow icon={Key} label="State ID"      value={p.stateId} />}
          {p.employeeId && <InfoRow icon={BadgeCheck} label="Employee ID" value={p.employeeId} />}
          {p.phone && <InfoRow icon={Phone} label="Phone"         value={`+91 ${p.phone}`} />}
          {p.email && <InfoRow icon={Mail}  label="Email"         value={p.email} />}
        </div>

        {/* Organization section */}
        <div className="bg-white mt-2 mb-1">
          <div className="px-4 py-2 bg-surface-secondary">
            <span className="text-[10px] font-bold text-txt-tertiary tracking-[0.8px]">ORGANIZATION</span>
          </div>
          <InfoRow icon={Building2} label="Organization" value={p.org} />
          {p.school    && <InfoRow icon={School}    label="School"   value={p.school} />}
          {p.district  && <InfoRow icon={MapPin}    label="District" value={p.district} />}
          <InfoRow icon={Globe}     label="Scope"        value={p.scope} />
          {p.childName && <InfoRow icon={BookOpen}  label="Child"    value={`${p.childName} · ${p.childGrade}`} />}
        </div>

        {/* Settings section */}
        <div className="bg-white mt-2 mb-1">
          <div className="px-4 py-2 bg-surface-secondary">
            <span className="text-[10px] font-bold text-txt-tertiary tracking-[0.8px]">SETTINGS</span>
          </div>
          <ActionRow icon={Globe}       label="Language"        value="English"    onClick={() => showToast('Language settings')} />
          <ActionRow icon={Bell}        label="Notifications"   value="Enabled"    onClick={() => showToast('Notification settings')} />
          <ActionRow icon={Lock}        label="Privacy"                            onClick={() => showToast('Privacy settings')} />
          <ActionRow icon={HelpCircle}  label="Help & Support"                     onClick={() => showToast('Opening help center')} />
        </div>

        {/* Sign out */}
        <div className="px-4 pt-3 pb-5">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 bg-danger-light text-danger font-bold text-[14px] py-3.5 rounded-xl active:opacity-80 transition-opacity"
          >
            <LogOut size={16} /> Sign Out
          </button>
          <p className="text-center text-[10px] text-txt-tertiary mt-3">
            SwiftChat v3.0 · Gujarat VSK Program · 🔒 DPDPA Compliant
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
