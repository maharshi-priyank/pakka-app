import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function useConnectClickUp() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/clickup/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDisconnectClickUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/clickup/disconnect'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['profile'] }),
    onError:    (err: Error) => toast.error(err.message),
  })
}

interface SyncResult {
  projects:    number
  timeEntries: number
  clients:     number
}

export function useSyncClickUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { synced: SyncResult } }>('/clickup/sync')
      return data.data.synced
    },
    onSuccess: (result) => {
      toast.success(
        `Synced ${result.projects} projects, ${result.timeEntries} time entries, ${result.clients} clients from ClickUp`
      )
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['time-entries'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

interface ClickUpList {
  id:        string
  name:      string
  spaceName: string
}

interface ClickUpMemberPreview {
  id:       string
  username: string
  email:    string
}

export function useClickUpPreview(enabled: boolean) {
  return useQuery({
    queryKey: ['clickup-preview'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: { lists: ClickUpList[]; members: ClickUpMemberPreview[] } }>('/clickup/preview')
      return data.data
    },
    enabled,
    staleTime: 60_000,
  })
}
