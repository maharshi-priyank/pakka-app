import { useRef, useState, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option { value: string; label: string }

interface Props {
  value: string
  onChange: (v: string) => void
  options: Option[]
  className?: string
  placeholder?: string
}

export default function DropdownSelect({ value, onChange, options, className, placeholder }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-medium transition-colors w-full min-w-0',
          'bg-white dark:bg-[#13141A] text-[#344054] dark:text-[#C2C8D8]',
          open
            ? 'border-[#2563EB] dark:border-[#2563EB]'
            : 'border-[#E4E7EC] dark:border-[#26283A] hover:border-[#D0D5DD] dark:hover:border-[#3D4258]',
        )}
      >
        <span className="truncate flex-1 text-left">{selected?.label ?? placeholder ?? '—'}</span>
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          className={cn('text-[#98A2B3] dark:text-[#545C74] transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[160px] bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-lg dark:shadow-black/40 overflow-hidden py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'flex items-center justify-between gap-3 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors',
                opt.value === value
                  ? 'bg-[#EFF6FF] dark:bg-[#1E2D4F] text-[#2563EB] font-semibold'
                  : 'text-[#344054] dark:text-[#C2C8D8] font-medium hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23]',
              )}
            >
              {opt.label}
              {opt.value === value && <Check size={13} strokeWidth={2.5} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
