import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { load } from '@cashfreepayments/cashfree-js'
import { api } from '@/lib/api'

export interface SubscriptionState {
  plan: string
  subscriptionStatus: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED'
  cashfreeSubscriptionId?: string
  cashfreePlanId?: string
  billingAnchorDate?: string
  planExpiresAt?: string
}

async function fetchSubscription(): Promise<SubscriptionState> {
  const { data } = await api.get<{ data: SubscriptionState }>('/payments/subscription')
  return data.data
}

async function createSubscription(tier: 'SOLO' | 'STUDIO'): Promise<{ checkoutUrl: string }> {
  const { data } = await api.post<{ data: { checkoutUrl: string } }>('/payments/create-subscription', { tier })
  return data.data
}

async function cancelSubscription(): Promise<void> {
  await api.delete('/payments/subscription')
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn:  fetchSubscription,
  })
}

export function useCreateSubscription() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (tier: 'SOLO' | 'STUDIO') => {
      const { checkoutUrl: sessionId } = await createSubscription(tier)
      const mode = (import.meta.env.VITE_CASHFREE_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'production'
      const cashfree = await load({ mode })
      await cashfree.subscriptionsCheckout({ subsSessionId: sessionId })
      // If SDK resolves the promise (modal flow), navigate programmatically
      navigate('/billing/success')
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.')
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Subscription cancelled. Access continues until end of billing period.')
    },
    onError: () => {
      toast.error('Failed to cancel subscription. Please try again.')
    },
  })
}
