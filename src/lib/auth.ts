import { api } from './api'
import { supabase } from './supabase'

/**
 * Ends only the session in this browser. Revoking the tracked backend session
 * first keeps Login Management accurate; local Supabase cleanup still happens
 * when that best-effort request cannot reach the API.
 */
export async function signOutCurrentDevice() {
  try {
    await api.delete('/auth/sessions/current')
  } catch {
    // The device may already be revoked, or the user may be offline. Local
    // credentials must still be removed in both cases.
  }

  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw error
}
