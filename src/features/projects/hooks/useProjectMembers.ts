import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface ProjectMember {
  id:        string
  projectId: string
  userId:    string
  joinedAt:  string
  user: {
    id:    string
    name:  string
    email: string
  }
}

export function useProjectMembers(projectId: string) {
  return useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn:  () => api.get(`/projects/${projectId}/members`).then(r => r.data.data),
    enabled:  !!projectId,
  })
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/projects/${projectId}/members`, { userId }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Team member added')
    },
    onError: () => toast.error('Failed to add team member'),
  })
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Team member removed')
    },
    onError: () => toast.error('Failed to remove team member'),
  })
}
