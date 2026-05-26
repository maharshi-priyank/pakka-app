import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function usePush() {
  const { session } = useAuthStore()
  const [permission, setPermission] = useState<PushPermission>(() =>
    isSupported() ? (Notification.permission as PushPermission) : 'unsupported',
  )
  const [subscribed, setSubscribed] = useState<boolean>(false)
  const [busy, setBusy] = useState(false)

  // Check current subscription status on mount
  useEffect(() => {
    if (!isSupported()) return
    let alive = true
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (alive) setSubscribed(!!sub)
      } catch { /* ignore */ }
    })()
    return () => { alive = false }
  }, [])

  /** Ask the user for permission and persist the subscription on the server. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported() || !session) return false
    setBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      if (result !== 'granted') return false

      const reg = await navigator.serviceWorker.ready

      // Reuse existing subscription if present
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const { data } = await api.get<{ data: { publicKey: string | null } }>(
          '/notifications/push/public-key',
        )
        const publicKey = data.data.publicKey
        if (!publicKey) return false

        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

      await api.post('/notifications/push/subscribe', {
        endpoint:  json.endpoint,
        keys:      { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      })

      setSubscribed(true)
      return true
    } finally {
      setBusy(false)
    }
  }, [session])

  /** Unsubscribe locally and on the server. */
  const disable = useCallback(async (): Promise<void> => {
    if (!isSupported()) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe().catch(() => {})
        await api.delete('/notifications/push/subscribe', { data: { endpoint } }).catch(() => {})
      }
      setSubscribed(false)
    } finally {
      setBusy(false)
    }
  }, [])

  /** Trigger a server-side test push (uses the current user's subscriptions). */
  const sendTest = useCallback(async (): Promise<void> => {
    await api.post('/notifications/push/test')
  }, [])

  return {
    isSupported: isSupported(),
    permission,
    subscribed,
    busy,
    enable,
    disable,
    sendTest,
  }
}
