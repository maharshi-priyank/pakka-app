// pakka-app/src/features/tasks/components/BoardColumnCard.tsx
import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Check, Trash2, Pencil, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateTask } from '../hooks/useTasks'
import { useUpdateColumn, useDeleteColumn, type BoardColumnWithTasks } from '../hooks/useTaskBoards'

interface Props {
  column:       BoardColumnWithTasks
  boardId:      string
  onCardClick:  (taskId: string) => void
  showProject?: boolean
  children?:    React.ReactNode
}

export default function BoardColumnCard({ column, boardId, onCardClick, showProject, children }: Props) {
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [renaming,     setRenaming]     = useState(false)
  const [nameInput,    setNameInput]    = useState(column.name)
  const [addingTask,   setAddingTask]   = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const renameRef  = useRef<HTMLInputElement>(null)
  const newTaskRef = useRef<HTMLInputElement>(null)

  const updateColumn = useUpdateColumn()
  const deleteColumn = useDeleteColumn()
  const createTask   = useCreateTask()

  useEffect(() => { if (renaming)   renameRef.current?.focus() },  [renaming])
  useEffect(() => { if (addingTask) newTaskRef.current?.focus() }, [addingTask])

  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === column.name) { setRenaming(false); return }
    await updateColumn.mutateAsync({ boardId, colId: column.id, name: trimmed })
    setRenaming(false)
  }

  async function handleMarkDone() {
    await updateColumn.mutateAsync({ boardId, colId: column.id, isDone: !column.isDone })
    setMenuOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete column "${column.name}"? Tasks will move to Inbox.`)) return
    await deleteColumn.mutateAsync({ boardId, colId: column.id })
    setMenuOpen(false)
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) { setAddingTask(false); return }
    await createTask.mutateAsync({ title, columnId: column.id })
    setNewTaskTitle('')
    setAddingTask(false)
  }

  const colorDot = column.color
    ? <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: column.color }} />
    : null

  return (
    <div className="flex flex-col bg-[#F8F9FB] dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] w-[280px] shrink-0 max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {colorDot}
        {renaming ? (
          <input
            ref={renameRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            className="flex-1 text-[13px] font-semibold bg-transparent border-b border-[#6366F1] outline-none text-[#101828] dark:text-[#ECEEF3]"
          />
        ) : (
          <span
            className="flex-1 text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate cursor-pointer"
            onClick={() => setRenaming(true)}
          >
            {column.name}
          </span>
        )}
        {column.isDone && <Check size={12} className="text-[#10B981] shrink-0" />}
        <span className="text-[11px] text-[#98A2B3] bg-[#F2F4F7] dark:bg-[#21222D] px-1.5 py-0.5 rounded-full shrink-0">
          {column.tasks.length}
        </span>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-0.5 rounded hover:bg-[#EAECF0] dark:hover:bg-[#26283A] transition-colors"
          >
            <MoreHorizontal size={14} className="text-[#667085]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { setRenaming(true); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                onClick={handleMarkDone}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                <Check size={12} /> {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
              </button>
              <div className="my-1 border-t border-[#EAECF0] dark:border-[#26283A]" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-[#2D1B1B]"
              >
                <Trash2 size={12} /> Delete column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list — rendered by parent via children (SortableCard) */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2 min-h-[40px]">
        {children}
      </div>

      {/* Add task */}
      <div className="px-3 pb-3 pt-1">
        {addingTask ? (
          <div className="flex flex-col gap-1.5">
            <input
              ref={newTaskRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') }
              }}
              placeholder="Task title..."
              className="form-input text-[12px] h-7 w-full"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAddTask}
                disabled={createTask.isPending}
                className="flex-1 btn-primary text-[11px] h-6 flex items-center justify-center gap-1"
              >
                {createTask.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAddingTask(false); setNewTaskTitle('') }}
                className="flex-1 text-[11px] h-6 border border-[#EAECF0] dark:border-[#26283A] rounded-md text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors w-full"
          >
            <Plus size={13} /> Add task
          </button>
        )}
      </div>
    </div>
  )
}
