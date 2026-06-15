import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface TeamMember {
  id:        string
  name:      string
  email:     string
  createdAt: string
  roleId:    string
  roleKey:   string
  roleName:  string
}

export interface TeamInvite {
  id:        string
  email:     string
  createdAt: string
  expiresAt: string
}

export interface TeamData {
  members: TeamMember[]
  invites: TeamInvite[]
}

export function useTeam() {
  return useQuery<TeamData>({
    queryKey: ['team'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: TeamData }>('/team')
      return data.data
    },
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, roleId }: { email: string; roleId?: string }) =>
      api.post('/team/invite', { email, roleId }).then(r => r.data),
    onSuccess: () => {
      toast.success('Invite sent')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to send invite')
    },
  })
}

export function useCancelInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/team/invite/${id}`),
    onSuccess: () => {
      toast.success('Invite cancelled')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/team/member/${id}`),
    onSuccess: () => {
      toast.success('Team member removed')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to remove member')
    },
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      api.patch(`/team/member/${memberId}/role`, { roleId }).then(r => r.data),
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['team'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update role')
    },
  })
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) => api.post(`/team/accept/${token}`),
  })
}

export interface InvitePreview {
  inviteeEmail: string
  senderName:   string
}

export function useInvitePreview(token: string) {
  return useQuery<InvitePreview>({
    queryKey:  ['invite-preview', token],
    queryFn:   async () => {
      const { data } = await api.get<{ data: InvitePreview }>(`/team/invite-preview/${token}`)
      return data.data
    },
    enabled:   !!token,
    retry:     false,
  })
}
