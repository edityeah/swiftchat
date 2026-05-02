import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import StatusBar from '../components/StatusBar'
import TopBar from '../components/TopBar'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import ChatInput from '../components/ChatInput'
import QuickReplies from '../components/QuickReplies'
import { now } from '../utils/helpers'
import { NAMO_PENDING, NAMO_REJECTED, scholarshipAmount } from '../utils/namoFlow'

function ScanCard({ label, scanType, onDone }) {
  const [state, setState] = useState('idle') // idle | scanning | done
  const handle = () => {
    setState('scanning')
    setTimeout(() => { setState('done'); onDone() }, 2000)
  }
  if (state === 'done') return (
    <div className="bg-ok-light border border-[#C8E6C9] rounded-xl p-3 text-[12px] text-[#1B5E20] font-bold">
      ✅ {label} scanned &amp; verified
    </div>
  )
  return (
    <button
      onClick={handle}
      disabled={state === 'scanning'}
      className="w-full border-2 border-dashed border-primary rounded-xl p-4 text-center transition-colors active:bg-primary-light disabled:opacity-70"
    >
      <div className="text-3xl mb-1">{state === 'scanning' ? '⏳' : '📷'}</div>
      <div className="text-[12px] font-bold text-primary">
        {state === 'scanning' ? 'Scanning — hold steady…' : `Tap to scan ${label}`}
      </div>
      <div className="text-[11px] text-txt-secondary mt-0.5">
        {state === 'scanning' ? 'Processing document…' : 'Position document in camera frame'}
      </div>
    </button>
  )
}

const INIT = [{ id: 1, type: 'bot', time: now(), html: `🏅 <strong>Namo Laxmi Yojana</strong><br><br>Scholarship for girl students (Class 6–12)<br>💰 ₹10,000–₹25,000 per year<br><br>What would you like to do?`, actions: [] }]

export default function NamoLaxmiPage() {
  const { goBack, showToast, openCanvas } = useApp()
  const [msgs, setMsgs] = useState(INIT)
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState(0)
  const [data, setData] = useState({})
  const [chips, setChips] = useState(['📋 Apply now', '⏳ Pending apps', '❌ Rejected'])
  const [usedChips, setUsedChips] = useState([])
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [msgs, typing])

  const addBot = (html, actions = []) =>
    setMsgs(p => [...p, { id: Date.now() + Math.random(), type: 'bot', html, actions, time: now() }])

  const addUser = text =>
    setMsgs(p => [...p, { id: Date.now(), type: 'user', text, time: now() }])

  const delay = (fn, ms = 1100) => {
    setTyping(true)
    setTimeout(() => { setTyping(false); fn() }, ms)
  }

  const handleChip = chip => {
    setUsedChips(p => [...p, chip])
    addUser(chip)
    if (chip.includes('Apply')) {
      delay(() => {
        addBot('✨ <strong>New Application</strong><br><br>Enter the <strong>student\'s full name</strong> to begin:')
        setStep(1)
        setChips([])
      })
    } else if (chip.includes('Pending')) {
      delay(() => {
        addBot(`⏳ <strong>Pending (${NAMO_PENDING.length})</strong><br><br>` +
          NAMO_PENDING.map(s => `📋 <strong>${s.name}</strong> (${s.cls}) — 🔴 ${s.issue}`).join('<br><br>'))
        setChips(['📋 Apply now', '❌ Rejected'])
      })
    } else if (chip.includes('Rejected')) {
      delay(() => {
        addBot(`❌ <strong>Rejected (${NAMO_REJECTED.length})</strong><br><br>` +
          NAMO_REJECTED.map(s => `✗ <strong>${s.name}</strong> (${s.cls})<br>${s.reason} — ${s.date}`).join('<br><br>'))
        setChips(['📋 Apply now', '⏳ Pending apps'])
      })
    }
  }

  const handleSend = text => {
    addUser(text)
    if (step === 1) {
      setData(d => ({ ...d, name: text }))
      delay(() => { addBot(`👤 <strong>${text}</strong><br><br>Enter class and section (e.g. "9-B"):`) ; setStep(2) })
    } else if (step === 2) {
      setData(d => ({ ...d, cls: text }))
      delay(() => { addBot(`📚 Class <strong>${text}</strong><br><br>Step 2 — Enter registered mobile number:`) ; setStep(3) })
    } else if (step === 3) {
      setData(d => ({ ...d, phone: text }))
      delay(() => { addBot(`📱 OTP sent to ${text.replace(/(\d{3})\d{4}/, '$1****')} ✓<br><br>Enter the 6-digit OTP:`) ; setStep(4) })
    } else if (step === 4) {
      delay(() => {
        addBot('✅ <strong>Phone verified!</strong><br><br>Step 3 — Scan the student\'s Aadhaar card:')
        setMsgs(p => [...p, { id: Date.now() + 2, type: 'scan', scanType: 'aadhaar', label: "Student's Aadhaar", time: now() }])
        setStep(5)
      })
    } else {
      delay(() => addBot('Got it — processing your request.'))
    }
  }

  const handleScan = scanType => {
    showToast(`${scanType} verified ✓`, 'ok')
    if (scanType === 'aadhaar') {
      delay(() => {
        addBot('✅ <strong>Aadhaar verified!</strong><br><br>Step 4 — Scan mother\'s Aadhaar / voter ID:')
        setMsgs(p => [...p, { id: Date.now() + 2, type: 'scan', scanType: 'mother', label: "Mother's Aadhaar", time: now() }])
        setStep(6)
      }, 400)
    } else if (scanType === 'mother') {
      delay(() => {
        addBot('✅ <strong>Mother\'s ID verified!</strong><br><br>Step 5 — Scan bank passbook (first page):')
        setMsgs(p => [...p, { id: Date.now() + 2, type: 'scan', scanType: 'passbook', label: 'Bank Passbook', time: now() }])
        setStep(7)
      }, 400)
    } else if (scanType === 'passbook') {
      delay(() => {
        const amt = scholarshipAmount(data.cls || '9')
        addBot(
          `✅ <strong>All documents verified!</strong><br><br>` +
          `📋 <strong>Application Summary</strong><br>` +
          `Student: <strong>${data.name || 'Priya Patel'}</strong><br>` +
          `Class: ${data.cls || '9-A'} · Amount: <strong>${amt}</strong><br>` +
          `Phone: ${data.phone || '+91 ••••••7890'}<br><br>` +
          `Please review and confirm:`,
          [{ label: '✅ Submit Application', action: 'submit_namo' }, { label: '✏️ Edit Details', action: 'edit_namo' }]
        )
        setStep(8)
      }, 400)
    }
  }

  const renderMsg = msg => {
    if (msg.type === 'scan') {
      return (
        <div key={msg.id} className="self-start w-[85%] animate-bubble-in">
          <ScanCard label={msg.label} scanType={msg.scanType} onDone={() => handleScan(msg.scanType)} />
        </div>
      )
    }
    return <ChatBubble key={msg.id} message={msg} />
  }

  return (
    <div className="flex flex-col h-full bg-surface-chat">
      <StatusBar />
      <TopBar
        title="Namo Laxmi"
        sub="Scholarship Application Bot"
        icon="🏅"
        actions={[
          { icon: '⊞', onClick: () => openCanvas({ chatId: 'namo_laxmi', botName: 'Namo Laxmi' }) },
          { icon: '⋮', onClick: () => showToast('Options', 'info') },
        ]}
      />
      {chips.length > 0 && <QuickReplies chips={chips} onSelect={handleChip} usedChips={usedChips} />}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5 scrollbar-hide">
        {msgs.map(renderMsg)}
        {typing && <TypingIndicator />}
      </div>
      <ChatInput onSend={handleSend} placeholder="Reply to Namo Laxmi Bot…" />
    </div>
  )
}
