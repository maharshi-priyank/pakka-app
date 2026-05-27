import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

// Resolved at build time from VITE_* env vars — empty string = disabled
const LICENSE_KEY  = import.meta.env.VITE_NEW_RELIC_LICENSE_KEY  ?? ''
const APP_ID       = import.meta.env.VITE_NEW_RELIC_APP_ID        ?? ''
const ACCOUNT_ID   = import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID    ?? ''
const TRUST_KEY    = import.meta.env.VITE_NEW_RELIC_TRUST_KEY     ?? ACCOUNT_ID

let agent: BrowserAgent | null = null

/**
 * Call once before React mounts.
 * No-op when env vars are absent so dev/local environments are unaffected.
 */
export function initNewRelic(): void {
  if (!LICENSE_KEY || !APP_ID || !ACCOUNT_ID) return

  agent = new BrowserAgent({
    init: {
      distributed_tracing:  { enabled: true },
      privacy:               { cookies_enabled: true },
      browser_consent_mode:  { enabled: false },
      ajax: {
        deny_list:       ['bam.nr-data.net'],
        capture_payloads: 'none' as never,
      },
      performance: {
        capture_marks:    false,
        capture_measures: true,
      },
    },
    info: {
      beacon:        'bam.nr-data.net',
      errorBeacon:   'bam.nr-data.net',
      licenseKey:    LICENSE_KEY,
      applicationID: APP_ID,
      sa:            1,
    },
    loader_config: {
      accountID:     ACCOUNT_ID,
      trustKey:      TRUST_KEY,
      agentID:       APP_ID,
      licenseKey:    LICENSE_KEY,
      applicationID: APP_ID,
    },
  })
}

/** Report a caught JS error to New Relic Errors Inbox */
export function noticeError(error: Error, attributes?: Record<string, string | number | boolean>): void {
  agent?.noticeError(error, attributes)
}

/** Tag the current page view (called on route change) */
export function setCurrentRouteName(name: string): void {
  agent?.setCurrentRouteName(name)
}

/** Attach a custom attribute to all subsequent events in this session */
export function setCustomAttribute(key: string, value: string | number | boolean): void {
  agent?.setCustomAttribute(key, value)
}

/** Record a custom event visible in NRQL queries */
export function recordCustomEvent(eventType: string, attributes: Record<string, string | number | boolean>): void {
  agent?.recordCustomEvent(eventType, attributes)
}
