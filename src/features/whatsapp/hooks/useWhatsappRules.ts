import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AutomationRule } from '@/features/automations/hooks/useAutomations'

export function useWhatsappRules() {
  return useQuery({
    queryKey: ['automations', 'whatsapp'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: { whatsapp?: AutomationRule[] } }>('/automations', {
        params: { category: 'whatsapp' },
      })
      return data.data.whatsapp ?? []
    },
    staleTime: 60_000,
  })
}

export function useToggleWhatsappRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch<{ data: AutomationRule }>(`/automations/${id}`, { isActive })
      return data.data
    },
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: ['automations', 'whatsapp'] })
      const prev = qc.getQueryData<AutomationRule[]>(['automations', 'whatsapp'])
      qc.setQueryData<AutomationRule[]>(['automations', 'whatsapp'], (rules) =>
        rules?.map((r) => (r.id === id ? { ...r, isActive } : r)) ?? [],
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['automations', 'whatsapp'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['automations', 'whatsapp'] }),
  })
}
