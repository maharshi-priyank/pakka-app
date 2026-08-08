import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

export interface PublicService {
  id: string
  icon: string
  name: string
  description: string
  tags: string[]
  priceFrom: number
  deliveryDays: number
}

export interface PublicPortfolioItem {
  id: string
  title: string
  category: string
  outcome: string
  tags: string[]
  thumbnailUrl: string | null
  liveUrl: string | null
}

export interface PublicReview {
  id: string
  authorName: string | null
  rating: number
  body: string | null
  submittedAt: string | null
  project: { name: string }
}

export interface PublicProfileData {
  username: string
  name: string
  businessName: string | null
  logoUrl: string | null
  createdAt: string
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
  reviews?: PublicReview[]
  averageRating?: number | null
  reviewCount?: number
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data } = await publicApi.get<{ data: PublicProfileData }>(`/public-profiles/${username}`)
      return data.data
    },
    retry: false,
  })
}

export interface SubmitEnquiryPayload {
  senderName: string
  senderPhone?: string
  senderEmail?: string
  budget?: string
  serviceNeeded?: string
  brief?: string
}

export function useSubmitEnquiry(username: string) {
  return useMutation({
    mutationFn: async (payload: SubmitEnquiryPayload) => {
      const { data } = await publicApi.post(`/public-profiles/${username}/enquire`, payload)
      return data.data
    },
  })
}
