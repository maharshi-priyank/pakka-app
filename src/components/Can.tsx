import { type ReactNode } from 'react'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import type { Permission } from '@/types/permissions'

interface CanProps {
  permission: Permission
  children:   ReactNode
  fallback?:  ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = useWorkspacePermissions()
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}
