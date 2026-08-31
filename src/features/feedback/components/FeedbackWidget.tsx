import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, CheckCircle, Bug, Lightbulb, MessageSquare, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeedback, type FeedbackType } from '../hooks/useFeedback'

const CATEGORIES: { type: FeedbackType; label: string; icon: React.ElementType }[] = [
  { type: 'BUG',       label: 'Bug',       icon: Bug            },
  { type: 'FEATURE',   label: 'Feature',   icon: Lightbulb      },
  { type: 'GENERAL',   label: 'General',   icon: MessageSquare  },
  { type: 'COMPLAINT', label: 'Complaint', icon: AlertTriangle  },
]

export default function FeedbackWidget() {
  const [open, setOpen]           = useState(false)
  const [type, setType]           = useState<FeedbackType>('GENERAL')
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const subjectRef                = useRef<HTMLInputElement>(null)

  const { mutate, isPending } = useFeedback()

  useEffect(() => {
    if (open && !submitted) {
      setTimeout(() => subjectRef.current?.focus(), 120)
    }
  }, [open, submitted])

  function handleClose() {
    setOpen(false)
    if (submitted) {
      setTimeout(() => {
        setSubmitted(false)
        setSubject('')
        setMessage('')
        setType('GENERAL')
      }, 300)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || isPending) return
    mutate(
      { type, subject: subject.trim(), message: message.trim() || undefined },
      {
        onSuccess: () => setSubmitted(true),
      }
    )
  }

  const widget = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleClose}
        />
      )}

      {/* Popup — full-width on mobile (above bottom nav), fixed 340px on lg+ */}
      <div
        className={cn(
          'fixed z-[9999]',
          'left-3 right-3 lg:left-auto lg:right-5',
          'bottom-[144px] lg:bottom-20',
          'lg:w-[340px] rounded-2xl bg-white shadow-2xl border border-gray-100',
          'transition-all duration-200 origin-bottom-right',
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        )}
        style={{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">Share Feedback</p>
            <p className="text-xs text-gray-400 mt-0.5">Help us improve ClearWork</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <CheckCircle size={22} className="text-indigo-600" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-gray-900">Thank you!</p>
            <p className="text-xs text-gray-400 mt-1">Your feedback has been received.</p>
            <button
              onClick={handleClose}
              className="mt-5 text-xs text-indigo-600 font-medium hover:underline"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            {/* Category chips */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(({ type: t, label, icon: Icon }) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    type === t
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  )}
                >
                  <Icon size={12} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Subject</label>
              <input
                ref={subjectRef}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={200}
                required
                placeholder="Brief summary..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Message <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Tell us more..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!subject.trim() || isPending}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={14} strokeWidth={2} />
              )}
              Send Feedback
            </button>
          </form>
        )}
      </div>

      {/* FAB trigger — icon-only circle above bottom nav on mobile, pill on lg+ */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open feedback"
        className={cn(
          'fixed right-4 lg:right-5 z-[9999]',
          /* bottom-[88px] clears the 72px bottom nav on mobile; lg+ has no bottom nav */
          'bottom-[88px] lg:bottom-5',
          /* Mobile: 44×44 circle */
          'w-11 h-11 lg:w-auto lg:h-auto',
          'rounded-full',
          /* Desktop: pill */
          'lg:flex lg:items-center lg:gap-2 lg:px-4 lg:py-2.5',
          'flex items-center justify-center',
          'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700',
          'text-xs font-medium transition-all hover:shadow-xl',
          open && 'opacity-0 pointer-events-none scale-90'
        )}
      >
        <MessageCircle size={15} strokeWidth={2} />
        <span className="hidden lg:inline">Feedback</span>
      </button>
    </>
  )

  return createPortal(widget, document.body)
}
