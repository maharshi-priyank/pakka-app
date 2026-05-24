import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface UserProfile {
  id:                string
  email:             string
  name:              string
  plan:              'FREE' | 'SOLO' | 'STUDIO'
  planExpiresAt:     string | null
  businessName:      string | null
  businessType:      string | null
  gstNumber:         string | null
  panNumber:         string | null
  logoUrl:           string | null
  bankName:          string | null
  bankAccountName:   string | null
  bankAccountNumber: string | null
  bankIfsc:          string | null
  upiId:                    string | null
  googleCalendarConnected:  boolean
  createdAt:                string
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
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated)
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
