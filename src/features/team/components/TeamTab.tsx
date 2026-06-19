import { useState, useEffect, useRef } from 'react'
import { UserPlus, Trash2, Clock, Loader2, ChevronDown, Check, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTeam, useInviteMember, useCancelInvite, useRemoveMember, useUpdateMemberRole } from '../hooks/useTeam'
import { useWorkspaceRoles } from '@/features/settings/hooks/useWorkspacePermissions'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface RoleOption { id: string; key: string; name: string }

const ROLE_DESC: Record<string, string> = {
  OWNER:  'Full workspace control',
  ADMIN:  'Full access except billing',
  MEMBER: 'Operational access',
  VIEWER: 'Read-only access',
}

function RoleDropdown({
  roles,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  roles: RoleOption[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = roles.find(r => r.id === value)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const available = roles.filter(r => r.key !== 'OWNER')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border transition-colors duration-150 cursor-pointer',
          compact
            ? 'h-7 px-2 text-[11.5px] border-[#E4E7EC] dark:border-[#3A3C4E] bg-white dark:bg-[#1C1E2D] text-[#344054] dark:text-[#C1C5D6] hover:border-[#6366F1] hover:text-[#6366F1]'
            : 'h-9 px-3 text-[13px] border-[#D0D5DD] dark:border-[#3A3C4E] bg-white dark:bg-[#262838] text-[#101828] dark:text-[#ECEEF3] focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]',
          open && 'border-[#6366F1] ring-2 ring-[#6366F1]/20',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className="font-medium">{selected?.name ?? 'Select role'}</span>
        <ChevronDown size={compact ? 11 : 13} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute z-50 mt-1 min-w-[180px] rounded-xl border border-[#E4E7EC] dark:border-[#2E3044]',
          'bg-white dark:bg-[#1C1E2D] shadow-xl overflow-hidden p-1.5',
          'right-0',
        )}>
          {available.map(role => {
            const isSelected = role.id === value
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => { onChange(role.id); setOpen(false) }}
                className={cn(
                  'flex items-start gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors duration-150 cursor-pointer',
                  isSelected
                    ? 'bg-[#EEF2FF] dark:bg-[#1E1C35]'
                    : 'hover:bg-[#F9FAFB] dark:hover:bg-[#262838]',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0',
                  isSelected ? 'bg-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#2A2C3E]',
                )}>
                  {isSelected
                    ? <Check size={10} strokeWidth={3} className="text-white" />
                    : <Shield size={10} className="text-[#98A2B3]" />
                  }
                </div>
                <div>
                  <p className={cn(
                    'text-[12.5px] font-semibold leading-tight',
                    isSelected ? 'text-[#6366F1]' : 'text-[#101828] dark:text-[#ECEEF3]',
                  )}>{role.name}</p>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#5A5E78] leading-tight mt-0.5">
                    {ROLE_DESC[role.key] ?? ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function TeamTab() {
  const { data: team, isLoading } = useTeam()
  const { mutate: invite, isPending: inviting } = useInviteMember()
  const { mutate: cancelInvite, isPending: cancelling } = useCancelInvite()
  const { mutate: removeMember, isPending: removing } = useRemoveMember()
  const { mutate: updateRole, isPending: updatingRole } = useUpdateMemberRole()

  const { data: roles = [] } = useWorkspaceRoles()
  const [email, setEmail] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')

  // Set default to MEMBER role when roles load
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      const memberRole = roles.find(r => r.key === 'MEMBER')
      if (memberRole) setSelectedRoleId(memberRole.id)
    }
  }, [roles, selectedRoleId])

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    invite(
      { email: email.trim(), roleId: selectedRoleId || undefined },
      { onSuccess: () => setEmail('') }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-[#6366F1]" />
      </div>
    )
  }

  const members = team?.members ?? []
  const invites = team?.invites ?? []
  const seatsFilled = members.length >= 1

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Team</h2>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
          Studio plan includes 1 team member seat.
        </p>
      </div>

      {/* Invite form */}
      {!seatsFilled && invites.length === 0 && (
        <form onSubmit={handleInvite} className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 space-y-3">
          <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Invite a team member</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="flex-1 h-9 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] bg-white dark:bg-[#262838] text-[13px] text-[#101828] dark:text-[#ECEEF3] px-3 outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] placeholder:text-[#98A2B3]"
            />
            <RoleDropdown
              roles={roles}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
            />
            <button
              type="submit"
              disabled={inviting}
              className="h-9 px-4 rounded-lg bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
            >
              {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              Send invite
            </button>
          </div>
        </form>
      )}

      {/* Active members */}
      {members.length > 0 && (
        <div className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl">
          <div className="px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C1C5D6]">Team members</p>
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#F9FAFB] dark:border-[#26283A] last:border-0 last:rounded-b-xl">
              {/* Avatar/initials */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-white">{m.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#101828] dark:text-[#ECEEF3]">{m.name}</p>
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RoleDropdown
                  compact
                  roles={roles}
                  value={m.roleId}
                  onChange={(roleId) => updateRole({ memberId: m.id, roleId })}
                  disabled={updatingRole}
                />
                <button
                  onClick={() => removeMember(m.id)}
                  disabled={removing || updatingRole}
                  className="h-7 w-7 rounded-lg border border-[#EAECF0] dark:border-[#3A3C4E] text-[#D92D20] hover:bg-[#FEF3F2] flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl">
          <div className="px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C1C5D6]">Pending invites</p>
          </div>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 border-b border-[#F9FAFB] dark:border-[#26283A] last:border-0">
              <div>
                <p className="text-[13px] font-medium text-[#101828] dark:text-[#ECEEF3]">{inv.email}</p>
                <p className="text-[11.5px] text-[#98A2B3] flex items-center gap-1">
                  <Clock size={10} /> Expires {fmtDate(inv.expiresAt)}
                </p>
              </div>
              <button
                onClick={() => cancelInvite(inv.id)}
                disabled={cancelling}
                className="h-7 px-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3A3C4E] text-[11.5px] text-[#667085] hover:text-[#D92D20] hover:bg-[#FEF3F2] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && invites.length === 0 && (
        <div className="text-center py-8 text-[12.5px] text-[#98A2B3]">
          No team members yet. Send an invite above.
        </div>
      )}
    </div>
  )
}
