import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardStats } from '../hooks/useDashboard'
import { useCurrency } from '@/hooks/useCurrency'
import { useCountUp } from '@/hooks/useCountUp'
import RevenueGoalTracker from './RevenueGoalTracker'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function HeroMetric() {
  const { data: stats, isLoading } = useDashboardStats()
  const { format } = useCurrency()
  const animatedRevenue = useCountUp(stats?.revenueThisMonth ?? 0)

  return (
    <div className="rounded-2xl bg-[#5F259F] dark:bg-[#3B1F5C] px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
          <DollarSign size={14} className="text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] font-semibold text-white/75">Revenue this month</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-11 w-56 !bg-white/15" />
      ) : (
        <div className="flex items-baseline gap-3">
          <p className="text-[40px] font-extrabold text-white leading-none tracking-tight tabular-nums">
            {stats ? format(animatedRevenue) : '—'}
          </p>
          {stats?.revenueChange != null && (
            <span className={cn(
              'flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-full',
              stats.revenueChange >= 0 ? 'text-[#F0FDF4] bg-white/15' : 'text-[#FEF3F2] bg-white/15',
            )}>
              {stats.revenueChange >= 0 ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
              {Math.abs(stats.revenueChange)}%
            </span>
          )}
        </div>
      )}

      {!isLoading && stats && (
        <RevenueGoalTracker revenueThisMonth={stats.revenueThisMonth ?? 0} monthlyGoal={stats.monthlyRevenueGoal} size="hero" tone="onViolet" />
      )}
    </div>
  )
}
