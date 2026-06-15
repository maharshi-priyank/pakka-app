import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus, Lock } from 'lucide-react'
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

const PLAN_ORDER = ['FREE', 'SOLO', 'STUDIO'] as const
const isTopPlan = (plan: string) => plan === PLAN_ORDER[PLAN_ORDER.length - 1]

const PLAN_STYLES: Record<string, string> = {
  FREE:   'bg-[#F2F4F7] text-[#667085]',
  SOLO:   'bg-[#EEF2FF] text-[#4F46E5]',
  STUDIO: 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white',
}

const AVATAR_GRADIENTS = [
  'from-[#4F46E5] to-[#7C3AED]',
  'from-[#0EA5E9] to-[#4F46E5]',
  'from-[#10B981] to-[#0EA5E9]',
  'from-[#F59E0B] to-[#EF4444]',
  'from-[#EC4899] to-[#8B5CF6]',
]

function getGradient(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  const { data: profile }               = useProfile()
  const { data: workspaces = [] }       = useWorkspaces()
  const { mutate: switchWs, isPending } = useSwitchWorkspace()

  const activeId      = profile?.activeWorkspaceId ?? profile?.id
  const active        = workspaces.find(w => w.id === activeId) ?? workspaces[0]
  const label         = active?.businessName ?? active?.name ?? profile?.name ?? 'My Workspace'
  const role          = active?.role ?? 'OWNER'
  const plan          = profile?.plan ?? 'FREE'
  const roleLabel     = active?.roleName ?? (role === 'OWNER' ? 'Owner' : 'Member')
  const ownedCount    = workspaces.filter(w => w.role === 'OWNER').length
  const wsLimit       = WORKSPACE_LIMITS[plan] ?? 1
  const atLimit       = ownedCount >= wsLimit
  // Each workspace shows only its own logo — no cross-workspace fallback.
  // Owner workspace logo is synced from profile on upload (backend handles this).
  const isOwnerWorkspace = active?.id === profile?.id
  const triggerLogo   = active?.logoUrl ?? (isOwnerWorkspace ? profile?.logoUrl : null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!profile) return (
    <div className="flex items-center gap-2.5 px-4 py-3 mx-1">
      <div className="w-8 h-8 rounded-xl bg-[#F2F4F7] dark:bg-[#26283A] animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-24 bg-[#F2F4F7] dark:bg-[#26283A] rounded-full animate-pulse" />
        <div className="h-2 w-12 bg-[#F2F4F7] dark:bg-[#26283A] rounded-full animate-pulse" />
      </div>
    </div>
  )

  const renderAvatar = (logoUrl: string | null, name: string, size: 'sm' | 'md' = 'md') => {
    const dim = size === 'md' ? 'w-8 h-8' : 'w-7 h-7'
    const textSize = size === 'md' ? 'text-[10px]' : 'text-[9px]'
    const gradient = getGradient(name)
    return (
      <div className={cn(dim, 'rounded-xl shrink-0 overflow-hidden shadow-sm')}>
        {logoUrl
          ? <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
          : (
            <div className={cn('w-full h-full flex items-center justify-center bg-gradient-to-br', gradient)}>
              <span className={cn(textSize, 'font-bold text-white tracking-tight')}>
                {generateInitials(name)}
              </span>
            </div>
          )
        }
      </div>
    )
  }

  return (
    <div ref={ref} className="relative px-3">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left cursor-pointer',
          'transition-all duration-150',
          open
            ? 'bg-white dark:bg-[#1C1E2D] shadow-sm ring-1 ring-[#E4E7EC] dark:ring-[#2E3044]'
            : 'hover:bg-white/70 dark:hover:bg-[#1C1E2D]/70',
        )}
      >
        {renderAvatar(triggerLogo, label)}

        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate leading-tight">
            {label}
          </p>
          <p className="text-[11px] text-[#98A2B3] dark:text-[#5A5E78] leading-tight font-medium">
            {roleLabel}
          </p>
        </div>

        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={cn(
            'shrink-0 transition-all duration-200 text-[#98A2B3] dark:text-[#5A5E78]',
            open && 'rotate-180 text-[#6366F1]',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden',
            'rounded-2xl border border-[#E4E7EC]/80 dark:border-[#2E3044]',
            'bg-white/95 dark:bg-[#181928]/95 backdrop-blur-xl',
          )}
          style={{
            boxShadow: '0 4px 6px -2px rgba(16,24,40,0.03), 0 12px 32px -4px rgba(16,24,40,0.10), 0 0 0 1px rgba(16,24,40,0.04)',
          }}
        >
          {/* Header label */}
          <div className="px-3.5 pt-3 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B0B8CC] dark:text-[#4A4E68]">
              Workspaces
            </p>
          </div>

          {/* Workspace list */}
          {(() => {
            const myWorkspaces      = workspaces.filter(w => w.role === 'OWNER')
            const invitedWorkspaces = workspaces.filter(w => w.role !== 'OWNER')

            const renderWs = (ws: typeof workspaces[number]) => {
              const wsLabel  = ws.businessName ?? ws.name
              const isActive = ws.id === activeId
              // Each workspace shows only its own logo — no cross-workspace fallback.
              const wsLogo   = ws.logoUrl ?? (ws.id === profile?.id ? profile?.logoUrl : null)
              const wsRole   = ws.roleName ?? (ws.role === 'OWNER' ? 'Owner' : 'Member')

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
                    'relative flex items-center gap-2.5 w-full px-3 py-2 text-left',
                    'transition-colors duration-150 cursor-pointer',
                    isActive
                      ? 'bg-[#F5F3FF] dark:bg-[#1E1C35]'
                      : 'hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2D]',
                  )}
                >
                  {/* Active left accent */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#6366F1]" />
                  )}

                  {renderAvatar(wsLogo, wsLabel)}

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[12.5px] font-semibold truncate leading-tight',
                      isActive
                        ? 'text-[#101828] dark:text-[#ECEEF3]'
                        : 'text-[#344054] dark:text-[#C1C5D6]',
                    )}>
                      {wsLabel}
                    </p>
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#5A5E78] leading-tight font-medium">
                      {wsRole}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive && (
                      <span className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none',
                        PLAN_STYLES[plan] ?? PLAN_STYLES.FREE,
                      )}>
                        {PLAN_LABEL[plan] ?? plan}
                      </span>
                    )}
                    {isActive && (
                      <div className="w-4 h-4 rounded-full bg-[#6366F1] flex items-center justify-center">
                        <Check size={9} strokeWidth={3} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              )
            }

            return (
              <>
                {myWorkspaces.length > 0 && (
                  <>
                    {myWorkspaces.length > 0 && invitedWorkspaces.length > 0 && (
                      <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#B0B8CC] dark:text-[#4A4E68]">
                        My Workspaces
                      </p>
                    )}
                    {myWorkspaces.map(renderWs)}
                  </>
                )}
                {invitedWorkspaces.length > 0 && (
                  <>
                    <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#B0B8CC] dark:text-[#4A4E68]">
                      Invited
                    </p>
                    {invitedWorkspaces.map(renderWs)}
                  </>
                )}
              </>
            )
          })()}

          {/* Footer: create / limit */}
          <div className="border-t border-[#F2F4F7] dark:border-[#2A2C3E] mx-1.5 mt-1" />
          <div className="p-1.5">
            {atLimit ? (
              <div className="px-2.5 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock size={10} className="text-[#98A2B3] shrink-0" />
                  <span className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8]">
                    {ownedCount}/{wsLimit} workspaces used
                  </span>
                </div>
                {isTopPlan(plan) ? (
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#5A5E78] leading-snug">
                    Studio plan maximum — {wsLimit} workspaces.
                  </p>
                ) : (
                  <a
                    href="https://getclearwork.in/#pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-center w-full text-[11.5px] font-semibold text-[#6366F1] hover:text-[#5558E8] py-1.5 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-[#1E1C35] transition-colors"
                  >
                    Upgrade to add more →
                  </a>
                )}
              </div>
            ) : (
              <button
                className={cn(
                  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left',
                  'text-[#667085] dark:text-[#8B92A8] transition-colors duration-150',
                  'hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2D] cursor-pointer group',
                )}
                onClick={() => {
                  setOpen(false)
                  document.dispatchEvent(new CustomEvent('create-workspace'))
                }}
              >
                <div className={cn(
                  'w-8 h-8 rounded-xl shrink-0 flex items-center justify-center',
                  'border border-dashed border-[#D0D5DD] dark:border-[#3A3C4E]',
                  'bg-[#F9FAFB] dark:bg-[#1C1E2D]',
                  'group-hover:border-[#6366F1] group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1E1C35]',
                  'transition-colors duration-150',
                )}>
                  <Plus size={13} className="text-[#98A2B3] group-hover:text-[#6366F1] transition-colors duration-150" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C1C5D6] leading-tight group-hover:text-[#6366F1] transition-colors duration-150">
                    Create new workspace
                  </p>
                  <p className="text-[11px] text-[#98A2B3] leading-tight">{ownedCount}/{wsLimit} used</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
