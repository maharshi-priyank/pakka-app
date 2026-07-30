import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ph } from '@/lib/posthog'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useUiStore } from '@/store/uiStore'
import type {
  Proposal,
  ProposalListResponse,
  ProposalStatus,
  CreateProposalInput,
  UpdateProposalInput,
} from '../schemas/proposal.schema'

interface ProposalsParams {
  page?:            number
  limit?:           number
  status?:          ProposalStatus
  includeArchived?: boolean
}

async function fetchProposals(params: ProposalsParams = {}): Promise<ProposalListResponse> {
  const { data } = await api.get<{ data: ProposalListResponse }>('/proposals', { params })
  return data.data
}

async function fetchProposal(id: string): Promise<Proposal> {
  const { data } = await api.get<{ data: Proposal }>(`/proposals/${id}`)
  return data.data
}

async function createProposal(input: CreateProposalInput): Promise<Proposal> {
  const { data } = await api.post<{ data: Proposal }>('/proposals', input)
  return data.data
}

async function updateProposal(id: string, input: UpdateProposalInput): Promise<Proposal> {
  const { data } = await api.patch<{ data: Proposal }>(`/proposals/${id}`, input)
  return data.data
}

async function sendProposal(
  id: string,
  dto?: { otpGated?: boolean },
): Promise<{ proposal: Proposal; shareUrl: string; otp?: string | null }> {
  const { data } = await api.post<{ data: { proposal: Proposal; shareUrl: string; otp?: string | null } }>(`/proposals/${id}/send`, dto)
  return data.data
}

async function deleteProposal(id: string): Promise<void> {
  await api.delete(`/proposals/${id}`)
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export const PROPOSALS_QUERY_KEY = 'proposals'

export function useProposals(params: ProposalsParams = {}) {
  return useQuery({
    queryKey: [PROPOSALS_QUERY_KEY, params],
    queryFn:  () => fetchProposals(params),
    staleTime: 30_000,
  })
}

export function useProposal(id: string | null) {
  return useQuery({
    queryKey: [PROPOSALS_QUERY_KEY, id],
    queryFn:  () => fetchProposal(id!),
    enabled:  !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateProposal() {
  const qc = useQueryClient()
  const { openUpgradeModal } = useUiStore()
  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal created'); ph.proposalCreated() },
    onError: (err: Error & { code?: string }) => {
      if (err.code === 'PLAN_LIMIT') openUpgradeModal('proposals')
      else toast.error(err.message || 'Failed to create proposal')
    },
  })
}

export function useUpdateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProposalInput & { id: string }) => updateProposal(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update proposal'),
  })
}

export function useSendProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; otpGated?: boolean }) => sendProposal(params.id, { otpGated: params.otpGated }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal sent to client'); ph.proposalSent() },
    onError: (err: Error) => toast.error(err.message || 'Failed to send proposal'),
  })
}

export function useDeleteProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProposal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete proposal'),
  })
}

export function useArchiveProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/proposals/${id}/archive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to archive proposal'),
  })
}

export function useUnarchiveProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/proposals/${id}/unarchive`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to unarchive proposal'),
  })
}
