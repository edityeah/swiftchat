import React, { useState } from 'react'
import { Search, ChevronRight, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'

const VSK_LOGO = 'https://i.ibb.co/Xr1jqvd4/Logo-VSK-PNG.png'

const STATES = [
  { name: 'Gujarat',        abbr: 'GJ', logo: VSK_LOGO },
  { name: 'Punjab',         abbr: 'PB' },
  { name: 'Delhi',          abbr: 'DL' },
  { name: 'Uttar Pradesh',  abbr: 'UP' },
  { name: 'Maharashtra',    abbr: 'MH' },
  { name: 'Karnataka',      abbr: 'KA' },
  { name: 'Tamil Nadu',     abbr: 'TN' },
  { name: 'West Bengal',    abbr: 'WB' },
  { name: 'Rajasthan',      abbr: 'RJ' },
  { name: 'Madhya Pradesh', abbr: 'MP' },
  { name: 'Andhra Pradesh', abbr: 'AP' },
  { name: 'Bihar',          abbr: 'BR' },
  { name: 'Odisha',         abbr: 'OD' },
  { name: 'Kerala',         abbr: 'KL' },
  { name: 'Haryana',        abbr: 'HR' },
]

export default function SelectStatePage() {
  const { navigate, goBack, setSsoState, ssoState } = useApp()
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(ssoState || 'Gujarat')

  const filtered = STATES.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.abbr.toLowerCase().includes(query.toLowerCase())
  )

  const handleConfirm = () => {
    setSsoState(selected)
    navigate('sso_redirect')
  }

  const selectedState = STATES.find(s => s.name === selected)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <Logo size={28} showText textColor="#1A1F36" />
        <button onClick={goBack} className="text-[13px] text-txt-secondary font-medium hover:text-txt-primary transition-colors">
          Cancel
        </button>
      </div>

      {/* Heading */}
      <div className="px-5 pt-3 pb-4 flex-shrink-0">
        <h1 className="text-[24px] font-bold text-txt-primary leading-tight"
          style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Select your{' '}
          <span style={{ color: '#386AF6' }}>State Program</span>
        </h1>
        <p className="text-[13px] text-txt-secondary mt-1.5">
          Choose the state education board you belong to.
        </p>
      </div>

      {/* Search */}
      <div className="px-5 pb-4 flex-shrink-0">
        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-3 transition-colors"
          style={{
            border: `1.5px solid ${query ? '#386AF6' : '#E2E8F0'}`,
            background: '#F8FAFC',
          }}
        >
          <Search size={16} className="text-txt-tertiary flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search state or board name..."
            className="flex-1 bg-transparent text-[14px] text-txt-primary outline-none placeholder:text-txt-tertiary"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-txt-tertiary text-[14px] hover:text-txt-secondary">✕</button>
          )}
        </div>
      </div>

      {/* State list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-txt-tertiary text-[14px]">
            No states match "{query}"
          </div>
        )}
        <div className="px-5">
          <div className="rounded-2xl overflow-hidden" style={{ background: '#F8FAFC' }}>
            {filtered.map((s, idx) => {
              const isSelected = selected === s.name
              return (
                <button
                  key={s.name}
                  onClick={() => setSelected(s.name)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all"
                  style={{
                    background: isSelected ? '#EEF3FF' : 'transparent',
                    borderTop: idx > 0 ? '1px solid #EEF0F6' : 'none',
                    outline: isSelected ? '2px solid #386AF6' : '2px solid transparent',
                    outlineOffset: -2,
                    borderRadius: isSelected ? 14 : 0,
                    position: 'relative',
                    zIndex: isSelected ? 1 : 0,
                  }}
                >
                  {/* Badge / Logo */}
                  {s.logo ? (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{
                        background: isSelected ? '#386AF6' : '#E8ECF4',
                      }}
                    >
                      <img
                        src={s.logo}
                        alt={s.abbr}
                        className="w-6 h-6 object-contain"
                        style={{ filter: isSelected ? 'brightness(0) invert(1)' : 'none' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                      style={{
                        background: isSelected ? '#386AF6' : '#E8ECF4',
                        color: isSelected ? 'white' : '#64748B',
                      }}
                    >
                      {s.abbr}
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-semibold truncate"
                      style={{
                        color: isSelected ? '#1E3A5F' : '#1A1F36',
                        fontFamily: 'Montserrat, sans-serif',
                      }}
                    >
                      {s.name}
                    </p>
                    <p className="text-[11px] text-txt-tertiary mt-0.5">
                      State Education Board · SSO enabled
                    </p>
                  </div>

                  {/* Right icon */}
                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check size={14} color="white" strokeWidth={3} />
                    </div>
                  ) : (
                    <ChevronRight size={16} className="text-txt-tertiary flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar — split layout */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid #EEF0F6' }}
      >
        {/* Selection info */}
        <div className="min-w-0">
          <p className="text-[13px] text-txt-secondary">
            Selected: <span className="font-bold text-txt-primary">{selected}</span>
          </p>
          <p className="text-[11px] text-txt-tertiary truncate">
            State Education Board Portal
          </p>
        </div>

        {/* Confirm button — compact for web */}
        <button
          onClick={handleConfirm}
          className="flex-shrink-0 px-6 py-3 rounded-xl font-bold text-[14px] text-white active:opacity-80 transition-opacity"
          style={{
            background: '#1E3A5F',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          Continue with {selected}
        </button>
      </div>
    </div>
  )
}
