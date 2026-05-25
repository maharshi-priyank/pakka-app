import { useRef, useState, useEffect } from 'react'
import { IndianRupee, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label?:  string
  min:     string
  max:     string
  onMin:   (v: string) => void
  onMax:   (v: string) => void
  onClear: () => void
}

function fmt(v: string) {
  if (!v) return ''
  const n = Number(v)
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}k`
  return `₹${n}`
}

export default function AmountRangePill({ label = 'Amount', min, max, onMin, onMax, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = !!(min || max)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const displayLabel = isActive ? `${fmt(min) || '₹0'} – ${fmt(max) || '∞'}` : label

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
        <IndianRupee size={11} strokeWidth={2} />
        {displayLabel}
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
        <div className="absolute left-0 top-[calc(100%+6px)] w-56 bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-xl dark:shadow-black/40 z-50 p-4 space-y-3">
          <div>
            <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-1.5">Min amount</p>
            <div className="relative">
              <IndianRupee size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
              <input
                type="number"
                min={0}
                value={min}
                onChange={e => onMin(e.target.value)}
                placeholder="0"
                className="w-full h-8 pl-6 pr-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#13141A] text-[12px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-1.5">Max amount</p>
            <div className="relative">
              <IndianRupee size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
              <input
                type="number"
                min={0}
                value={max}
                onChange={e => onMax(e.target.value)}
                placeholder="No limit"
                className="w-full h-8 pl-6 pr-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#13141A] text-[12px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>
          {isActive && (
            <button
              onClick={() => { onClear(); setOpen(false) }}
              className="text-[11px] text-[#98A2B3] hover:text-[#D92D20] transition-colors font-medium"
            >
              Clear amount
            </button>
          )}
        </div>
      )}
    </div>
  )
}
