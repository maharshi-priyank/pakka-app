import axios from 'axios'
import { supabase } from './supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data    = error.response?.data
    const message = data?.message ?? data?.error?.message ?? error.message ?? 'Something went wrong'
    const err     = new Error(message) as Error & { code?: string; status?: number }
    err.code   = data?.code
    err.status = error.response?.status
    return Promise.reject(err)
  },
)
