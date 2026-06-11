import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PlBasis = 'accrual' | 'cash'

export interface ProjectPl {
  revenue:         number
  expenses:        number
  grossProfit:     number
  margin:          number | null
  budget:          number | null
  budgetSpent:     number
  budgetRemaining: number | null
}

export function useProjectPl(projectId: string, basis: PlBasis) {
  return useQuery({
    queryKey: ['projects', projectId, 'pl', basis],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectPl }>(`/projects/${projectId}/pl`, {
        params: { basis },
      })
      return data.data
    },
    staleTime: 30_000,
  })
}
