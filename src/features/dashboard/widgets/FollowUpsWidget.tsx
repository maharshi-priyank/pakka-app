import { CheckCircle2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpcomingFollowUps } from '../hooks/useDashboard'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

const AVATAR_COLORS = [
  'bg-[#EEF2FF] text-[#4338CA]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

const STAGE_LABEL: Record<string, string> = {
  ENQUIRY: 'Enquiry', PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATING: 'Negotiating', WON: 'Won', LOST: 'Lost',
}

function urgency(followUpAt: string): { label: string; color: string } {
  const diff = new Date(followUpAt).getTime() - Date.now()
  const days  = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 0)  return { label: 'Today',       color: 'text-[#D92D20]' }
  if (days === 1) return { label: 'Tomorrow',    color: 'text-[#B54708]' }
  if (days <= 3)  return { label: `In ${days}d`, color: 'text-[#B54708]' }
  return               { label: `In ${days}d`,   color: 'text-[#667085]' }
}

export default function FollowUpsWidget() {
  const { data: followUps, isLoading } = useUpcomingFollowUps()

  return (
    <div className="card overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828]">Follow-ups</h2>
          <p className="text-[12px] text-[#98A2B3] mt-0.5">Due this week</p>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (followUps?.length ?? 0) > 0 && (
            <span className="badge badge-error">{followUps!.length} due</span>
          )}
          <div className="w-8 h-8 rounded-xl bg-[#FFFAEB] flex items-center justify-center">
            <Calendar size={14} className="text-[#B54708]" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#F2F4F7]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>
          ))
        ) : (followUps?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 size={26} className="text-[#D0D5DD] mb-2" />
            <p className="text-[13px] text-[#98A2B3]">No follow-ups this week</p>
          </div>
        ) : followUps!.slice(0, 5).map((f, i) => {
          const { label, color } = urgency(f.followUpAt)
          return (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFBFF] transition-colors cursor-pointer">
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0', AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                {f.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#101828] truncate">{f.name}</p>
                <p className="text-[11px] text-[#98A2B3] truncate">{f.service ?? f.company ?? '—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={cn('text-[11px] font-bold', color)}>{label}</p>
                <p className="text-[10px] text-[#98A2B3] mt-0.5">{STAGE_LABEL[f.stage] ?? f.stage}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
