import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAIChat() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role:    m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }))
      const { data } = await api.post<{ data: { reply: string } }>('/ai/chat', {
        message: trimmed,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const reset = useCallback(() => setMessages([]), [])

  return { messages, isLoading, send, reset }
}
