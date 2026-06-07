import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface ProjectNote {
  id:        string
  projectId: string
  content:   string
  createdAt: string
  updatedAt: string
}

export function useProjectNotes(projectId: string) {
  return useQuery<ProjectNote[]>({
    queryKey: ['project-notes', projectId],
    queryFn:  () => api.get(`/projects/${projectId}/notes`).then(r => r.data.data),
    enabled:  !!projectId,
  })
}

export function useCreateProjectNote(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/projects/${projectId}/notes`, { content }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-notes', projectId] })
    },
    onError: () => toast.error('Failed to save note'),
  })
}

export function useDeleteProjectNote(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) =>
      api.delete(`/projects/${projectId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-notes', projectId] })
      toast.success('Note deleted')
    },
    onError: () => toast.error('Failed to delete note'),
  })
}
