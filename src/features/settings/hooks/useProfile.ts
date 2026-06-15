import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Workspace } from './useWorkspaces'

export interface UserProfile {
  id:                string
  email:             string
  name:              string
  plan:              'FREE' | 'SOLO' | 'STUDIO'
  planExpiresAt:     string | null
  subscriptionStatus: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED'
  cashfreeSubscriptionId: string | null
  cashfreePlanId:    string | null
  billingAnchorDate: string | null
  businessName:      string | null
  businessType:      string | null
  gstNumber:         string | null
  panNumber:         string | null
  logoUrl:           string | null
  bankName:          string | null
  bankAccountName:   string | null
  bankAccountNumber: string | null
  bankIfsc:          string | null
  upiId:                   string | null
  upiQrUrl:                string | null
  googleCalendarConnected: boolean
  outlookConnected:        boolean
  clickUpConnected:        boolean
  clickUpWorkspaceId:      string | null
  flodeskConnected:        boolean
  canvaConnected:          boolean
  googleFormsConnected:    boolean
  googleDocsConnected:     boolean
  googleSheetsConnected:   boolean
  googleSheetsId:          string | null
  createdAt:               string
  defaultHsnSac:           string | null
  defaultLutNumber:        string | null
  razorpayKeyId:           string | null
  razorpayKeySecret:       string | null
  onboardingComplete:      boolean
  country:                 string | null
  currency:                string | null
  taxLabel:                string | null
  ibanNumber:              string | null
  swiftCode:               string | null
  routingNumber:           string | null
  activeWorkspaceId:       string | null
  activeWorkspace:         (Omit<Workspace, 'role'> & { razorpayKeyId?: string | null }) | null
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: UserProfile }>('/users/me')
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>) => {
      const { data } = await api.patch<{ data: UserProfile }>('/users/me', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useRedeemPromo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<{ data: { plan: string; expiresAt: string } }>('/users/redeem-promo', { code })
      return data.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success(`Upgraded to ${data.plan} plan — valid for 30 days!`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUploadLogo() {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `logos/${user.id}/logo.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Bust cache by appending timestamp
      return `${data.publicUrl}?t=${Date.now()}`
    },
  })
}

export function useUploadUpiQr() {
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `upi-qr/${user.id}/qr.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return `${data.publicUrl}?t=${Date.now()}`
    },
  })
}
