import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Permission } from '@/types/permissions'

export interface WorkspaceRolePermission {
  id:         string
  roleId:     string
  permission: string
}

export interface WorkspaceRole {
  id:          string
  key:         string
  name:        string
  description: string | null
  isSystem:    boolean
  sortOrder:   number
  workspaceId: string | null
  permissions: WorkspaceRolePermission[]
  _count:      { members: number }
}

export function useWorkspacePermissions() {
  const { data: permissions = [], isPending } = useQuery({
    queryKey: ['workspace-permissions'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: Permission[] }>('/workspaces/my-permissions')
      return data.data
    },
    staleTime: 60_000,
  })

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  )

  return { permissions, hasPermission, isPending }
}

export function useWorkspaceRoles() {
  return useQuery({
    queryKey: ['workspace-roles'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: WorkspaceRole[] }>('/workspaces/roles')
      return data.data
    },
    staleTime: Infinity,
  })
}
