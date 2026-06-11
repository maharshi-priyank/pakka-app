import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useProjectPl, type PlBasis } from '@/features/projects/hooks/useProjectPl'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#26283A] rounded', className)} />
}

function BasisToggle({ basis, onChange }: { basis: PlBasis; onChange: (b: PlBasis) => void }) {
  return (
    <div className="flex items-center bg-[#F3F4F6] dark:bg-[#21222D] rounded-full p-0.5">
      {(['accrual', 'cash'] as PlBasis[]).map(b => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all capitalize',
            basis === b
              ? 'bg-white dark:bg-[#2D2E3D] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
              : 'text-[#6B7280] dark:text-[#8B92A8] hover:text-[#344054]',
          )}
        >
          {b}
        </button>
      ))}
    </div>
  )
}

interface Props { projectId: string }

export default function ProjectPlCard({ projectId }: Props) {
  const [basis, setBasis] = useState<PlBasis>('accrual')
  const { data, isLoading } = useProjectPl(projectId, basis)

  const hasBudget   = data?.budget !== null && data?.budget !== undefined
  const budgetPct   = hasBudget && data!.budget! > 0
    ? Math.min((data!.budgetSpent / data!.budget!) * 100, 100)
    : 0
  const overBudget  = hasBudget && data!.budgetSpent > (data!.budget ?? 0)
  const isProfit    = (data?.grossProfit ?? 0) >= 0
  const margin      = data?.margin ?? null

  const barColor = budgetPct < 70
    ? 'from-[#12B76A] to-[#3DD68C]'
    : budgetPct < 90
    ? 'from-[#F59E0B] to-[#FCD34D]'
    : 'from-[#D92D20] to-[#F97066]'

  const marginColor = margin === null ? ''
    : margin >= 50 ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
    : margin >= 20 ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400'
    : 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'

  return (
    <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-[0_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
            <BarChart3 size={12} className="text-[#6366F1]" strokeWidth={2.5} />
          </div>
          <span className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8] uppercase tracking-wider">P&amp;L</span>
        </div>
        <BasisToggle basis={basis} onChange={setBasis} />
      </div>

      <div className={cn('grid', hasBudget || !data ? 'sm:grid-cols-2' : 'grid-cols-1')}>

        {/* ── Left: P&L Summary ─────────────────────────────── */}
        <div className="px-5 py-4 flex flex-col gap-0">

          {/* Revenue */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-36 mt-2" />
            </div>
          ) : (
            <>
              {/* Revenue row */}
              <div className="flex items-center justify-between py-2">
                <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74] font-medium">Revenue</span>
                <span className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] tabular-nums">
                  {formatCurrency(data?.revenue ?? 0)}
                </span>
              </div>

              {/* Expenses row */}
              <div className="flex items-center justify-between py-2">
                <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74] font-medium">Expenses</span>
                <span className="text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8] tabular-nums">
                  {formatCurrency(data?.expenses ?? 0)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-dashed border-[#E4E7EC] dark:border-[#26283A] my-1" />

              {/* Gross Profit — hero row */}
              <div className="flex items-end justify-between pt-2 pb-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#667085] dark:text-[#8B92A8] font-medium uppercase tracking-wide">Gross Profit</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[26px] font-extrabold leading-none tracking-tight tabular-nums',
                      isProfit ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400',
                    )}>
                      {formatCurrency(data?.grossProfit ?? 0)}
                    </span>
                    {isProfit
                      ? <TrendingUp size={15} className="text-[#12B76A] mb-0.5" />
                      : <TrendingDown size={15} className="text-[#D92D20] mb-0.5" />
                    }
                  </div>
                </div>

                {/* Margin badge */}
                {margin !== null && (
                  <span className={cn('text-[12px] font-bold px-2.5 py-1 rounded-lg', marginColor)}>
                    {margin.toFixed(1)}%
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right: Budget ──────────────────────────────────── */}
        {!isLoading && (
          <div className={cn(
            'px-5 py-4 flex flex-col gap-3',
            hasBudget
              ? 'sm:border-l border-t sm:border-t-0 border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#16171F]'
              : '',
          )}>
            {hasBudget ? (
              <>
                {/* Budget header */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wider">Budget</span>
                  <span className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8] tabular-nums">
                    {formatCurrency(data!.budget!)}
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="h-2.5 w-full bg-[#F2F4F7] dark:bg-[#26283A] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', barColor)}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74]">
                      {Math.round(budgetPct)}% used
                    </span>
                    {overBudget && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#B54708] dark:text-amber-400 bg-[#FFFAEB] dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle size={9} /> Over budget
                      </span>
                    )}
                  </div>
                </div>

                {/* Spent / Remaining */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-[#98A2B3] dark:text-[#545C74] font-medium mb-0.5">Spent</p>
                    <p className="text-[14px] font-bold text-[#344054] dark:text-[#C2C8D8] tabular-nums leading-none">
                      {formatCurrency(data!.budgetSpent)}
                    </p>
                  </div>
                  <div className={cn(
                    'border rounded-lg px-3 py-2.5',
                    (data!.budgetRemaining ?? 0) < 0
                      ? 'bg-[#FEF3F2] dark:bg-red-950/20 border-[#FDA29B] dark:border-red-900'
                      : 'bg-white dark:bg-[#1A1B23] border-[#EAECF0] dark:border-[#26283A]',
                  )}>
                    <p className="text-[10px] text-[#98A2B3] dark:text-[#545C74] font-medium mb-0.5">Remaining</p>
                    <p className={cn(
                      'text-[14px] font-bold tabular-nums leading-none',
                      (data!.budgetRemaining ?? 0) < 0
                        ? 'text-[#D92D20] dark:text-red-400'
                        : 'text-[#027A48] dark:text-[#34D399]',
                    )}>
                      {formatCurrency(data!.budgetRemaining ?? 0)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* No budget set */
              <div className="flex flex-col items-center justify-center py-6 text-center sm:border-l border-t sm:border-t-0 border-[#F2F4F7] dark:border-[#26283A]">
                <div className="w-8 h-8 rounded-lg bg-[#F4F5F8] dark:bg-[#21222D] flex items-center justify-center mb-2">
                  <BarChart3 size={14} className="text-[#D0D5DD] dark:text-[#3D4258]" />
                </div>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-1.5">No expense budget set</p>
                <Link
                  to={`/app/projects/${projectId}`}
                  className="text-[11.5px] text-[#6366F1] dark:text-[#818CF8] hover:underline font-semibold"
                >
                  Set a budget →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Loading skeleton for budget side */}
        {isLoading && (
          <div className="px-5 py-4 sm:border-l border-t sm:border-t-0 border-[#F2F4F7] dark:border-[#26283A] space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
