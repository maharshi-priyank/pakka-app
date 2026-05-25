import { useRef, useState, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface Props {
  label:    string
  icon?:    React.ReactNode
  options:  Option[]
  selected: string[]
  onChange: (vals: string[]) => void
}

export default function MultiSelectPill({ label, icon, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = selected.length > 0

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  const displayLabel = !isActive
    ? label
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? `1 selected`)
      : `${selected.length} ${label.toLowerCase()}`

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
        {icon}
        {displayLabel}
        {isActive ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onChange([]) }}
            className="w-4 h-4 rounded-full hover:bg-[#2563EB] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={9} strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown size={11} className={cn('transition-transform duration-150', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] min-w-[180px] bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden">
          <div className="py-1.5">
            {options.map(opt => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors text-left"
                >
                  <div className={cn(
                    'w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors',
                    isSelected
                      ? 'bg-[#2563EB] border-[#2563EB]'
                      : 'border-[#D0D5DD] dark:border-[#3D4258]',
                  )}>
                    {isSelected && <Check size={9} strokeWidth={3} className="text-white" />}
                  </div>
                  <span className="text-[12px] text-[#101828] dark:text-[#ECEEF3]">{opt.label}</span>
                </button>
              )
            })}
          </div>

          {isActive && (
            <div className="border-t border-[#F2F4F7] dark:border-[#26283A] px-3 py-2">
              <button
                onClick={() => { onChange([]); setOpen(false) }}
                className="text-[11px] text-[#98A2B3] hover:text-[#D92D20] transition-colors font-medium"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
