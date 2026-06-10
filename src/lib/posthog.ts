import posthog from 'posthog-js'

export function initPostHog() {
  posthog.init('phc_xSXNoxHAsWWSdrFotWYZoaDKJ4MK9j2WvDoDXrNMMKdc', {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false, // we fire manually on route change
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true, // mask sensitive form fields by default
      maskInputOptions: { password: true },
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing() // no noise from local dev
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

// ── Activation funnel ────────────────────────────────────────────────────────

export const ph = {
  leadCreated: () => track('lead_created'),
  leadConverted: () => track('lead_converted'),

  proposalCreated: () => track('proposal_created'),
  proposalSent: () => track('proposal_sent'),

  contractCreated: () => track('contract_created'),
  contractSent: () => track('contract_sent'),

  invoiceCreated: () => track('invoice_created'),
  invoiceSent: () => track('invoice_sent'),
  invoicePaid: () => track('invoice_paid'),

  clientPortalCopied: () => track('client_portal_copied'),

  projectCreated: () => track('project_created'),

  expenseLogged: () => track('expense_logged'),
  timeLogged: () => track('time_logged'),
}
