import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ThreadSummary {
  id:            string
  subject:       string | null
  client:        { id: string; name: string; email: string }
  latestMessage: { id: string; senderType: 'FREELANCER' | 'CLIENT'; body: string; createdAt: string } | null
  unreadCount:   number
  updatedAt:     string
}

export interface Message {
  id:             string
  threadId:       string
  senderType:     'FREELANCER' | 'CLIENT'
  body:           string
  attachmentType: 'PROPOSAL' | 'INVOICE' | 'CONTRACT' | null
  attachmentId:   string | null
  readAt:         string | null
  createdAt:      string
}

export interface ThreadDetail {
  thread:   { id: string; subject: string | null }
  messages: Message[]
  client:   { id: string; name: string; email: string } | null
}

export function useThreads() {
  return useQuery<ThreadSummary[]>({
    queryKey:        ['messages', 'threads'],
    queryFn:         () => api.get('/messages').then(r => r.data.data),
    refetchInterval: 30_000,
    staleTime:       10_000,
  })
}

export function useThread(clientId: string | null) {
  return useQuery<ThreadDetail>({
    queryKey:        ['messages', 'thread', clientId],
    queryFn:         () => api.get(`/messages/${clientId}`).then(r => r.data.data),
    enabled:         !!clientId,
    refetchInterval: 8_000,
    staleTime:       4_000,
  })
}

export function useMessageUnreadCount() {
  return useQuery<number>({
    queryKey: ['messages', 'unread-count'],
    queryFn:  () =>
      api.get<{ data: { count: number } }>('/messages/unread-count').then(r => r.data.data.count),
    refetchInterval: 30_000,
    staleTime:       15_000,
  })
}

export function useSendMessage(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { body: string; subject?: string; attachmentType?: string; attachmentId?: string }) =>
      api.post(`/messages/${clientId}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'thread', clientId] })
      qc.invalidateQueries({ queryKey: ['messages', 'threads'] })
      qc.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

export function useMarkThreadRead(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/messages/${clientId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'threads'] })
      qc.invalidateQueries({ queryKey: ['messages', 'unread-count'] })
    },
  })
}

// ── Portal hooks (token-based, no JWT) ──────────────────────────────────────

export interface PortalThreadData {
  thread:       { id: string; subject: string | null }
  messages:     Message[]
  businessName: string
}

export function usePortalThread(token: string) {
  return useQuery<PortalThreadData>({
    queryKey:        ['portal', 'messages', token],
    queryFn:         () => api.get(`/portal/${token}/messages`).then(r => r.data.data),
    refetchInterval: 10_000,
    staleTime:       5_000,
  })
}

export function useSendPortalReply(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/portal/${token}/messages`, { body }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'messages', token] }),
  })
}

export function useMarkPortalRead(token: string) {
  return useMutation({
    mutationFn: () => api.patch(`/portal/${token}/messages/read`),
  })
}
