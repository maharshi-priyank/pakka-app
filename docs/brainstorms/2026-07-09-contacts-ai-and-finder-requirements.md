---
title: Wire "Add with AI" and "Find Contacts" into Contacts
date: 2026-07-09
type: feat
status: ready-for-planning
---

## Problem

The unified Contact migration replaced the old Leads system, but two user-facing features from the Leads page were not ported:

1. **Add with AI** — AI-assisted contact creation (Gemini extraction from text or image)
2. **Find Contacts** (was "Find Leads") — deep-link to the external contact finder at `leads.getclearwork.in`

Users who relied on these features to populate their pipeline now have no equivalent entry point in Contacts.

## Actors

- **A1 — Freelancer/agency owner** using ClearWork to manage their contact pipeline

## Key Flows

**F1 — Add contact via AI**

1. User clicks "Add with AI" on the ContactsPage header.
2. Modal opens (text input or image upload).
3. On submit, AI extracts: name, email, phone, company, service, deal value, source, notes.
4. User sees a review panel with the extracted fields pre-filled and editable, plus a **stage selector** defaulting to Enquiry.
5. User confirms → Contact is created at the chosen stage.

**F2 — Find Contacts (external tool)**

1. User clicks "Find Contacts" on the ContactsPage header.
2. App fetches the current session auth tokens and opens `VITE_LEADS_APP_URL` (default: `https://leads.getclearwork.in`) in a new tab with `?at=<access_token>&rt=<refresh_token>`.

## Requirements

**R1** — ContactsPage header shows "Add with AI" and "Find Contacts" buttons alongside the existing "Add Contact" button.

**R2** — "Add with AI" opens an AI extraction modal (reuse `AIModal` with a `mode="contact"` config) accepting free text or image upload.

**R3** — On extraction success, a review panel displays all extracted fields pre-filled and editable.

**R4** — The review panel includes a stage selector defaulting to Enquiry; user may change it before confirming.

**R5** — Confirming the review panel creates a Contact (not a Lead) using the chosen stage and extracted fields.

**R6** — "Find Contacts" fetches the current Supabase session and opens `VITE_LEADS_APP_URL` in a new tab with auth tokens as query params — identical to the current Find Leads deep-link logic.

**R7** — The button label reads "Find Contacts" (not "Find Leads") and the icon matches the existing Telescope + ExternalLink treatment.

**R8** — The backend endpoint `POST /ai/extract-lead` is reused as-is; no backend changes are required.

## Acceptance Examples

**AE1** — User pastes a business card text into the AI modal, clicks Extract. Review panel shows pre-filled name, email, company with stage defaulting to "Enquiry". User changes stage to "Proposal Sent" and clicks Create. A new Contact appears in the Contacts list at stage "Proposal Sent".

**AE2** — User clicks "Find Contacts". Browser opens a new tab to `https://leads.getclearwork.in?at=<token>&rt=<token>`. No navigation change occurs in the ClearWork app.

**AE3** — If AI extraction returns low-confidence fields, the review panel still shows them (editable) rather than blocking the user.

## Scope Boundaries

**In scope:**
- ContactsPage header additions (Add with AI + Find Contacts buttons)
- AI modal wired to create Contact instead of Lead
- Stage picker in review panel

**Out of scope:**
- Changes to the external `leads.getclearwork.in` app
- New backend endpoint (reuse `extract-lead`)
- Porting these buttons to any other page (Pipeline, Clients, etc.)
- Changing the AI extraction prompt or extracted field set

## Patterns to Follow

- `src/pages/app/LeadsPage.tsx` — `openLeadFinder()` function (lines 59–67) for the Find Contacts deep-link
- `src/features/ai/components/AILeadModal.tsx` — existing 3-phase modal structure to mirror for contacts
- `src/features/ai/hooks/useAIExtract.ts` — `useExtractLead` hook; create a parallel `useExtractContact` (or reuse with a contact-creation callback)
- `src/features/contacts/components/ContactStagePicker.tsx` — stage picker component for the review panel

## Dependencies

- `VITE_LEADS_APP_URL` env var must be set (already in use by Leads feature)
- Supabase session must be accessible to fetch auth tokens (already the pattern in `openLeadFinder`)
