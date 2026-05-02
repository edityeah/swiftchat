import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'
import Shield3D from '../assets/icons/Shield3D'
import EllipseLarge from '../assets/icons/EllipseLarge'
import EllipseSmall from '../assets/icons/EllipseSmall'
import iconsBg from '../assets/images/icons-background.svg'

// ── Carousel slide data ────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    headline: 'Enjoyed by',
    bold: '10 crores smart children across India',
    visual: 'students',
  },
  {
    id: 1,
    headline: 'Trusted by',
    bold: '10+ State Education Boards',
    visual: 'shield',
  },
  {
    id: 2,
    headline: 'Featured as',
    bold: 'Best App on Google Play Store for 2023 in AI category',
    visual: 'trophy',
  },
]

// ── Slide visuals ──────────────────────────────────────────────────────────
function SlideVisual({ type }) {
  if (type === 'shield') {
    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute" style={{ width: 220, height: 220, opacity: 0.15 }}>
          <EllipseLarge size={220} />
        </div>
        <div className="absolute" style={{ width: 80, height: 80, bottom: 56, right: 32, opacity: 0.12, transform: 'rotate(-52deg)' }}>
          <EllipseSmall size={80} />
        </div>
        <div className="relative z-10">
          <Shield3D width={150} height={180} />
        </div>
      </div>
    )
  }
  if (type === 'trophy') {
    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute top-4 right-8 text-[13px] font-semibold text-txt-secondary text-right leading-snug">
          Featured as<br />
          <span className="text-txt-primary font-bold">Best App on Google Play<br />Store for 2023 in<br />AI category</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-[90px] leading-none select-none">🏆</div>
          <div className="mt-2 flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-card">
            <span className="text-[18px]">▶</span>
            <span className="text-[11px] font-bold text-txt-secondary">Google Play</span>
          </div>
        </div>
        {/* Decorative shapes */}
        <div className="absolute top-8 left-8 w-6 h-6 border-2 border-primary-light rounded-full opacity-40" />
        <div className="absolute bottom-16 right-6 w-4 h-4 border-2 border-primary-light rotate-45 opacity-40" />
        <div className="absolute top-14 right-4 w-5 h-5 rounded-full border-[1.5px] border-txt-tertiary opacity-30" />
      </div>
    )
  }
  // students (default slide 0)
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <div className="absolute" style={{ width: 220, height: 220, opacity: 0.12 }}>
        <EllipseLarge size={220} />
      </div>
      <img
        src={iconsBg}
        alt=""
        className="absolute"
        style={{ width: 200, height: 154, opacity: 0.7, transform: 'translate(10%, -5%)' }}
      />
      {/* Students illustration placeholder — two figures studying */}
      <div className="relative z-10 flex gap-4 items-end">
        <div className="flex flex-col items-center">
          <div className="w-16 h-20 bg-[#FFC107] rounded-t-full rounded-b-lg shadow-card flex items-end justify-center pb-1">
            <span className="text-[30px]">👧</span>
          </div>
          <div className="w-14 h-5 bg-[#FF9800] rounded-sm mt-0.5" />
        </div>
        <div className="flex flex-col items-center mb-2">
          <div className="w-14 h-16 bg-[#1565C0] rounded-t-full rounded-b-lg shadow-card flex items-end justify-center pb-1">
            <span className="text-[26px]">👦</span>
          </div>
          <div className="w-12 h-4 bg-[#1976D2] rounded-sm mt-0.5" />
        </div>
      </div>
    </div>
  )
}

// ── Mobile hero area ───────────────────────────────────────────────────────
function MobileHero({ slide, total }) {
  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: '#F4F6FA' }}>
      {/* slide label */}
      <div className="absolute top-10 right-5 text-right z-10 pointer-events-none" style={{ maxWidth: 160 }}>
        <p className="text-[13px] font-medium text-txt-secondary leading-snug">
          {slide.headline}
        </p>
        <p className="text-[14px] font-bold text-txt-secondary leading-snug mt-0.5">
          {slide.bold}
        </p>
      </div>

      <SlideVisual type={slide.visual} />

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 items-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="transition-all duration-300"
            style={{
              width: i === slide.id ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i === slide.id ? '#386AF6' : '#C5CBDC',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Desktop left panel ─────────────────────────────────────────────────────
function DesktopPanel({ slide, total }) {
  return (
    <div
      className="hidden md:flex flex-col h-full overflow-hidden"
      style={{ background: '#F4F6FA', flex: '1 1 0' }}
    >
      {/* Logo top-left */}
      <div className="p-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-card">
          <Logo size={22} />
        </div>
      </div>

      {/* Central illustration */}
      <div className="flex-1 relative">
        <SlideVisual type={slide.visual} />
      </div>

      {/* Caption + dots bottom */}
      <div className="p-8 pb-10">
        <p className="text-[13px] font-medium text-txt-secondary">{slide.headline}</p>
        <p className="text-[15px] font-bold text-txt-primary mt-1 leading-snug max-w-[260px]">
          {slide.bold}
        </p>
        <div className="flex gap-2 mt-5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="transition-all duration-300 rounded-full"
              style={{
                width: i === slide.id ? 20 : 8,
                height: 8,
                background: i === slide.id ? '#386AF6' : '#C5CBDC',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Login action panel ─────────────────────────────────────────────────────
function LoginPanel({ navigate }) {
  return (
    <div
      className="flex flex-col bg-white"
      style={{
        // Mobile: full-width bottom sheet style
        // Desktop: fixed right panel width
        flexShrink: 0,
      }}
    >
      {/* Desktop: heading above the form (hidden on mobile, shown via md:) */}
      <div className="hidden md:flex flex-col px-10 pt-10 pb-6">
        <div className="mb-8">
          <p
            className="text-[16px] text-txt-secondary"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Hello there! Welcome to
          </p>
          <h1
            className="text-[34px] font-bold text-txt-primary leading-tight"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            SwiftChat
          </h1>
        </div>

        {/* Desktop: primary button */}
        <button
          onClick={() => navigate('select_state')}
          className="w-full bg-primary text-white font-bold text-[15px] py-3.5 rounded-pill shadow-modal active:opacity-80 transition-opacity mb-5"
          style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2px' }}
        >
          Login with State ID
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-bdr" />
          <span className="text-[11px] font-semibold text-txt-tertiary">or</span>
          <div className="flex-1 h-px bg-bdr" />
        </div>

        {/* Desktop: secondary button */}
        <button
          onClick={() => navigate('phone_entry')}
          className="w-full border-[1.5px] border-primary text-primary font-semibold text-[14px] h-12 rounded-pill bg-white active:bg-primary-light transition-colors"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Continue with Phone Number
        </button>

        {/* Legal */}
        <p
          className="text-center text-[11px] text-txt-tertiary mt-5 leading-relaxed"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          By continuing, I agree to SwiftChat's{' '}
          <span className="text-primary cursor-pointer">Terms of Service</span>
          {' '}and{' '}
          <span className="text-primary cursor-pointer">User Privacy Policy</span>
        </p>
      </div>

      {/* Mobile: rounded-top bottom sheet */}
      <div
        className="md:hidden flex flex-col rounded-t-3xl"
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 28,
          paddingBottom: 24,
          gap: 16,
          boxShadow: '0 -4px 24px rgba(56,106,246,0.10)',
        }}
      >
        <button
          onClick={() => navigate('select_state')}
          style={{
            background: '#386AF6',
            borderRadius: 50,
            paddingTop: 14,
            paddingBottom: 14,
            width: '100%',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '0.2px',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
          onTouchStart={e => (e.currentTarget.style.opacity = '0.85')}
          onTouchEnd={e => (e.currentTarget.style.opacity = '1')}
        >
          Login with State ID
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#E8EDF5' }} />
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 11, color: '#7383A5' }}>
            or
          </span>
          <div style={{ flex: 1, height: 1, background: '#E8EDF5' }} />
        </div>

        <button
          onClick={() => navigate('phone_entry')}
          style={{
            background: 'transparent',
            border: '1.5px solid #386AF6',
            borderRadius: 999,
            height: 48,
            width: '100%',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            color: '#386AF6',
            cursor: 'pointer',
          }}
          onTouchStart={e => (e.currentTarget.style.background = '#EEF2FF')}
          onTouchEnd={e => (e.currentTarget.style.background = 'transparent')}
        >
          Continue with Phone Number
        </button>

        <div style={{ textAlign: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 500, fontSize: 10, color: '#7383A5', letterSpacing: '0.2px' }}>
          By continuing, I agree to SwiftChat's{' '}
          <span style={{ color: '#386AF6', cursor: 'pointer' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: '#386AF6', cursor: 'pointer' }}>User Privacy Policy</span>
        </div>
      </div>
    </div>
  )
}

// ── Main LoginPage ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const { navigate } = useApp()
  const [slideIdx, setSlideIdx] = useState(0)

  // Auto-advance carousel every 3.5s
  const advance = useCallback(() => {
    setSlideIdx(i => (i + 1) % SLIDES.length)
  }, [])

  useEffect(() => {
    const t = setInterval(advance, 3500)
    return () => clearInterval(t)
  }, [advance])

  const slide = SLIDES[slideIdx]

  return (
    // Mobile: flex-col (hero on top, panel below)
    // Desktop: flex-row (left illustrated panel + right form panel)
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Desktop left panel — fills remaining space */}
      <DesktopPanel slide={slide} total={SLIDES.length} />

      {/* Mobile hero (hidden on desktop) */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <MobileHero slide={slide} total={SLIDES.length} />
        <LoginPanel navigate={navigate} />
      </div>

      {/* Desktop right panel — fixed comfortable width */}
      <div
        className="hidden md:flex flex-col justify-center flex-shrink-0"
        style={{ width: 'clamp(340px, 38%, 460px)', background: '#fff', borderLeft: '1px solid #E8EDF5' }}
      >
        <LoginPanel navigate={navigate} />
      </div>
    </div>
  )
}
