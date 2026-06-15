import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import type { Permission } from '@/types/permissions'

export function usePermissionRedirect(permission: Permission, redirectTo = '/dashboard') {
  const { hasPermission, permissions } = useWorkspacePermissions()
  const navigate = useNavigate()

  useEffect(() => {
    if (permissions.length > 0 && !hasPermission(permission)) {
      navigate(redirectTo, { replace: true })
    }
  }, [permissions, hasPermission, permission, navigate, redirectTo])
}
