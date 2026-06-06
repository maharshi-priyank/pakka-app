import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Listens for service-worker updates and shows a "Reload to update" toast.
 * Auto-update mode is on (registerType: 'autoUpdate'), but we still surface
 * a toast so users in long-running sessions know to refresh for new features.
 */
export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      if (import.meta.env.DEV) console.log('[PWA] SW registered:', swUrl)
    },
    onRegisterError(err) {
      if (import.meta.env.DEV) console.warn('[PWA] SW registration error:', err)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast.message('A new version of ClearWork is ready', {
      description: 'Reload to get the latest improvements.',
      duration: Infinity,
      action: {
        label: 'Reload',
        onClick: () => updateServiceWorker(true),
      },
      onDismiss: () => setNeedRefresh(false),
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
