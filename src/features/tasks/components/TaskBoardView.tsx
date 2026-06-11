import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Loader2, Inbox } from 'lucide-react'
import { useTasks, useUpdateTask, type Task } from '../hooks/useTasks'
import {
  useTaskBoard,
  useUpdateColumn,
  useCreateColumn,
  type BoardColumnWithTasks,
} from '../hooks/useTaskBoards'
import TaskCard from './TaskCard'
import BoardColumnCard from './BoardColumnCard'
import TaskSlideIn from './TaskSlideIn'

interface Props {
  boardId:    string
  projectId?: string
  listUrl:    string
}

function SortableCard({
  task,
  onClick,
  showProject,
}: {
  task: Task
  onClick: () => void
  showProject?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${task.id}`,
    data: { type: 'card', task },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} showProject={showProject} />
    </div>
  )
}

function SortableColumn({
  column,
  boardId,
  onCardClick,
  showProject,
}: {
  column: BoardColumnWithTasks
  boardId: string
  onCardClick: (id: string) => void
  showProject?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${column.id}`,
    data: { type: 'column', column },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      <BoardColumnCard
        column={column}
        boardId={boardId}
        onCardClick={onCardClick}
        showProject={showProject}
      />
    </div>
  )
}

export default function TaskBoardView({ boardId, projectId, listUrl }: Props) {
  const { taskId }   = useParams<{ taskId?: string }>()
  const navigate     = useNavigate()
  const updateTask   = useUpdateTask()
  const updateColumn = useUpdateColumn()
  const createColumn = useCreateColumn()

  const { data: board, isLoading } = useTaskBoard(boardId)
  const { data: inboxTasks = [] }  = useTasks({ projectId })

  const unassigned = inboxTasks.filter(t => t.columnId === null)

  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName,   setNewColName]   = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const colIds = board?.columns.map(c => `col:${c.id}`) ?? []

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData   = over.data.current

    if (activeData?.type === 'column' && overData?.type === 'column') {
      const cols     = board!.columns
      const newIndex = cols.findIndex(c => `col:${c.id}` === over.id)
      if (newIndex === -1) return
      await updateColumn.mutateAsync({
        boardId,
        colId: activeData.column.id,
        position: newIndex,
      })
      return
    }

    if (activeData?.type === 'card') {
      const taskId      = activeData.task.id
      const overId      = String(over.id)
      const targetColId = overId.startsWith('col:')
        ? overId.replace('col:', '')
        : (overData?.task?.columnId ?? null)

      if (targetColId === null) return // dragging into inbox not allowed
      await updateTask.mutateAsync({ id: taskId, columnId: targetColId })
    }
  }

  async function handleAddColumn() {
    const name = newColName.trim()
    if (!name) { setAddingColumn(false); return }
    await createColumn.mutateAsync({ boardId, name })
    setNewColName('')
    setAddingColumn(false)
  }

  function openTask(id: string) {
    navigate(`${listUrl}/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
      </div>
    )
  }

  if (!board) return null

  const allTasks    = [...board.columns.flatMap(c => c.tasks), ...unassigned]
  const activeCard  = activeId?.startsWith('card:')
    ? allTasks.find(t => `card:${t.id}` === activeId)
    : null

  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {/* Inbox — virtual read-only column */}
          <div className="flex flex-col bg-[#F8F9FB] dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] w-[280px] shrink-0 max-h-[calc(100vh-220px)]">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <Inbox size={13} className="text-[#98A2B3]" />
              <span className="flex-1 text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8]">Inbox</span>
              <span className="text-[11px] text-[#98A2B3] bg-[#F2F4F7] dark:bg-[#21222D] px-1.5 py-0.5 rounded-full">
                {unassigned.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3 min-h-[40px]">
              <SortableContext
                items={unassigned.map(t => `card:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {unassigned.map(task => (
                  <SortableCard
                    key={task.id}
                    task={task}
                    onClick={() => openTask(task.id)}
                    showProject={!projectId}
                  />
                ))}
              </SortableContext>
              {unassigned.length === 0 && (
                <p className="text-[11px] text-[#D0D5DD] text-center py-4">No unassigned tasks</p>
              )}
            </div>
          </div>

          {/* Real columns */}
          <SortableContext items={colIds} strategy={horizontalListSortingStrategy}>
            {board.columns.map(col => (
              <SortableContext
                key={col.id}
                items={col.tasks.map(t => `card:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <SortableColumn
                  column={col}
                  boardId={boardId}
                  onCardClick={openTask}
                  showProject={!projectId}
                />
              </SortableContext>
            ))}
          </SortableContext>

          {/* Add column */}
          <div className="shrink-0 w-[280px]">
            {addingColumn ? (
              <div className="bg-[#F8F9FB] dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-3 flex flex-col gap-2">
                <input
                  autoFocus
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') }
                  }}
                  placeholder="Column name..."
                  className="form-input text-[13px] h-8"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddColumn} className="flex-1 btn-primary text-[12px] h-7">
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColName('') }}
                    className="flex-1 text-[12px] h-7 border border-[#EAECF0] dark:border-[#26283A] rounded-md text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 text-[13px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors px-1 py-2"
              >
                <Plus size={14} /> Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-1 shadow-lg opacity-90">
              <TaskCard task={activeCard} onClick={() => {}} showProject={!projectId} />
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
