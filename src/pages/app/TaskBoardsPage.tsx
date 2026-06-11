import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, X, Loader2, LayoutDashboard, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useTaskBoards,
  useCreateBoard,
  useDeleteBoard,
  type TaskBoardSummary,
} from '@/features/tasks/hooks/useTaskBoards'
import TaskBoardView from '@/features/tasks/components/TaskBoardView'

interface Props {
  projectId?: string
}

function NewBoardModal({ onClose, onSave, isPending }: {
  onClose:   () => void
  onSave:    (name: string) => void
  isPending: boolean
}) {
  const [name, setName] = useState('New Board')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => { inputRef.current?.select() }, 50)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="glass-modal rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0] dark:border-[#26283A]">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={15} className="text-[#6366F1]" />
            <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">New Board</h2>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] mb-1.5">
              Board name
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sprint 1"
              className="form-input w-full text-[13px]"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 text-[13px] border border-[#EAECF0] dark:border-[#26283A] rounded-lg text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex-1 h-9 btn-primary text-[13px] flex items-center justify-center gap-1.5"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Create board
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteBoardModal({ board, onClose, onConfirm, isPending }: {
  board:     TaskBoardSummary
  onClose:   () => void
  onConfirm: () => void
  isPending: boolean
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
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Delete board?</p>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1">
                <span className="font-medium text-[#344054] dark:text-[#C2C8D8]">"{board.name}"</span> will be permanently deleted.
                Tasks in its columns will move to Inbox.
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

export default function TaskBoardsPage({ projectId }: Props) {
  const { boardId } = useParams<{ boardId?: string }>()
  const navigate    = useNavigate()

  const baseUrl       = projectId ? `/projects/${projectId}/tasks` : '/tasks'
  const boardsBaseUrl = `${baseUrl}/task-boards`

  const { data: boards = [], isLoading } = useTaskBoards({ projectId })
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()

  const [showNewBoard,   setShowNewBoard]   = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState<TaskBoardSummary | null>(null)

  // Auto-create default board on first visit (empty boards list)
  useEffect(() => {
    if (isLoading || boards.length > 0) return
    const name = projectId ? 'Project Board' : 'My Board'
    createBoard.mutateAsync({ name, projectId: projectId ?? undefined }).then(board => {
      navigate(`${boardsBaseUrl}/${board.id}`, { replace: true })
    })
  }, [isLoading, boards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to first board if no boardId in URL
  useEffect(() => {
    if (!boardId && boards.length > 0) {
      navigate(`${boardsBaseUrl}/${boards[0].id}`, { replace: true })
    }
  }, [boardId, boards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleNewBoardSave(name: string) {
    const board = await createBoard.mutateAsync({ name, projectId: projectId ?? undefined })
    setShowNewBoard(false)
    navigate(`${boardsBaseUrl}/${board.id}`)
  }

  function handleDeleteClick(e: React.MouseEvent, board: TaskBoardSummary) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmDelete(board)
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return
    await deleteBoard.mutateAsync(confirmDelete.id)
    const remaining = boards.filter(b => b.id !== confirmDelete.id)
    setConfirmDelete(null)
    if (remaining.length > 0) {
      navigate(`${boardsBaseUrl}/${remaining[0].id}`, { replace: true })
    } else {
      navigate(boardsBaseUrl, { replace: true })
    }
  }

  if (isLoading || (boards.length === 0 && createBoard.isPending)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header + sub-nav (only in standalone global page, not inside project tab) */}
        {!projectId && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-[19px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">
                Task Boards
              </h1>
            </div>

            <div className="flex items-center gap-1 text-[13px]">
              <Link
                to="/tasks"
                className="px-3 py-1.5 rounded-lg text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
              >
                Tasks
              </Link>
              <span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
                Task Boards
              </span>
            </div>
          </>
        )}

        {/* Board tab bar */}
        <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto">
          {boards.map(board => (
            <div key={board.id} className="relative group shrink-0">
              <Link
                to={`${boardsBaseUrl}/${board.id}`}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 transition-colors',
                  board.id === boardId
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                {board.name}
                <button
                  onClick={e => handleDeleteClick(e, board)}
                  className={cn(
                    'rounded-full p-0.5 transition-colors',
                    board.id === boardId
                      ? 'opacity-60 hover:opacity-100 hover:bg-[#EEF2FF] dark:hover:bg-[#1e1f2e]'
                      : 'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-[#F2F4F7] dark:hover:bg-[#21222D]',
                  )}
                >
                  <X size={11} />
                </button>
              </Link>
            </div>
          ))}
          <button
            onClick={() => setShowNewBoard(true)}
            disabled={createBoard.isPending}
            className="flex items-center gap-1 px-3 py-2 text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors shrink-0"
          >
            {createBoard.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <Plus size={13} />
            }
            New board
          </button>
        </div>

        {/* Board view */}
        {boardId && (
          <TaskBoardView
            boardId={boardId}
            projectId={projectId}
            listUrl={`${boardsBaseUrl}/${boardId}`}
          />
        )}
      </div>

      {showNewBoard && (
        <NewBoardModal
          onClose={() => setShowNewBoard(false)}
          onSave={handleNewBoardSave}
          isPending={createBoard.isPending}
        />
      )}

      {confirmDelete && (
        <DeleteBoardModal
          board={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteConfirm}
          isPending={deleteBoard.isPending}
        />
      )}
    </>
  )
}
