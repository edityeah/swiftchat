import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Toast from './components/Toast'
import CallOverlay from './components/CallOverlay'
import CanvasPanel from './canvas/CanvasPanel'
import NotificationToast from './components/notifications/NotificationToast'

import SplashPage        from './pages/SplashPage'
import LoginPage         from './pages/LoginPage'
import SelectStatePage   from './pages/SelectStatePage'
import SSORedirectPage   from './pages/SSORedirectPage'
import SSOVerifyingPage  from './pages/SSOVerifyingPage'
import SSOSuccessPage    from './pages/SSOSuccessPage'
import SSOFailPage       from './pages/SSOFailPage'
import PhoneEntryPage    from './pages/PhoneEntryPage'
import PhoneOTPPage      from './pages/PhoneOTPPage'
import HomePage          from './pages/SuperHomePage'
import UpdatesPage       from './pages/UpdatesPage'
import ProfilePage       from './pages/ProfilePage'
import ChatPage          from './pages/ChatPage'
import NamoLaxmiPage     from './pages/NamoLaxmiPage'
import PostsPage         from './pages/PostsPage'
import CreatePostPage    from './pages/CreatePostPage'

// Every chat bot ID that uses the generic ChatPage
const CHAT_IDS = ['swift','xamta','att','ews','tmsg','catt','cschol','dbt','datt','warroom','parentbot','kpi']
const AUTH_SCREENS = new Set(['splash','login','select_state','sso_redirect','sso_verifying','sso_ok','sso_fail','phone_entry','phone_otp'])

// Static routes: id → component
const STATIC_ROUTES = {
  splash:        <SplashPage />,
  login:         <LoginPage />,
  select_state:  <SelectStatePage />,
  sso_redirect:  <SSORedirectPage />,
  sso_verifying: <SSOVerifyingPage />,
  sso_ok:        <SSOSuccessPage />,
  sso_fail:      <SSOFailPage />,
  phone_entry:   <PhoneEntryPage />,
  phone_otp:     <PhoneOTPPage />,
  home:          <HomePage />,
  updates:       <UpdatesPage />,
  profile:       <ProfilePage />,
  posts:         <PostsPage />,
  create_post:   <CreatePostPage />,
  chat_namo_laxmi: <NamoLaxmiPage />,
}

function Screen({ id, current }) {
  const active = id === current
  const content = STATIC_ROUTES[id] ?? <ChatPage chatId={id.replace('chat_', '')} />

  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        active
          ? 'translate-x-0 opacity-100 pointer-events-auto z-10'
          : 'translate-x-full opacity-0 pointer-events-none z-0'
      }`}
    >
      {active ? content : null}
    </div>
  )
}

function AppRoutes() {
  const { screen, call } = useApp()
  const isAuth = AUTH_SCREENS.has(screen)

  // All possible screen IDs
  const allIds = [
    ...Object.keys(STATIC_ROUTES),
    ...CHAT_IDS.map(id => 'chat_' + id),
  ]

  const isFullScreen = isAuth || screen === 'home' || screen === 'posts' || screen === 'create_post'

  return (
    <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${isFullScreen ? '' : 'bg-[#e8eaf6]'}`}>
      {/*
        Only transition the shadow on full-screen ↔ framed route changes.
        Previously `transition-all duration-300` was animating the WIDTH
        too, which made content visually squish / clip during the 300ms
        switch (e.g. when going from sso_ok → home, or home → profile).
        Width is now instant; only the soft shadow crossfades.
      */}
      <div className={`relative h-full overflow-hidden transition-shadow duration-300 bg-white ${
        isFullScreen
          ? 'w-full'
          : 'w-full max-w-[420px] shadow-[0_0_40px_rgba(0,0,0,0.15)]'
      }`}>
        {allIds.map(id => (
          <Screen key={id} id={id} current={screen} />
        ))}
        {call && <CallOverlay />}
        <CanvasPanel />
        <Toast />
        <NotificationToast />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
