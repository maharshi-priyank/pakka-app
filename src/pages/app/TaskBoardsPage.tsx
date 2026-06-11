import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useTaskBoards,
  useCreateBoard,
  useDeleteBoard,
} from '@/features/tasks/hooks/useTaskBoards'
import TaskBoardView from '@/features/tasks/components/TaskBoardView'

interface Props {
  projectId?: string
}

export default function TaskBoardsPage({ projectId }: Props) {
  const { boardId } = useParams<{ boardId?: string }>()
  const navigate    = useNavigate()

  const baseUrl       = projectId ? `/projects/${projectId}/tasks` : '/tasks'
  const boardsBaseUrl = `${baseUrl}/task-boards`

  const { data: boards = [], isLoading } = useTaskBoards({ projectId })
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()

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

  async function handleNewBoard() {
    const name = prompt('Board name:', 'New Board')
    if (!name?.trim()) return
    const board = await createBoard.mutateAsync({ name: name.trim(), projectId: projectId ?? undefined })
    navigate(`${boardsBaseUrl}/${board.id}`)
  }

  async function handleDeleteBoard(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this board? Tasks will move to Inbox.')) return
    await deleteBoard.mutateAsync(id)
    const remaining = boards.filter(b => b.id !== id)
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
                onClick={e => handleDeleteBoard(e, board.id)}
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
          onClick={handleNewBoard}
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
  )
}
