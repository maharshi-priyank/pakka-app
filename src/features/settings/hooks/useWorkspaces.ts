import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface Workspace {
  id:              string
  name:            string
  logoUrl:         string | null
  businessName:    string | null
  businessType:    string | null
  gstNumber:       string | null
  panNumber:       string | null
  country:         string | null
  currency:        string | null
  taxLabel:        string | null
  bankName:        string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankIfsc:        string | null
  upiId:           string | null
  upiQrUrl:        string | null
  ibanNumber:      string | null
  swiftCode:       string | null
  routingNumber:   string | null
  defaultHsnSac:   string | null
  defaultLutNumber: string | null
  emailSignature:  string | null
  monthlyRevenueGoal: number | null
  createdAt:       string
  role:     'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  roleId:   string
  roleName: string
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: Workspace[] }>('/workspaces')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<{ data: { id: string; name: string } }>('/workspaces', { name })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Workspace created')
    },
    onError: () => toast.error('Failed to create workspace'),
  })
}

export function useSwitchWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      await api.patch('/users/me/active-workspace', { workspaceId })
      return workspaceId
    },
    onSuccess: () => {
      // Workspace switch is a complete context change — every cached entity
      // belongs to the old workspace. Invalidate all queries so every list,
      // detail, and dashboard re-fetches against the new activeWorkspaceId.
      qc.invalidateQueries()
    },
    onError: () => toast.error('Failed to switch workspace'),
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<Workspace, 'id' | 'createdAt' | 'role' | 'roleId' | 'roleName'>>) => {
      const { data } = await api.patch<{ data: Workspace }>(`/workspaces/${workspaceId}`, payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Workspace updated')
    },
    onError: () => toast.error('Failed to update workspace'),
  })
}
