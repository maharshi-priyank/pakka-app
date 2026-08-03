---
type: requirements
topic: website-lead-capture-and-review
date: 2026-08-02
---

# Website Lead Capture & Unified Lead Review — Requirements

## Summary

Website form submissions become pending Leads instead of instantly-created Contacts, and land in one Leads page alongside manually-added and AI-discovered leads for explicit review. Converting a lead there creates a real Contact — fixing the existing Convert action, which currently targets the legacy Client model. The Leads page replaces today's `/leads` as its own top-level left-nav destination, and surfaces the already-built form embed code more prominently rather than adding a new setup flow.

## Problem Frame

ClearWork already has most of the pieces for website lead capture, but they're fragmented and inconsistent. `IntakeForm` already generates an embeddable form with a copy-pasteable iframe snippet, and submissions can auto-create a Contact — but only if a per-form toggle (`autoCreateLead`) is on, and when it fires there's no review step: a form submission instantly becomes a real Contact at `ENQUIRY` stage. When the toggle is off, submissions are invisible outside the form's own submission list.

Separately, an older `Lead` entity still powers a standalone `/leads` page with its own Kanban and an explicit "Convert" action — genuinely the review-then-decide flow being asked for. But that Convert action creates a legacy `Client` record, not a `Contact`, and it has no connection to website forms at all. The same `Lead` table is also the backing store for the AI-powered lead-discovery feature (LinkedIn prospecting), so three separate lead sources exist today with no single place to review them and no working path from any of them to a real Contact via `Lead`.

## Key Decisions

- **Reuse the existing shared `Lead` entity for website-form submissions.** Manually-added, AI-discovered, and website-form leads become one unified set rather than three separate mechanisms. This means fixing the Convert action benefits all three sources at once, not just new work — but it also changes behavior for leads already live in the product today, not only new ones.
- **Fix Convert to target `Contact`, not `Client`.** The legacy `Client` model is superseded by the unified `Contact` migration elsewhere in the product; Convert should have targeted `Contact` all along.
- **Remove the `autoCreateLead` toggle entirely.** Every form submission always creates a pending Lead and always goes through review — no per-form choice, no instant-Contact path left.
- **Retire the standalone `/leads` page in favor of one new Leads page.** It becomes its own dedicated left-nav destination — not nested inside Pipeline (confirmed to be the Projects pipeline, not a sales pipeline) or inside Contacts.
- **No new embed setup flow.** `FormBuilderPage` already generates a working iframe embed snippet with a copy button. The gap is discoverability, not capability — the new Leads page needs a clear entry point into that existing panel, not a rebuilt or guided version of it.

## Actors

- A1. **Freelancer / agency user** (workspace owner) — reviews leads from any source on the Leads page and decides to convert or leave pending.
- A2. **Website visitor** — submits the embedded form on the user's own website; has no visibility into ClearWork's internal review state.
- A3. **AI lead-discovery system** — creates Lead rows automatically today (LinkedIn prospecting); unchanged by this work, just reviewed on the same page going forward.

## Requirements

**Lead capture from website forms**
- R1. A form submission creates a Lead row tagged with its originating form, not a Contact directly.
- R2. The `autoCreateLead` toggle is removed from form settings; every submission always creates a pending Lead.

**Unified lead review**
- R3. One Leads page shows leads from all three sources — manually added, AI-discovered, and website-form — together.
- R4. The Leads page is a dedicated top-level left-nav item, not nested under Pipeline or Contacts.
- R5. Each lead has an explicit Convert action that creates a real Contact.
- R6. The Convert action targets `Contact` instead of the legacy `Client` model, for leads from all three sources.
- R7. Manually adding a lead directly remains supported on the new page.

**Embed discoverability**
- R8. The Leads page surfaces a clear entry point into the existing form embed-code panel; no new setup wizard is introduced.

## Key Flows

- F1. **Website visitor submits an embedded form**
  - **Trigger:** A visitor submits the iframe-embedded form on the user's own website.
  - **Actors:** A2
  - **Steps:** Submission is recorded; a Lead row is created tagged with the source form; the lead becomes visible on the Leads page.
  - **Covered by:** R1, R2, R3

- F2. **Freelancer reviews and converts a lead**
  - **Trigger:** The freelancer opens the Leads page.
  - **Actors:** A1
  - **Steps:** Sees leads from any source in one list; selects a lead; clicks Convert; a real Contact is created.
  - **Covered by:** R3, R5, R6

## Scope Boundaries

**Deferred for later:**
- A guided, platform-specific embed setup wizard (step-by-step WordPress/Wix/Squarespace instructions, live preview, test-submission checker) — the existing snippet just needs better placement, not a new flow.
- Any change to the AI lead-discovery review UI (`LeadReviewPanel`, `AILeadModal`) beyond having its output reviewed on the relocated Leads page — that flow itself is untouched.

## Dependencies / Assumptions

- **Assumption:** there's no validated user request behind this yet — it's a competitive-parity roadmap bet, not a response to a specific ask. Treat scope conservatively rather than over-building on a hunch.
- **Dependency:** fixing Convert's target changes existing behavior for manual and AI-discovered leads that are already live in the product, not just new website-form leads — this isn't purely additive work.

## Outstanding Questions

**Deferred to Planning:**
- What happens to a Lead row after it's converted — archived, deleted, or kept with a converted marker for history?
- Exact field mapping from Lead to Contact on conversion, and how it should reconcile with the field-mapping pattern `IntakeForm` already uses for form-field-to-contact-field mapping.
- Whether dismissing a lead (as distinct from converting it) is a first-class action or handled via existing archive behavior.

## Sources & Research

- `pakka-api/src/modules/forms/forms.service.ts:99-165` — `IntakeForm.submit()` creates a Contact directly today via `createContactFromSubmission()` when `autoCreateLead` is on; also the existing form-field-to-contact-field mapping pattern (`leadFieldMap`).
- `pakka-app/src/pages/app/FormBuilderPage.tsx:334-335` — existing iframe embed snippet generation with a working copy button.
- `pakka-app/src/features/leads/components/ConvertLeadModal.tsx` and `useConvertLeadToClient` — the existing Lead entity's Convert action targets the legacy Client model, not Contact.
- `pakka-api/src/modules/discovered-leads/discovered-leads.service.ts:43` — AI lead-discovery also writes to the same shared Lead table.
- `pakka-app/src/router/index.tsx:146-151` — `/leads` is still an actively routed page today.
- `pakka-app/src/pages/app/PipelinePage.tsx:274-275` — Pipeline is the Projects pipeline (`useProjects`), not a sales/contact pipeline — corrected during dialogue after an initial misreading.
