import { useState } from 'react'
import { Target, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useUpdateWorkspace } from '@/features/settings/hooks/useWorkspaces'

interface Props {
  revenueThisMonth: number
  monthlyGoal:      number | null
  size?:            'compact' | 'hero'
  tone?:            'onSurface' | 'onViolet'
}

export default function RevenueGoalTracker({ revenueThisMonth, monthlyGoal, size = 'compact', tone = 'onSurface' }: Props) {
  const { data: profile } = useProfile()
  const workspaceId = profile?.activeWorkspaceId ?? profile?.id ?? ''
  const { mutate: updateWorkspace } = useUpdateWorkspace(workspaceId)
  const [editingGoal, setEditingGoal] = useState(false)

  const widthCls  = size === 'hero' ? 'max-w-[280px]' : 'w-full'
  const onViolet   = tone === 'onViolet'

  if (editingGoal) {
    return (
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={e => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem('goal') as HTMLInputElement
          const n = Number(input.value)
          if (n > 0) { updateWorkspace({ monthlyRevenueGoal: n }); setEditingGoal(false) }
        }}
        className={cn('flex items-center gap-1.5 mt-3', widthCls)}
      >
        <input
          name="goal"
          type="number" min={0} step={1000} autoFocus
          defaultValue={monthlyGoal ?? ''}
          placeholder="Monthly goal"
          className={cn(
            'w-full h-7 px-2 rounded-lg text-[12px] outline-none',
            onViolet
              ? 'border border-white/30 bg-white/10 text-white placeholder-white/50 focus:border-white/60'
              : 'border border-[#D0D5DD] dark:border-[#3D4258] bg-white dark:bg-[#1A1B23] text-[#101828] dark:text-[#ECEEF3] focus:border-[#5F259F]',
          )}
        />
        <button type="submit" className={cn('text-[11px] font-semibold shrink-0', onViolet ? 'text-white' : 'text-[#5F259F]')}>Save</button>
        <button type="button" onClick={() => setEditingGoal(false)} className={cn('text-[11px] shrink-0', onViolet ? 'text-white/60' : 'text-[#98A2B3]')}>Cancel</button>
      </form>
    )
  }

  if (!monthlyGoal) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setEditingGoal(true) }}
        className={cn(
          'flex items-center gap-1 text-[10.5px] font-semibold mt-3 transition-colors',
          onViolet ? 'text-white/60 hover:text-white' : 'text-[#98A2B3] hover:text-[#5F259F]',
        )}
      >
        <Target size={10} strokeWidth={2.5} />
        Set a monthly goal
      </button>
    )
  }

  const pct = Math.min(100, Math.round((revenueThisMonth / monthlyGoal) * 100))
  return (
    <button
      onClick={e => { e.stopPropagation(); setEditingGoal(true) }}
      className={cn('text-left mt-3 group/goal block', widthCls)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn('flex items-center gap-1 text-[10.5px] font-semibold', onViolet ? 'text-white/85' : 'text-[#5F259F] dark:text-[#D8B9F5]')}>
          <Target size={10} strokeWidth={2.5} />
          {pct}% of goal
        </span>
        <Pencil size={10} className={cn('opacity-0 group-hover/goal:opacity-100 transition-opacity', onViolet ? 'text-white/50' : 'text-[#D0D5DD]')} />
      </div>
      <div className={cn('h-1.5 rounded-full overflow-hidden', onViolet ? 'bg-white/20' : 'bg-[#F3EAFB] dark:bg-[#3B1F5C]')}>
        <div className={cn('h-full rounded-full transition-all', onViolet ? 'bg-white' : 'bg-[#5F259F]')} style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}
