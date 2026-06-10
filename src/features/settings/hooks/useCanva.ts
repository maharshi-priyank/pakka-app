import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface CanvaDesign {
  id:           string
  title:        string
  thumbnailUrl: string | null
  editUrl:      string
  viewUrl:      string
  createdAt:    string
  updatedAt:    string
}

export function useConnectCanva() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { authUrl: string } }>('/auth/canva/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
    onError: () => toast.error('Failed to start Canva connection. Please try again.'),
  })
}

export function useDisconnectCanva() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/canva/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.removeQueries({ queryKey: ['canva-designs'] })
      toast.success('Canva disconnected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCanvaDesigns(query?: string, enabled = true) {
  return useQuery({
    queryKey: ['canva-designs', query],
    queryFn:  async () => {
      const params = query ? `?q=${encodeURIComponent(query)}` : ''
      const { data } = await api.get<{ data: { designs: CanvaDesign[]; continuation?: string } }>(`/canva/designs${params}`)
      return data.data
    },
    enabled,
    staleTime: 2 * 60_000,
  })
}
