import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useProfile } from '@/features/settings/hooks/useProfile'

export interface SubscriptionState {
  plan: string
  subscriptionStatus: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED'
  razorpaySubscriptionId?: string
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
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()

  return useMutation({
    mutationFn: async (tier: 'SOLO' | 'STUDIO') => {
      const { checkoutUrl: subscriptionId } = await createSubscription(tier)

      return new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:             import.meta.env.VITE_RAZORPAY_KEY_ID,
          subscription_id: subscriptionId,
          name:            'ClearWork',
          description:     'Monthly subscription',
          prefill: {
            name:  profile?.name  ?? '',
            email: profile?.email ?? '',
          },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_subscription_id: string
            razorpay_signature: string
          }) => {
            try {
              await api.post('/payments/razorpay/verify', {
                razorpay_payment_id:      response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature:       response.razorpay_signature,
              })
              queryClient.invalidateQueries({ queryKey: ['billing'] })
              queryClient.invalidateQueries({ queryKey: ['profile'] })
              window.location.href = '/billing/success'
              resolve()
            } catch (err) {
              reject(err)
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        })

        rzp.open()
      })
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.')
    },
  })
}

async function createStripeCheckout(tier: 'SOLO' | 'STUDIO'): Promise<{ checkoutUrl: string }> {
  const { data } = await api.post<{ data: { checkoutUrl: string } }>('/payments/stripe/checkout', { tier })
  return data.data
}

export function useCreateStripeCheckout() {
  return useMutation({
    mutationFn: async (tier: 'SOLO' | 'STUDIO') => {
      const { checkoutUrl } = await createStripeCheckout(tier)
      window.location.href = checkoutUrl
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
