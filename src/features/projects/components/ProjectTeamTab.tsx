import { useState } from 'react'
import { UserPlus, Trash2, Users, Loader2, ChevronDown } from 'lucide-react'
import { useProjectMembers, useAddProjectMember, useRemoveProjectMember } from '../hooks/useProjectMembers'
import { useTeam } from '@/features/team/hooks/useTeam'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default function ProjectTeamTab({ projectId }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data: members = [], isLoading } = useProjectMembers(projectId)
  const { data: teamData } = useTeam()
  const addMember    = useAddProjectMember(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  const assignedIds = new Set(members.map(m => m.userId))
  const available   = (teamData?.members ?? []).filter(m => !assignedIds.has(m.id))

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-[#0F172A] dark:text-[#ECEEF3]">Team</h3>
          <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            Workspace members working on this project
          </p>
        </div>

        {available.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen(v => !v)}
              className="flex items-center gap-1.5 h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-lg transition-all active:scale-[0.97]"
            >
              <UserPlus size={12} />
              Add member
              <ChevronDown size={10} className={cn('transition-transform', pickerOpen && 'rotate-180')} />
            </button>

            {pickerOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-64 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#EAECF0] dark:border-[#26283A]">
                  <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">
                    Add from workspace
                  </p>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {available.map(member => (
                    <button
                      key={member.id}
                      disabled={addMember.isPending}
                      onClick={() => {
                        addMember.mutate(member.id, {
                          onSuccess: () => setPickerOpen(false),
                        })
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors text-left disabled:opacity-50"
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        avatarColor(member.name),
                      )}>
                        {initials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#101828] dark:text-[#ECEEF3] truncate">{member.name}</p>
                        <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] truncate">{member.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[13px] text-[#98A2B3] dark:text-[#545C74]">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-3">
            <Users size={18} className="text-[#B8C0CC] dark:text-[#545C74]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No team members yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            {available.length > 0
              ? 'Add workspace members to this project using the button above'
              : 'Invite team members in Settings → Team first'
            }
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden bg-white dark:bg-[#13141A]">
          {members.map((member, idx) => (
            <div
              key={member.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 group',
                idx < members.length - 1 && 'border-b border-[#F2F4F7] dark:border-[#26283A]',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
                avatarColor(member.user.name),
              )}>
                {initials(member.user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">{member.user.name}</p>
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] truncate">{member.user.email}</p>
              </div>
              <button
                onClick={() => removeMember.mutate(member.userId)}
                disabled={removeMember.isPending}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-[#2A1A1A] transition-all disabled:opacity-30"
                title="Remove from project"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
