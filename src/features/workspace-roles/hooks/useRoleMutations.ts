import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { WorkspaceRole } from '@/features/settings/hooks/useWorkspacePermissions'

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: { name: string; description?: string; copyFromRoleId?: string }): Promise<WorkspaceRole> =>
      api.post('/workspace-roles', dto).then(r => r.data.data),
    onSuccess: () => {
      toast.success('Role created')
      qc.invalidateQueries({ queryKey: ['workspace-roles'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create role')
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }): Promise<WorkspaceRole> =>
      api.patch(`/workspace-roles/${id}`, { name, description }).then(r => r.data.data),
    onSuccess: () => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['workspace-roles'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update role')
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspace-roles/${id}`),
    onSuccess: () => {
      toast.success('Role deleted')
      qc.invalidateQueries({ queryKey: ['workspace-roles'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to delete role')
    },
  })
}

export function useSetRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }): Promise<WorkspaceRole> =>
      api.put(`/workspace-roles/${id}/permissions`, { permissions }).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-roles'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to update permissions')
    },
  })
}
