import { createPortal } from 'react-dom'
import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  Plus, Loader2, Calendar, UserCircle2, FolderOpen,
  MoreHorizontal, Pencil, Check, Trash2, AlertTriangle,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useTasks, useUpdateTask, useCreateTask, type Task } from '../hooks/useTasks'
import {
  useTaskBoard,
  useUpdateColumn,
  useDeleteColumn,
  useCreateColumn,
  type BoardColumnWithTasks,
} from '../hooks/useTaskBoards'
import TaskSlideIn from './TaskSlideIn'

interface Props {
  boardId:    string
  projectId?: string
  listUrl:    string
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact card — draggable when enabled, static when disabled (inbox)
// ─────────────────────────────────────────────────────────────────────────────
function SwimLaneCard({
  task,
  onClick,
  disabled,
  showProject,
}: {
  task:         Task
  onClick:      () => void
  disabled?:    boolean
  showProject?: boolean
}) {
  const done      = task.status === 'COMPLETED'
  const isOverdue = !done && task.dueDate && new Date(task.dueDate) < new Date()
  const accent    = task.column?.color

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:       task.id,
    data:     { task },
    disabled: disabled ?? false,
  })

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-[#16171F] rounded-lg border border-[#E9ECF0] dark:border-[#26283A] cursor-pointer select-none',
        'transition-all duration-150 ease-out',
        'hover:-translate-y-px hover:shadow-[0_3px_10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_3px_10px_rgba(0,0,0,0.3)] hover:border-[#C7D7FD] dark:hover:border-[#3B4267]',
        isDragging && 'opacity-20 scale-95',
        done       && 'opacity-50',
      )}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: '3px' } : undefined}
    >
      <div className={cn('px-3 py-2.5', accent ? 'pl-2.5' : '')}>
        <p className={cn(
          'text-[12.5px] font-medium leading-[1.4] break-words',
          done
            ? 'line-through text-[#A8B0BE] dark:text-[#4B5268]'
            : 'text-[#0F1728] dark:text-[#E8EAF0]',
        )}>
          {task.title}
        </p>
        {task.dueDate && (
          <div className="mt-1.5">
            <span className={cn(
              'inline-flex items-center gap-[3px] text-[10.5px] font-medium px-1.5 py-[2px] rounded-md',
              isOverdue
                ? 'bg-[#FEF3F2] text-[#D92D20] dark:bg-red-950/30 dark:text-[#FDA29B]'
                : 'bg-[#F2F4F7] dark:bg-[#1C1D27] text-[#667085] dark:text-[#8B92A8]',
            )}>
              <Calendar size={9} />
              {formatDate(task.dueDate)}
            </span>
          </div>
        )}
        {showProject && task.project && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-[3px] text-[10.5px] font-medium px-1.5 py-[2px] rounded-md bg-[#EEF2FF] dark:bg-[#1C1D2E] text-[#6366F1] dark:text-[#818CF8] max-w-full">
              <FolderOpen size={9} className="shrink-0" />
              <span className="truncate">{task.project.name}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Droppable cell — one per (column × swim lane)
// ─────────────────────────────────────────────────────────────────────────────
function DropCell({
  id,
  isEmpty,
  children,
}: {
  id:       string
  isEmpty:  boolean
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-[260px] shrink-0 min-h-[72px] rounded-xl p-2 flex flex-col gap-1.5 transition-colors duration-150',
        isOver
          ? 'bg-[#EEF2FF]/70 dark:bg-[#1C1D2E]/80 ring-1 ring-inset ring-[#C7D7FD] dark:ring-[#3B4267]'
          : isEmpty
            ? 'bg-[#F4F6FB]/50 dark:bg-[#17181F]/50 border border-dashed border-[#E2E5EC] dark:border-[#23242F]'
            : 'bg-[#F4F6FB]/50 dark:bg-[#17181F]/50',
      )}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignee label — left side of each swim lane row
// ─────────────────────────────────────────────────────────────────────────────
function AssigneeLabel({
  assignee,
  taskCount,
}: {
  assignee:  { id: string; name: string; email: string } | null
  taskCount: number
}) {
  return (
    <div className="w-[200px] shrink-0 flex items-center gap-2.5 pr-4 py-1">
      {assignee ? (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-sm ring-[1.5px] ring-white dark:ring-[#17181F]">
          <span className="text-[11px] font-bold text-white leading-none">
            {assignee.name.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-[#F2F4F7] dark:bg-[#23242F] border border-dashed border-[#D0D5DD] dark:border-[#3D4258] flex items-center justify-center shrink-0">
          <UserCircle2 size={13} className="text-[#98A2B3] dark:text-[#5A6175]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate leading-tight">
          {assignee?.name ?? 'Unassigned'}
        </p>
        <p className="text-[10.5px] text-[#98A2B3] dark:text-[#5A6175] leading-tight">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column header with rename / mark-done / delete menu
// ─────────────────────────────────────────────────────────────────────────────
function ColumnHeader({
  column,
  boardId,
  totalCount,
}: {
  column:     BoardColumnWithTasks
  boardId:    string
  totalCount: number
}) {
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [renaming,  setRenaming]  = useState(false)
  const [nameInput, setNameInput] = useState(column.name)
  const [showDel,   setShowDel]   = useState(false)

  const updateColumn = useUpdateColumn()
  const deleteColumn = useDeleteColumn()

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
    setShowDel(false)
  }

  return (
    <div className="w-[260px] shrink-0">
      <div className="flex items-center gap-2 px-2">
        {column.color
          ? <span className="w-2 h-2 rounded-full shrink-0" style={{ background: column.color }} />
          : <span className="w-2 h-2 rounded-full bg-[#D0D5DD] dark:bg-[#3D4258] shrink-0" />
        }

        {renaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter')  handleRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="flex-1 text-[11px] font-semibold bg-transparent border-b border-[#6366F1] outline-none text-[#344054] dark:text-[#C2C8D8] uppercase tracking-[0.06em]"
          />
        ) : (
          <span
            onClick={() => setRenaming(true)}
            className="flex-1 text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-[0.06em] truncate cursor-pointer hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            {column.name}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {column.isDone && (
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40">
              <Check size={8} className="text-[#10B981]" />
            </span>
          )}
          <span
            className="text-[10.5px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
            style={column.color
              ? { background: `${column.color}20`, color: column.color }
              : { background: 'rgb(233 236 240)', color: '#667085' }
            }
          >
            {totalCount}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[#E9ECF0] dark:hover:bg-[#23242F] transition-colors"
            >
              <MoreHorizontal size={11} className="text-[#98A2B3]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E1F2A] border border-[#E8EAEF] dark:border-[#2A2B37] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-50 py-1.5">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#26273A] transition-colors"
                >
                  <Pencil size={11} className="text-[#667085]" /> Rename
                </button>
                <button
                  onClick={handleMarkDone}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#26273A] transition-colors"
                >
                  <Check size={11} className="text-[#667085]" />
                  {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
                </button>
                <div className="my-1 border-t border-[#F2F4F7] dark:border-[#26273A]" />
                <button
                  onClick={() => { setMenuOpen(false); setShowDel(true) }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-[#2D1B1B] transition-colors"
                >
                  <Trash2 size={11} /> Delete column
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDel && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
          <div className="glass-modal rounded-2xl w-full max-w-sm">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FEF3F2] dark:bg-[#2D1B1B] flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-[#F04438]" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Delete column?</p>
                  <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1">
                    <span className="font-medium text-[#344054] dark:text-[#C2C8D8]">"{column.name}"</span> will be permanently deleted. Tasks move to Inbox.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDel(false)}
                  className="flex-1 h-9 text-[13px] border border-[#EAECF0] dark:border-[#26283A] rounded-lg text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteColumn.isPending}
                  className="flex-1 h-9 text-[13px] bg-[#F04438] hover:bg-[#D92D20] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {deleteColumn.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline quick-add at the bottom of each droppable cell
// ─────────────────────────────────────────────────────────────────────────────
function AddTaskInCell({
  columnId,
  assigneeId,
}: {
  columnId:   string
  assigneeId: string | null
}) {
  const [adding,    setAdding]    = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const createTask = useCreateTask()

  async function handleAdd() {
    const title = taskTitle.trim()
    if (!title) { setAdding(false); return }
    await createTask.mutateAsync({ title, columnId, assigneeId: assigneeId || null })
    setTaskTitle('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="group flex items-center gap-1 w-full mt-0.5 py-1 px-1 rounded-md text-[11px] text-[#B0B8C8] dark:text-[#3D4258] hover:text-[#6366F1] dark:hover:text-[#818CF8] hover:bg-[#EEF2FF]/60 dark:hover:bg-[#1C1D2E]/60 transition-colors duration-150"
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center rounded bg-[#E9ECF0] dark:bg-[#23242F] group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1C1D2E] transition-colors">
          <Plus size={9} className="text-[#98A2B3] group-hover:text-[#6366F1] dark:group-hover:text-[#818CF8] transition-colors" />
        </span>
        Add task
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1C1D27] rounded-lg border border-[#E8EAEF] dark:border-[#26273A] p-2 mt-0.5 flex flex-col gap-1.5">
      <input
        autoFocus
        value={taskTitle}
        onChange={e => setTaskTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  handleAdd()
          if (e.key === 'Escape') { setAdding(false); setTaskTitle('') }
        }}
        placeholder="Task title..."
        className="form-input text-[12px] h-7 w-full"
      />
      <div className="flex gap-1">
        <button
          onClick={handleAdd}
          disabled={createTask.isPending}
          className="flex-1 btn-primary text-[11px] h-6 flex items-center justify-center gap-1 disabled:opacity-60"
        >
          {createTask.isPending ? <Loader2 size={9} className="animate-spin" /> : 'Add'}
        </button>
        <button
          onClick={() => { setAdding(false); setTaskTitle('') }}
          className="flex-1 text-[11px] h-6 border border-[#E8EAEF] dark:border-[#26273A] rounded-lg text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component — JIRA-style swim lane board
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskBoardView({ boardId, projectId, listUrl }: Props) {
  const { taskId }   = useParams<{ taskId?: string }>()
  const navigate     = useNavigate()
  const updateTask   = useUpdateTask()
  const createColumn = useCreateColumn()

  const { data: board, isLoading } = useTaskBoard(boardId)
  const { data: inboxTasks = [] }  = useTasks({ projectId })

  const inboxTasks_ = inboxTasks.filter(t => t.columnId === null)

  const [activeTask,   setActiveTask]   = useState<Task | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName,   setNewColName]   = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Collect swim lanes: one per unique assignee (in order of first appearance), then Unassigned.
  // Uses task.assignee relation when available; falls back to assigneeId for tasks from the board
  // endpoint if the relation wasn't populated (e.g. stale cache before backend fix lands).
  const swimLanes = useMemo(() => {
    const allTasks = board
      ? [...board.columns.flatMap(c => c.tasks), ...inboxTasks_]
      : inboxTasks_

    const seenIds     = new Set<string>()
    const assigneeMap = new Map<string, { id: string; name: string; email: string }>()

    // Prefer fully-populated assignee objects; register what we find
    allTasks.forEach(t => {
      if (t.assignee && !assigneeMap.has(t.assignee.id)) {
        assigneeMap.set(t.assignee.id, t.assignee)
      }
    })

    // Also track tasks that have assigneeId but no populated relation yet
    allTasks.forEach(t => {
      if (t.assigneeId && !assigneeMap.has(t.assigneeId)) {
        assigneeMap.set(t.assigneeId, { id: t.assigneeId, name: '…', email: '' })
      }
    })

    const lanes: { id: string | null; assignee: { id: string; name: string; email: string } | null }[] = []
    assigneeMap.forEach((assignee, id) => {
      if (!seenIds.has(id)) {
        seenIds.add(id)
        lanes.push({ id, assignee })
      }
    })

    lanes.push({ id: null, assignee: null })
    return lanes
  }, [board, inboxTasks_])

  function taskBelongsToLane(t: Task, assigneeId: string | null): boolean {
    const aid = t.assigneeId ?? t.assignee?.id ?? null
    return assigneeId === null ? !aid : aid === assigneeId
  }

  function getColumnTasks(colId: string, assigneeId: string | null): Task[] {
    if (!board) return []
    const col = board.columns.find(c => c.id === colId)
    if (!col) return []
    return col.tasks.filter(t => taskBelongsToLane(t, assigneeId))
  }

  function getInboxTasks(assigneeId: string | null): Task[] {
    return inboxTasks_.filter(t => taskBelongsToLane(t, assigneeId))
  }

  function laneTaskCount(assigneeId: string | null): number {
    const boardCount = (board?.columns ?? []).reduce(
      (sum, col) => sum + getColumnTasks(col.id, assigneeId).length,
      0,
    )
    return boardCount + getInboxTasks(assigneeId).length
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveTask(e.active.data.current?.task ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const task = active.data.current?.task as Task | undefined
    if (!task) return

    // over.id format: "drop:{colId}:{assigneeId|NULL}"
    const str = String(over.id)
    if (!str.startsWith('drop:')) return

    const targetColId = str.split(':')[1]
    if (!targetColId || task.columnId === targetColId) return

    await updateTask.mutateAsync({ id: task.id, columnId: targetColId })
  }

  async function handleAddColumn() {
    const name = newColName.trim()
    if (!name) { setAddingColumn(false); return }
    await createColumn.mutateAsync({ boardId, name })
    setNewColName('')
    setAddingColumn(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
      </div>
    )
  }

  if (!board) return null

  const columns     = board.columns
  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-6 -mx-1 px-1 scrollbar-thin">
          <div className="w-max">

            {/* ── Column headers row ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#EAECF0] dark:border-[#1E1F29]">
              {/* Spacer for assignee column */}
              <div className="w-[200px] shrink-0" />

              {/* Inbox header */}
              <div className="w-[260px] shrink-0 flex items-center gap-2 px-2">
                <span className="w-2 h-2 rounded-full bg-[#D0D5DD] dark:bg-[#3D4258] shrink-0" />
                <span className="flex-1 text-[11px] font-semibold text-[#98A2B3] dark:text-[#5A6175] uppercase tracking-[0.06em]">
                  Inbox
                </span>
                <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums bg-[#E9ECF0] dark:bg-[#23242F] text-[#98A2B3] dark:text-[#5A6175]">
                  {inboxTasks_.length}
                </span>
              </div>

              {/* Column headers with management */}
              {columns.map(col => (
                <ColumnHeader
                  key={col.id}
                  column={col}
                  boardId={boardId}
                  totalCount={col.tasks.length}
                />
              ))}

              {/* Add column */}
              <div className="shrink-0 pl-2">
                {addingColumn ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  handleAddColumn()
                        if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') }
                      }}
                      placeholder="Column name..."
                      className="form-input text-[12px] h-7 w-32"
                    />
                    <button onClick={handleAddColumn} className="btn-primary text-[11px] h-7 px-2.5">Add</button>
                    <button
                      onClick={() => { setAddingColumn(false); setNewColName('') }}
                      className="text-[11px] h-7 px-2.5 border border-[#E8EAEF] dark:border-[#23242F] rounded-lg text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="group flex items-center gap-1.5 text-[11.5px] text-[#A8B0BE] dark:text-[#4B5268] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors px-2 py-1 rounded-lg hover:bg-[#EEF2FF]/60 dark:hover:bg-[#1C1D2E]/80"
                  >
                    <span className="w-5 h-5 flex items-center justify-center rounded-md bg-[#E9ECF0] dark:bg-[#23242F] group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1C1D2E] transition-colors">
                      <Plus size={11} className="text-[#667085] group-hover:text-[#6366F1] transition-colors" />
                    </span>
                    Add column
                  </button>
                )}
              </div>
            </div>

            {/* ── Swim lane rows ──────────────────────────────────────────── */}
            {swimLanes.map((lane, idx) => {
              const inboxLaneTasks = getInboxTasks(lane.id)
              const totalCount     = laneTaskCount(lane.id)

              return (
                <div
                  key={lane.id ?? '__unassigned__'}
                  className={cn(
                    'flex items-start gap-3 py-3',
                    idx < swimLanes.length - 1 && 'border-b border-[#F0F2F7] dark:border-[#1A1B23]',
                  )}
                >
                  {/* Assignee label */}
                  <AssigneeLabel assignee={lane.assignee} taskCount={totalCount} />

                  {/* Inbox cell — read-only, no drop */}
                  <div className="w-[260px] shrink-0 min-h-[72px] rounded-xl p-2 bg-[#F4F6FB]/30 dark:bg-[#17181F]/30 border border-dashed border-[#E2E5EC] dark:border-[#23242F] flex flex-col gap-1.5">
                    {inboxLaneTasks.map(task => (
                      <div key={task.id} className="opacity-60">
                        <SwimLaneCard task={task} onClick={() => navigate(`${listUrl}/${task.id}`)} disabled showProject={!projectId} />
                      </div>
                    ))}
                    {inboxLaneTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center min-h-[48px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E0E4EF] dark:bg-[#2A2B37]" />
                      </div>
                    )}
                  </div>

                  {/* Column cells — droppable */}
                  {columns.map(col => {
                    const cellId    = `drop:${col.id}:${lane.id ?? 'NULL'}`
                    const cellTasks = getColumnTasks(col.id, lane.id)

                    return (
                      <DropCell key={col.id} id={cellId} isEmpty={cellTasks.length === 0}>
                        {cellTasks.map(task => (
                          <SwimLaneCard
                            key={task.id}
                            task={task}
                            onClick={() => navigate(`${listUrl}/${task.id}`)}
                            showProject={!projectId}
                          />
                        ))}
                        <AddTaskInCell columnId={col.id} assigneeId={lane.id} />
                      </DropCell>
                    )
                  })}
                </div>
              )
            })}

          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && (
            <div className="rotate-[1.5deg] shadow-[0_12px_32px_rgba(99,102,241,0.22)] scale-[1.03] opacity-95 w-[260px]">
              <div
                className="bg-white dark:bg-[#16171F] rounded-lg border border-[#E9ECF0] dark:border-[#26283A] px-3 py-2.5"
                style={activeTask.column?.color
                  ? { borderLeftColor: activeTask.column.color, borderLeftWidth: '3px' }
                  : undefined
                }
              >
                <p className="text-[12.5px] font-medium text-[#0F1728] dark:text-[#E8EAF0] leading-[1.4]">
                  {activeTask.title}
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskSlideIn
        open={slideInOpen}
        taskId={slideInId}
        defaultProjectId={projectId}
        listUrl={listUrl}
      />
    </>
  )
}
