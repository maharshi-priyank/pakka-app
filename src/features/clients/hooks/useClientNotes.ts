import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface ClientNote {
  id:        string
  clientId:  string
  content:   string
  createdAt: string
  updatedAt: string
}

export function useClientNotes(clientId: string) {
  return useQuery<ClientNote[]>({
    queryKey: ['client-notes', clientId],
    queryFn:  () => api.get(`/clients/${clientId}/notes`).then(r => r.data.data),
    enabled:  !!clientId,
  })
}

export function useCreateClientNote(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/clients/${clientId}/notes`, { content }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes', clientId] })
    },
    onError: () => toast.error('Failed to save note'),
  })
}

export function useDeleteClientNote(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) =>
      api.delete(`/clients/${clientId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-notes', clientId] })
      toast.success('Note deleted')
    },
    onError: () => toast.error('Failed to delete note'),
  })
}
