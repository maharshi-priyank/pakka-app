import { useState } from 'react'
import { TrendingUp, AlertCircle, FileText, ArrowUp, ArrowDown, DollarSign, Target, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardStats } from '../hooks/useDashboard'
import { useCurrency } from '@/hooks/useCurrency'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useUpdateWorkspace } from '@/features/settings/hooks/useWorkspaces'

function GoalEditor({ value, onSave, onClose }: {
  value:   number | null
  onSave:  (v: number) => void
  onClose: () => void
}) {
  const [input, setInput] = useState(value != null ? String(value) : '')
  return (
    <form
      onClick={e => e.stopPropagation()}
      onSubmit={e => {
        e.preventDefault()
        const n = Number(input)
        if (n > 0) onSave(n)
      }}
      className="flex items-center gap-1.5 mt-2"
    >
      <input
        type="number" min={0} step={1000} autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Monthly goal"
        className="w-full h-7 px-2 rounded-lg text-[12px] border border-[#D0D5DD] dark:border-[#3D4258] bg-white dark:bg-[#1A1B23] text-[#101828] dark:text-[#ECEEF3] outline-none focus:border-[#6366F1]"
      />
      <button type="submit" className="text-[11px] font-semibold text-[#6366F1] shrink-0">Save</button>
      <button type="button" onClick={onClose} className="text-[11px] text-[#98A2B3] shrink-0">Cancel</button>
    </form>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

type StatType = 'revenue_month' | 'pipeline' | 'overdue' | 'open_proposals'

export default function StatCardWidget({ type }: { type: StatType }) {
  const { data: stats, isLoading } = useDashboardStats()
  const { format } = useCurrency()
  const { data: profile } = useProfile()
  const workspaceId = profile?.activeWorkspaceId ?? profile?.id ?? ''
  const { mutate: updateWorkspace } = useUpdateWorkspace(workspaceId)
  const [editingGoal, setEditingGoal] = useState(false)

  const META: Record<StatType, {
    label:     string
    sub:       (s: NonNullable<typeof stats>) => string
    iconBg:    string
    icon:      React.ElementType
    iconColor: string
    value:     (s: NonNullable<typeof stats>) => React.ReactNode
  }> = {
    revenue_month: {
      label:     'Revenue this month',
      sub:       s => s.revenueChange != null
        ? `${s.revenueChange >= 0 ? '+' : ''}${s.revenueChange}% vs last month`
        : `Last month: ${format(s.revenueLastMonth ?? 0)}`,
      iconBg:    'bg-[#EEF2FF] dark:bg-[#1E2040]',
      iconColor: 'text-[#6366F1]',
      icon:      DollarSign,
      value:     s => format(s.revenueThisMonth ?? 0),
    },
    pipeline: {
      label:     'Pipeline value',
      sub:       s => `${s.activeContacts ?? 0} active contact${s.activeContacts !== 1 ? 's' : ''}`,
      iconBg:    'bg-[#ECFDF3] dark:bg-emerald-950/40',
      iconColor: 'text-[#027A48] dark:text-[#34D399]',
      icon:      TrendingUp,
      value:     s => format(s.pipelineValue ?? 0),
    },
    overdue: {
      label:     'Overdue invoices',
      sub:       s => s.overdueCount === 0 ? 'All invoices up to date' : `${s.overdueCount} invoice${s.overdueCount !== 1 ? 's' : ''} pending`,
      iconBg:    'bg-[#FEF3F2] dark:bg-red-950/40',
      iconColor: 'text-[#D92D20] dark:text-red-400',
      icon:      AlertCircle,
      value:     s => format(s.overdueAmount ?? 0),
    },
    open_proposals: {
      label:     'Open proposals',
      sub:       () => 'Sent or viewed by client',
      iconBg:    'bg-[#FFFAEB] dark:bg-amber-950/30',
      iconColor: 'text-[#B54708] dark:text-amber-400',
      icon:      FileText,
      value:     s => String(s.openProposals ?? 0),
    },
  }

  const m = META[type]
  const Icon = m.icon

  return (
    <div className="card-glass p-5 h-full hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', m.iconBg)}>
          <Icon size={18} className={m.iconColor} strokeWidth={2} />
        </div>
        {type === 'revenue_month' && !isLoading && stats?.revenueChange != null && (
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full',
            stats.revenueChange >= 0 ? 'text-[#027A48] dark:text-[#34D399] bg-[#ECFDF3] dark:bg-emerald-950/40' : 'text-[#D92D20] dark:text-red-400 bg-[#FEF3F2] dark:bg-red-950/40',
          )}>
            {stats.revenueChange >= 0 ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
            {Math.abs(stats.revenueChange)}%
          </span>
        )}
        {type === 'overdue' && !isLoading && (stats?.overdueCount ?? 0) > 0 && (
          <span className="text-[11px] font-semibold text-[#D92D20] dark:text-red-400 bg-[#FEF3F2] dark:bg-red-950/40 px-2 py-1 rounded-full">
            {stats!.overdueCount} overdue
          </span>
        )}
      </div>
      {isLoading
        ? <Skeleton className="h-8 w-28 mb-2" />
        : <p className="text-[26px] font-extrabold text-[#101828] dark:text-[#ECEEF3] leading-none tracking-tight">
            {stats ? m.value(stats) : '—'}
          </p>
      }
      <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium mt-2">{m.label}</p>
      {isLoading
        ? <Skeleton className="h-3 w-20 mt-1" />
        : <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1">{stats ? m.sub(stats) : ''}</p>
      }

      {/* Monthly goal progress — only on the revenue card */}
      {type === 'revenue_month' && !isLoading && stats && (
        editingGoal ? (
          <GoalEditor
            value={stats.monthlyRevenueGoal}
            onClose={() => setEditingGoal(false)}
            onSave={v => { updateWorkspace({ monthlyRevenueGoal: v }); setEditingGoal(false) }}
          />
        ) : stats.monthlyRevenueGoal ? (
          <button
            onClick={e => { e.stopPropagation(); setEditingGoal(true) }}
            className="w-full text-left mt-3 group/goal"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#6366F1]">
                <Target size={10} strokeWidth={2.5} />
                {Math.min(100, Math.round((stats.revenueThisMonth / stats.monthlyRevenueGoal) * 100))}% of goal
              </span>
              <Pencil size={10} className="text-[#D0D5DD] opacity-0 group-hover/goal:opacity-100 transition-opacity" />
            </div>
            <div className="h-1.5 rounded-full bg-[#EEF2FF] dark:bg-[#1E2040] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#6366F1] transition-all"
                style={{ width: `${Math.min(100, (stats.revenueThisMonth / stats.monthlyRevenueGoal) * 100)}%` }}
              />
            </div>
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setEditingGoal(true) }}
            className="flex items-center gap-1 text-[10.5px] font-semibold text-[#98A2B3] hover:text-[#6366F1] mt-3 transition-colors"
          >
            <Target size={10} strokeWidth={2.5} />
            Set a monthly goal
          </button>
        )
      )}
    </div>
  )
}
