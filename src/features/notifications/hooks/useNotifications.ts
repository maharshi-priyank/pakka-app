import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AppNotification {
  id:         string
  userId:     string
  type:       string
  title:      string
  body:       string
  entityId:   string | null
  entityType: string | null
  read:       boolean
  createdAt:  string
}

interface UnreadCountResponse {
  count: number
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey:       ['notifications'],
    queryFn:        () => api.get('/notifications').then(r => r.data.data),
    refetchInterval: 300_000,
    staleTime:      300_000,
  })
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey:        ['notifications', 'unread-count'],
    queryFn:         () =>
      api.get<{ data: UnreadCountResponse }>('/notifications/unread-count')
        .then(r => r.data.data.count),
    refetchInterval: 300_000,
    staleTime:       300_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
