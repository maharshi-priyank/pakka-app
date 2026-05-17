import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Lead, LeadsListResponse, LeadStage } from '../schemas/lead.schema'
import type { CreateLeadInput, UpdateLeadInput } from '../schemas/lead.schema'

interface LeadsParams {
  page?:   number
  limit?:  number
  search?: string
  stage?:  LeadStage
}

async function fetchLeads(params: LeadsParams = {}): Promise<LeadsListResponse> {
  const { data } = await api.get<{ data: LeadsListResponse }>('/leads', { params })
  return data.data
}

async function fetchLead(id: string): Promise<Lead> {
  const { data } = await api.get<{ data: Lead }>(`/leads/${id}`)
  return data.data
}

async function createLead(input: CreateLeadInput): Promise<Lead> {
  const payload = {
    ...input,
    budget: input.budget ? Number(input.budget) : undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    company: input.company || undefined,
    service: input.service || undefined,
    notes: input.notes || undefined,
    followUpAt: input.followUpAt || undefined,
  }
  const { data } = await api.post<{ data: Lead }>('/leads', payload)
  return data.data
}

async function updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
  const payload = {
    ...input,
    budget: input.budget ? Number(input.budget) : undefined,
    email: input.email || undefined,
    phone: input.phone || undefined,
    company: input.company || undefined,
    service: input.service || undefined,
    notes: input.notes || undefined,
    followUpAt: input.followUpAt || undefined,
  }
  const { data } = await api.patch<{ data: Lead }>(`/leads/${id}`, payload)
  return data.data
}

async function updateLeadStage(id: string, stage: LeadStage): Promise<Lead> {
  const { data } = await api.patch<{ data: Lead }>(`/leads/${id}/stage`, { stage })
  return data.data
}

async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`)
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export const LEADS_QUERY_KEY = 'leads'

export function useLeads(params: LeadsParams = {}) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, params],
    queryFn:  () => fetchLeads(params),
    staleTime: 30_000,
  })
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, id],
    queryFn:  () => fetchLead(id!),
    enabled:  !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }); toast.success('Lead added') },
    onError: (err: Error) => toast.error(err.message || 'Failed to add lead'),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateLeadInput & { id: string }) => updateLead(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }); toast.success('Lead updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update lead'),
  })
}

export function useUpdateLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => updateLeadStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to update stage'),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] }); toast.success('Lead deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete lead'),
  })
}
