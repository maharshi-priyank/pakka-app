// pakka-app/src/features/tasks/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type TaskStatus = 'TODO' | 'COMPLETED'

export interface TaskProject {
  id:     string
  name:   string
  client: { id: string; name: string } | null
}

export interface Task {
  id:          string
  userId:      string
  title:       string
  status:      TaskStatus
  dueDate:     string | null
  includeTime: boolean
  isPrivate:   boolean
  projectId:   string | null
  project:     TaskProject | null
  createdAt:   string
  updatedAt:   string
  columnId:    string | null
  position:    number
}

export interface CreateTaskInput {
  title:        string
  dueDate?:     string | null
  includeTime?: boolean
  isPrivate?:   boolean
  projectId?:   string | null
  columnId?:    string | null
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id:        string
  status?:   TaskStatus
  columnId?: string | null
  position?: number
}

const KEYS = {
  all:    ['tasks'] as const,
  lists:  () => [...KEYS.all, 'list'] as const,
  list:   (params: object) => [...KEYS.lists(), params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useTasks(params?: {
  status?:    TaskStatus
  projectId?: string
  search?:    string
}) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn:  async () => {
      const { data } = await api.get<{ data: Task[] }>('/tasks', { params })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn:  async () => {
      const { data } = await api.get<{ data: Task }>(`/tasks/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post<{ data: Task }>('/tasks', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateTaskInput) => {
      const { data } = await api.patch<{ data: Task }>(`/tasks/${id}`, rest)
      return data.data
    },
    onSuccess: (_, { id, columnId }) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      if (columnId !== undefined) {
        qc.invalidateQueries({ queryKey: ['task-boards'] })
      }
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}
