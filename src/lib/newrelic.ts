// The New Relic SPA agent is loaded via CDN in index.html and exposes window.newrelic.
// All calls here are safe no-ops when the agent is absent (ad-blockers, SSR, etc).

interface NrAgent {
  noticeError(error: Error | string, attributes?: Record<string, string | number | boolean>): void
  setCurrentRouteName(name: string): void
  setCustomAttribute(key: string, value: string | number | boolean): void
  addPageAction(name: string, attributes?: Record<string, string | number | boolean>): void
  recordCustomEvent(eventType: string, attributes?: Record<string, string | number | boolean>): void
}

declare global {
  interface Window { newrelic?: NrAgent }
}

function nr(): NrAgent | undefined {
  return window.newrelic
}

// Called in main.tsx — nothing to init, agent starts from index.html
export function initNewRelic(): void { /* no-op: CDN loader handles init */ }

/** Report a caught error to New Relic Errors Inbox */
export function noticeError(error: Error, attributes?: Record<string, string | number | boolean>): void {
  nr()?.noticeError(error, attributes)
}

/** Tag the current SPA route for page view grouping */
export function setCurrentRouteName(name: string): void {
  nr()?.setCurrentRouteName(name)
}

/** Attach a custom attribute to all events in this session (e.g. userId) */
export function setCustomAttribute(key: string, value: string | number | boolean): void {
  nr()?.setCustomAttribute(key, value)
}

/** Record a named custom event queryable via NRQL */
export function recordCustomEvent(eventType: string, attributes?: Record<string, string | number | boolean>): void {
  nr()?.recordCustomEvent(eventType, attributes)
}
