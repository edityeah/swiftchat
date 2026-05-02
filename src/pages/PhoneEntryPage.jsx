import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'
import PeopleIllustration from '../assets/icons/PeopleIllustration'
import { DEMO_PHONE_USER } from '../data/mockData'

export default function PhoneEntryPage() {
  const { navigate, goBack } = useApp()
  const [phone, setPhone] = useState('')

  const handleChange = (e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
  const handleDemoFill = () => setPhone(DEMO_PHONE_USER.phone)
  const canProceed = phone.length === 10

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">

      {/* ── Desktop: left illustration panel ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center overflow-hidden"
        style={{
          flex: '1 1 0',
          background: 'linear-gradient(135deg, #EEF3FF 0%, #F5F0FF 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="relative flex flex-col items-center justify-center gap-6 px-10 text-center w-full h-full">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{ background: 'rgba(56,106,246,0.07)', transform: 'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
            style={{ background: 'rgba(124,58,237,0.06)', transform: 'translate(-30%,30%)' }} />
          <PeopleIllustration width={300} height={300} />
          <div>
            <h3 className="text-[18px] font-bold text-txt-primary mb-1"
              style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Stay Connected
            </h3>
            <p className="text-[13px] text-txt-secondary max-w-[260px] leading-relaxed mx-auto">
              Join millions of students, teachers and parents on SwiftChat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-[14px]">🏛️</span>
              <span className="text-[11px] font-semibold text-txt-secondary">Govt. Approved</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-[14px]">🔒</span>
              <span className="text-[11px] font-semibold text-txt-secondary">Secure OTP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: full page / Desktop: right form panel ── */}
      <div
        className="flex-1 md:flex-none flex flex-col overflow-y-auto bg-white"
        style={{ width: '100%' }}
      >
        {/* Inner wrapper constrains width on desktop */}
        <div className="md:hidden w-full flex flex-col">
          {/* Logo */}
          <div className="px-6 pt-6 pb-2">
            <Logo size={30} showText textColor="#1A1F36" />
          </div>
          <FormContent phone={phone} onPhoneChange={handleChange} canProceed={canProceed} navigate={navigate} goBack={goBack} onDemoFill={handleDemoFill} />
          {/* Mobile illustration */}
          <div className="flex justify-center pb-6 px-6">
            <PeopleIllustration width={220} height={220} />
          </div>
        </div>

        {/* Desktop form (hidden on mobile) */}
        <div
          className="hidden md:flex flex-col justify-center h-full"
          style={{ width: 'clamp(340px, 38%, 460px)', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px' }}
        >
          <div className="mb-8">
            <Logo size={30} showText textColor="#1A1F36" />
          </div>
          <FormContent phone={phone} onPhoneChange={handleChange} canProceed={canProceed} navigate={navigate} goBack={goBack} onDemoFill={handleDemoFill} />
        </div>
      </div>
    </div>
  )
}

// ── Shared form content ────────────────────────────────────────────────────
function FormContent({ phone, onPhoneChange, onDemoFill, canProceed, navigate, goBack }) {
  return (
    <div className="px-6 pb-6">
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="text-[28px] font-bold text-txt-primary leading-tight mb-2"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Hello there!<br />
          <span style={{ color: '#386AF6' }}>Welcome to SwiftChat</span>
        </h1>
        <p className="text-[14px] text-txt-secondary leading-relaxed">
          Please enter your phone number. We'll send you an OTP so we know you're real.
        </p>
      </div>

      {/* Phone input */}
      <div className="mb-6">
        <label className="text-[12px] font-semibold text-txt-secondary uppercase tracking-[0.5px] mb-2 block">
          Mobile Number
        </label>
        <div
          className="flex items-center rounded-2xl border-[1.5px] overflow-hidden transition-colors"
          style={{ borderColor: phone.length > 0 ? '#386AF6' : '#E2E8F0' }}
        >
          <div className="flex items-center gap-1.5 px-4 py-3.5 border-r border-[#E2E8F0] bg-[#F8FAFC] flex-shrink-0">
            <span className="text-[18px]">🇮🇳</span>
            <span className="text-[14px] font-bold text-txt-primary">+91</span>
            <span className="text-[10px] text-txt-tertiary">▾</span>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={onPhoneChange}
            placeholder="80897 69802"
            className="flex-1 px-4 py-3.5 text-[16px] font-semibold text-txt-primary bg-white outline-none"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          />
          {phone.length === 10 && (
            <div className="px-3">
              <div className="w-5 h-5 rounded-full bg-ok flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </div>
        <p className="text-[11px] text-txt-tertiary mt-2">
          By continuing, I agree to SwiftChat's{' '}
          <span className="text-primary cursor-pointer font-medium">Terms of Service</span>
          {' '}and{' '}
          <span className="text-primary cursor-pointer font-medium">Privacy Policy</span>
        </p>
      </div>

      {/* Send OTP button */}
      <button
        onClick={() => navigate('phone_otp')}
        disabled={!canProceed}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: canProceed ? 'linear-gradient(135deg, #386AF6 0%, #5B85F8 100%)' : '#CBD5E1',
          fontFamily: 'Montserrat, sans-serif',
          boxShadow: canProceed ? '0 4px 16px rgba(56,106,246,0.35)' : 'none',
        }}
      >
        Send OTP
      </button>

      <button
        onClick={goBack}
        className="mt-4 text-[13px] text-txt-secondary text-center w-full"
      >
        ← Back to login options
      </button>

      {/* Demo hint */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-[11px] text-txt-tertiary">Demo parent:</span>
        <button
          onClick={onDemoFill}
          className="text-[11px] font-bold text-primary underline underline-offset-2"
        >
          {DEMO_PHONE_USER.phone}
        </button>
      </div>
    </div>
  )
}
