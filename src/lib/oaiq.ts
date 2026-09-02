// OpenAI Ads Manager measurement pixel — https://developers.openai.com/ads/measurement-pixel
// The pixel script itself is loaded + initialized in index.html (anonymous, no user data).
// This module re-initializes it with a hashed identity once a real signup completes, then
// fires the registration_completed conversion so it carries that match data.

declare global {
  interface Window {
    oaiq: (...args: unknown[]) => void
  }
}

const PIXEL_ID = '7CCaeumQ4mJbHJ7VPxyoHV'

function oaiq(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.oaiq) return
  window.oaiq(...args)
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Per the doc's exact normalization rules — trim + lowercase for email,
// trim only (case + everything else preserved) for external_id.
function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeExternalId(id: string) {
  return id.trim()
}

/**
 * Re-initializes the pixel with hashed identity so it can be matched to
 * later conversion events. Per the doc: "call init again with the complete
 * user object" once user data becomes available (e.g. after signup/login).
 */
export async function identifyOaiqUser({ email, userId }: { email: string; userId: string }) {
  const [email_sha256, external_id_sha256] = await Promise.all([
    sha256Hex(normalizeEmail(email)),
    sha256Hex(normalizeExternalId(userId)),
  ])
  oaiq('init', { pixelId: PIXEL_ID, user: { email_sha256, external_id_sha256 } })
}

/** Fires once, right after a brand-new account is created and identified. */
export function trackRegistrationCompleted() {
  oaiq('measure', 'registration_completed', { type: 'customer_action' })
}
