// pakka-app/src/features/tasks/components/TaskSlideIn.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, Loader2, Link2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTask, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { useProjects } from '@/features/projects/hooks/useProjects'

interface Props {
  open:              boolean
  taskId?:           string       // undefined = new task form
  defaultProjectId?: string       // pre-fill project when creating from project context
  listUrl:           string       // URL to navigate to on close (e.g. '/tasks' or '/projects/abc/tasks')
}

export default function TaskSlideIn({ open, taskId, defaultProjectId, listUrl }: Props) {
  const navigate  = useNavigate()
  const isNew     = !taskId || taskId === 'new'
  const { data: existing, isLoading } = useTask(taskId)
  const { data: projectsData } = useProjects()
  const projects  = projectsData?.projects ?? []

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title,       setTitle]       = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [projectId,   setProjectId]   = useState<string>('')
  const [isPrivate,   setIsPrivate]   = useState(false)
  const [showDel,     setShowDel]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Sync form state when existing task loads or taskId changes
  useEffect(() => {
    if (isNew) {
      setTitle('')
      setDueDate('')
      setIncludeTime(false)
      setProjectId(defaultProjectId ?? '')
      setIsPrivate(false)
    } else if (existing) {
      setTitle(existing.title)
      setDueDate(existing.dueDate
        ? (existing.includeTime
            ? new Date(existing.dueDate).toISOString().slice(0, 16)
            : new Date(existing.dueDate).toISOString().slice(0, 10))
        : '')
      setIncludeTime(existing.includeTime)
      setProjectId(existing.projectId ?? '')
      setIsPrivate(existing.isPrivate)
    }
  }, [existing, isNew, defaultProjectId, taskId])

  function close() {
    navigate(listUrl)
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') navigate(listUrl) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, navigate, listUrl])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:       title.trim(),
        dueDate:     dueDate || null,
        includeTime,
        isPrivate,
        projectId:   projectId || null,
      }
      if (isNew) {
        const created = await createTask.mutateAsync(payload)
        navigate(`${listUrl}/${created.id}`.replace(/\/+/g, '/'))
      } else {
        await updateTask.mutateAsync({ id: taskId!, ...payload })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!taskId) return
    await deleteTask.mutateAsync(taskId)
    navigate(listUrl)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        onClick={close}
      />

      {/* Panel */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px]',
        'bg-white dark:bg-[#13141A] border-l border-[#EAECF0] dark:border-[#26283A]',
        'flex flex-col shadow-2xl',
        'transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A] shrink-0">
          <div className="min-w-0">
            {existing?.project && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5 truncate">
                {existing.project.name}
                {existing.project.client && <span> &middot; {existing.project.client.name}</span>}
              </p>
            )}
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {isNew ? 'New task' : 'Task details'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isNew && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                  title="Copy link"
                >
                  <Link2 size={13} />
                </button>
                <button
                  onClick={() => setShowDel(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-red-950/20 transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading && !isNew ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-[#98A2B3]" />
            </div>
          ) : (
            <>
              {/* Title */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Task
                </label>
                <textarea
                  autoFocus
                  rows={2}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="form-input w-full resize-none text-[14px] font-medium"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Due date
                </label>
                <input
                  type={includeTime ? 'datetime-local' : 'date'}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="form-input w-full text-[13px]"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTime}
                    onChange={e => {
                      setIncludeTime(e.target.checked)
                      // When toggling, strip/keep time part of dueDate
                      if (dueDate) {
                        setDueDate(e.target.checked ? dueDate.slice(0, 16) : dueDate.slice(0, 10))
                      }
                    }}
                    className="rounded border-[#D0D5DD] text-[#6366F1]"
                  />
                  <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Include time</span>
                </label>
              </div>

              {/* Project */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="form-input w-full text-[13px]"
                >
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Private */}
              <div className="flex items-center justify-between py-3 border-t border-[#F2F4F7] dark:border-[#26283A]">
                <div className="flex items-center gap-2">
                  <Lock size={13} className="text-[#98A2B3]" />
                  <div>
                    <p className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">Private task</p>
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Only visible to you</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  onClick={() => setIsPrivate(v => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                    isPrivate ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    isPrivate ? 'translate-x-4' : 'translate-x-0',
                  )} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#F2F4F7] dark:border-[#26283A] shrink-0 flex gap-2">
          <button onClick={close} className="btn-secondary flex-1 text-[13px]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="btn-primary flex-1 text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            {isNew ? 'Create task' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {showDel && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDel(false)} />
          <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[#FEF3F2] dark:bg-red-950/40 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={18} className="text-[#D92D20]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-1">Delete task?</h3>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-5">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDel(false)} className="btn-secondary flex-1 text-[13px]">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="flex-1 h-9 px-4 rounded-xl bg-[#D92D20] hover:bg-[#B42318] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deleteTask.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
