# Feature: WhatsApp Business Integration for Client Communications

## Background

ClearWork is a client operating system for freelancers, agencies and small businesses.

Currently, client communications are sent through email for events such as:

- Proposal shared
- Contract sent
- Contract signed
- Invoice generated
- Payment reminder
- Payment received
- Project updates
- Meeting reminders

We want to extend this communication system to support WhatsApp Business.

This should NOT replace email.

It should work alongside email.

---

# Goal

If a user has connected WhatsApp Business and enabled WhatsApp notifications, ClearWork should automatically send WhatsApp messages to the client's phone number whenever supported business events occur.

Flow:

Business Event

↓

Email

+

WhatsApp (optional)

↓

Client

---

# Important Requirements

## 1. User-owned WhatsApp Business

Messages must be sent from the business owner's WhatsApp Business number.

NOT from a shared ClearWork number.

The client should see:

- Freelancer's name
- Agency name
- Business phone number

instead of ClearWork.

---

## 2. Optional Feature

Users who never connect WhatsApp should continue using email exactly as today.

No existing functionality should break.

Email remains the default communication channel.

---

## 3. Event Driven

The notification system should be channel-agnostic.

Instead of writing logic like:

if email:
    sendEmail()

We should have something similar to:

Notification Service

↓

Enabled Channels

↓

Email Provider

↓

WhatsApp Provider

↓

Future Providers
(SMS, Push, Slack)

---

# MVP Supported Events

Implement WhatsApp notifications for:

- Proposal Shared
- Contract Sent
- Contract Signed
- Invoice Sent
- Payment Reminder
- Payment Received
- Project Completed

Design so new events can easily be added.

---

# User Settings

Add a Communication Settings page.

User can:

- Connect WhatsApp Business
- Disconnect WhatsApp
- Enable/Disable WhatsApp notifications
- Choose which events trigger WhatsApp

Example:

Proposal Shared      ☑ Email   ☑ WhatsApp

Invoice Sent         ☑ Email   ☑ WhatsApp

Payment Reminder     ☑ Email   ☑ WhatsApp

Project Completed    ☑ Email   ☐ WhatsApp

---

# Client Requirements

Each client should have:

- Name
- Email (optional)
- Phone Number (optional)

Rules:

If email exists:

→ send email

If WhatsApp enabled AND phone exists:

→ send WhatsApp

Both may happen simultaneously.

---

# Notification Architecture

Current email implementation should be generalized.

Suggested architecture:

Business Event

↓

Notification Dispatcher

↓

Notification Builder

↓

Email Provider

↓

WhatsApp Provider

Future:

↓

SMS Provider

↓

Push Notifications

↓

Slack

The dispatcher should decide which providers receive the event.

Providers should not know about business logic.

---

# WhatsApp Provider

Create a dedicated provider abstraction.

Responsibilities:

- Send approved template messages
- Inject dynamic variables
- Handle retries
- Log responses
- Store delivery status
- Store message IDs
- Handle failures gracefully

---

# Template System

Messages should use templates.

Example:

Invoice Sent

Template:

Hi {{client_name}},

{{business_name}} has shared Invoice #{{invoice_number}} for ₹{{amount}}.

View Invoice:

{{invoice_link}}

Every notification type should have its own template.

Templates should be configurable later.

---

# Delivery Tracking

Persist:

- Sent
- Delivered
- Read
- Failed
- Failure reason
- Provider message ID
- Timestamp

Expose status inside communication history.

---

# Communication Timeline

Every communication should appear in a single timeline.

Example:

✓ Email Sent

✓ WhatsApp Sent

✓ Delivered

✓ Read

✓ Client Paid

This timeline should be provider-independent.

---

# Error Handling

If WhatsApp fails:

- Email should still send.
- Business operation must never fail.

Communication failures should be logged separately.

Implement retries with exponential backoff.

---

# Database Changes

Design schemas for:

## WhatsApp Connection

- User ID
- Provider
- Business Account ID
- Phone Number ID
- Access Token / Credential Reference
- Connection Status
- Created At
- Updated At

---

## Notification Log

- Notification ID
- Event Type
- User ID
- Client ID
- Provider
- Status
- Provider Message ID
- Payload
- Failure Reason
- Created At

---

# Extensibility

The implementation should NOT be tightly coupled to WhatsApp.

Introduce interfaces such as:

NotificationProvider

EmailProvider

WhatsAppProvider

Future providers should be pluggable.

---

# Security

Never expose provider credentials.

Store encrypted credentials.

Avoid logging sensitive access tokens.

---

# Future Features (Do NOT implement now)

Keep architecture ready for:

- SMS
- Push Notifications
- Slack
- Teams
- AI-generated message content
- AI follow-up suggestions
- Delivery analytics
- Communication insights
- Client communication timeline
- Multi-provider fallback

---

# Deliverables

Provide:

1. High-level architecture
2. Database schema changes
3. Backend design
4. Service interfaces
5. Event flow diagrams
6. Notification pipeline
7. API endpoints
8. Settings UI changes
9. Template management approach
10. Error handling strategy
11. Retry strategy
12. Sequence diagrams
13. Suggested folder structure
14. Migration plan from current email-only implementation

---

# Engineering Principles

- Keep providers independent.
- Keep business logic outside providers.
- Follow SOLID principles.
- Event-driven architecture preferred.
- Backward compatible with current email implementation.
- Easy to add new notification providers in the future.
- Production-ready and scalable.

The objective is not just to integrate WhatsApp, but to build a reusable multi-channel communication framework that can support additional providers with minimal changes in the future.