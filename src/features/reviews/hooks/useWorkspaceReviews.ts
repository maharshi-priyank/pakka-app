import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface WorkspaceReview {
  id: string
  authorName: string | null
  authorEmail: string
  rating: number | null
  body: string | null
  submittedAt: string | null
  project: { id: string; name: string }
}

export interface ReviewStats {
  averageRating: number | null
  totalCount: number
}

export function useWorkspaceReviews() {
  return useQuery({
    queryKey: ['workspace-reviews'],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkspaceReview[] }>('/reviews/workspace')
      return data.data
    },
  })
}

export function useReviewStats() {
  return useQuery({
    queryKey: ['workspace-review-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReviewStats }>('/reviews/workspace/stats')
      return data.data
    },
  })
}
