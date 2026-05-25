import { useRef, useState, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  from:    string
  to:      string
  onFrom:  (v: string) => void
  onTo:    (v: string) => void
  onClear: () => void
}

export default function DateRangePill({ from, to, onFrom, onTo, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = !!(from || to)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function fmt(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const label = isActive ? `${fmt(from) || '…'} – ${fmt(to) || '…'}` : 'Date'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-medium transition-all whitespace-nowrap',
          isActive
            ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#2563EB] dark:text-[#93C5FD]'
            : 'border-[#E4E7EC] dark:border-[#26283A] text-[#667085] dark:text-[#8B92A8] bg-white dark:bg-[#13141A] hover:border-[#D0D5DD] dark:hover:border-[#3D4258] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23]',
        )}
      >
        <Calendar size={12} strokeWidth={2} />
        {label}
        {isActive ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onClear() }}
            className="w-4 h-4 rounded-full hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={9} strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown size={11} className={cn('transition-transform duration-150', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-60 bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-xl dark:shadow-black/40 z-50 p-4 space-y-3">
          <div>
            <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-1.5">From</p>
            <input
              type="date"
              value={from}
              onChange={e => onFrom(e.target.value)}
              className="w-full h-8 px-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#13141A] text-[12px] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-1.5">To</p>
            <input
              type="date"
              value={to}
              onChange={e => onTo(e.target.value)}
              className="w-full h-8 px-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#13141A] text-[12px] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          {isActive && (
            <button
              onClick={() => { onClear(); setOpen(false) }}
              className="text-[11px] text-[#98A2B3] hover:text-[#D92D20] transition-colors font-medium"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  )
}
