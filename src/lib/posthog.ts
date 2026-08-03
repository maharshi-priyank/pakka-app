import posthog, { type PostHogInterface } from 'posthog-js'
import { sendProductEvent, type ProductEventName, type ProductEventProperties } from './productTelemetry'

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  if (!key) return
  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    capture_pageview: false, // we fire manually on route change
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true, // mask sensitive form fields by default
      maskInputOptions: { password: true },
    },
    loaded: (instance: PostHogInterface) => {
      if (import.meta.env.DEV) instance.opt_out_capturing() // no noise from local dev
    },
  })
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits)
}

export function resetUser() {
  posthog.reset()
}

export function trackPageview(path: string) {
  posthog.capture('$pageview', { $current_url: window.location.origin + path })
}

export function track(event: string, properties?: Record<string, unknown>) {
  posthog.capture(event, properties)
}

export function trackProductEvent(event: ProductEventName, properties?: ProductEventProperties) {
  track(event, properties)
  void sendProductEvent(event, properties)
}

// ── Activation funnel ────────────────────────────────────────────────────────

export const ph = {
  leadCreated: () => trackProductEvent('lead_created'),
  leadConverted: () => trackProductEvent('lead_converted'),

  proposalCreated: () => trackProductEvent('proposal_created'),
  proposalSent: () => trackProductEvent('proposal_sent'),

  contractCreated: () => trackProductEvent('contract_created'),
  contractSent: () => trackProductEvent('contract_sent'),

  invoiceCreated: () => trackProductEvent('invoice_created'),
  invoiceSent: () => trackProductEvent('invoice_sent'),
  invoicePaid: () => trackProductEvent('invoice_paid'),

  clientPortalCopied: () => trackProductEvent('client_portal_copied'),

  projectCreated: () => trackProductEvent('project_created'),

  expenseLogged: () => trackProductEvent('expense_logged'),
  timeLogged: () => trackProductEvent('time_logged'),
}
