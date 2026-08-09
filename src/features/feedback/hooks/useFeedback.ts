import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type FeedbackType = 'BUG' | 'FEATURE' | 'GENERAL' | 'COMPLAINT'

export interface SubmitFeedbackInput {
  type: FeedbackType
  subject: string
  message?: string
}

async function submitFeedback(input: SubmitFeedbackInput): Promise<{ id: string }> {
  const { data } = await api.post<{ id: string }>('/feedback', input)
  return data
}

export function useFeedback() {
  return useMutation({
    mutationFn: submitFeedback,
  })
}
