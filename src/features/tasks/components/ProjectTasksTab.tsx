// pakka-app/src/features/tasks/components/ProjectTasksTab.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Circle, CheckCircle2, Loader2, Search } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useTasks, useUpdateTask, type Task, type TaskStatus } from '../hooks/useTasks'
import TaskSlideIn from './TaskSlideIn'

type FilterTab = 'all' | 'TODO' | 'COMPLETED'

const FILTER_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'TODO',      label: 'To Do' },
  { value: 'COMPLETED', label: 'Completed' },
]

interface Props {
  projectId: string
}

export default function ProjectTasksTab({ projectId }: Props) {
  const { taskId }  = useParams<{ taskId?: string }>()
  const navigate    = useNavigate()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const listUrl = `/projects/${projectId}/tasks`

  const { data: tasks, isLoading } = useTasks({
    projectId,
    status: filter === 'all' ? undefined : filter as TaskStatus,
    search: search || undefined,
  })

  const updateTask = useUpdateTask()

  function openTask(id: string) {
    navigate(`${listUrl}/${id}`)
  }

  function openNew() {
    navigate(`${listUrl}/new`)
  }

  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <div className="space-y-4">
      {/* Sub-nav + New task button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[13px]">
            <span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
              Tasks
            </span>
            <span className="px-3 py-1.5 rounded-lg text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed select-none" title="Coming soon">
              Task Boards
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-0.5 bg-white dark:bg-[#13141A]">
            {FILTER_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                  filter === t.value
                    ? 'bg-[#6366F1] text-white'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="form-input pl-8 text-[13px] h-8 w-48"
            />
          </div>
        </div>

        <button
          onClick={openNew}
          className="btn-primary text-[13px] flex items-center gap-1.5 h-8 px-3"
        >
          <Plus size={13} /> New task
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-[#98A2B3]" />
          </div>
        ) : !tasks?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">
              {search ? 'No tasks match your search' : 'No tasks for this project yet'}
            </p>
            {!search && (
              <button
                onClick={openNew}
                className="mt-2 flex items-center gap-1 text-[12px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors"
              >
                <Plus size={12} /> New task
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Task</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Due date</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {tasks.map(task => (
                  <ProjectTaskRow
                    key={task.id}
                    task={task}
                    onOpen={openTask}
                    onToggle={t => updateTask.mutateAsync({ id: t.id, status: t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED' })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in */}
      <TaskSlideIn
        open={slideInOpen}
        taskId={slideInId}
        defaultProjectId={projectId}
        listUrl={listUrl}
      />
    </div>
  )
}

function ProjectTaskRow({ task, onOpen, onToggle }: {
  task:     Task
  onOpen:   (id: string) => void
  onToggle: (task: Task) => void
}) {
  const [toggling, setToggling] = useState(false)
  const done = task.status === 'COMPLETED'

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try { await onToggle(task) } finally { setToggling(false) }
  }

  return (
    <tr
      className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer"
      onClick={() => onOpen(task.id)}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <button onClick={handleToggle} disabled={toggling} className="flex items-center gap-2.5 group/row min-w-0">
          {toggling
            ? <Loader2 size={15} className="animate-spin text-[#98A2B3] shrink-0" />
            : done
              ? <CheckCircle2 size={15} className="text-[#6366F1] shrink-0" />
              : <Circle size={15} className="text-[#D0D5DD] group-hover/row:text-[#6366F1] shrink-0 transition-colors" />
          }
          <span className={cn(
            'text-[13px] font-medium text-left',
            done ? 'line-through text-[#98A2B3] dark:text-[#545C74]' : 'text-[#101828] dark:text-[#ECEEF3]',
          )}>
            {task.title}
          </span>
        </button>
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {task.dueDate ? formatDate(task.dueDate) : <span className="text-[#D0D5DD]">—</span>}
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {formatDate(task.createdAt)}
      </td>
    </tr>
  )
}
