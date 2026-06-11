// pakka-app/src/features/tasks/components/TaskCard.tsx
import { useState } from 'react'
import { Circle, CheckCircle2, Loader2, Lock, Calendar, FolderOpen } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useUpdateTask, type Task } from '../hooks/useTasks'

interface Props {
  task:         Task
  onClick:      () => void
  showProject?: boolean
}

export default function TaskCard({ task, onClick, showProject }: Props) {
  const [toggling, setToggling] = useState(false)
  const updateTask              = useUpdateTask()
  const done                    = task.status === 'COMPLETED'

  const isOverdue = !done && task.dueDate && new Date(task.dueDate) < new Date()

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try {
      await updateTask.mutateAsync({ id: task.id, status: done ? 'TODO' : 'COMPLETED' })
    } finally {
      setToggling(false)
    }
  }

  const accentColor = task.column?.color

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-white dark:bg-[#16171F] rounded-xl border border-[#E9ECF0] dark:border-[#26283A] cursor-pointer select-none',
        'transition-all duration-150 ease-out',
        'hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-[#C7D7FD] dark:hover:border-[#3B4267]',
        done && 'opacity-50',
      )}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '3px' } : undefined}
    >
      <div className={cn('p-3.5', accentColor ? 'pl-3' : '')}>
        {/* Title row */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="mt-[1px] shrink-0 transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            {toggling
              ? <Loader2 size={14} className="animate-spin text-[#98A2B3]" />
              : done
                ? <CheckCircle2 size={15} className="text-[#6366F1]" />
                : <Circle size={15} className="text-[#D0D5DD] group-hover:text-[#A5B4FC] transition-colors duration-150" />
            }
          </button>
          <span className={cn(
            'text-[13px] font-medium leading-[1.45] flex-1 min-w-0 break-words',
            done ? 'line-through text-[#A8B0BE] dark:text-[#4B5268]' : 'text-[#0F1728] dark:text-[#E8EAF0]',
          )}>
            {task.title}
          </span>
          {task.isPrivate && (
            <Lock size={11} className="text-[#C4CAD4] dark:text-[#3D4258] shrink-0 mt-0.5" />
          )}
        </div>

        {/* Meta row */}
        {(task.dueDate || (showProject && task.project) || task.assignee) && (
          <div className="flex items-center justify-between mt-2.5 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              {task.dueDate && (
                <span className={cn(
                  'flex items-center gap-[3px] text-[11px] font-medium px-1.5 py-0.5 rounded-md',
                  isOverdue
                    ? 'bg-[#FEF3F2] text-[#D92D20] dark:bg-red-950/30 dark:text-[#FDA29B]'
                    : 'bg-[#F2F4F7] dark:bg-[#1C1D27] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  <Calendar size={10} />
                  {formatDate(task.dueDate)}
                </span>
              )}
              {showProject && task.project && (
                <span className="flex items-center gap-[3px] text-[11px] font-medium px-1.5 py-0.5 bg-[#EEF2FF] dark:bg-[#1C1D2E] rounded-md text-[#6366F1] dark:text-[#818CF8] max-w-[110px] truncate">
                  <FolderOpen size={10} />
                  {task.project.name}
                </span>
              )}
            </div>
            {task.assignee && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shrink-0 ring-[1.5px] ring-white dark:ring-[#16171F] shadow-sm"
                title={task.assignee.name}
              >
                <span className="text-[9px] font-bold leading-none">
                  {task.assignee.name.charAt(0).toUpperCase()}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
