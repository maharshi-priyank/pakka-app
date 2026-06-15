import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface Workspace {
  id:              string
  name:            string
  logoUrl:         string | null
  businessName:    string | null
  country:         string | null
  currency:        string | null
  createdAt:       string
  role:            'OWNER' | 'MEMBER'
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: Workspace[] }>('/workspaces')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useSwitchWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await api.patch('/users/me/active-workspace', { workspaceId })
      return workspaceId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => toast.error('Failed to switch workspace'),
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<Workspace, 'id' | 'createdAt' | 'role'>>) => {
      const { data } = await api.patch<{ data: Workspace }>(`/workspaces/${workspaceId}`, payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Workspace updated')
    },
    onError: () => toast.error('Failed to update workspace'),
  })
}
