import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PricingWindow {
  window: 'founding' | 'earlyaccess' | 'regular'
  windowEnds?: string
  solo:   { planId: string; price: number }
  studio: { planId: string; price: number }
}

async function fetchCurrentPricing(): Promise<PricingWindow> {
  const { data } = await api.get<{ data: PricingWindow }>('/payments/current-pricing')
  return data.data
}

export function useCurrentPricing() {
  return useQuery({
    queryKey: ['billing', 'current-pricing'],
    queryFn:  fetchCurrentPricing,
    staleTime: 5 * 60 * 1000,
  })
}
