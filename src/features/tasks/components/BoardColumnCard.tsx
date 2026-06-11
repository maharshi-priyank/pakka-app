// pakka-app/src/features/tasks/components/BoardColumnCard.tsx
import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Check, Trash2, Pencil, Plus, Loader2, AlertTriangle } from 'lucide-react'
import { useCreateTask } from '../hooks/useTasks'
import { useUpdateColumn, useDeleteColumn, type BoardColumnWithTasks } from '../hooks/useTaskBoards'

interface Props {
  column:    BoardColumnWithTasks
  boardId:   string
  children?: React.ReactNode
}

function DeleteColumnModal({ columnName, onClose, onConfirm, isPending }: {
  columnName: string
  onClose:    () => void
  onConfirm:  () => void
  isPending:  boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="glass-modal rounded-2xl w-full max-w-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FEF3F2] dark:bg-[#2D1B1B] flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-[#F04438]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Delete column?</p>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1">
                <span className="font-medium text-[#344054] dark:text-[#C2C8D8]">"{columnName}"</span> will be permanently deleted.
                Tasks in this column will move to Inbox.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-9 text-[13px] border border-[#EAECF0] dark:border-[#26283A] rounded-lg text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 h-9 text-[13px] bg-[#F04438] hover:bg-[#D92D20] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BoardColumnCard({ column, boardId, children }: Props) {
  const [menuOpen,        setMenuOpen]        = useState(false)
  const [renaming,        setRenaming]        = useState(false)
  const [nameInput,       setNameInput]       = useState(column.name)
  const [addingTask,      setAddingTask]      = useState(false)
  const [newTaskTitle,    setNewTaskTitle]    = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
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

  async function handleDeleteConfirm() {
    await deleteColumn.mutateAsync({ boardId, colId: column.id })
    setShowDeleteModal(false)
    setMenuOpen(false)
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) { setAddingTask(false); return }
    await createTask.mutateAsync({ title, columnId: column.id })
    setNewTaskTitle('')
    setAddingTask(false)
  }

  return (
    <div className="flex flex-col w-[300px] shrink-0 max-h-[calc(100vh-200px)] rounded-2xl bg-[#F4F6FB] dark:bg-[#17181F] border border-[#E8EAEF] dark:border-[#23242F]">
      {/* Color accent stripe */}
      {column.color && (
        <div
          className="h-[3px] rounded-t-2xl w-full shrink-0"
          style={{ background: column.color }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
        {!column.color && (
          <span className="w-2 h-2 rounded-full bg-[#D0D5DD] dark:bg-[#3D4258] shrink-0" />
        )}
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
            className="flex-1 text-[12.5px] font-semibold text-[#344054] dark:text-[#B8BFCF] uppercase tracking-[0.04em] truncate cursor-pointer hover:text-[#101828] dark:hover:text-[#ECEEF3] transition-colors duration-150"
            onClick={() => setRenaming(true)}
          >
            {column.name}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {column.isDone && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40">
              <Check size={9} className="text-[#10B981]" />
            </span>
          )}
          <span
            className="text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
            style={column.color
              ? { background: `${column.color}20`, color: column.color }
              : { background: 'rgb(233 236 240 / 1)', color: '#667085' }
            }
          >
            {column.tasks.length}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#E9ECF0] dark:hover:bg-[#23242F] transition-colors duration-150"
            >
              <MoreHorizontal size={13} className="text-[#98A2B3] dark:text-[#5A6175]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#1E1F2A] border border-[#E8EAEF] dark:border-[#2A2B37] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 py-1.5 overflow-hidden">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#26273A] transition-colors duration-100"
                >
                  <Pencil size={12} className="text-[#667085] dark:text-[#8B92A8]" /> Rename
                </button>
                <button
                  onClick={handleMarkDone}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#26273A] transition-colors duration-100"
                >
                  <Check size={12} className="text-[#667085] dark:text-[#8B92A8]" />
                  {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
                </button>
                <div className="my-1 border-t border-[#F2F4F7] dark:border-[#26273A]" />
                <button
                  onClick={() => { setMenuOpen(false); setShowDeleteModal(true) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12.5px] text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-[#2D1B1B] transition-colors duration-100"
                >
                  <Trash2 size={12} /> Delete column
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2 min-h-[60px] scrollbar-thin">
        {children}
      </div>

      {/* Add task footer */}
      <div className="px-3 pb-3 pt-1.5">
        {addingTask ? (
          <div className="flex flex-col gap-2 bg-white dark:bg-[#1C1D27] rounded-xl border border-[#E8EAEF] dark:border-[#26273A] p-3">
            <input
              ref={newTaskRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') }
              }}
              placeholder="Task title..."
              className="form-input text-[12.5px] h-8 w-full"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAddTask}
                disabled={createTask.isPending}
                className="flex-1 btn-primary text-[11.5px] h-7 flex items-center justify-center gap-1"
              >
                {createTask.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Add task'}
              </button>
              <button
                onClick={() => { setAddingTask(false); setNewTaskTitle('') }}
                className="flex-1 text-[11.5px] h-7 border border-[#E8EAEF] dark:border-[#26273A] rounded-lg text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="group flex items-center gap-1.5 text-[12px] text-[#A8B0BE] dark:text-[#4B5268] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors duration-150 w-full px-1 py-1.5 rounded-lg hover:bg-[#EEF2FF]/60 dark:hover:bg-[#1C1D2E]/80"
          >
            <span className="w-4 h-4 flex items-center justify-center rounded-md bg-[#E9ECF0] dark:bg-[#23242F] group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1C1D2E] transition-colors duration-150">
              <Plus size={10} className="text-[#667085] group-hover:text-[#6366F1] dark:group-hover:text-[#818CF8] transition-colors duration-150" />
            </span>
            Add task
          </button>
        )}
      </div>

      {showDeleteModal && (
        <DeleteColumnModal
          columnName={column.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          isPending={deleteColumn.isPending}
        />
      )}
    </div>
  )
}
