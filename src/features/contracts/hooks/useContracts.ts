import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  Contract,
  ContractListResponse,
  ContractStatus,
  CreateContractInput,
  UpdateContractInput,
  SendContractResponse,
} from '../schemas/contract.schema'

interface ContractsParams {
  page?:   number
  limit?:  number
  status?: ContractStatus
}

async function fetchContracts(params: ContractsParams = {}): Promise<ContractListResponse> {
  const { data } = await api.get<{ data: ContractListResponse }>('/contracts', { params })
  return data.data
}

async function fetchContract(id: string): Promise<Contract> {
  const { data } = await api.get<{ data: Contract }>(`/contracts/${id}`)
  return data.data
}

async function createContract(input: CreateContractInput): Promise<Contract> {
  const { data } = await api.post<{ data: Contract }>('/contracts', input)
  return data.data
}

async function createFromProposal(proposalId: string): Promise<Contract> {
  const { data } = await api.post<{ data: Contract }>(`/contracts/from-proposal/${proposalId}`)
  return data.data
}

async function updateContract(id: string, input: UpdateContractInput): Promise<Contract> {
  const { data } = await api.patch<{ data: Contract }>(`/contracts/${id}`, input)
  return data.data
}

async function sendContract(id: string): Promise<SendContractResponse> {
  const { data } = await api.post<{ data: SendContractResponse }>(`/contracts/${id}/send`)
  return data.data
}

async function deleteContract(id: string): Promise<void> {
  await api.delete(`/contracts/${id}`)
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export const CONTRACTS_QUERY_KEY = 'contracts'

export function useContracts(params: ContractsParams = {}) {
  return useQuery({
    queryKey: [CONTRACTS_QUERY_KEY, params],
    queryFn:  () => fetchContracts(params),
    staleTime: 30_000,
  })
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: [CONTRACTS_QUERY_KEY, id],
    queryFn:  () => fetchContract(id!),
    enabled:  !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createContract,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] }); toast.success('Contract created') },
    onError: (err: Error) => toast.error(err.message || 'Failed to create contract'),
  })
}

export function useCreateContractFromProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createFromProposal,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] }); toast.success('Contract created from proposal') },
    onError: (err: Error) => toast.error(err.message || 'Failed to create contract'),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateContractInput & { id: string }) => updateContract(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] }); toast.success('Contract updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update contract'),
  })
}

export function useSendContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sendContract(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] }); toast.success('Contract sent for signing') },
    onError: (err: Error) => toast.error(err.message || 'Failed to send contract'),
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CONTRACTS_QUERY_KEY] }); toast.success('Contract deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete contract'),
  })
}
