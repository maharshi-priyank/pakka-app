import { useState } from 'react'
import { UserPlus, Trash2, Clock, Loader2, Users } from 'lucide-react'
import { useSubscriptionStatus } from '@/features/billing/hooks/useSubscription'
import { useTeam, useInviteMember, useCancelInvite, useRemoveMember } from '../hooks/useTeam'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeamTab() {
  const { data: subscription } = useSubscriptionStatus()
  const isStudio = subscription?.plan === 'STUDIO'

  const { data: team, isLoading } = useTeam()
  const { mutate: invite, isPending: inviting } = useInviteMember()
  const { mutate: cancelInvite, isPending: cancelling } = useCancelInvite()
  const { mutate: removeMember, isPending: removing } = useRemoveMember()

  const [email, setEmail] = useState('')

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    invite(email.trim(), { onSuccess: () => setEmail('') })
  }

  if (!isStudio) {
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Team</h2>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            Invite a team member to collaborate in your workspace.
          </p>
        </div>
        <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-3">
            <Users size={18} className="text-[#6366F1]" />
          </div>
          <p className="text-[14px] font-semibold text-[#101828] dark:text-[#ECEEF3] mb-1">Studio plan required</p>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
            Upgrade to Studio to add a team member to your workspace.
          </p>
        </div>
      </div>
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
        <div className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C1C5D6]">Team members</p>
          </div>
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b border-[#F9FAFB] dark:border-[#26283A] last:border-0">
              <div>
                <p className="text-[13px] font-medium text-[#101828] dark:text-[#ECEEF3]">{m.name}</p>
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">{m.email}</p>
              </div>
              <button
                onClick={() => removeMember(m.id)}
                disabled={removing}
                className="h-7 px-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3A3C4E] text-[11.5px] text-[#D92D20] hover:bg-[#FEF3F2] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={11} />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
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
