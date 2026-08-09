import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface EntitlementSummary {
  plan: 'FREE' | 'SOLO' | 'STUDIO'
  usage: { clients: number; projects: number; activeLeads: number; teamMembers: number; storageBytes: number }
  limits: { clients: number | null; projects: number | null; activeLeads: number | null; teamMembers: number | null; storageBytes: number | null }
  overLimit: Record<string, boolean>
  trialEndsAt?: string | null
  subscriptionStatus: string
}

export function useEntitlementSummary() {
  return useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => (await api.get<{ data: EntitlementSummary }>('/payments/usage')).data.data,
    staleTime: 30_000,
  })
}
