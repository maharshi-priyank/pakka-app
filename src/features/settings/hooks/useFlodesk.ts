import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function useConnectFlodesk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (apiKey: string) => {
      await api.post('/flodesk/connect', { apiKey })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Flodesk connected successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDisconnectFlodesk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/flodesk/disconnect'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Flodesk disconnected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
