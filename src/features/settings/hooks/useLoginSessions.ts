import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type LoginDeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface LoginSession {
  id: string
  deviceName: string
  deviceType: LoginDeviceType
  browser: string
  os: string
  ipAddress: string | null
  location: string | null
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

interface SessionsResponse {
  data: {
    sessions: LoginSession[]
  }
}

const sessionsQueryKey = ['auth', 'sessions'] as const

export function useLoginSessions() {
  return useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const { data } = await api.get<SessionsResponse>('/auth/sessions')
      return data.data.sessions
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}

export function useRevokeLoginSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.delete<{ data: { revoked: true } }>(`/auth/sessions/${sessionId}`)
      return data.data
    },
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<LoginSession[]>(sessionsQueryKey, current =>
        current?.filter(session => session.id !== sessionId),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  })
}

export function useRevokeOtherLoginSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { revoked: number } }>('/auth/sessions/revoke-others')
      return data.data
    },
    onSuccess: () => {
      queryClient.setQueryData<LoginSession[]>(sessionsQueryKey, current =>
        current?.filter(session => session.isCurrent),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsQueryKey }),
  })
}
