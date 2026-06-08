import { useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

export function useAIChat() {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // successfulMessages only contains real AI replies — never error stubs
  const successfulMessages = useRef<ChatMessage[]>([])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const history = successfulMessages.current.map(m => ({
        role:    m.role === 'assistant' ? 'model' : 'user',
        content: m.content,
      }))
      const { data } = await api.post<{ data: { reply: string } }>('/ai/chat', {
        message: trimmed,
        history,
      })
      const reply = data.data.reply
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply }
      successfulMessages.current = [...successfulMessages.current, userMsg, assistantMsg]
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: detail,
        isError: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const reset = useCallback(() => {
    setMessages([])
    successfulMessages.current = []
  }, [])

  return { messages, isLoading, send, reset }
}
