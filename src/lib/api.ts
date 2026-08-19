import axios from 'axios'
import { supabase } from './supabase'
import { getDeviceMetadata } from './device'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const device = getDeviceMetadata()
      config.headers.Authorization = `Bearer ${session.access_token}`
      config.headers['X-Device-Id'] = device.id
      config.headers['X-Device-Name'] = device.name
      config.headers['X-Device-Type'] = device.type
      config.headers['X-Device-Timezone'] = device.timezone
    }
  } catch {
    // Public pages can run in sandboxed iframes where auth storage is blocked.
    // Their unauthenticated API requests should continue without device data.
  }
  return config
})

let isHandlingRevokedSession = false

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const data    = error.response?.data
    const message = data?.message ?? data?.error?.message ?? error.message ?? 'Something went wrong'
    const code    = data?.code ?? data?.error?.code
    const status  = error.response?.status

    if (status === 401 && code === 'SESSION_REVOKED' && !isHandlingRevokedSession) {
      isHandlingRevokedSession = true
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // Preserve the original API error; local auth cleanup will be retried
        // on the next revoked request or explicit sign-out.
      } finally {
        isHandlingRevokedSession = false
      }
    }

    const err     = new Error(message) as Error & { code?: string; status?: number }
    err.code   = code
    err.status = status
    return Promise.reject(err)
  },
)
