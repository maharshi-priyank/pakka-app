import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Chip {
  key:      string
  label:    string
  onRemove: () => void
}

interface Props {
  open:     boolean
  onClear:  () => void
  chips:    Chip[]
  children: React.ReactNode
}

export default function FilterPanel({ open, onClear, chips, children }: Props) {
  return (
    <div className="space-y-2">
      {/* Slide-down panel */}
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
      )}>
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            {children}
          </div>
        </div>
      </div>

      {/* Active chips row */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded-full bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1] text-[11px] font-medium border border-[#C7D2FE] dark:border-[#3730A3]/60"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="w-3.5 h-3.5 rounded-full hover:bg-[#6366F1] hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <button
            onClick={onClear}
            className="text-[11px] text-[#98A2B3] dark:text-[#545C74] hover:text-[#D92D20] dark:hover:text-[#F87171] transition-colors font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

/* Small section wrapper used inside FilterPanel children */
export function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <p className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">{label}</p>
      {children}
    </div>
  )
}
