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

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try {
      await updateTask.mutateAsync({ id: task.id, status: done ? 'TODO' : 'COMPLETED' })
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-3 cursor-pointer',
        'hover:border-[#C7D7FD] dark:hover:border-[#3B4267] hover:shadow-sm transition-all select-none',
        done && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="mt-0.5 shrink-0"
        >
          {toggling
            ? <Loader2 size={14} className="animate-spin text-[#98A2B3]" />
            : done
              ? <CheckCircle2 size={14} className="text-[#6366F1]" />
              : <Circle size={14} className="text-[#D0D5DD] hover:text-[#6366F1] transition-colors" />
          }
        </button>
        <span className={cn(
          'text-[13px] font-medium leading-snug flex-1 min-w-0',
          done ? 'line-through text-[#98A2B3] dark:text-[#545C74]' : 'text-[#101828] dark:text-[#ECEEF3]',
        )}>
          {task.title}
        </span>
        {task.isPrivate && (
          <Lock size={11} className="text-[#98A2B3] shrink-0 mt-0.5" />
        )}
      </div>

      {(task.dueDate || (showProject && task.project)) && (
        <div className="flex items-center gap-2 mt-2 pl-5 flex-wrap">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#8B92A8]">
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {showProject && task.project && (
            <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full text-[#344054] dark:text-[#C2C8D8]">
              <FolderOpen size={10} />
              {task.project.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
