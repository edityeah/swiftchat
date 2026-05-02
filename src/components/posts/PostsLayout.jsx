import React, { useEffect, useRef, useState } from 'react'
import { MessageSquare, Newspaper, ChevronUp, LogOut, Plus, Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { USER_PROFILES } from '../../data/mockData'

const SWITCHABLE = [
  { id: 'teacher',         label: 'Teacher',         sublabel: 'Class teacher · GPS Mehsana' },
  { id: 'principal',       label: 'Principal',       sublabel: 'GPS Mehsana' },
  { id: 'deo',             label: 'DEO',             sublabel: 'District officer · Ahmedabad' },
  { id: 'state_secretary', label: 'State Secretary', sublabel: 'Education Dept · Gujarat' },
  { id: 'parent',          label: 'Parent',          sublabel: 'Parent portal' },
]

// Reusable desktop-style layout for non-chat surfaces (Posts, Create Post).
// Mirrors the VSKSidebar visual language so the experience is consistent
// when the user navigates between Chats and Posts.
export default function PostsLayout({ active = 'posts', headerTitle, headerRight, children }) {
  const { role, userProfile, switchRole, signOut, navigate } = useApp()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)
  const meta = userProfile || {}
  const initial = (meta.name || 'U')[0].toUpperCase()

  useEffect(() => {
    if (!switcherOpen) return
    const onDoc = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setSwitcherOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [switcherOpen])

  const titleLarge = { fontSize: 16, fontWeight: 700, lineHeight: '20px', fontFamily: 'Montserrat, sans-serif' }
  const caption    = { fontSize: 11, fontWeight: 500, lineHeight: '14px', letterSpacing: '0.2px', fontFamily: 'Montserrat, sans-serif' }
  const navLabel   = { fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px', fontFamily: 'Montserrat, sans-serif' }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#ECECEC' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col h-full bg-white border-r flex-shrink-0"
        style={{ width: 260, borderRightColor: '#D5D8DF' }}
      >
        {/* Branding */}
        <div className="flex items-center gap-2 px-4 py-4 border-b" style={{ borderBottomColor: '#ECECEC' }}>
          <img
            src="https://i.ibb.co/Xr1jqvd4/Logo-VSK-PNG.png"
            alt="VSK Gujarat" width={32} height={32}
            style={{ objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
          <span style={{ ...titleLarge, color: '#0E0E0E' }}>VSK Gujarat</span>
        </div>

        {/* Search (visual parity with home) */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: '#ECECEC' }}>
            <Search size={14} className="flex-shrink-0" style={{ color: '#828996' }} />
            <input
              className="flex-1 bg-transparent outline-none placeholder:text-[#828996]"
              placeholder="Search posts…"
              style={{ fontSize: 14, fontWeight: 500, lineHeight: '20px', letterSpacing: '0.1px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 pb-2 flex-1">
          <NavItem
            Icon={MessageSquare}
            label="Chats"
            isActive={active === 'home'}
            onClick={() => navigate('home')}
          />
          <NavItem
            Icon={Newspaper}
            label="Posts"
            badge="NEW"
            isActive={active === 'posts'}
            onClick={() => navigate('posts')}
          />
        </nav>

        {/* User footer with Switch / Sign out */}
        <div className="relative border-t" style={{ borderTopColor: '#ECECEC' }} ref={switcherRef}>
          {switcherOpen && (
            <div
              className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: '0 8px 28px rgba(15, 23, 42, 0.18)', border: '1px solid #ECECEC', zIndex: 50 }}
            >
              <div
                className="px-3 py-2"
                style={{ ...caption, color: '#828996', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #ECECEC' }}
              >
                Switch user
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {SWITCHABLE.map(opt => {
                  const activeRole = opt.id === role
                  const profile = USER_PROFILES[opt.id]
                  const optInitial = (profile?.name || opt.label)[0].toUpperCase()
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { setSwitcherOpen(false); if (!activeRole) switchRole(opt.id) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                      style={{ background: activeRole ? '#ECECEC' : 'transparent' }}
                      onMouseEnter={e => { if (!activeRole) e.currentTarget.style.background = '#F4F5F7' }}
                      onMouseLeave={e => { if (!activeRole) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: profile?.color || '#386AF6', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
                      >{optInitial}</div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>{opt.label}</div>
                        <div className="truncate" style={{ ...caption, color: '#828996' }}>{opt.sublabel}</div>
                      </div>
                      {activeRole && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#386AF6', fontFamily: 'Montserrat, sans-serif' }}>Active</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => { setSwitcherOpen(false); signOut() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#FEE2E2]"
                style={{ borderTop: '1px solid #ECECEC', color: '#DC2626', fontFamily: 'Montserrat, sans-serif' }}
              >
                <LogOut size={16} />
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>Sign out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setSwitcherOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={switcherOpen}
            className="w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-[#F4F5F7]"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: meta.color || '#386AF6', fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
            >{initial}</div>
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>{meta.name || meta.org}</div>
              <div className="truncate" style={{ ...caption, color: '#828996' }}>{meta.badge || meta.org}</div>
            </div>
            <span
              className="flex-shrink-0 transition-transform"
              style={{ color: '#7383A5', transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              aria-hidden="true"
            >
              <ChevronUp size={16} />
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        <header
          className="flex items-center gap-3 px-4 md:px-6 h-14 bg-white border-b flex-shrink-0"
          style={{ borderBottomColor: '#ECECEC', fontFamily: 'Montserrat, sans-serif' }}
        >
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0E0E0E' }}>{headerTitle?.title}</div>
            {headerTitle?.sub && (
              <div style={{ fontSize: 11, fontWeight: 500, color: '#828996' }}>{headerTitle.sub}</div>
            )}
          </div>
          {headerRight}
        </header>

        <div className="flex-1 overflow-y-auto" style={{ background: '#ECECEC' }}>
          {children}
        </div>
      </main>
    </div>
  )
}

function NavItem({ Icon, label, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors mb-0.5"
      style={{
        background: isActive ? '#ECECEC' : 'transparent',
        color: isActive ? '#0E0E0E' : '#7383A5',
        fontFamily: 'Montserrat, sans-serif',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={16} style={{ color: isActive ? '#386AF6' : '#7383A5' }} />
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px' }}>{label}</span>
      {badge && (
        <span
          className="ml-auto text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: '#386AF6' }}
        >{badge}</span>
      )}
    </button>
  )
}

// Re-export the create button helper so callers can drop it into headerRight.
export function CreatePostButton({ onClick, label = 'Create post' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold text-sm transition-colors"
      style={{ background: '#386AF6', fontFamily: 'Montserrat, sans-serif' }}
      onMouseEnter={e => e.currentTarget.style.background = '#2D55D8'}
      onMouseLeave={e => e.currentTarget.style.background = '#386AF6'}
    >
      <Plus size={16} strokeWidth={2.5} />
      {label}
    </button>
  )
}
