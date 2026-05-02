import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'
import PeopleIllustration from '../assets/icons/PeopleIllustration'
import { DEMO_PHONE_USER } from '../data/mockData'

const OTP_LEN = 4
const OTP_TIMER = 40

export default function PhoneOTPPage() {
  const { navigate, goBack, setRole, showToast } = useApp()
  const [otp, setOtp]       = useState(Array(OTP_LEN).fill(''))
  const [status, setStatus] = useState('idle') // idle | error | success
  const [secs, setSecs]     = useState(OTP_TIMER)
  const inputRefs           = useRef([])
  const timerRef            = useRef(null)

  // Single countdown interval — not recreated on every tick
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next  = [...otp]
    next[i] = digit
    setOtp(next)
    setStatus('idle')
    if (digit && i < OTP_LEN - 1) inputRefs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
    if (!text) return
    const next = [...otp]
    text.split('').forEach((d, i) => { next[i] = d })
    setOtp(next)
    inputRefs.current[Math.min(text.length, OTP_LEN - 1)]?.focus()
  }

  const filled = otp.every(d => d !== '')

  const handleConfirm = () => {
    const code = otp.join('')
    // Accept demo OTP or any 4-digit non-0000 code
    const valid = code === DEMO_PHONE_USER.otp || (code !== '0000' && code.length === 4)
    if (!valid) { setStatus('error'); return }
    setStatus('success')
    setRole('parent')
    setTimeout(() => navigate('home', true), 1200)
  }

  const handleResend = () => {
    clearInterval(timerRef.current)
    setSecs(OTP_TIMER)
    setOtp(Array(OTP_LEN).fill(''))
    setStatus('idle')
    inputRefs.current[0]?.focus()
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0 }
        return s - 1
      })
    }, 1000)
    showToast('OTP resent ✓', 'ok')
  }

  const boxStyle = (d) => {
    const base = { width: 56, height: 56, fontSize: 24, fontWeight: 700, borderRadius: 16, border: '2px solid', outline: 'none', textAlign: 'center', transition: 'all 0.15s', fontFamily: 'Montserrat, sans-serif' }
    if (status === 'error')   return { ...base, background: '#FFF0F0', borderColor: '#EF4444', color: '#EF4444' }
    if (status === 'success') return { ...base, background: '#F0FFF4', borderColor: '#10B981', color: '#10B981' }
    if (d)                    return { ...base, background: '#EEF3FF', borderColor: '#386AF6', color: '#1A1F36' }
    return { ...base, background: '#F8FAFC', borderColor: '#E2E8F0', color: '#1A1F36' }
  }

  const FormBody = () => (
    <div className="px-6 pb-6">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold leading-tight mb-2"
          style={{ color: '#1A1F36', fontFamily: 'Montserrat, sans-serif' }}>
          Enter your<br />
          <span style={{ color: '#386AF6' }}>Verification code</span>
        </h1>
        <p className="text-[14px] text-txt-secondary leading-relaxed">
          Please enter the {OTP_LEN}-digit code sent to{' '}
          <span className="font-semibold text-txt-primary">+91 ••••• 69802</span>{' '}
          <button onClick={goBack} className="text-primary font-semibold">✏️</button>
        </p>
      </div>

      {/* OTP boxes */}
      <div className="flex gap-3 mb-2" onPaste={handlePaste}>
        {otp.map((d, i) => (
          <input
            key={i}
            ref={el => (inputRefs.current[i] = el)}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            style={boxStyle(d)}
          />
        ))}
      </div>

      {/* Status messages */}
      <div className="h-6 mb-4">
        {status === 'error' && (
          <p className="text-[13px] font-semibold" style={{ color: '#EF4444' }}>
            Oops! Wrong code. Please try again.
          </p>
        )}
        {status === 'success' && (
          <p className="text-[13px] font-semibold" style={{ color: '#10B981' }}>
            Hurray! OTP Verification Successful 🎉
          </p>
        )}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!filled || status === 'success'}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white disabled:opacity-40 disabled:pointer-events-none"
        style={{
          background: filled ? 'linear-gradient(135deg, #386AF6 0%, #5B85F8 100%)' : '#CBD5E1',
          fontFamily: 'Montserrat, sans-serif',
          boxShadow: filled ? '0 4px 16px rgba(56,106,246,0.35)' : 'none',
        }}
      >
        Confirm
      </button>

      {/* Timer / Resend */}
      <div className="flex items-center justify-center mt-5">
        {secs > 0 ? (
          <p className="text-[13px] text-txt-secondary">
            Resend code in <span className="font-bold text-primary">{secs}s</span>
          </p>
        ) : (
          <p className="text-[13px] text-txt-secondary">
            Did not receive code?{' '}
            <button onClick={handleResend} className="font-bold text-primary">Resend OTP</button>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">

      {/* ── Desktop: left illustration ── */}
      <div
        className="hidden md:flex flex-col items-center justify-center overflow-hidden"
        style={{
          flex: '1 1 0',
          background: 'linear-gradient(135deg, #EEF3FF 0%, #F5F0FF 100%)',
        }}
      >
        <div className="relative flex flex-col items-center justify-center gap-6 px-10 text-center w-full h-full">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full"
            style={{ background: 'rgba(56,106,246,0.07)', transform: 'translate(30%,-30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full"
            style={{ background: 'rgba(124,58,237,0.06)', transform: 'translate(-30%,30%)' }} />
          <PeopleIllustration width={300} height={300} />
          <div>
            <h3 className="text-[18px] font-bold text-txt-primary mb-1"
              style={{ fontFamily: 'Montserrat, sans-serif' }}>Quick & Secure
            </h3>
            <p className="text-[13px] text-txt-secondary max-w-[260px] leading-relaxed mx-auto">
              Your OTP expires in {OTP_TIMER} seconds. Never share it with anyone.
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile: full page ── */}
      <div className="md:hidden flex-1 flex flex-col overflow-y-auto bg-white">
        <div className="px-6 pt-6 pb-2">
          <Logo size={30} showText textColor="#1A1F36" />
        </div>
        <FormBody />
        <div className="flex justify-center pb-6 px-6">
          <PeopleIllustration width={200} height={200} />
        </div>
      </div>

      {/* ── Desktop: right form panel ── */}
      <div
        className="hidden md:flex flex-col justify-center"
        style={{ width: 'clamp(340px, 38%, 460px)', flexShrink: 0, padding: '0 16px' }}
      >
        <div className="mb-8 px-6">
          <Logo size={30} showText textColor="#1A1F36" />
        </div>
        <FormBody />
      </div>
    </div>
  )
}
