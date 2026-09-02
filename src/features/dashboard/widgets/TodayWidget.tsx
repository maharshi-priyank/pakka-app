import { useNavigate } from 'react-router-dom'
import { CheckSquare, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTasks } from '@/features/tasks/hooks/useTasks'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export default function TodayWidget() {
  const { data: tasks, isLoading } = useTasks({ status: 'TODO' })
  const navigate = useNavigate()

  const todayEnd = endOfToday()
  const dueTasks = (tasks ?? [])
    .filter(t => t.dueDate)
    .map(t => ({ ...t, due: new Date(t.dueDate as string) }))
    .filter(t => t.due <= todayEnd)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const overdue = dueTasks.filter(t => t.due < startOfToday())
  const dueToday = dueTasks.filter(t => t.due >= startOfToday())

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Today</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            {isLoading ? 'Loading…' : dueTasks.length === 0 ? 'Nothing due' : `${dueTasks.length} task${dueTasks.length !== 1 ? 's' : ''} to handle`}
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#F3EAFB] dark:bg-[#3B1F5C] flex items-center justify-center">
          <CheckSquare size={14} className="text-[#5F259F] dark:text-[#D8B9F5]" strokeWidth={2} />
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2.5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      ) : dueTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <CheckSquare size={28} className="text-[#D0D5DD] mb-2" />
          <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">Nothing due today</p>
        </div>
      ) : (
        <div className="px-3 py-3 space-y-1 max-h-[220px] overflow-y-auto">
          {overdue.slice(0, 3).map(task => (
            <button
              key={task.id}
              onClick={() => navigate(task.projectId ? `/projects/${task.projectId}` : '/tasks')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#FEF3F2] dark:hover:bg-red-950/20 transition-colors text-left group"
            >
              <AlertTriangle size={13} className="text-[#D92D20] dark:text-red-400 shrink-0" strokeWidth={2} />
              <span className="flex-1 text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] truncate">{task.title}</span>
              <span className="text-[10.5px] font-semibold text-[#D92D20] dark:text-red-400 shrink-0">Overdue</span>
            </button>
          ))}
          {dueToday.slice(0, 4).map(task => (
            <button
              key={task.id}
              onClick={() => navigate(task.projectId ? `/projects/${task.projectId}` : '/tasks')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="w-3.5 h-3.5 rounded-[4px] border-[1.5px] border-[#D0D5DD] dark:border-[#3D4258] shrink-0" />
              <span className="flex-1 text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] truncate">{task.title}</span>
              {task.project && (
                <span className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] shrink-0 truncate max-w-[80px]">{task.project.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
