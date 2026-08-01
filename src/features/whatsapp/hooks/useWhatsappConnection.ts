import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface WhatsappConnectionStatus {
  connected:    boolean
  displayPhone?: string
  connectedAt?:  string
}

export function useWhatsappConnection() {
  return useQuery({
    queryKey: ['whatsapp-status'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: WhatsappConnectionStatus }>('/whatsapp/status')
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useConnectWhatsapp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{ data: { connected: boolean; displayPhone: string } }>('/whatsapp/connect', { code })
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  })
}

export function useDisconnectWhatsapp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/whatsapp/connect')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-status'] }),
  })
}
