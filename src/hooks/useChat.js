import { useState, useCallback } from 'react'
import { getReply } from '../utils/chatData'
import { now } from '../utils/helpers'

export function useChat(chatId, role, initialMessages = []) {
  const [messages, setMessages] = useState(initialMessages)
  const [typing, setTyping] = useState(false)

  const addBotMessage = useCallback((html, actions = []) => {
    const msg = { id: Date.now() + Math.random(), type: 'bot', html, actions, time: now() }
    setMessages(prev => [...prev, msg])
  }, [])

  const sendMessage = useCallback((text) => {
    if (!text.trim()) return
    const userMsg = { id: Date.now(), type: 'user', text, time: now() }
    setMessages(prev => [...prev, userMsg])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      const { html, actions } = getReply(chatId, role, text)
      addBotMessage(html, actions)
    }, 1000 + Math.random() * 800)
  }, [chatId, role, addBotMessage])

  return { messages, typing, sendMessage, addBotMessage, setMessages }
}
