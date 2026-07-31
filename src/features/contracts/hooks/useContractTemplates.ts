import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ContractTemplate } from '../schemas/contract.schema'
import type { Contract } from '../schemas/contract.schema'
import { CONTRACTS_QUERY_KEY } from './useContracts'

const TEMPLATES_KEY = 'contract-templates'

export function useContractTemplates() {
  return useQuery<ContractTemplate[]>({
    queryKey:  [TEMPLATES_KEY],
    queryFn:   () => api.get<{ data: ContractTemplate[] }>('/contract-templates').then(r => r.data.data),
    staleTime: 60_000,
  })
}

export function useContractTemplate(id: string | null) {
  return useQuery<ContractTemplate>({
    queryKey:  [TEMPLATES_KEY, id],
    queryFn:   () => api.get<{ data: ContractTemplate }>(`/contract-templates/${id}`).then(r => r.data.data),
    enabled:   !!id,
    staleTime: 60_000,
  })
}

export function useCreateContractTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; category?: string; content: object; totalAmount?: number }) =>
      api.post<{ data: ContractTemplate }>('/contract-templates', dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template created')
    },
    onError: () => toast.error('Failed to create template'),
  })
}

export function useUpdateContractTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; description?: string; category?: string; content?: object; totalAmount?: number }) =>
      api.patch<{ data: ContractTemplate }>(`/contract-templates/${id}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template updated')
    },
    onError: () => toast.error('Failed to update template'),
  })
}

export function useDeleteContractTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contract-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template deleted')
    },
    onError: () => toast.error('Failed to delete template'),
  })
}

export function useSaveContractAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, ...dto }: { contractId: string; name: string; description?: string; category?: string }) =>
      api.post<{ data: ContractTemplate }>(`/contract-templates/from-contract/${contractId}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template saved')
    },
    onError: () => toast.error('Failed to save template'),
  })
}

export function useIncrementContractTemplateUsage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/contract-templates/${id}/use`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}

// New — no Proposal equivalent (Proposal templates are virtual constants
// with no mutable `isDefault` state, KTD2). Sets this template as the
// workspace's default Contract template; the backend un-defaults whichever
// template previously held the flag.
export function useSetDefaultContractTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: ContractTemplate }>(`/contract-templates/${id}/set-default`).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Default template updated')
    },
    onError: () => toast.error('Failed to set default template'),
  })
}

// New — R8/KTD7/KTD8. Re-applies a different template's boilerplate clauses
// onto an existing, still-editable Contract. Invalidates the Contracts query
// key so `useContract(id)` refetches and the editor reflects the new content.
export function useReapplyContractTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contractId, templateId }: { contractId: string; templateId: string }) =>
      api.post<{ data: Contract }>(`/contracts/${contractId}/reapply-template`, { templateId }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] })
      toast.success('Template re-applied')
    },
    onError: () => toast.error('Failed to re-apply template'),
  })
}
