import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Building2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '../hooks/useProfile'
import { useWorkspaces, useSwitchWorkspace } from '../hooks/useWorkspaces'
import { generateInitials } from '@/lib/utils'

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  const { data: profile }       = useProfile()
  const { data: workspaces = [] } = useWorkspaces()
  const { mutate: switchWs, isPending } = useSwitchWorkspace()

  const activeId = profile?.activeWorkspaceId ?? profile?.id
  const active   = workspaces.find(w => w.id === activeId) ?? workspaces[0]
  const label    = active?.businessName ?? active?.name ?? 'My Workspace'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (workspaces.length <= 1) return null

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-white/40 transition-all group"
        disabled={isPending}
      >
        {/* Workspace avatar */}
        <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center shrink-0">
          {active?.logoUrl
            ? <img src={active.logoUrl} alt={label} className="w-6 h-6 rounded-md object-cover" />
            : <span className="text-[9px] font-bold text-indigo-700">{generateInitials(label)}</span>
          }
        </div>
        <span className="flex-1 text-left text-[12px] font-semibold text-gray-700 truncate">{label}</span>
        <ChevronDown
          size={12}
          className={cn('text-gray-400 transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 overflow-hidden">
          {workspaces.map(ws => {
            const wsLabel = ws.businessName ?? ws.name
            const isActive = ws.id === activeId
            return (
              <button
                key={ws.id}
                disabled={isPending}
                onClick={() => {
                  if (!isActive) switchWs(ws.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 text-left text-[12.5px] transition-colors',
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center shrink-0">
                  {ws.logoUrl
                    ? <img src={ws.logoUrl} alt={wsLabel} className="w-5 h-5 rounded-md object-cover" />
                    : <span className="text-[8px] font-bold text-indigo-700">{generateInitials(wsLabel)}</span>
                  }
                </div>
                <span className="flex-1 truncate font-medium">{wsLabel}</span>
                <span className="text-[10px] text-gray-400">{ws.role === 'OWNER' ? 'Owner' : 'Member'}</span>
                {isActive && <Check size={11} className="text-indigo-600 shrink-0" />}
              </button>
            )
          })}

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-[12.5px] text-gray-500 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setOpen(false)
                // CreateWorkspaceModal trigger — will be wired in a follow-up
                document.dispatchEvent(new CustomEvent('create-workspace'))
              }}
            >
              <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                <Plus size={9} className="text-gray-500" />
              </div>
              <span className="font-medium">New workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
