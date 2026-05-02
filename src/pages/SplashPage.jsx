import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'
import { Check } from 'lucide-react'

const LANGS = [
  { code: 'en', native: 'English',  english: 'English'  },
  { code: 'hi', native: 'हिन्दी',    english: 'Hindi'    },
  { code: 'gu', native: 'ગુજરાતી',  english: 'Gujarati' },
  { code: 'mr', native: 'मराठी',    english: 'Marathi'  },
  { code: 'te', native: 'తెలుగు',   english: 'Telugu'   },
]

export default function SplashPage() {
  const { navigate, lang, setLang } = useApp()
  const [selected, setSelected] = useState(lang || 'en')

  const handleContinue = () => {
    setLang(selected)
    navigate('login')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white overflow-y-auto">
    <div className="w-full max-w-[480px] flex flex-col items-center justify-between min-h-full px-6 py-10 gap-10">

      {/* Top: logo + heading */}
      <div className="flex flex-col items-center text-center w-full">
        {/* App icon */}
        <div className="mb-5">
          <Logo size={64} />
        </div>

        <h1
          className="text-[22px] font-bold text-txt-primary mb-1"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Choose your language
        </h1>
        <p
          className="text-[13px] text-txt-secondary"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          You can change this anytime from the Settings.
        </p>
      </div>

      {/* Language grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-[380px]">
        {LANGS.map(l => {
          const active = selected === l.code
          return (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 py-4 px-3 transition-all active:scale-[0.97] ${
                active
                  ? 'bg-ok-light border-ok'
                  : 'bg-white border-bdr hover:border-primary'
              }`}
            >
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ok flex items-center justify-center">
                  <Check size={12} color="#fff" strokeWidth={3} />
                </span>
              )}
              <span
                className={`text-[16px] font-bold ${active ? 'text-ok' : 'text-txt-primary'}`}
                style={{ fontFamily: 'Noto Sans, sans-serif' }}
              >
                {l.native}
              </span>
              {l.code !== 'en' && (
                <span className="text-[11px] text-txt-tertiary mt-0.5">
                  {l.english}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue button */}
      <div className="w-full max-w-[380px]">
        <button
          onClick={handleContinue}
          className="w-full bg-primary text-white font-bold text-[15px] py-3.5 rounded-pill shadow-modal active:opacity-80 transition-opacity"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Continue
        </button>
      </div>
    </div>
    </div>
  )
}
