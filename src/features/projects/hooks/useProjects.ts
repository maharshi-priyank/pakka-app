import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

export interface ProjectClient {
  id:      string
  name:    string
  company: string | null
  email?:  string | null
}

export interface ProjectCount {
  proposals:   number
  contracts:   number
  invoices:    number
  timeEntries: number
  expenses:    number
}

export interface Project {
  id:          string
  userId:      string
  clientId:    string | null
  name:        string
  description: string | null
  status:      ProjectStatus
  budget:      string | null
  startDate:   string | null
  endDate:     string | null
  archivedAt:  string | null
  createdAt:   string
  updatedAt:   string
  client:              ProjectClient | null
  _count?:             ProjectCount
  invoiced?:           number
  collected?:          number
  shareRateWithClient: boolean
}

export interface ProjectDetail extends Project {
  proposals: {
    id: string; title: string; status: string
    totalAmount: string; createdAt: string; acceptedAt: string | null
  }[]
  contracts: {
    id: string; title: string; status: string
    createdAt: string; sentAt: string | null; signedAt: string | null
  }[]
  invoices: {
    id: string; invoiceNumber: string; status: string
    total: string; amountPaid: string; dueDate: string | null; createdAt: string; paidAt: string | null
  }[]
  timeEntries: {
    id: string; description: string; date: string
    durationMins: number; hourlyRate: string | null; isBilled: boolean
  }[]
  expenses: {
    id: string; description: string; category: string
    amount: string; date: string; isBillable: boolean; isBilled: boolean
  }[]
}

export interface ProjectStats {
  invoiced:      number
  collected:     number
  outstanding:   number
  totalHours:    number
  billableValue: number
  expenseTotal:  number
  profit:        number
  budget:        number | null
  budgetUsed:    number | null
}

export interface ProjectsResponse {
  projects:   Project[]
  total:      number
  page:       number
  totalPages: number
}

export interface CreateProjectInput {
  name:                 string
  description?:         string
  clientId?:            string
  status?:              ProjectStatus
  budget?:              number
  startDate?:           string
  endDate?:             string
  shareRateWithClient?: boolean
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string
}

const KEYS = {
  all:   ['projects'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list:  (params: object) => [...KEYS.lists(), params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  stats:  (id: string) => [...KEYS.all, 'stats',  id] as const,
}

export function useProjects(params?: {
  search?:          string
  status?:          ProjectStatus
  clientId?:        string
  page?:            number
  limit?:           number
  includeArchived?: boolean
}) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn:  async () => {
      const { data } = await api.get<{ data: ProjectsResponse }>('/projects', { params })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  async () => {
      const { data } = await api.get<{ data: ProjectDetail }>(`/projects/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: KEYS.stats(id),
    queryFn:  async () => {
      const { data } = await api.get<{ data: ProjectStats }>(`/projects/${id}/stats`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data } = await api.post<{ data: Project }>('/projects', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateProjectInput) => {
      const { data } = await api.patch<{ data: Project }>(`/projects/${id}`, rest)
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}

export function useArchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${id}/archive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
    onError: (err: Error) => toast.error(err.message || 'Failed to archive project'),
  })
}

export function useUnarchiveProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/projects/${id}/unarchive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
    onError: (err: Error) => toast.error(err.message || 'Failed to unarchive project'),
  })
}
