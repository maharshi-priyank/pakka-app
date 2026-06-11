import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useProjectPl, type PlBasis } from '@/features/projects/hooks/useProjectPl'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
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

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[#98A2B3] text-[12px]">—</span>
  const cls = margin >= 50
    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
    : margin >= 20
    ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400'
    : 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
  return (
    <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {margin.toFixed(1)}%
    </span>
  )
}

function PlRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">{label}</span>
      <span className={cn('text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]', valueClass)}>{value}</span>
    </div>
  )
}

interface Props {
  projectId: string
}

export default function ProjectPlCard({ projectId }: Props) {
  const [basis, setBasis] = useState<PlBasis>('accrual')
  const { data, isLoading } = useProjectPl(projectId, basis)

  const hasBudget = data?.budget !== null && data?.budget !== undefined
  const budgetPct = hasBudget && data!.budget! > 0
    ? Math.min((data!.budgetSpent / data!.budget!) * 100, 100)
    : 0

  const barColor = budgetPct < 70
    ? 'bg-[#12B76A]'
    : budgetPct < 90
    ? 'bg-[#F59E0B]'
    : 'bg-[#D92D20]'

  const overBudget = hasBudget && data!.budgetSpent > (data!.budget ?? 0)

  return (
    <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8] uppercase tracking-wider">P&amp;L</h3>
        <BasisToggle basis={basis} onChange={setBasis} />
      </div>

      <div className={cn('grid gap-4', hasBudget ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        {/* Left — P&L summary */}
        <div className="space-y-0.5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <PlRow label="Revenue"  value={formatCurrency(data?.revenue ?? 0)} />
              <PlRow label="Expenses" value={formatCurrency(data?.expenses ?? 0)} />
              <div className="border-t border-[#F2F4F7] dark:border-[#26283A] my-1" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Gross Profit</span>
                <span className={cn(
                  'text-[13px] font-bold',
                  (data?.grossProfit ?? 0) >= 0
                    ? 'text-[#027A48] dark:text-[#34D399]'
                    : 'text-[#D92D20] dark:text-red-400',
                )}>
                  {formatCurrency(data?.grossProfit ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Margin</span>
                <MarginBadge margin={data?.margin ?? null} />
              </div>
            </>
          )}
        </div>

        {/* Right — Budget tracking */}
        {!isLoading && hasBudget && (
          <div className="space-y-0.5">
            <PlRow label="Budget" value={formatCurrency(data!.budget!)} />
            <PlRow label="Spent"  value={formatCurrency(data!.budgetSpent)} />
            <div className="border-t border-[#F2F4F7] dark:border-[#26283A] my-1" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Remaining</span>
              <div className="flex items-center gap-1.5">
                {overBudget && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#B54708] dark:text-amber-400 bg-[#FFFAEB] dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle size={9} /> Over budget
                  </span>
                )}
                <span className={cn(
                  'text-[13px] font-semibold',
                  (data!.budgetRemaining ?? 0) < 0
                    ? 'text-[#D92D20] dark:text-red-400'
                    : 'text-[#101828] dark:text-[#ECEEF3]',
                )}>
                  {formatCurrency(data!.budgetRemaining ?? 0)}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">Budget used</span>
                <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B92A8]">{Math.round(budgetPct)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#F2F4F7] dark:bg-[#26283A] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Budget not set prompt */}
        {!isLoading && !hasBudget && (
          <div className="flex items-center justify-center border border-dashed border-[#EAECF0] dark:border-[#26283A] rounded-lg p-4">
            <Link
              to={`/app/projects/${projectId}`}
              className="text-[12px] text-[#6366F1] dark:text-[#818CF8] hover:underline font-medium"
            >
              Set a budget →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
