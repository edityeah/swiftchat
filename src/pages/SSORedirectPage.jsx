import React, { useState } from 'react'
import { ArrowLeft, MoreVertical, Eye, EyeOff, Lock, RefreshCw, X, ChevronRight, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DEMO_SSO_USERS } from '../data/mockData'

const STATES = [
  'Gujarat', 'Punjab', 'Delhi', 'Uttar Pradesh', 'Maharashtra',
  'Karnataka', 'Tamil Nadu', 'West Bengal', 'Rajasthan', 'Madhya Pradesh',
]

function StateSheet({ onSelect, onClose }) {
  return (
    <div
      className="absolute inset-0 z-20 flex"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full bg-white shadow-canvas flex flex-col animate-slide-in"
        style={{ width: '72%', maxWidth: 320 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bdr">
          <span className="font-bold text-[15px] text-txt-primary">Select your state program</span>
          <button onClick={onClose} className="text-txt-tertiary active:text-txt-primary">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {STATES.map(state => (
            <button
              key={state}
              onClick={() => onSelect(state)}
              className="w-full text-left px-5 py-3.5 text-[14px] text-txt-primary border-b border-bdr-light hover:bg-primary-light active:bg-primary-light transition-colors"
            >
              {state}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SSORedirectPage() {
  const { navigate, goBack, ssoState, setSsoState, setRole } = useApp()
  const [stateId, setStateId] = useState('')
  const [password, setPassword] = useState('')
  const [captchaIn, setCaptchaIn] = useState('')
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [selectedState, setSelectedState] = useState(ssoState || 'Gujarat')
  const [showSheet, setShowSheet] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [captchaCode] = useState('3X6E5')

  const clearError = () => setError('')

  const handleSignIn = () => {
    const normalizedStateId = stateId.trim().toUpperCase()
    const normalizedPassword = password.trim()
    const normalizedCaptcha = captchaIn.trim().toUpperCase()

    if (!normalizedStateId || !normalizedPassword || !normalizedCaptcha) {
      setError('Enter your State ID, password, and captcha to continue.')
      return
    }

    if (normalizedCaptcha !== captchaCode) {
      setRole(null)
      setError('Captcha does not match. Please try again.')
      return
    }

    const match = DEMO_SSO_USERS.find(
      user => user.stateId.toUpperCase() === normalizedStateId && user.password === normalizedPassword
    )

    if (!match) {
      setRole(null)
      setError('State ID or password is incorrect. Try one of the demo credentials below.')
      return
    }

    setStateId(normalizedStateId)
    clearError()
    setRole(match.role)
    navigate('sso_verifying', true)
  }

  const fillDemo = (user) => {
    setStateId(user.stateId)
    setPassword(user.password)
    setCaptchaIn(captchaCode)
    clearError()
    setShowDemo(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-bdr bg-[#F8FAFC] flex-shrink-0">
        <button
          onClick={goBack}
          className="w-8 h-8 flex items-center justify-center text-txt-secondary active:text-txt-primary rounded-full active:bg-surface-secondary"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[11px] font-bold text-txt-primary flex-shrink-0">Exit Portal</span>

        <div className="flex-1 mx-2 flex items-center gap-1.5 bg-white rounded-lg border border-bdr px-2.5 py-1.5 min-w-0">
          <Lock size={11} className="text-ok flex-shrink-0" />
          <span className="text-[11px] text-txt-secondary truncate">
            https://sso.education.{selectedState.toLowerCase().replace(/\s+/g, '')}.gov.in/auth/login
          </span>
        </div>

        <button className="w-8 h-8 flex items-center justify-center text-txt-tertiary rounded-full active:bg-surface-secondary">
          <MoreVertical size={16} />
        </button>
      </div>

      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #1A3A5C 0%, #1E4D7A 100%)' }}
      >
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <span className="text-[20px]">🏛️</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/70">Government of India</div>
          <div className="text-[13px] font-bold text-white leading-tight">State Education Department</div>
          <div className="text-[10px] text-white/60">State | Ministry of Education</div>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-1 bg-white/15 text-white text-[11px] font-bold rounded-full px-2.5 py-1 active:bg-white/25"
        >
          {selectedState} <ChevronRight size={10} />
        </button>
      </div>

      <div className="h-1 bg-bdr flex-shrink-0">
        <div className="h-full w-[65%] bg-gradient-to-r from-[#FF6D00] to-[#4CAF50]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-[11px] text-txt-tertiary border-b border-bdr-light">
          Home &gt; Authentication &gt; <span className="text-primary font-semibold">SSO Login</span>
        </div>

        <div className="flex justify-center px-4 py-6">
          <div className="w-full max-w-[520px]">
            <div className="bg-white rounded-2xl border border-bdr shadow-card p-6 md:p-8">
              <h2
                className="text-[20px] font-bold text-txt-primary mb-1"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                Unified Login Portal
              </h2>
              <p className="text-[13px] text-txt-secondary mb-6">
                Sign in with your State Education ID to continue
              </p>

              <div className="mb-4">
                <label className="text-[11px] font-bold text-txt-secondary uppercase tracking-[0.6px] mb-1.5 block">
                  Student / Teacher ID <span className="text-danger">*</span>
                </label>
                <input
                  value={stateId}
                  onChange={e => { setStateId(e.target.value.toUpperCase()); clearError() }}
                  placeholder="TCH1001"
                  className="w-full px-4 py-3 rounded-xl border-[1.5px] border-bdr text-[14px] text-txt-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="mb-4">
                <label className="text-[11px] font-bold text-txt-secondary uppercase tracking-[0.6px] mb-1.5 block">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError() }}
                    placeholder="Demo@123"
                    className="w-full px-4 py-3 pr-10 rounded-xl border-[1.5px] border-bdr text-[14px] text-txt-primary bg-white outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-tertiary active:text-txt-secondary"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-[11px] font-bold text-txt-secondary uppercase tracking-[0.6px] mb-1.5 block">
                  Captcha Verification <span className="text-danger">*</span>
                </label>
                <div className="flex gap-3 mb-2 items-center">
                  <div className="flex items-center px-4 py-2 rounded-xl border-2 border-dashed border-primary bg-primary-light select-none">
                    <span
                      className="text-[20px] font-bold text-primary"
                      style={{ fontFamily: 'monospace', letterSpacing: '6px' }}
                    >
                      {captchaCode}
                    </span>
                  </div>
                  <button className="flex items-center gap-1.5 text-[12px] text-primary font-semibold active:opacity-70">
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
                <input
                  value={captchaIn}
                  onChange={e => { setCaptchaIn(e.target.value.toUpperCase()); clearError() }}
                  placeholder={captchaCode}
                  className="w-full px-4 py-3 rounded-xl border-[1.5px] border-bdr text-[14px] text-txt-primary bg-white outline-none focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <p className="mb-4 text-[12px] font-medium text-danger">
                  {error}
                </p>
              )}

              <button
                onClick={handleSignIn}
                disabled={!stateId || !password || !captchaIn}
                className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white transition-all disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
                style={{
                  background: '#1A3A5C',
                  fontFamily: 'Montserrat, sans-serif',
                  boxShadow: '0 4px 14px rgba(26,58,92,0.35)',
                }}
              >
                Sign In
              </button>
            </div>

            <div className="flex justify-between mt-3 px-1">
              <span className="text-[12px] text-primary cursor-pointer active:underline">Forgot Password?</span>
              <span className="text-[12px] text-primary cursor-pointer active:underline">Help / Support</span>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary text-[12px] font-semibold text-primary bg-primary-light"
              >
                <Zap size={13} /> Demo Credentials {showDemo ? '▲' : '▼'}
              </button>
              {showDemo && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {DEMO_SSO_USERS.map(user => (
                    <button
                      key={user.stateId}
                      onClick={() => fillDemo(user)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-bdr bg-white hover:bg-primary-light transition-colors text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{ background: user.color }}
                      >
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-txt-primary truncate">{user.name}</p>
                        <p className="text-[10px] text-txt-tertiary">{user.badge}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center mt-3">
              <span
                className="text-[11px] text-danger cursor-pointer font-semibold"
                onClick={() => navigate('sso_fail', true)}
              >
                Simulate server unavailable -&gt;
              </span>
            </p>
          </div>
        </div>
      </div>

      {showSheet && (
        <StateSheet
          onSelect={state => {
            setSelectedState(state)
            setSsoState(state)
            setShowSheet(false)
          }}
          onClose={() => setShowSheet(false)}
        />
      )}
    </div>
  )
}
