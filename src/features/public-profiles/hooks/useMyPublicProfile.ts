import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { PublicService, PublicPortfolioItem } from './usePublicProfile'

export interface MyPublicProfile {
  publicUsername: string | null
  publicProfileEnabled: boolean
  publicUsernameChanged: boolean
  publicBio: string | null
  publicCity: string | null
  publicWhatsapp: string | null
  publicLanguages: string[]
  publicSkills: string[]
  publicServices: PublicService[]
  publicPortfolio: PublicPortfolioItem[]
  publicAccentColor: string
  statsProjectsCompleted: number
  statsTotalEarned: number
  statsRepeatClientPct: number
  statsAcceptanceRate: number
  statsAvgResponseHrs: number
  statsLastCalculatedAt: string | null
  name: string
  businessName: string | null
  logoUrl: string | null
  createdAt: string
}

export function useMyPublicProfile() {
  return useQuery({
    queryKey: ['my-public-profile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyPublicProfile }>('/public-profiles/me')
      return data.data
    },
    staleTime: 2 * 60_000,
  })
}

export function useUpdateMyPublicProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<MyPublicProfile> & { publicUsername?: string }) => {
      const { data } = await api.patch<{ data: MyPublicProfile }>('/public-profiles/me', payload)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(['my-public-profile'], updated)
      toast.success('Profile saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRecalculateMyStats() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/public-profiles/me/recalculate')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-public-profile'] })
      toast.success('Stats refreshed')
    },
  })
}
