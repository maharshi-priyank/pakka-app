---
title: "feat: Predefined lead capture form"
type: feat
date: 2026-08-03
origin: docs/brainstorms/2026-08-03-predefined-lead-capture-form-requirements.md
---

# feat: Predefined lead capture form

**Target repos:** `pakka-app` (frontend) and `pakka-api` (backend). File paths below are relative to each repo's root as labeled.

## Summary

The Lead Capture tab (renamed from "Website Leads") always has exactly one lead-capture form per workspace, seeded automatically on login rather than created through a modal. The tab shows the ready-to-copy embed code directly; a "Customize fields" link goes to the existing form-builder page. The seeded form is excluded from the generic Forms tab's list, and the now-unnecessary "New form" flow is removed from this tab entirely.

## Problem Frame

The lead-capture flow shipped in the prior plan (`docs/plans/2026-08-03-001-feat-website-lead-capture-and-review-plan.md`) required a freelancer to manually create a form via a modal before getting an embed code — friction for a feature meant to be effortless. That flow reused the generic Forms tab's "New form" pattern, appropriate for a general-purpose builder serving many use cases, but wrong for lead capture specifically, where there's exactly one thing a freelancer wants: an embed snippet, immediately.

## Key Decisions

- **KD1 — Seed the form via the existing idempotent per-login pattern, not a new mechanism.** `UsersService.upsert()` already calls `ContractTemplatesService.seedDefault()` and `InvoiceTemplatesService.seedDefault()` on every login, each an `upsert` keyed by a `(workspaceId, key)` unique constraint (see origin's deferred "find-or-create mechanism" question). This plan adds `FormsService.seedLeadCaptureForm()` to that same call site, following the identical shape — no new provisioning strategy introduced.
- **KD2 — `IntakeForm` gains a nullable `key` field with a `(workspaceId, key)` unique constraint**, mirroring `ContractTemplate` exactly. This is what makes the seed idempotent (concurrent logins never create two rows) and gives the backend a deterministic way to find "the" lead-capture form.
- **KD3 — Only the seed path may create a `capturesLeads: true` form.** `capturesLeads` is removed from `CreateFormDto` entirely — the generic Forms "New form" flow can never produce one, tightening KD1 (origin)'s "exactly one, forever" into an invariant the API itself enforces, not just UI convention.
- **KD4 — Default fields: Name (required), Email, Phone — pre-mapped 1:1** (`leadFieldMap: { name: 'name', email: 'email', phone: 'phone' }`), matching origin KD6.
- **KD5 — Embed code generation is duplicated, not extracted.** `FormBuilderPage.tsx` already computes it inline (`` `${origin}/q/${token}` `` plus a 4-line iframe string). The new page needs the same two lines; extracting a shared helper for that little logic, used in two places, would be premature.
- **KD6 — Rename for consistency, not just the tab label.** Route `/website-leads` → `/lead-capture`, page component, and the notification `entityType` string (`'website-lead'` → `'lead-capture'`) all follow the "Lead Capture" name — safe to rename since this shipped moments ago with no production data.

## Requirements

**Provisioning**
- R1. `FormsService` seeds exactly one `capturesLeads: true` form per workspace, idempotently, wired into the existing per-login seed call site (see origin R1, R7).
- R2. The seeded form's default fields are Name (required), Email, Phone, each pre-mapped to its Lead field (see origin R2).
- R8. `capturesLeads` is removed from `CreateFormDto` — the generic form-creation path can never produce a lead-capture form.

**Embed & customization**
- R3. The Lead Capture tab shows the workspace's form's embed code directly, with no navigation required (see origin R3).
- R4. A "Customize fields" action links to the existing form-builder page for that form (see origin R4).

**Separation from generic Forms**
- R5. The generic Forms tab's list excludes the seeded lead-capture form (see origin R5).

**Naming**
- R6. The tab, its route, and the notification entity type are all renamed to "Lead Capture" / `lead-capture` (see origin R6, KD6).

**Removal**
- R7. The generic Forms tab's "New form" flow / `CreateFormModal` usage is removed from the Lead Capture tab (see origin R7).

## Key Flows

- F1. **Freelancer logs in for the first time after this ships**
  - **Trigger:** `UsersService.upsert()` runs, as it does on every login.
  - **Steps:** The existing template-seeding calls run unchanged; `FormsService.seedLeadCaptureForm(workspaceId)` runs alongside them, upserting the one lead-capture form for that workspace (idempotent — a no-op on every subsequent login).
  - **Covered by:** R1, R2

- F2. **Freelancer opens the Lead Capture tab**
  - **Trigger:** Navigating to `/lead-capture`.
  - **Steps:** The frontend fetches the workspace's one lead-capture form (already seeded by F1) and renders its embed code immediately — no creation step, ever, from this tab.
  - **Covered by:** R3

- F3. **Freelancer customizes the form**
  - **Trigger:** Clicking "Customize fields" on the Lead Capture tab.
  - **Steps:** Navigates to the existing form-builder page for that form; edits fields/mapping as today; returns to Lead Capture with the same embed code (same token).
  - **Covered by:** R4

## Implementation Units

### U1. Backend: `IntakeForm.key` field + unique constraint

**Goal:** Give `IntakeForm` the same deterministic-lookup shape `ContractTemplate` already has, making idempotent seeding possible.

**Requirements:** R1

**Dependencies:** None

**Files (pakka-api):**
- `prisma/schema.prisma` — `IntakeForm` model: add `key String?`, add `@@unique([workspaceId, key])`
- `prisma/migrations/20260803_003_add_intake_form_key/migration.sql` (new)

**Approach:** One nullable `ADD COLUMN "key" TEXT`, one unique index on `("workspaceId", "key")`. Mirrors `ContractTemplate.key`'s exact shape (`schema.prisma:842,854`) — nullable so existing forms (all `key: null`) don't collide with each other under the unique constraint (Postgres treats each `NULL` as distinct).

**Patterns to follow:** `ContractTemplate.key` / `@@unique([workspaceId, key])` (`prisma/schema.prisma:842,854`).

**Test expectation:** none — pure schema/migration change.

**Verification:** Migration applies cleanly; `npx prisma generate` produces no type errors; existing forms (all `key: null`) are unaffected.

---

### U2. Backend: seed the lead-capture form on login; fetch endpoint; hide from generic list

**Goal:** Exactly one lead-capture form exists per workspace before a freelancer ever opens the tab, fetchable by a dedicated endpoint, invisible in the generic Forms list.

**Requirements:** R1, R2, R5

**Dependencies:** U1

**Files (pakka-api):**
- `src/modules/forms/forms.service.ts` (new `seedLeadCaptureForm()`, new `getLeadCaptureForm()`, `findAll()` excludes `capturesLeads: true`)
- `src/modules/forms/forms.controller.ts` (new `GET /forms/lead-capture` route)
- `src/modules/users/users.service.ts` (`upsert()` calls `formsService.seedLeadCaptureForm(workspaceId)` alongside the existing template seeds)
- `src/modules/users/users.module.ts` (add `FormsModule` to `imports` — confirmed not currently present, unlike `ContractTemplatesModule`/`InvoiceTemplatesModule` which already are)

**Approach:** `seedLeadCaptureForm(workspaceId)` is an `upsert` keyed by `{ workspaceId_key: { workspaceId, key: 'lead-capture-default' } }`, `update: {}`, `create: { ..., capturesLeads: true, title: 'Lead Capture Form', fields: [...three default fields...], leadFieldMap: { name: 'name', email: 'email', phone: 'phone' }, token: nanoid(21) }` — identical shape to `ContractTemplatesService.seedDefault()` (`contract-templates.service.ts:147-161`). `getLeadCaptureForm(workspaceId)` does `findFirst({ where: { workspaceId, key: 'lead-capture-default' } })`, calling `seedLeadCaptureForm` first as a belt-and-suspenders fallback (mirrors `ContractTemplatesService.getDefault()`'s null-fallback comment at `contract-templates.service.ts:136-139`, but here seeding-then-fetching rather than returning null, since the frontend has nothing sensible to render without a form). `findAll()` adds `capturesLeads: false` to its `where` clause — every existing call site of `GET /forms` (the generic Forms tab) is unaffected except for no longer listing the seeded form.

The new `@Get('lead-capture')` handler must be declared in `forms.controller.ts` **before** the existing `@Get(':id')` handler — Nest matches routes in declaration order, so appending it after `:id` (the natural place given the file's current route order) would make every request to `/forms/lead-capture` get swallowed by `findOne('lead-capture')` and 404 as "Form not found." The new route also must resolve the caller's workspace via `resolveWorkspaceId(user)`, not the raw `user.id` every other route in this controller currently passes — `resolveWorkspaceId` is what the login-time seed call (above) resolves to, and using raw `user.id` here instead would mean a team member's fetch resolves to a *different* id than the workspace owner's form was seeded under, silently breaking "exactly one form per workspace" (R1) for any workspace with team members. This is a deliberate, scoped exception to this controller's existing (raw-`user.id`) convention for this one new route — not a fix to the other routes' existing scoping, which stays as-is.

**Patterns to follow:** `ContractTemplatesService.seedDefault()`/`getDefault()` (`contract-templates.service.ts:136-161`); `UsersService.upsert()`'s existing seed call site (`users.service.ts:47-58`) for exactly where and how to add the new call, including its `resolveWorkspaceId(user)` comment about seeding under the correct shared-workspace id.

**Test scenarios:**
- Happy path: calling `seedLeadCaptureForm` on a workspace with no lead-capture form yet creates one with the default fields and `capturesLeads: true`.
- Edge case: calling `seedLeadCaptureForm` twice for the same workspace creates only one row (idempotency, mirroring the existing `contract-templates.service.spec.ts` upsert-twice test shape).
- Edge case: `GET /forms` (generic list) never includes a `capturesLeads: true` form, even after seeding.
- Integration: a real login (`UsersService.upsert()`) seeds the lead-capture form alongside the existing contract/invoice template seeds, without altering those calls' existing behavior.

**Verification:** After a fresh login for a workspace with no prior lead-capture form, `GET /forms/lead-capture` returns a form with the default fields; `GET /forms` does not include it.

---

### U3. Backend: `capturesLeads` is seed-only

**Goal:** Close the second way a lead-capture form could be created, making "exactly one, forever" an API-level invariant.

**Requirements:** R8

**Dependencies:** None

**Files (pakka-api):**
- `src/modules/forms/dto/create-form.dto.ts` (remove `capturesLeads`)
- `src/modules/forms/forms.service.ts` (`create()` no longer reads `dto.capturesLeads`; always creates with the default `capturesLeads: false`)

**Files (pakka-app):**
- `src/features/forms/components/CreateFormModal.tsx` (remove the `capturesLeads` prop and its inclusion in the `mutateAsync` payload)
- `src/features/forms/hooks/useForms.ts` (`useCreateForm`'s payload type drops `capturesLeads`)

**Approach:** Delete the field and its validators from the DTO; `create()`'s data object drops the `capturesLeads: dto.capturesLeads ?? false` line entirely (the Prisma column default of `false` already covers it). This DTO removal is not backend-only: the global `ValidationPipe` is configured with `forbidNonWhitelisted: true` (`main.ts`), so `CreateFormModal.tsx`'s still-live "New form" flow on the generic Forms tab — which currently sends `capturesLeads` in its `POST /forms` body — would start getting `400 Bad Request` on every submission the moment the DTO no longer whitelists that field. Both frontend call sites must stop sending it in the same change.

**Test expectation:** none — mechanical removal; covered by U2's "generic list never includes a capturesLeads:true form" scenario.

**Verification:** `POST /forms` with any payload (including one that tries to pass `capturesLeads: true`) always creates a `capturesLeads: false` form. The generic Forms tab's "New form" flow still succeeds (no 400) after the DTO change.

---

### U4. Frontend: `useLeadCaptureForm` hook

**Goal:** Data-fetching support for the new tab.

**Requirements:** R3

**Dependencies:** U2

**Files (pakka-app):**
- `src/features/forms/hooks/useForms.ts` (new `useLeadCaptureForm()`)

**Approach:** Standard `useQuery` against `GET /forms/lead-capture`, returning the single `IntakeForm`. No creation mutation needed on this hook — there's nothing for the frontend to create.

**Patterns to follow:** `useForm(id)`'s existing query shape in the same file.

**Test expectation:** none — thin hook layer, covered by U2's endpoint tests and U5's manual verification.

**Verification:** The hook returns the seeded form without any prior action from the frontend.

---

### U5. Frontend: rebuild the tab around the predefined form; rename throughout

**Goal:** The tab shows the embed code immediately, offers "Customize fields," keeps the existing lead-review list, and drops the creation flow — renamed to "Lead Capture" everywhere.

**Requirements:** R3, R4, R6, R7

**Dependencies:** U4

**Files (pakka-app):**
- `src/pages/app/LeadCapturePage.tsx` (new, replacing `WebsiteLeadsPage.tsx`)
- `src/pages/app/WebsiteLeadsPage.tsx` (removed)
- `src/router/index.tsx` (`/website-leads` → `/lead-capture`, updated component import)
- `src/components/layout/Sidebar.tsx` (nav entry: id/label/href updated to "Lead Capture" / `/lead-capture`)
- `src/features/notifications/components/NotificationBell.tsx` (`ENTITY_ROUTES` key `'website-lead'` → `'lead-capture'`, route → `/lead-capture`)
- `src/pages/app/FormBuilderPage.tsx` (back-navigation target: `/lead-capture` when the fetched form's `capturesLeads` is true, `/forms` otherwise)
- `src/modules/notifications/notifications.listener.ts` (pakka-api — `entityType` value `'website-lead'` → `'lead-capture'`; listed here for traceability even though it's a backend file, since it must land in the same unit as the frontend rename or the notification click-through breaks)

**Approach:** `LeadCapturePage` keeps the prior plan's lead-review list (Convert/Dismiss actions, loading/error states) unchanged, but replaces the header and the zero-leads empty state, and adds an embed-code panel:
- No "New form" button, no `CreateFormModal` usage anywhere on this page — there is nothing left to create.
- The zero-leads empty state's copy and CTA are rewritten: it no longer offers to "create a form" (there's exactly one, already seeded) — it points at the embed-code panel above it instead (e.g. "No submissions yet — copy the embed code above and add it to your website").
- The embed-code panel is new: it renders directly using the fetched form's `token` (`` `${window.location.origin}/q/${form.token}` ``, iframe string per KD5), with a copy button matching `FormBuilderPage.tsx`'s existing copy-button UX, and a "Customize fields" link to `/forms/:id` using the fetched form's `id`. While `useLeadCaptureForm` is loading, the panel shows a skeleton (matching the existing `Skeleton` component already used elsewhere on this page); on fetch failure, an inline error state with a retry action — the panel's core content (the embed snippet) has no creation flow to fall back on, so it cannot silently render `/q/undefined`.
- `FormBuilderPage.tsx`'s back button currently always navigates to `/forms`. Since R5 hides `capturesLeads: true` forms from that list, a freelancer editing the lead-capture form via "Customize fields" and then clicking back would land on a list that doesn't show the form they just edited. The back button's target becomes conditional on the loaded form's `capturesLeads` field.

Router, Sidebar, and NotificationBell changes are mechanical renames; the backend `entityType` rename must land in the same commit as the frontend `ENTITY_ROUTES` key change since they're two halves of one string contract.

**Patterns to follow:** `FormBuilderPage.tsx`'s existing embed-code computation and copy-button UX; the prior plan's `WebsiteLeadsPage.tsx` for the lead-review list, its `Skeleton` component, and Convert/Dismiss wiring (carried forward, not rewritten).

**Test expectation:** none — this codebase has no frontend automated test suite; verification is manual.

**Verification:** Opening `/lead-capture` for a workspace shows the embed code immediately (a skeleton first if the fetch hasn't resolved), with no button click required to reach it. A workspace with zero submissions shows empty-state copy that points at the embed panel, not a "create a form" CTA. "Customize fields" opens the correct form in the existing builder, and its back button returns to `/lead-capture`. The old `/website-leads` route no longer exists. A form submission's notification opens `/lead-capture`, not a 404.

---

## Scope Boundaries

**Deferred / out of scope:**
- Multi-form / multi-embed lead capture — deferred per origin; the generic Forms tab still supports creating additional custom forms for non-lead purposes, unaffected.
- Any broader redesign of the generic Forms tab beyond the U2 list filter.
- Backfilling a `key` value onto any lead-capture form created via the now-removed "New form" flow from the prior plan, if one exists in the current environment — the next login's seed `upsert` will find no row matching `key: 'lead-capture-default'` (since that older form has `key: null`) and create a fresh seeded row rather than adopting the old one. Given this is a pre-launch environment with no real production data, this is treated as acceptable, not a migration to write.

## Risks

- `forms.controller.ts`'s other existing routes (`findAll`, `findOne`, `update`, `archive`, `remove`) all scope by the caller's raw `user.id` rather than `resolveWorkspaceId(user)` — a pre-existing inconsistency this plan does not fix. The new `GET /forms/lead-capture` route is a deliberate, scoped exception (see U2) that resolves correctly for team workspaces; the rest of the generic Forms feature does not, and remains out of scope here.

## Dependencies / Assumptions

- **Dependency:** confirmed `UsersModule` does not currently import `FormsModule` (`users.module.ts`'s `imports` array has `AutomationsModule`, `WorkspacesModule`, `ContractTemplatesModule`, `InvoiceTemplatesModule` — no `FormsModule`); U2 adds it, mirroring how the existing template modules are already wired.
- **Assumption:** the belt-and-suspenders seed-then-fetch in `getLeadCaptureForm()` means the tab works correctly even for a workspace whose login happened before this feature deployed — the endpoint itself guarantees a form exists, not just the login hook.

## Sources & Research

- `pakka-api/src/modules/contract-templates/contract-templates.service.ts:136-161` — `getDefault()`/`seedDefault()`, the exact idempotent per-workspace seeding pattern this plan reuses.
- `pakka-api/src/modules/users/users.service.ts:47-58` — the existing per-login seed call site U2 adds to.
- `pakka-api/prisma/schema.prisma:838-857` — `ContractTemplate`'s `key`/`@@unique([workspaceId, key])` shape, mirrored by U1.
- `pakka-api/src/modules/forms/forms.service.ts:31-37` — `findAll()`, where U2 adds the `capturesLeads: false` exclusion.
- `pakka-api/src/modules/forms/forms.controller.ts` — existing route shape (`fill/:token`, `POST`, `GET`, `GET :id`) the new `GET /forms/lead-capture` route follows.
- `pakka-app/src/pages/app/FormBuilderPage.tsx` — existing embed-code computation and copy-button UX, reused (not extracted) per KD5.
- `docs/plans/2026-08-03-001-feat-website-lead-capture-and-review-plan.md` — the immediately prior plan this one builds on and partially supersedes (removes its "New form" flow on this tab; keeps the Lead-review list and Convert-to-Contact). Note: `capturesLeads` and the field-mapping gate on `FormBuilderPage` already exist in the current codebase, but were added via live code changes after plan 001 was written, not documented in its text — plan 001's own KD4 explicitly states `leadFieldMap` "stays as-is." This plan does not re-attribute their origin to plan 001; it takes their current, shipped shape as a given.
