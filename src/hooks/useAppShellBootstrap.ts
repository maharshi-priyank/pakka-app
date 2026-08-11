import { useProfile } from '@/features/settings/hooks/useProfile'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { useWorkspaces } from '@/features/settings/hooks/useWorkspaces'

/** Shell-level data the sidebar, workspace switcher, and bottom nav all need. */
export function useAppShellBootstrap() {
  const profile     = useProfile()
  const permissions = useWorkspacePermissions()
  const workspaces  = useWorkspaces()

  const isReady = !profile.isPending && !permissions.isPending && !workspaces.isPending

  return { isReady }
}
