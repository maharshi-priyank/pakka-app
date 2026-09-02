import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, FileSignature, CalendarDays, ArrowRight, MessageSquare } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useDashboardStats } from '../hooks/useDashboard'
import { useUpcomingMeetings } from '@/features/meetings/hooks/useMeetings'
import { useContracts } from '@/features/contracts/hooks/useContracts'

interface ActionCardProps {
  icon:        React.ElementType
  iconBg:      string
  iconColor:   string
  borderColor: string
  title:       string
  sub:         string
  ctaLabel:    string
  onClick:     () => void
}

function ActionCard({ icon: Icon, iconBg, iconColor, borderColor, title, sub, ctaLabel, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white dark:bg-[#1A1B23] shadow-sm hover:shadow-md transition-all text-left group flex-1 min-w-0',
        borderColor,
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={16} className={iconColor} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate">{title}</p>
        <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] truncate">{sub}</p>
      </div>
      <span className={cn('shrink-0 flex items-center gap-1 text-[11.5px] font-semibold whitespace-nowrap', iconColor)}>
        {ctaLabel}
        <ArrowRight size={11} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
      </span>
    </button>
  )
}

export default function PrioritiesStrip() {
  const navigate = useNavigate()
  const { data: stats }    = useDashboardStats()
  const { data: meetings = [] } = useUpcomingMeetings()
  const { data: sentContracts } = useContracts({ status: 'SENT', limit: 50 })

  const today = new Date().toDateString()
  const todayMeetings = meetings.filter(m => new Date(m.scheduledAt).toDateString() === today)

  const hasOverdue   = (stats?.overdueCount ?? 0) > 0
  const hasProposals = (stats?.openProposals ?? 0) > 0
  const hasMeetings  = todayMeetings.length > 0
  const hasUnread    = (stats?.unreadClientMessages ?? 0) > 0
  const hasContracts = (sentContracts?.total ?? 0) > 0

  if (!hasOverdue && !hasProposals && !hasMeetings && !hasUnread && !hasContracts) return null

  return (
    <div className="flex flex-wrap gap-3">
      {hasUnread && (
        <ActionCard
          icon={MessageSquare}
          iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"
          iconColor="text-[#6366F1]"
          borderColor="border-[#C7D2FE] dark:border-[#6366F1]/40"
          title={`${stats!.unreadClientMessages} unread client message${stats!.unreadClientMessages !== 1 ? 's' : ''}`}
          sub="Waiting for your reply"
          ctaLabel="View messages"
          onClick={() => navigate('/inbox')}
        />
      )}
      {hasOverdue && (
        <ActionCard
          icon={AlertCircle}
          iconBg="bg-[#FEF3F2] dark:bg-red-950/40"
          iconColor="text-[#D92D20] dark:text-red-400"
          borderColor="border-[#FECDC9] dark:border-red-800/40"
          title={`${stats!.overdueCount} invoice${stats!.overdueCount !== 1 ? 's' : ''} overdue`}
          sub={`${formatCurrency(stats!.overdueAmount)} pending collection`}
          ctaLabel="View invoices"
          onClick={() => navigate('/invoices')}
        />
      )}
      {hasProposals && (
        <ActionCard
          icon={FileText}
          iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"
          iconColor="text-[#B54708] dark:text-amber-400"
          borderColor="border-[#FEDF89] dark:border-amber-800/40"
          title={`${stats!.openProposals} proposal${stats!.openProposals !== 1 ? 's' : ''} awaiting response`}
          sub="Sent or viewed by client"
          ctaLabel="Follow up"
          onClick={() => navigate('/proposals')}
        />
      )}
      {hasContracts && (
        <ActionCard
          icon={FileSignature}
          iconBg="bg-[#F3EAFB] dark:bg-[#3B1F5C]"
          iconColor="text-[#5F259F] dark:text-[#D8B9F5]"
          borderColor="border-[#DDBEF0] dark:border-[#5F259F]/40"
          title={`${sentContracts!.total} contract${sentContracts!.total !== 1 ? 's' : ''} awaiting signature`}
          sub="Sent to client, not yet signed"
          ctaLabel="Follow up"
          onClick={() => navigate('/contracts')}
        />
      )}
      {hasMeetings && (
        <ActionCard
          icon={CalendarDays}
          iconBg="bg-[#EFF6FF] dark:bg-blue-950/40"
          iconColor="text-[#2563EB] dark:text-[#60A5FA]"
          borderColor="border-[#BFDBFE] dark:border-blue-800/40"
          title={`${todayMeetings.length} meeting${todayMeetings.length !== 1 ? 's' : ''} today`}
          sub={todayMeetings.map(m => m.title).slice(0, 2).join(' · ')}
          ctaLabel="View meetings"
          onClick={() => navigate('/meetings')}
        />
      )}
    </div>
  )
}
