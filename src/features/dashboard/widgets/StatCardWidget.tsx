import { IndianRupee, TrendingUp, AlertCircle, FileText, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useDashboardStats } from '../hooks/useDashboard'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

type StatType = 'revenue_month' | 'pipeline' | 'overdue' | 'open_proposals'

const META: Record<StatType, {
  label:   string
  sub:     (s: NonNullable<ReturnType<typeof useDashboardStats>['data']>) => string
  iconBg:  string
  icon:    React.ElementType
  iconColor: string
  value:   (s: NonNullable<ReturnType<typeof useDashboardStats>['data']>) => React.ReactNode
}> = {
  revenue_month: {
    label:     'Revenue this month',
    sub:       s => s.revenueChange != null
      ? `${s.revenueChange >= 0 ? '+' : ''}${s.revenueChange}% vs last month`
      : `Last month: ${formatCurrency(s.revenueLastMonth ?? 0)}`,
    iconBg:    'bg-[#EEF2FF]',
    iconColor: 'text-[#6366F1]',
    icon:      IndianRupee,
    value:     s => formatCurrency(s.revenueThisMonth ?? 0),
  },
  pipeline: {
    label:     'Pipeline value',
    sub:       s => `${s.activeLeads ?? 0} active lead${s.activeLeads !== 1 ? 's' : ''}`,
    iconBg:    'bg-[#ECFDF3]',
    iconColor: 'text-[#027A48]',
    icon:      TrendingUp,
    value:     s => formatCurrency(s.pipelineValue ?? 0),
  },
  overdue: {
    label:     'Overdue invoices',
    sub:       s => s.overdueCount === 0 ? 'All invoices up to date' : `${s.overdueCount} invoice${s.overdueCount !== 1 ? 's' : ''} pending`,
    iconBg:    'bg-[#FEF3F2]',
    iconColor: 'text-[#D92D20]',
    icon:      AlertCircle,
    value:     s => formatCurrency(s.overdueAmount ?? 0),
  },
  open_proposals: {
    label:     'Open proposals',
    sub:       () => 'Sent or viewed by client',
    iconBg:    'bg-[#FFFAEB]',
    iconColor: 'text-[#B54708]',
    icon:      FileText,
    value:     s => String(s.openProposals ?? 0),
  },
}

export default function StatCardWidget({ type }: { type: StatType }) {
  const { data: stats, isLoading } = useDashboardStats()
  const m = META[type]
  const Icon = m.icon

  return (
    <div className="card p-5 h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', m.iconBg)}>
          <Icon size={18} className={m.iconColor} strokeWidth={2} />
        </div>
        {type === 'revenue_month' && !isLoading && stats?.revenueChange != null && (
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full',
            stats.revenueChange >= 0 ? 'text-[#027A48] bg-[#ECFDF3]' : 'text-[#D92D20] bg-[#FEF3F2]',
          )}>
            {stats.revenueChange >= 0 ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
            {Math.abs(stats.revenueChange)}%
          </span>
        )}
        {type === 'overdue' && !isLoading && (stats?.overdueCount ?? 0) > 0 && (
          <span className="text-[11px] font-semibold text-[#D92D20] bg-[#FEF3F2] px-2 py-1 rounded-full">
            {stats!.overdueCount} overdue
          </span>
        )}
      </div>
      {isLoading
        ? <Skeleton className="h-8 w-28 mb-2" />
        : <p className="text-[26px] font-extrabold text-[#101828] leading-none tracking-tight">
            {stats ? m.value(stats) : '—'}
          </p>
      }
      <p className="text-[12px] text-[#667085] font-medium mt-2">{m.label}</p>
      {isLoading
        ? <Skeleton className="h-3 w-20 mt-1" />
        : <p className="text-[11px] text-[#98A2B3] mt-1">{stats ? m.sub(stats) : ''}</p>
      }
    </div>
  )
}
