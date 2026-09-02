import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimeEntries } from '@/features/time-entries/hooks/useTimeEntries'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { useCurrency } from '@/hooks/useCurrency'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function UnbilledWidget() {
  const { data: unbilledTime, isLoading: timeLoading } = useTimeEntries({ isBilled: false })
  const { data: unbilledExpenses, isLoading: expensesLoading } = useExpenses({ isBillable: true, isBilled: false })
  const { format } = useCurrency()

  const isLoading = timeLoading || expensesLoading

  const timeValue = (unbilledTime ?? []).reduce((sum, t) => {
    if (!t.hourlyRate) return sum
    return sum + (t.durationMins / 60) * t.hourlyRate
  }, 0)
  const timeMinsNoRate = (unbilledTime ?? [])
    .filter(t => !t.hourlyRate)
    .reduce((sum, t) => sum + t.durationMins, 0)

  const expenseValue = (unbilledExpenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0)
  const total = timeValue + expenseValue
  const hasUnrated = timeMinsNoRate > 0

  return (
    <div className="card-glass p-5 h-full hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#FFFAEB] dark:bg-amber-950/30 flex items-center justify-center">
          <Clock size={18} className="text-[#B54708] dark:text-amber-400" strokeWidth={2} />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-28 mb-2" />
      ) : (
        <p className="text-[26px] font-extrabold text-[#101828] dark:text-[#ECEEF3] leading-none tracking-tight">
          {format(total)}
        </p>
      )}
      <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium mt-2">Sitting uninvoiced</p>
      {isLoading ? (
        <Skeleton className="h-3 w-32 mt-1" />
      ) : (
        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1">
          {(unbilledTime?.length ?? 0)} unbilled entr{(unbilledTime?.length ?? 0) === 1 ? 'y' : 'ies'} · {(unbilledExpenses?.length ?? 0)} unbilled expense{(unbilledExpenses?.length ?? 0) !== 1 ? 's' : ''}
          {hasUnrated ? ' · some entries have no hourly rate set' : ''}
        </p>
      )}
    </div>
  )
}
