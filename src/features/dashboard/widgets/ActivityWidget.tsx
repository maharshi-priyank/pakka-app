import {
  Bell, Clock, ArrowUpRight, IndianRupee, FileText, PenLine,
  CheckCircle2, FilePlus, FileSignature,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useRecentActivity } from '../hooks/useDashboard'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function activityMeta(type: string): { iconBg: string; iconColor: string; icon: React.ElementType } {
  switch (type) {
    case 'invoice_paid':      return { iconBg: 'bg-[#ECFDF3] dark:bg-emerald-950/40', iconColor: 'text-[#027A48] dark:text-[#34D399]', icon: IndianRupee }
    case 'invoice_sent':      return { iconBg: 'bg-[#EEF2FF] dark:bg-[#1E2040]',      iconColor: 'text-[#4338CA] dark:text-[#818CF8]', icon: FileText }
    case 'contract_signed':   return { iconBg: 'bg-[#EEF2FF] dark:bg-[#1E2040]',      iconColor: 'text-[#4338CA] dark:text-[#818CF8]', icon: FileSignature }
    case 'contract_sent':     return { iconBg: 'bg-[#F4F3FF] dark:bg-violet-950/40',  iconColor: 'text-[#5925DC] dark:text-[#A78BFA]', icon: PenLine }
    case 'proposal_accepted': return { iconBg: 'bg-[#ECFDF3] dark:bg-emerald-950/40', iconColor: 'text-[#027A48] dark:text-[#34D399]', icon: CheckCircle2 }
    case 'proposal_opened':   return { iconBg: 'bg-[#FFFAEB] dark:bg-amber-950/30',   iconColor: 'text-[#B54708] dark:text-amber-400', icon: Bell }
    case 'proposal_sent':     return { iconBg: 'bg-[#EEF2FF] dark:bg-[#1E2040]',      iconColor: 'text-[#4338CA] dark:text-[#818CF8]', icon: FileText }
    case 'lead_added':        return { iconBg: 'bg-[#FFFAEB] dark:bg-amber-950/30',   iconColor: 'text-[#B54708] dark:text-amber-400', icon: FilePlus }
    default:                  return { iconBg: 'bg-[#F2F4F7] dark:bg-[#21222D]',      iconColor: 'text-[#667085] dark:text-[#8B92A8]', icon: Bell }
  }
}

export default function ActivityWidget() {
  const { data: activity, isLoading } = useRecentActivity()

  return (
    <div className="card overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Recent Activity</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Latest events across your pipeline</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B76A] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#12B76A]" />
            </span>
            <span className="text-[11px] text-[#667085] dark:text-[#8B92A8] font-medium">Live</span>
          </div>
          <a href="/app/leads" className="flex items-center gap-1 text-[12.5px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            View all <ArrowUpRight size={13} strokeWidth={2.5} />
          </a>
        </div>
      </div>
      <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>
          ))
        ) : (activity?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Bell size={28} className="text-[#D0D5DD] mb-2" />
            <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No activity yet — add your first lead to get started</p>
          </div>
        ) : activity!.map((a, i) => {
          const { icon: Icon, iconBg, iconColor } = activityMeta(a.type)
          return (
            <div key={`${a.entityId}-${i}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                <Icon size={14} className={iconColor} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">{a.label}</p>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">{a.detail}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] whitespace-nowrap">{formatRelativeTime(a.time)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
