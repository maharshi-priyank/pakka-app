// pakka-app/src/features/tasks/hooks/useTaskBoards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Task } from './useTasks'

export interface BoardColumn {
  id:       string
  boardId:  string
  name:     string
  position: number
  isDone:   boolean
  color:    string | null
}

export interface BoardColumnWithTasks extends BoardColumn {
  tasks: Task[]
}

export interface TaskBoard {
  id:        string
  userId:    string
  projectId: string | null
  name:      string
  position:  number
  columns:   BoardColumnWithTasks[]
  createdAt: string
  updatedAt: string
}

export interface TaskBoardSummary {
  id:         string
  name:       string
  position:   number
  projectId:  string | null
  archivedAt: string | null
  createdAt:  string
}

export interface CreateBoardInput {
  name:       string
  projectId?: string
}

export interface UpdateBoardInput {
  id:        string
  name?:     string
  position?: number
}

export interface CreateColumnInput {
  boardId: string
  name:    string
  isDone?: boolean
  color?:  string
}

export interface UpdateColumnInput {
  boardId:   string
  colId:     string
  name?:     string
  position?: number
  isDone?:   boolean
  color?:    string
}

const KEYS = {
  all:    ['task-boards'] as const,
  lists:  () => [...KEYS.all, 'list'] as const,
  list:   (params: object) => [...KEYS.lists(), params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useTaskBoards(params?: { projectId?: string; includeArchived?: boolean }) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn: async () => {
      const { data } = await api.get<{ data: TaskBoardSummary[] }>('/task-boards', { params })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useTaskBoard(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: TaskBoard }>(`/task-boards/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data } = await api.post<{ data: TaskBoard }>('/task-boards', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateBoardInput) => {
      const { data } = await api.patch<{ data: TaskBoardSummary }>(`/task-boards/${id}`, rest)
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/task-boards/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, ...rest }: CreateColumnInput) => {
      const { data } = await api.post<{ data: BoardColumn }>(`/task-boards/${boardId}/columns`, rest)
      return data.data
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
    },
  })
}

export function useUpdateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, colId, ...rest }: UpdateColumnInput) => {
      const { data } = await api.patch<{ data: BoardColumn }>(
        `/task-boards/${boardId}/columns/${colId}`,
        rest,
      )
      return data.data
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
    },
  })
}

export function useDeleteColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, colId }: { boardId: string; colId: string }) => {
      await api.delete(`/task-boards/${boardId}/columns/${colId}`)
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useArchiveBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/task-boards/${id}/archive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
    onError: (err: Error) => toast.error(err.message || 'Failed to archive board'),
  })
}

export function useUnarchiveBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/task-boards/${id}/unarchive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
    onError: (err: Error) => toast.error(err.message || 'Failed to unarchive board'),
  })
}
