import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface GoogleFormsSetup {
  webhookUrl:     string
  scriptSnippet:  string
}

export function useConnectGoogleForms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<GoogleFormsSetup> => {
      const { data } = await api.post<{ data: GoogleFormsSetup }>('/google-forms/connect')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['google-forms-setup'] })
      toast.success('Google Forms connected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDisconnectGoogleForms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/google-forms/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.removeQueries({ queryKey: ['google-forms-setup'] })
      toast.success('Google Forms disconnected')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useGoogleFormsSetup(enabled: boolean) {
  return useQuery({
    queryKey: ['google-forms-setup'],
    queryFn:  async (): Promise<GoogleFormsSetup> => {
      const { data } = await api.get<{ data: GoogleFormsSetup }>('/google-forms/setup')
      return data.data
    },
    enabled,
    staleTime: Infinity,
  })
}
