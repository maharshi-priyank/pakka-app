// pakka-app/src/features/tasks/components/TaskSlideIn.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, Loader2, Link2, Lock, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTask, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useTeam } from '@/features/team/hooks/useTeam'

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

  const { data: profile }  = useProfile()
  const { data: teamData } = useTeam()
  const assignableUsers = [
    ...(profile ? [{ id: profile.id, name: profile.name, email: profile.email }] : []),
    ...(teamData?.members ?? []),
  ]

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title,       setTitle]       = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [projectId,   setProjectId]   = useState<string>('')
  const [isPrivate,   setIsPrivate]   = useState(false)
  const [assigneeId,  setAssigneeId]  = useState<string>('')
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
      setAssigneeId('')
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
      setAssigneeId(existing.assigneeId ?? '')
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
        projectId:   projectId  || null,
        assigneeId:  assigneeId || null,
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

              {/* Assignee */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Assignee
                </label>
                <div className="relative">
                  <UserCircle2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="form-input w-full text-[13px] pl-8"
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}{profile && u.id === profile.id ? ' (you)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
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

      <ConfirmModal
        open={showDel}
        onClose={() => setShowDel(false)}
        onConfirm={handleDelete}
        title="Delete task?"
        description="This will permanently delete the task. This cannot be undone."
        confirmLabel="Delete Task"
        variant="delete"
        isLoading={deleteTask.isPending}
      />
    </>
  )
}
