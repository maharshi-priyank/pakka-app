import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ProposalTemplate } from '../schemas/proposal.schema'

const TEMPLATES_KEY = 'proposal-templates'

export function useProposalTemplates() {
  return useQuery<ProposalTemplate[]>({
    queryKey:  [TEMPLATES_KEY],
    queryFn:   () => api.get<{ data: ProposalTemplate[] }>('/proposal-templates').then(r => r.data.data),
    staleTime: 60_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; category?: string; content: object; totalAmount?: number }) =>
      api.post<{ data: ProposalTemplate }>('/proposal-templates', dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template created')
    },
    onError: () => toast.error('Failed to create template'),
  })
}

export function useProposalTemplate(id: string | null) {
  return useQuery<ProposalTemplate>({
    queryKey:  [TEMPLATES_KEY, id],
    queryFn:   () => api.get<{ data: ProposalTemplate }>(`/proposal-templates/${id}`).then(r => r.data.data),
    enabled:   !!id,
    staleTime: 60_000,
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; description?: string; category?: string; content?: object; totalAmount?: number }) =>
      api.patch<{ data: ProposalTemplate }>(`/proposal-templates/${id}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template updated')
    },
    onError: () => toast.error('Failed to update template'),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/proposal-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template deleted')
    },
    onError: () => toast.error('Failed to delete template'),
  })
}

export function useSaveProposalAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proposalId, ...dto }: { proposalId: string; name: string; description?: string; category?: string }) =>
      api.post<{ data: ProposalTemplate }>(`/proposal-templates/from-proposal/${proposalId}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template saved')
    },
    onError: () => toast.error('Failed to save template'),
  })
}

export function useIncrementTemplateUsage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/proposal-templates/${id}/use`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}

export interface ParsedTemplate {
  title:           string
  scopeItems:      string[]
  deliverables:    string[]
  exclusions:      string[]
  lineItems:       Array<{ description: string; qty: number; rate: number; gstRate: number }>
  paymentSchedule: Array<{ milestone: string; percentage: number }>
  pricingNotes:    string
  terms:           string
  confidence:      number
}

export function useParseTemplate() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post<{ data: ParsedTemplate }>('/ai/parse-template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data.data),
    onError: () => toast.error('Failed to parse file — ensure it is a text-based PDF or DOCX'),
  })
}
