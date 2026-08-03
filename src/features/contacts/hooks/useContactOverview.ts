import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ContactOverviewMonth {
  month: string
  hours: number
}

export interface ContactOverview {
  totalHours:   number
  monthlyHours: ContactOverviewMonth[]
}

export function useContactOverview(contactId: string | null) {
  return useQuery<ContactOverview>({
    queryKey: ['contacts', contactId, 'overview'],
    queryFn:  () => api.get(`/contacts/${contactId}/overview`).then(r => r.data.data),
    enabled:  !!contactId,
  })
}
