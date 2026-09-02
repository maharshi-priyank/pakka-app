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
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'
import UpgradeModal from '@/components/UpgradeModal'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import PWAUpdatePrompt from '@/components/PWAUpdatePrompt'
import { setCurrentRouteName, setCustomAttribute } from '@/lib/newrelic'
import { identifyUser, resetUser, trackPageview } from '@/lib/posthog'
import { identifyOaiqUser, trackRegistrationCompleted } from '@/lib/oaiq'

// Track route changes for New Relic + PostHog SPA monitoring
router.subscribe(({ location }) => {
  setCurrentRouteName(location.pathname)
  trackPageview(location.pathname)
})

// Module-level guard — sync at most once per authenticated user ID.
// Prevents duplicate calls from getSession + onAuthStateChange both firing,
// React strict-mode double-effect, and token refreshes.
let syncedUserId: string | null = null

// Supabase has no explicit "is this a brand-new account" flag on SIGNED_IN,
// so treat first-ever sign-in (created_at ~= last_sign_in_at) as a signup —
// covers both the email-confirmation redirect and a fresh Google OAuth account.
function isFreshSignup(user: { created_at: string; last_sign_in_at?: string | null }) {
  if (!user.last_sign_in_at) return false
  const createdAt   = new Date(user.created_at).getTime()
  const lastSignIn  = new Date(user.last_sign_in_at).getTime()
  return Math.abs(lastSignIn - createdAt) < 60_000
}

function trackRegistrationIfFresh(user: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }) {
  if (!user.email || !isFreshSignup(user)) return
  const key = `oaiq_registration_tracked:${user.id}`
  if (localStorage.getItem(key)) return
  localStorage.setItem(key, '1')
  identifyOaiqUser({ email: user.email, userId: user.id }).then(trackRegistrationCompleted)
}

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
    // getSession sets store state; onAuthStateChange handles the sync.
    // Public routes (e.g. /q/:token embedded in a sandboxed iframe) still
    // mount this component -- guard against the Locks API SecurityError
    // GoTrueClient throws in that context so it doesn't surface as an
    // uncaught rejection on every embedded form view.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
      // INITIAL_SESSION fires on page load with existing session
      // SIGNED_IN fires on fresh login — both need the upsert
      // TOKEN_REFRESHED / USER_UPDATED / SIGNED_OUT do not
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        syncUserWithApi(session.user.id)
        setCustomAttribute('userId', session.user.id)
        identifyUser(session.user.id, { email: session.user.email })
      }
      if (session && event === 'SIGNED_IN') {
        trackRegistrationIfFresh(session.user)
      }
      if (event === 'SIGNED_OUT') {
        syncedUserId = null // reset so next login syncs again
        queryClient.clear()
        resetUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" closeButton />
        <UpgradeModal />
        <PWAInstallPrompt />
        <PWAUpdatePrompt />
        <ReactQueryDevtools initialIsOpen={false} />
      </WorkspaceProvider>
    </QueryClientProvider>
  )
}
