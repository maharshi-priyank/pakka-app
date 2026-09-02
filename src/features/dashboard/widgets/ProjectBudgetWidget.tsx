import { useNavigate } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useCurrency } from '@/hooks/useCurrency'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function ProjectBudgetWidget() {
  const { data, isLoading } = useProjects({ status: 'ACTIVE', limit: 20 })
  const { format } = useCurrency()
  const navigate = useNavigate()

  const projects = (data?.projects ?? [])
    .filter(p => p.budget != null && Number(p.budget) > 0)
    .map(p => ({
      ...p,
      budgetNum: Number(p.budget),
      pct: Math.min(100, Math.round(((p.invoiced ?? 0) / Number(p.budget)) * 100)),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Project Budgets</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Active projects with a set budget</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center">
          <FolderKanban size={14} className="text-[#2563EB] dark:text-[#60A5FA]" strokeWidth={2} />
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-4 space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <FolderKanban size={28} className="text-[#D0D5DD] mb-2" />
          <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No active projects with a budget set</p>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate pr-2">{p.name}</span>
                <span className={cn(
                  'text-[11px] font-bold shrink-0',
                  p.pct >= 90 ? 'text-[#D92D20] dark:text-red-400' : 'text-[#98A2B3] dark:text-[#545C74]',
                )}>
                  {p.pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] overflow-hidden mb-1">
                <div
                  className={cn('h-full rounded-full transition-all', p.pct >= 90 ? 'bg-[#D92D20]' : 'bg-[#2563EB]')}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74]">
                {format(p.invoiced ?? 0)} of {format(p.budgetNum)} invoiced
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
