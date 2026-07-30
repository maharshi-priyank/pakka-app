import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type HistoryEntryKind = 'email' | 'message' | 'meeting'

export interface HistoryEntry {
  id:         string
  kind:       HistoryEntryKind
  occurredAt: string
  title:      string
  body:       string | null
  status?:    string
  error?:     string | null
  direction?: string
}

interface HistoryPage {
  items: HistoryEntry[]
  total: number
  page:  number
  limit: number
}

const PAGE_LIMIT = 20

export function useContactHistory(contactId: string | null) {
  return useInfiniteQuery<HistoryPage>({
    queryKey:   ['contacts', contactId, 'history'],
    queryFn:    ({ pageParam }) =>
      api
        .get(`/contacts/${contactId}/history`, { params: { page: pageParam, limit: PAGE_LIMIT } })
        .then(r => r.data.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetchedSoFar = lastPage.page * lastPage.limit
      return fetchedSoFar < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: !!contactId,
  })
}
