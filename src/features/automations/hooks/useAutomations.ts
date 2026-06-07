import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AutomationRule {
  id:            string
  key:           string
  name:          string
  description:   string | null
  category:      string
  triggerEvent:  string
  triggerConfig: Record<string, unknown>
  actionType:    string
  actionConfig:  Record<string, unknown>
  isActive:      boolean
  isSystem:      boolean
  lastRunAt:     string | null
  runCount:      number
  createdAt:     string
  _count?:       { executions: number }
}

export interface AutomationExecution {
  id:         string
  ruleId:     string
  entityId:   string | null
  entityType: string | null
  status:     'SUCCESS' | 'FAILED' | 'SKIPPED'
  error:      string | null
  metadata:   Record<string, unknown> | null
  firedAt:    string
}

export type GroupedAutomations = Record<string, AutomationRule[]>

export const CATEGORY_LABELS: Record<string, string> = {
  invoice:  'Invoice Automations',
  proposal: 'Proposal Automations',
  contract: 'Contract Automations',
  lead:     'Lead Automations',
  business: 'Business & Reminders',
}

export const CATEGORY_ORDER = ['invoice', 'proposal', 'contract', 'lead', 'business']

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: GroupedAutomations }>('/automations')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useToggleAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch<{ data: AutomationRule }>(`/automations/${id}`, { isActive })
      return data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<GroupedAutomations>(['automations'], (prev) => {
        if (!prev) return prev
        return Object.fromEntries(
          Object.entries(prev).map(([cat, rules]) => [
            cat,
            rules.map((r) => (r.id === updated.id ? { ...r, isActive: updated.isActive } : r)),
          ]),
        )
      })
    },
  })
}

export function useGenerateAutomation() {
  return useMutation({
    mutationFn: async (prompt: string) => {
      const { data } = await api.post<{ data: { rules: AutomationRule[] } }>('/automations/ai-generate', { prompt })
      return data.data.rules
    },
  })
}

export function useCreateFromAI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rules: Partial<AutomationRule>[]) => {
      const { data } = await api.post<{ data: unknown[] }>('/automations/ai-create', { rules })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useAutomationExecutions(ruleId: string) {
  return useQuery({
    queryKey: ['automations', ruleId, 'executions'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: AutomationExecution[] }>(`/automations/${ruleId}/executions`)
      return data.data
    },
    staleTime: 30_000,
    enabled:   !!ruleId,
  })
}
