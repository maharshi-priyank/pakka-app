import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSend:       (body: string) => Promise<void>
  isPending:    boolean
  placeholder?: string
}

export function ReplyComposer({ onSend, isPending, placeholder = 'Reply…' }: Props) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    await onSend(`<p>${trimmed.replace(/\n/g, '</p><p>')}</p>`)
    setText('')
    ref.current?.focus()
  }, [text, isPending, onSend])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 p-3 bg-gray-50/50">
      <div className={cn(
        'flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2',
        'focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all',
      )}>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={2}
          className="flex-1 resize-none text-[13px] outline-none placeholder-gray-300 bg-transparent leading-relaxed"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!text.trim() || isPending}
          className="mb-0.5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
      <p className="text-[10px] text-gray-300 mt-1.5 pl-1">⌘+Enter to send</p>
    </div>
  )
}
