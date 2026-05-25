import { useRef, useState, useEffect } from 'react'
import { CalendarClock, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type FollowUpValue = '' | 'overdue' | 'this_week' | 'unset'

const OPTIONS: { value: FollowUpValue; label: string }[] = [
  { value: '',         label: 'Any' },
  { value: 'overdue',  label: 'Overdue' },
  { value: 'this_week', label: 'This week' },
  { value: 'unset',    label: 'Not set' },
]

interface Props {
  value:    FollowUpValue
  onChange: (v: FollowUpValue) => void
}

export default function FollowUpPill({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = value !== ''

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const displayLabel = isActive
    ? `Follow-up: ${OPTIONS.find(o => o.value === value)?.label ?? ''}`
    : 'Follow-up'

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
        <CalendarClock size={12} strokeWidth={2} />
        {displayLabel}
        {isActive ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="w-4 h-4 rounded-full hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={9} strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown size={11} className={cn('transition-transform duration-150', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-44 bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden">
          <div className="py-1.5">
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors text-left"
              >
                <div className={cn(
                  'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                  value === opt.value
                    ? 'bg-[#2563EB] border-[#2563EB]'
                    : 'border-[#D0D5DD] dark:border-[#3D4258]',
                )}>
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-[12px] text-[#101828] dark:text-[#ECEEF3]">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
