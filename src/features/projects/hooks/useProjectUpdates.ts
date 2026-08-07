import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface ProjectUpdate {
  id:        string
  projectId: string
  authorId:  string
  content:   string
  createdAt: string
  updatedAt: string
  author: {
    id:    string
    name:  string
    email: string
  }
}

export function useProjectUpdates(projectId: string) {
  return useQuery<ProjectUpdate[]>({
    queryKey: ['project-updates', projectId],
    queryFn:  () => api.get(`/projects/${projectId}/updates`).then(r => r.data.data),
    enabled:  !!projectId,
  })
}

export function useCreateProjectUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/projects/${projectId}/updates`, { content }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-updates', projectId] })
    },
    onError: () => toast.error('Failed to post update'),
  })
}

export function useDeleteProjectUpdate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updateId: string) =>
      api.delete(`/projects/${projectId}/updates/${updateId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-updates', projectId] })
      toast.success('Update deleted')
    },
    onError: () => toast.error('Failed to delete update'),
  })
}
