import { useRef, useState, useEffect } from 'react'
import { ChevronDown, Search, Check, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClients } from '@/features/clients/hooks/useClients'

interface Props {
  selected: string[]
  onChange: (ids: string[]) => void
}

export default function ClientMultiSelect({ selected, onChange }: Props) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useClients(search || undefined)
  const clients  = data?.clients ?? []

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const isActive = selected.length > 0
  const label = !isActive
    ? 'Client'
    : selected.length === 1
      ? (clients.find(c => c.id === selected[0])?.name ?? '1 selected')
      : `${selected.length} clients`

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
        <Users size={12} strokeWidth={2} />
        {label}
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
        <div className="absolute left-0 top-[calc(100%+6px)] w-56 bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden">
          <div className="p-2 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                autoFocus
                className="w-full h-7 pl-7 pr-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#13141A] text-[11.5px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {clients.length === 0 ? (
              <p className="px-3 py-4 text-[12px] text-[#98A2B3] text-center">No clients found</p>
            ) : (
              clients.map(client => {
                const isSelected = selected.includes(client.id)
                return (
                  <button
                    key={client.id}
                    onClick={() => toggle(client.id)}
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
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#101828] dark:text-[#ECEEF3] truncate">{client.name}</p>
                      {client.company && (
                        <p className="text-[10.5px] text-[#98A2B3] truncate">{client.company}</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {isActive && (
            <div className="border-t border-[#F2F4F7] dark:border-[#26283A] px-3 py-2">
              <button
                onClick={() => onChange([])}
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
