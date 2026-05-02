import React, { useRef, useEffect, useState } from 'react'
import { Phone, PanelRight, MoreVertical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBar from '../components/StatusBar'
import TopBar from '../components/TopBar'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import ChatInput from '../components/ChatInput'
import QuickReplies from '../components/QuickReplies'
import AttendanceGrid from '../components/AttendanceGrid'
import { useChat } from '../hooks/useChat'
import { getChatConfig, getInitialMessage } from '../utils/chatData'
import { now } from '../utils/helpers'

export default function ChatPage({ chatId }) {
  const { role, goBack, openCall, openCanvas, showToast } = useApp()
  const cfg = getChatConfig(chatId, role)
  const [usedChips, setUsedChips] = useState([])
  const [micActive, setMicActive] = useState(false)
  const [showAtt, setShowAtt] = useState(false)
  const bodyRef = useRef(null)

  const init = getInitialMessage(chatId, role)
  const initMsgs = init ? [{ id: 1, type: 'bot', html: init.html, actions: init.actions || [], time: now() }] : []

  const { messages, typing, sendMessage, addBotMessage } = useChat(chatId, role, initMsgs)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, typing])

  const handleChip = chip => {
    setUsedChips(p => [...p, chip])
    // Special handling for attendance
    if (chatId === 'att' && chip.includes('Mark')) {
      setShowAtt(true)
      return
    }
    sendMessage(chip)
  }

  const handleMic = () => {
    setMicActive(m => !m)
    showToast(micActive ? 'Mic off' : 'Listening…', micActive ? '' : 'info')
  }

  const actions = [
    { icon: <Phone size={20} />,       label: 'Call',    onClick: () => openCall(chatId, cfg.name) },
    { icon: <PanelRight size={20} />,  label: 'Canvas',  onClick: () => openCanvas({ chatId, botName: cfg.name, role }) },
    { icon: <MoreVertical size={20} />, label: 'Options', onClick: () => showToast('Options', 'info') },
  ]

  return (
    <div className="flex flex-col h-full bg-surface-chat">
      <StatusBar />
      <TopBar title={cfg.name} sub={cfg.sub} icon={cfg.icon} actions={actions} />
      <QuickReplies chips={cfg.chips} onSelect={handleChip} usedChips={usedChips} />

      <div ref={bodyRef} className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5 bg-surface-chat scrollbar-hide">
        {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
        {/* Attendance inline widget */}
        {showAtt && chatId === 'att' && (
          <div className="self-start w-full max-w-[90%] bg-white rounded-2xl p-3 shadow-card animate-bubble-in">
            <div className="text-[12px] font-bold text-txt-secondary mb-2 pb-1 border-b border-bdr-light">
              📅 Class 6-B Attendance — Today
            </div>
            <AttendanceGrid onSubmit={() => { setShowAtt(false); addBotMessage('✅ Attendance submitted. Parent alerts queued for 5 PM ✓', []) }} />
          </div>
        )}
        {typing && <TypingIndicator />}
      </div>

      <ChatInput
        onSend={sendMessage}
        onMicToggle={handleMic}
        micActive={micActive}
        placeholder={`Message ${cfg.name}…`}
      />
    </div>
  )
}
