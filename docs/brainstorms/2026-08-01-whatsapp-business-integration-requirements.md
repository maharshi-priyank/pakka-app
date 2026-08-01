---
type: requirements
feature: WhatsApp Business Integration
status: draft
date: 2026-08-01
---

# WhatsApp Business Integration — Requirements

## Problem Frame

ClearWork users communicate with clients via email today. A segment of users — particularly those serving Indian and international clients — would benefit from WhatsApp notifications because WhatsApp has near-100% open rates vs ~20% for email in India, clients respond faster on WhatsApp, and business communication via WhatsApp feels more personal and immediate.

This is a **second channel**, not a replacement. Email remains the default and must continue working identically for users who never connect WhatsApp.

## Core Architecture Decision (Resolved)

**Per-workspace Embedded Signup — user's own WhatsApp Business number.**

Each workspace owner connects their own WhatsApp Business Account (WABA) through Meta's official Embedded Signup flow. Messages arrive from the owner's own business phone number. Meta's standard messaging fees apply directly to the user's Meta account. ClearWork is never in the billing loop.

Framing for users: Meta is the messaging network. ClearWork is the software. This is identical to how Shopify requires connecting Stripe or Razorpay — nobody expects Shopify to pay Stripe on the merchant's behalf.

**Rejected alternative**: Shared ClearWork number. Reason: billing complexity, reconciliation overhead, shared quality score risk, months of Meta partner approval work — none of which delivers proportional value at current scale.

---

## Actors

**A1 — Workspace Owner**: Connects their WhatsApp Business Account via Embedded Signup, configures per-event notification toggles. Pays Meta directly for message usage.

**A2 — Client**: Receives WhatsApp messages from A1's own business number. Sees A1's business name and number — never "ClearWork".

**A3 — Team Member**: Benefits from WhatsApp notifications firing but cannot connect/disconnect WhatsApp or modify per-event settings (owner-only action).

---

## Key Flows

**F1 — Connect Flow**
Owner opens Settings → Communication → clicks "Connect WhatsApp" → Meta Embedded Signup OAuth launches inline → owner selects their WhatsApp Business Account and phone number → Meta grants ClearWork's app access to the WABA → ClearWork stores WABA ID, Phone Number ID, access token → status shows Connected.

**F2 — Notification Delivery Flow**
Business event fires → Notification Dispatcher checks workspace WhatsApp: is it connected and is this event toggled on? → checks contact has a phone number → sends the appropriate pre-approved template via Meta Cloud API using the workspace's Phone Number ID → logs the attempt and outcome.

**F3 — Per-Event Configuration**
Owner sees a communication settings grid: rows = supported events, columns = channels (Email, WhatsApp). Email column is always checked and locked. WhatsApp column defaults to off; owner enables per-event. Changes apply immediately to future notifications.

**F4 — Disconnect Flow**
Owner clicks Disconnect → ClearWork revokes access token via Meta API → clears stored credentials → all WhatsApp delivery silently stops → email continues unchanged.

---

## MVP Supported Events

| ID | Event |
|----|-------|
| E1 | Proposal Shared |
| E2 | Contract Sent |
| E3 | Contract Signed |
| E4 | Invoice Sent |
| E5 | Payment Reminder |
| E6 | Payment Received |
| E7 | Project Completed |

New events must be addable with a single registration step — no dispatcher logic changes.

---

## Requirements

### Workspace Connection

R1. A workspace can have at most one connected WhatsApp Business Account at a time.

R2. Only the workspace owner can connect or disconnect WhatsApp. Team members see a read-only status.

R3. The Embedded Signup OAuth flow must launch inline within ClearWork Settings, not as a full-page redirect.

R4. ClearWork stores per-workspace: WABA ID, Phone Number ID, access token (encrypted at rest), connection status, connected_at timestamp.

R5. Access tokens must never appear in API responses, error messages, or application logs.

R6. Disconnecting must revoke the stored access token via Meta's token-revocation API and immediately clear all stored credentials.

### Message Delivery

R7. Messages are sent via Meta Cloud API using the workspace owner's own Phone Number ID.

R8. Only pre-approved template messages may be sent in Phase 1. No free-form session messages.

R9. ClearWork maintains one approved template per MVP event (7 templates total), submitted through ClearWork's Meta App. Templates are available to all connected WABAs — this is the standard shared-template model used by WhatsApp BSPs.

R10. Each template injects dynamic variables appropriate to the event: `{{client_name}}`, `{{business_name}}`, `{{document_title_or_number}}`, `{{amount}}` (where applicable), `{{direct_link}}`.

R11. If a contact has no phone number, WhatsApp delivery is silently skipped. Email still sends. No error is surfaced to the owner.

R12. Phone numbers must be stored and transmitted in E.164 format. Normalize on contact save: strip spaces, add country code if missing. Reject on save if the number is unparseable.

R13. WhatsApp delivery failure must never block or fail the email send or the underlying business operation (proposal creation, invoice generation, etc.).

R14. Retry transient Meta API failures with exponential backoff: 3 attempts, delays of 1s / 4s / 16s. After 3 failures, mark the log record as FAILED with reason.

### Settings UI

R15. Settings → Communication shows:
- **Email**: "Connected" badge, no disconnect action (always on)
- **WhatsApp**: Connected / Not Connected status; Connect or Disconnect action
- Per-event toggle grid (Email locked on, WhatsApp toggleable) — shown only when WhatsApp is connected

R16. When WhatsApp is not connected, the Connect button is accompanied by transparent copy:
> "Messages will be sent from your own WhatsApp Business number. Clients see your business name and number — not ClearWork. Meta charges standard WhatsApp Business messaging fees."

R17. Per-event toggle changes are saved immediately (no Save button required).

### Contact Phone Number

R18. No new Contact field is needed — the phone field already exists.

R19. Contacts without a phone number are silently skipped for WhatsApp; no UI error is shown to the owner at notification time.

R20. The Contact form must show inline validation when a phone number is provided but cannot be normalized to E.164.

### Notification Log

R21. Every WhatsApp send attempt is persisted: event type, workspace ID, contact ID, provider (`WHATSAPP`), status (`QUEUED` / `SENT` / `DELIVERED` / `READ` / `FAILED`), provider message ID, failure reason (if any), created_at, updated_at.

R22. Meta's delivery-status webhooks (message_delivered, message_read) must update the corresponding log record.

R23. The log is the source of truth for communication history. A future "Communication Timeline" on the Contact page will read from it (deferred — see Out of Scope).

### Notification Architecture

R24. The existing email dispatch path must NOT be modified to embed WhatsApp logic inline. Instead, introduce a channel-agnostic **Notification Dispatcher** that:
  - Accepts an event type + structured payload
  - Resolves which channels are active for the workspace + event combination
  - Dispatches to each enabled channel provider independently
  - Isolates failures — one channel failing does not affect others

R25. Email and WhatsApp must implement a shared `NotificationProvider` interface. Adding SMS, Push, or Slack in future requires only a new provider implementation and registration — no dispatcher changes.

R26. Evaluate the existing `AutomationRule` / `AutomationEngine` pattern as the extension point. If it fits the provider model cleanly, add a `send_whatsapp.client` action type parallel to `send_email.client`. If it doesn't fit cleanly, introduce a lightweight parallel dispatcher rather than forcing the fit.

---

## Out of Scope (Phase 1)

- Inbound WhatsApp messages or client replies (no Meta webhook for session messages)
- Free-form / session messages
- Per-contact WhatsApp opt-out toggle (Phase 2 after PMF)
- Communication Timeline on Contact page (Phase 2)
- Meta Tech Partner or reseller billing abstraction (revisit when >60% of paid users connect WhatsApp)
- SMS, Push Notification, Slack providers (architecture must support; implementation deferred)
- AI-generated message content
- Delivery analytics dashboard

---

## Open Questions (Deferred to Implementation)

- **Phone normalization library**: `google-libphonenumber` (npm) is the standard; confirm at implementation time.
- **Meta App registration**: ClearWork's Meta App ID and Embedded Signup configuration must be set up as a business action before engineering begins. This is a pre-requisite, not an implementation task.
- **Template pre-approval**: ClearWork submits 7 templates to Meta for approval; approval typically takes 24–48 hours. Must be submitted well before launch.
- **Token refresh**: Meta long-lived access tokens expire after 60 days. Implement a refresh job or use system user tokens (non-expiring) — decide at implementation time.

---

## Success Criteria

1. A workspace owner can connect their WhatsApp Business account in under 2 minutes using the Embedded Signup flow.
2. When a supported event fires and the contact has a phone number, a WhatsApp message is delivered within 5 seconds in the happy path.
3. WhatsApp send failures have zero impact on email delivery rate.
4. Owner can enable/disable per-event WhatsApp toggles without a page reload.
5. A workspace that never connects WhatsApp has identical behavior to today — no regressions.
6. All sent messages display the owner's business name and phone number, not "ClearWork".
