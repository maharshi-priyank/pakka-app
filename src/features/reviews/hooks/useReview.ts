import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ReviewData {
  id: string
  token: string
  status: 'PENDING' | 'SUBMITTED'
  projectName: string
  workspaceName: string
  rating: number | null
  body: string | null
  submittedAt: string | null
}

export function useReview(token: string) {
  return useQuery({
    queryKey: ['review', token],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReviewData }>(`/reviews/token/${token}`)
      return data.data
    },
    enabled: !!token,
  })
}

export function useSubmitReview(token: string) {
  return useMutation({
    mutationFn: async (payload: { rating: number; body?: string; authorName?: string }) => {
      const { data } = await api.post(`/reviews/token/${token}/submit`, payload)
      return data.data
    },
  })
}
