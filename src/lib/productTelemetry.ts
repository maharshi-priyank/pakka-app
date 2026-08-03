import { api } from './api'

export const PRODUCT_EVENT_NAMES = [
  'session_started',
  'onboarding_completed',
  'lead_created',
  'lead_converted',
  'proposal_created',
  'proposal_sent',
  'contract_created',
  'contract_sent',
  'contract_signed',
  'invoice_created',
  'invoice_sent',
  'invoice_paid',
  'project_created',
  'expense_logged',
  'time_logged',
  'client_portal_copied',
  'subscription_activated',
  'subscription_payment_succeeded',
  'subscription_payment_failed',
  'subscription_cancelled',
  'subscription_paused',
] as const

export type ProductEventName = typeof PRODUCT_EVENT_NAMES[number]
export type ProductEventProperties = Record<string, string | number | boolean>

const ATTRIBUTION_KEY = 'clearwork_signup_attribution_v1'

function clean(value: string | null, maxLength: number) {
  if (!value) return undefined
  const normalized = Array.from(value)
    .filter(character => {
      const code = character.charCodeAt(0)
      return code > 0x1f && code !== 0x7f
    })
    .join('')
    .trim()
    .slice(0, maxLength)
  return normalized || undefined
}

export function captureSignupAttribution(searchParams?: URLSearchParams) {
  const params = searchParams ?? new URLSearchParams(window.location.search)
  const existing = getSignupAttribution()
  const attribution = {
    acquisitionSource: clean(params.get('utm_source'), 80) ?? existing.acquisitionSource ?? 'unknown',
    acquisitionMedium: clean(params.get('utm_medium'), 80) ?? existing.acquisitionMedium,
    acquisitionCampaign: clean(params.get('utm_campaign'), 120) ?? existing.acquisitionCampaign,
    acquisitionContent: clean(params.get('utm_content'), 120) ?? existing.acquisitionContent,
    acquisitionTerm: clean(params.get('utm_term'), 120) ?? existing.acquisitionTerm,
  }
  try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)) } catch { /* storage is optional */ }
  return attribution
}

export function getSignupAttribution(): {
  acquisitionSource: string
  acquisitionMedium?: string
  acquisitionCampaign?: string
  acquisitionContent?: string
  acquisitionTerm?: string
} {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        acquisitionSource: typeof parsed.acquisitionSource === 'string' ? parsed.acquisitionSource : 'unknown',
        acquisitionMedium: typeof parsed.acquisitionMedium === 'string' ? parsed.acquisitionMedium : undefined,
        acquisitionCampaign: typeof parsed.acquisitionCampaign === 'string' ? parsed.acquisitionCampaign : undefined,
        acquisitionContent: typeof parsed.acquisitionContent === 'string' ? parsed.acquisitionContent : undefined,
        acquisitionTerm: typeof parsed.acquisitionTerm === 'string' ? parsed.acquisitionTerm : undefined,
      }
    }
  } catch { /* storage is optional */ }
  return { acquisitionSource: 'unknown' }
}

export function clearSignupAttribution() {
  try { sessionStorage.removeItem(ATTRIBUTION_KEY) } catch { /* storage is optional */ }
}

function makeIdempotencyKey() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Fire-and-forget first-party telemetry; customer workflows never await this request. */
export async function sendProductEvent(
  eventName: ProductEventName,
  properties?: ProductEventProperties,
): Promise<void> {
  try {
    await api.post('/product-events', {
      eventName,
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      idempotencyKey: makeIdempotencyKey(),
      properties,
    })
  } catch {
    // Analytics is best-effort. The action that triggered it has already succeeded.
  }
}
