import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router'
import UpgradeModal from '@/components/UpgradeModal'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'

// Module-level guard — sync at most once per authenticated user ID.
// Prevents duplicate calls from getSession + onAuthStateChange both firing,
// React strict-mode double-effect, and token refreshes.
let syncedUserId: string | null = null

async function syncUserWithApi(userId: string) {
  if (syncedUserId === userId) return
  syncedUserId = userId
  try {
    await api.post('/users/me')
  } catch {
    syncedUserId = null // allow retry on next render if it failed
  }
}

export default function App() {
  const { setSession, setLoading } = useAuthStore()

  useEffect(() => {
    // getSession sets store state; onAuthStateChange handles the sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
      // INITIAL_SESSION fires on page load with existing session
      // SIGNED_IN fires on fresh login — both need the upsert
      // TOKEN_REFRESHED / USER_UPDATED / SIGNED_OUT do not
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        syncUserWithApi(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        syncedUserId = null // reset so next login syncs again
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" closeButton />
      <UpgradeModal />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
