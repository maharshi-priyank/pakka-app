---
type: requirements
topic: predefined-lead-capture-form
date: 2026-08-03
---

# Predefined Lead Capture Form — Requirements

## Summary

The tab (renamed **"Lead Capture"**, from "Website Leads") always has exactly one lead-capture form per workspace, auto-provisioned rather than created through a modal. The embed code shows directly on the tab with no navigation required; customizing fields links out to the existing form-builder page. The auto-provisioned form is hidden from the generic Forms tab.

## Problem Frame

The lead-capture flow shipped moments ago requires a freelancer to manually create a form (title, description) via a modal before they get an embed code — real friction for a feature meant to remove setup, not add it. That flow reused the generic Forms tab's "New form" pattern, which makes sense for a general-purpose form builder serving many use cases (surveys, project briefs, feedback), but is the wrong shape for lead capture specifically: there's exactly one thing a freelancer wants here — an embed snippet for their website — and today's flow makes them name a form, save it, then go find the embed code on a separate page before they get it.

## Key Decisions

- **KD1 — Exactly one lead-capture form per workspace, forever.** Not one-default-plus-the-option-to-create-more. Simpler mental model — no "which form is this" confusion, and no need to build a list/selector UI for something that's conceptually singular.
- **KD2 — Auto-provisioned (find-or-create), never created through a modal.** Visiting the tab is what produces the form, not an explicit "create" action. This removes the "New form" entry point from this tab entirely.
- **KD3 — Embed code shown directly on the tab, no click-through.** A link-out to a separate page to retrieve the embed snippet would still be friction; showing it inline is what makes "zero setup" true rather than aspirational.
- **KD4 — Field customization reuses the existing form-builder page**, not a new inline editor. That UI and its field-mapping logic already exist and work; customizing is an optional, secondary action, not part of the core zero-setup promise, so one click to a dedicated page is fine there.
- **KD5 — The auto-provisioned form is hidden from the generic Forms tab's list.** It's managed exclusively through Lead Capture now; showing it in Forms too would read as an unexplained, uneditable-feeling entry a user never created.
- **KD6 — Default fields: Name (required), Email, Phone.** The three fields that map cleanly onto existing Lead fields with nothing orphaned — a sensible, immediately-useful starting point that's fully editable afterward.
- **KD7 — Tab renamed "Lead Capture."** Supersedes "Website Leads" everywhere in the app (nav label, page title).

## Requirements

**Provisioning**
- R1. Visiting the Lead Capture tab always finds or creates exactly one lead-capture form for the workspace — never zero, never more than one.
- R2. The default field set for a newly-provisioned form is Name (required), Email, Phone, each pre-mapped to its corresponding Lead field.
- R7. The form-creation flow ("New form" button/modal) is removed from this tab; find-or-create replaces it entirely.

**Embed & customization**
- R3. The embed code for the workspace's one lead-capture form is shown directly on the Lead Capture tab, ready to copy, with no navigation required.
- R4. A "Customize fields" action links to the existing form-builder page for that form.

**Separation from generic Forms**
- R5. The generic Forms tab's list excludes the auto-provisioned lead-capture form.

**Naming**
- R6. The tab is labeled "Lead Capture" throughout the app.

## Key Flows

- F1. **Freelancer opens Lead Capture for the first time**
  - **Trigger:** Navigating to the Lead Capture tab when no lead-capture form exists yet for the workspace.
  - **Steps:** The backend finds none and creates one with the default field set; the tab renders with the embed code immediately visible — no intermediate step.
  - **Covered by:** R1, R2, R3

- F2. **Freelancer customizes the form**
  - **Trigger:** Clicking "Customize fields" on the Lead Capture tab.
  - **Steps:** Navigates to the existing form-builder page for that one form; edits fields or field-mapping as today; returns to Lead Capture with the same embed code (same form, same token).
  - **Covered by:** R4

## Scope Boundaries

**Deferred for later:**
- Multi-form / multi-embed lead capture (e.g., a different form for a different landing page) — the generic Forms tab still supports creating additional custom forms for non-lead purposes, entirely unaffected by this change.

**Outside this change's scope:**
- Any broader redesign of the generic Forms tab beyond the one-line list filter (R5).

## Dependencies / Assumptions

- **Assumption:** any lead-capture form already created via the now-removed "New form" flow (shipped in the prior plan, moments before this one) becomes the one form the find-or-create logic picks up — no duplicate is created, no existing data or embed link is lost.
- **Dependency:** reuses `IntakeForm.capturesLeads` and the form-builder's existing field-mapping UI, both shipped in `docs/plans/2026-08-03-001-feat-website-lead-capture-and-review-plan.md` — no new schema is anticipated beyond whatever planning needs to identify "the" form deterministically per workspace.

## Outstanding Questions

**Deferred to Planning:**
- Exact find-or-create mechanism (lazy on first tab visit vs. eager at workspace creation) — both satisfy the product requirement identically from the user's perspective; the choice is an implementation detail.

## Sources & Research

- `docs/plans/2026-08-03-001-feat-website-lead-capture-and-review-plan.md` — the prior plan this redesign builds on and partially supersedes (removes its "New form" flow on this tab; keeps `capturesLeads`, the Lead-review list, Convert-to-Contact, and the generic-Forms field-mapping gate).
- Shipped code this redesign changes: `pakka-app/src/pages/app/WebsiteLeadsPage.tsx` (to be renamed/restructured), `pakka-app/src/features/forms/components/CreateFormModal.tsx` (its use on this tab is removed), `pakka-api/src/modules/forms/forms.service.ts` (`create()`, `findAll()`).
