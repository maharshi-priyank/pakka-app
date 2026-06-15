import { useState, useRef, useEffect } from 'react'
import { ChevronsUpDown, Check, Plus, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '../hooks/useProfile'
import { useWorkspaces, useSwitchWorkspace } from '../hooks/useWorkspaces'
import { generateInitials } from '@/lib/utils'

const PLAN_LABEL: Record<string, string> = {
  FREE:   'Free',
  SOLO:   'Solo',
  STUDIO: 'Studio',
}

const WORKSPACE_LIMITS: Record<string, number> = {
  FREE:   1,
  SOLO:   2,
  STUDIO: 5,
}

// Ordered from lowest to highest — last entry is the top plan
const PLAN_ORDER = ['FREE', 'SOLO', 'STUDIO'] as const
const isTopPlan = (plan: string) => plan === PLAN_ORDER[PLAN_ORDER.length - 1]

const PLAN_COLORS: Record<string, string> = {
  FREE:   'bg-gray-100 text-gray-500',
  SOLO:   'bg-indigo-50 text-indigo-600',
  STUDIO: 'bg-purple-50 text-purple-600',
}

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  const { data: profile }             = useProfile()
  const { data: workspaces = [] }     = useWorkspaces()
  const { mutate: switchWs, isPending } = useSwitchWorkspace()

  const activeId      = profile?.activeWorkspaceId ?? profile?.id
  const active        = workspaces.find(w => w.id === activeId) ?? workspaces[0]
  const label         = active?.businessName ?? active?.name ?? profile?.name ?? 'My Workspace'
  const role          = active?.role ?? 'OWNER'
  const plan          = profile?.plan ?? 'FREE'
  const roleLabel     = role === 'OWNER' ? 'Owner' : 'Member'
  const ownedCount    = workspaces.filter(w => w.role === 'OWNER').length
  const wsLimit       = WORKSPACE_LIMITS[plan] ?? 1
  const atLimit       = ownedCount >= wsLimit
  // profile.logoUrl fallback only applies to the owner workspace (id === user.id).
  // Secondary workspaces have their own identity — never inherit the owner logo.
  const isOwnerWorkspace = active?.id === profile?.id
  const triggerLogo = active?.logoUrl ?? (isOwnerWorkspace ? profile?.logoUrl : null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!profile) return (
    <div className="flex items-center gap-2.5 px-4 py-3 mx-1">
      <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-2 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  )

  return (
    <div ref={ref} className="relative px-3">
      {/* Trigger row */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left transition-colors',
          open ? 'bg-white/60' : 'hover:bg-white/40',
        )}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* Avatar */}
        <div className={cn(
          'w-7 h-7 rounded-lg shrink-0 overflow-hidden',
          !triggerLogo && 'bg-indigo-600 flex items-center justify-center',
        )}>
          {triggerLogo
            ? <img src={triggerLogo} alt={label} className="w-7 h-7 object-cover" />
            : <span className="text-[9px] font-bold text-white">{generateInitials(label)}</span>
          }
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-gray-800 truncate leading-tight">{label}</p>
          <p className="text-[10px] text-gray-400 leading-tight">{roleLabel}</p>
        </div>

        <ChevronsUpDown
          size={12}
          className={cn('text-gray-400 shrink-0 transition-colors', open && 'text-gray-600')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100/80 z-50 overflow-hidden"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)' }}
        >
          {/* Header */}
          <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400">
            Workspaces
          </p>

          {/* Workspace list */}
          {workspaces.map(ws => {
            const wsLabel  = ws.businessName ?? ws.name
            const isActive = ws.id === activeId
            // Each workspace shows only its own logo — no cross-workspace fallback.
            // Owner workspace logo is synced from profile on upload (backend handles this).
            const wsLogo   = ws.logoUrl ?? (ws.id === profile?.id ? profile?.logoUrl : null)
            return (
              <button
                key={ws.id}
                role="option"
                aria-selected={isActive}
                disabled={isPending}
                onClick={() => {
                  if (!isActive) switchWs(ws.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors',
                  isActive ? 'bg-indigo-50/60' : 'hover:bg-gray-50',
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-7 h-7 rounded-md shrink-0 overflow-hidden',
                  !wsLogo && 'bg-indigo-600 flex items-center justify-center',
                )}>
                  {wsLogo
                    ? <img src={wsLogo} alt={wsLabel} className="w-7 h-7 object-cover" />
                    : <span className="text-[9px] font-bold text-white">{generateInitials(wsLabel)}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[12.5px] font-medium truncate leading-tight',
                    isActive ? 'text-gray-900' : 'text-gray-700',
                  )}>
                    {wsLabel}
                  </p>
                  <p className="text-[10.5px] text-gray-400 leading-tight">{ws.role === 'OWNER' ? 'Owner' : 'Member'}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Plan badge only on active workspace */}
                  {isActive && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none',
                      PLAN_COLORS[plan] ?? PLAN_COLORS.FREE,
                    )}>
                      {PLAN_LABEL[plan] ?? plan}
                    </span>
                  )}
                  {isActive && <Check size={12} className="text-indigo-600" />}
                </div>
              </button>
            )
          })}

          {/* Create new workspace / limit feedback */}
          <div className="border-t border-gray-100 mt-1">
            {atLimit ? (
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={10} className="text-gray-400 shrink-0" />
                  <span className="text-[11.5px] font-semibold text-gray-500">
                    {ownedCount}/{wsLimit} workspaces used
                  </span>
                </div>
                {isTopPlan(plan) ? (
                  <p className="text-[11px] text-gray-400 leading-snug">
                    You're on the Studio plan — {wsLimit} workspaces is the current maximum.
                  </p>
                ) : (
                  <a
                    href="https://getclearwork.in/#pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    Upgrade to add more →
                  </a>
                )}
              </div>
            ) : (
              <button
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-[12.5px] text-gray-500 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setOpen(false)
                  document.dispatchEvent(new CustomEvent('create-workspace'))
                }}
              >
                <div className="w-7 h-7 rounded-md border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                  <Plus size={11} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-600">Create new workspace</span>
                  <span className="ml-1.5 text-[10.5px] text-gray-400">{ownedCount}/{wsLimit}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
