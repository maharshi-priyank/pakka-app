import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  page?:   number
  limit?:  number
  status?: ProposalStatus
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

async function sendProposal(id: string): Promise<{ proposal: Proposal; shareUrl: string }> {
  const { data } = await api.post<{ data: { proposal: Proposal; shareUrl: string } }>(`/proposals/${id}/send`)
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal created') },
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
    mutationFn: (id: string) => sendProposal(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [PROPOSALS_QUERY_KEY] }); toast.success('Proposal sent to client') },
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
