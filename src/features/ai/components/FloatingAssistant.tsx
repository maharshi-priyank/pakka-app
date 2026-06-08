import { useState, useEffect } from 'react'
import { X, RotateCcw, CornerRightUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIChat } from '../hooks/useAIChat'
import { useAutoResizeTextarea } from '@/components/hooks/use-auto-resize-textarea'

const SUGGESTIONS = [
  'When do I need GST registration?',
  'What is TDS 194J?',
  'IGST vs CGST+SGST?',
  'New vs old tax regime?',
]

const GREETING = "Hi! I can help with GST, TDS, invoicing, contracts, tax filing — anything about running your freelance business in India. What's on your mind?"

const INPUT_MIN_HEIGHT = 36

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const { messages, isLoading, send, reset } = useAIChat()
  const [input, setInput] = useState('')

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: 120,
  })

  useEffect(() => {
    function handler(e: Event) {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message
      setOpen(true)
      if (msg) setTimeout(() => send(msg), 80)
    }
    window.addEventListener('open-assistant', handler)
    return () => window.removeEventListener('open-assistant', handler)
  }, [send])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 150)
  }, [open, textareaRef])

  useEffect(() => {
    // scroll to bottom on new messages
    if (textareaRef.current) {
      const container = textareaRef.current.closest('.messages-scroll')
      if (container) container.scrollTop = container.scrollHeight
    }
  }, [messages, isLoading, textareaRef])

  function handleSend() {
    if (!input.trim() || isLoading) return
    send(input)
    setInput('')
    adjustHeight(true)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleReset() {
    reset()
    setInput('')
    adjustHeight(true)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* Chat box */}
      {open && (
        <div
          className="w-[340px] max-h-[520px] flex flex-col bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)' }}
        >

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F1F5F9] shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-base shrink-0">✦</div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#0F172A]">ClearWork Assistant</p>
              <p className="text-[10px] text-[#10B981] flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full inline-block" />
                Online · replies instantly
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={handleReset} title="New chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors">
                <RotateCcw size={13} strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors">
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-scroll flex-1 overflow-y-auto p-3 space-y-3 bg-[#F8FAFC]">

            {/* Greeting */}
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[11px] shrink-0 mt-0.5">✦</div>
              <div className="bg-white border border-[#E2E8F0] rounded-[0_10px_10px_10px] px-3 py-2 text-[12px] text-[#374151] leading-relaxed shadow-sm max-w-[260px]">
                {GREETING}
              </div>
            </div>

            {/* Suggestions — only when no messages yet */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pl-8">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { send(s); setInput('') }}
                    className="bg-white text-[#374151] border border-[#E2E8F0] rounded-full px-3 py-1 text-[10px] hover:bg-[#F1F5F9] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map((msg, i) => (
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-[#0F172A] text-white rounded-[10px_10px_0_10px] px-3 py-2 text-[12px] leading-relaxed max-w-[240px]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[11px] shrink-0 mt-0.5">✦</div>
                  <div className={cn(
                    'rounded-[0_10px_10px_10px] px-3 py-2 text-[12px] leading-relaxed shadow-sm max-w-[260px] whitespace-pre-wrap',
                    msg.isError
                      ? 'bg-[#FFF1F1] border border-[#FECACA] text-[#991B1B]'
                      : 'bg-white border border-[#E2E8F0] text-[#374151]',
                  )}>
                    {msg.content}
                  </div>
                </div>
              )
            ))}

            {/* AI thinking indicator */}
            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-md bg-[#F0FDF4] flex items-center justify-center text-[11px] shrink-0 mt-0.5">✦</div>
                <div className="bg-white border border-[#E2E8F0] rounded-[0_10px_10px_10px] px-3 py-2.5 shadow-sm flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 bg-[#0F172A] rounded-sm animate-spin"
                    style={{ animationDuration: '2s' }}
                  />
                  <span className="text-[11px] text-[#94A3B8]">Thinking...</span>
                </div>
              </div>
            )}

            <div className="h-1" />
          </div>

          {/* Input area */}
          <div className="px-3 py-2.5 border-t border-[#E2E8F0] bg-white flex gap-2 items-end shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustHeight() }}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              disabled={isLoading}
              rows={1}
              className={cn(
                'flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-3 py-2',
                'text-[12px] text-[#0F172A] placeholder:text-[#94A3B8]',
                'outline-none focus:border-[#94A3B8] transition-colors',
                'resize-none leading-[1.4] overflow-hidden',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              style={{ minHeight: `${INPUT_MIN_HEIGHT}px`, maxHeight: '120px' }}
            />

            {/* Send / loading button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all',
                isLoading
                  ? 'bg-transparent cursor-default'
                  : 'bg-[#0F172A] text-white hover:bg-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label={isLoading ? 'AI is thinking' : 'Send message'}
            >
              {isLoading ? (
                <div
                  className="w-3.5 h-3.5 bg-[#0F172A] rounded-sm animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              ) : (
                <CornerRightUp size={13} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-[50px] h-[50px] bg-[#0F172A] text-white rounded-full flex items-center justify-center hover:bg-[#1E293B] transition-colors"
        style={{ boxShadow: '0 4px 20px rgba(15,23,42,0.35)' }}
        aria-label="Open ClearWork Assistant"
      >
        {open
          ? <X size={20} strokeWidth={2} />
          : <span className="text-[22px] leading-none">✦</span>
        }
      </button>
    </div>
  )
}
