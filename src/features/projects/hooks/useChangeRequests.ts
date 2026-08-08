import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ApprovalRequest {
  id: string
  kind: string
  status: string
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
}

export interface ChangeRequest {
  id: string
  projectId: string
  description: string
  status: string
  raisedByEmail: string
  freelancerNote: string | null
  createdAt: string
  updatedAt: string
  approvalRequests: ApprovalRequest[]
}

export function useChangeRequests(projectId: string) {
  return useQuery({
    queryKey: ['change-requests', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ChangeRequest[] }>(`/projects/${projectId}/change-requests`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useRequestSignoff(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${projectId}/approval-requests/signoff`)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  })
}

export function useProjectApprovalRequests(projectId: string) {
  return useQuery({
    queryKey: ['project-approval-requests', projectId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ApprovalRequest[] }>(`/projects/${projectId}/approval-requests`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useRespondChangeRequest(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      responseType,
      note,
    }: {
      id: string
      responseType: string
      note?: string
    }) => {
      const { data } = await api.post(
        `/projects/${projectId}/change-requests/${id}/respond`,
        { responseType, note },
      )
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['change-requests', projectId] }),
  })
}
