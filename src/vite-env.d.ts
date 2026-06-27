/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // New Relic Browser — all optional; agent is disabled when absent
  readonly VITE_RAZORPAY_KEY_ID: string
  // New Relic Browser — all optional; agent is disabled when absent
  readonly VITE_NEW_RELIC_LICENSE_KEY?: string
  readonly VITE_NEW_RELIC_APP_ID?: string
  readonly VITE_NEW_RELIC_ACCOUNT_ID?: string
  readonly VITE_NEW_RELIC_TRUST_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
