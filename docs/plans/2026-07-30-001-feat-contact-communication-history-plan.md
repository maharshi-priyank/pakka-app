---
title: "feat: Contact communication history timeline"
type: feat
date: 2026-07-30
status: draft
---

# feat: Contact communication history timeline

## Summary

ClearWork sends client-facing emails through its own SMTP relay, so nothing ever appears in a freelancer's own Gmail "Sent" folder — the only record lives inside ClearWork, and today nothing surfaces it. `CommunicationLog` already captures every automated send (recipient, subject, status, timestamp) but is write-only: no endpoint or UI ever reads it, and it has no `contactId` or message-body field. Portal inbox messages (`Message`/`Thread`) and meetings are already fully tracked per contact but shown as separate tabs, not as one timeline.

This plan adds a read-only **Communication History** tab on the Contact detail page: a single chronological feed merging automated emails, portal messages, and meetings for that contact. WhatsApp/SMS are out of scope — no integration exists for either channel yet.

---

## Problem Frame

| Today | Target |
|---|---|
| `CommunicationLog` logged on every send, never read by anything | Queryable per contact, surfaced in the UI |
| `CommunicationLog` has no `contactId` — only a polymorphic `entityId`/`entityType` back to the invoice/proposal/etc. that triggered it | `contactId` stored directly at send time |
| `CommunicationLog` has no message body — can't show what was actually sent | Full rendered HTML body stored going forward, retained indefinitely for audit purposes |
| Messages and meetings are separate ContactPage tabs | Merged into one chronological feed alongside emails |
| No way to tell what was sent to a contact before today's fix, or with what content | Historical emails still show as history entries (sender, subject, timestamp, status) with an explicit "content not captured" indicator, rather than disappearing |

---

## Requirements

- R1: A new "History" tab on `ContactPage.tsx` shows a single chronological list of every email, portal message, and meeting associated with that contact.
- R2: Each entry shows what kind it is (email / message / meeting), a timestamp, and a short title/subject.
- R3: Entries with captured body content (all messages, meetings, and emails sent after this ships) are expandable to show full content.
- R4: Entries without captured body content (emails sent before this ships) show clearly as metadata-only — not hidden, not silently blank.
- R5: Failed email sends are visibly distinguishable from successful ones (reusing `CommunicationLog.status`/`error`).
- R6: Every email-sending code path in the backend stores `contactId` (when the send target is a contact) and the full rendered body going forward.
- R7: Historical `CommunicationLog` rows get `contactId` backfilled wherever it's derivable from their `entityId`/`entityType`, so pre-migration sends still appear in the right contact's history (best-effort — rows referencing since-deleted entities stay unlinked).

---

## Key Technical Decisions

**KTD-1 — Store `contactId` directly on `CommunicationLog` at send time, not resolved indirectly later**

Most current call sites of `EmailService.send()` (`automation.engine.ts`, `automation.scheduler.ts`, `messages.service.ts`) already resolve the contact immediately before calling `send()` — a direct result of today's contact-relation bug fixes — so threading `contactId` through is a small, mechanical change there. **`workflow.engine.ts` is the exception**: its `resolveClientEmail()` returns a bare `Promise<string>` (just the email address), not a contact reference — there is no already-resolved `contact` variable to thread through at its two call sites (`sendCustomEmail`, `sendFormLink`). U2 calls this out as its own sub-step. `team.service.ts` (`invite()`) and `email-templates.service.ts` (`sendTestEmail()`) also call `EmailService.send()` but correctly have no contact target — they're listed here for completeness, not because they need changes.

Resolving `contactId` indirectly later (matching the stored `to` address against `Contact.email`) is fragile — it breaks silently if a contact's email address ever changes, and duplicates the exact "match by email" pattern that already caused bugs elsewhere in this codebase today. Direct storage avoids that class of bug entirely.

**KTD-2 — Store the full rendered HTML body verbatim, retained indefinitely**

`EmailService.send()` already receives the rendered `html` that gets mailed — persisting it into a new `CommunicationLog.body` column requires no new data, just storing what's already in hand. Per explicit product decision, this is never truncated or expired — future audit or support needs may require the exact content that was sent, even though the History UI itself may choose to summarize.

**KTD-3 — Reuse the existing `Message`/`Thread` and `Meeting` contact-resolution paths as-is**

`messages.service.ts`'s `getThreadByContactId()` and the `contact`-relation-aware queries already used for the Meetings tab are proven, tested code paths. The history endpoint calls into the same resolution logic rather than re-deriving thread/meeting-to-contact lookups — this also sidesteps the legacy `Thread.clientId`-only edge case (migration `20260709_003` enforcing `contactId NOT NULL` on threads is still pending from earlier work), since that fallback already lives in the reused code.

**KTD-4 — Merge and sort server-side; return one typed, paginated array; lazy-load on the frontend via `useInfiniteQuery`**

There's no existing client-side pattern in this codebase for interleaving multiple entity types into one sorted feed (`ContactProjectAccordion` renders separate labeled sections, it doesn't merge). A dedicated `GET /contacts/:id/history` endpoint queries all three sources, tags each with `kind: 'email' | 'message' | 'meeting'`, sorts by timestamp, and paginates using the app's existing `{ items, total, page, limit }` list convention (`PaginationDto`) — the same shape already used by every other list endpoint in this codebase.

**Deduplication:** `messages.service.ts`'s `sendMessageToContact()` creates a `Message` row *and* fires a notification email (`CommunicationLog` row with `entityType: 'message'`) for the same user action. Without exclusion, both would appear as separate timeline entries for one portal reply. The `CommunicationLog` query excludes `entityType: 'message'` rows — the `Message` row already represents that communication, and is the richer of the two (full thread context vs. a notification wrapper).

Lazy loading (page-by-page "Load more") is the right call here — `CommunicationLog` retaining bodies indefinitely (KTD-2) means a long-lived contact's history can genuinely grow large, unlike the Messages/Meetings tabs today which eager-load everything because their data stays small. This *is* new frontend work, though — no `useInfiniteQuery` or page-accumulation pattern exists anywhere in this codebase yet (verified: zero matches for `useInfiniteQuery`/`fetchNextPage` in `pakka-app/src`), so U5 should use React Query's `useInfiniteQuery` explicitly rather than an ad hoc pattern the implementer has to invent.

**KTD-5 — Backfill historical `CommunicationLog.contactId` via a one-off script, best-effort**

Mirrors the exact `backfill-contact-ids.ts` pattern already used earlier for other tables: for each `CommunicationLog` row with `contactId IS NULL`, resolve the underlying entity via `entityId`/`entityType` and copy its `contactId` if the entity still exists and has one. Rows referencing deleted entities, or `entityType` values with no contact concept (e.g. `'user'` digest emails), stay `NULL` — correct, not a bug.

---

## High-Level Technical Design

```
Contact History request flow

  ContactPage (History tab)
        │  GET /contacts/:id/history?page=1&limit=20
        ▼
  ContactsController → ContactsService.getCommunicationHistory()
        │
        ├─ CommunicationLog.findMany({ contactId, workspaceId, entityType != 'message' })  → kind: 'email'
        ├─ getThreadByContactId() → Message.findMany()                                     → kind: 'message'
        └─ Meeting.findMany({ contactId, status != CANCELLED })                             → kind: 'meeting'
        │
        ▼
  merge all three → sort by occurredAt desc → paginate (page/limit)
        │
        ▼
  { items: [{ id, kind, occurredAt, title, body?, status? }], total, page, limit }
```

```
Write path (every email send, going forward)

  automation.engine.ts / automation.scheduler.ts / workflow.engine.ts / messages.service.ts
        │  already resolves `contact` before sending (today's fix)
        ▼
  EmailService.send({ ..., contactId: contact?.id })
        ▼
  EmailService.log() → CommunicationLog.create({ ..., contactId, body: html })
```

---

## Implementation Units

### U1. Rename `EmailLog` to `CommunicationLog`; add `contactId`, `body`, and `channel` columns

**Goal:** Extend the schema so sends can be linked to a contact, their content retained, and the table is ready to hold other outbound channels (WhatsApp/SMS) when those get built, without another rename.

**Requirements:** R6, R7

**Dependencies:** None

**Files:**
- `pakka-api/prisma/schema.prisma` — rename the `EmailLog` model to `CommunicationLog` (`@@map("communication_logs")`), add `contactId String?` (with `@@index([contactId])` and a `Contact?` relation), `body String?`, and `channel CommunicationChannel @default(EMAIL)` (new enum: `EMAIL` only for now — do not add `WHATSAPP`/`SMS` values speculatively; add them when those integrations actually exist and their real data shape is known)
- `pakka-api/prisma/migrations/20260730_00X_rename_email_log_to_communication_log/migration.sql` — new migration

**Approach:** `EmailLog` has exactly one consumer in the entire codebase (`EmailService`) and no other feature depends on its current shape — this is the cheapest possible moment to generalize it, since U1 is already touching this table's schema regardless. `contactId`/`body` nullable, same rationale as before (historical and non-contact rows legitimately have neither). Follows the existing `20260709_002_add_contactid_fk_columns` precedent exactly for the FK shape (`REFERENCES "contacts"("id") ON DELETE SET NULL`) — every sibling `contactId` column added in that migration has this FK; `CommunicationLog.contactId` should too, so a deleted contact cleanly nulls out its linked rows instead of leaving orphaned references. The rename itself is a straightforward `ALTER TABLE ... RENAME TO` plus `ALTER TABLE ... RENAME COLUMN` if the underlying `@@map` changes — no data migration needed since it's the same rows, same columns, just a new name and one new column with a single default value.

**Patterns to follow:** `pakka-api/prisma/migrations/20260709_002_add_contactid_fk_columns/migration.sql` for the FK shape; today's `20260730_001_razorpay_subscription_billing/migration.sql` for a clean `RENAME COLUMN`-style migration in this same repo.

**Test expectation:** none — pure schema/migration change, no behavior yet.

**Verification:** Migration applies cleanly against a copy of the current schema; `npx prisma generate` produces no type errors elsewhere in the codebase; `EmailService`'s existing `prisma.emailLog` accessor calls are updated to `prisma.communicationLog` and the app still builds.

---

### U2. Thread `contactId` and body storage through `EmailService` and every call site

**Goal:** Every email sent to a contact going forward is recorded with its contact link and full content.

**Requirements:** R6

**Dependencies:** U1

**Files:**
- `pakka-api/src/modules/automations/email.service.ts` (`send()`, `log()`)
- `pakka-api/src/modules/automations/automation.engine.ts` (`sendEmailToClient`, `sendMeetingConfirmation`)
- `pakka-api/src/modules/automations/automation.scheduler.ts` (`sendMeetingReminders`, `checkColdLeads`)
- `pakka-api/src/modules/workflows/workflow.engine.ts` (`resolveClientEmail`, `sendCustomEmail`, `sendFormLink`)
- `pakka-api/src/modules/messages/messages.service.ts` (`sendMessage`, `sendMessageToContact` — for consistency, though these already resolve contact)

**Approach:** Add `contactId?: string` to `EmailService.send()`'s options and thread it into `log()`'s create call alongside `body: opts.html` (already available, no new parameter needed for body). At each call site, pass the `contactId` from whichever `contact` variable that site already resolved today. Calls that send to the freelancer themselves (digests, cold-lead alerts to the user) correctly omit `contactId`.

**`workflow.engine.ts` needs its own sub-step first**, per KTD-1: `resolveClientEmail(entityId, entityType)` currently returns a bare `Promise<string>` — refactor it to return `{ email: string; contactId?: string }` (or similar), pulling `contactId` from whichever `contact`/`client`/`lead` relation it already queries internally. Update both callers (`sendCustomEmail`, `sendFormLink`) to destructure the new shape and pass `contactId` through to `email.send()`.

**Exhaustiveness check:** before marking this unit done, grep the codebase for every `EmailService.send(` / `this.email.send(` / `this.emailService.send(` call site and confirm each one is either covered above or has no contact target (e.g. `team.service.ts`'s `invite()`, `email-templates.service.ts`'s `sendTestEmail()` — both correctly omit `contactId`). R6 says "every" code path; don't rely on the enumerated list above being complete without checking.

**Patterns to follow:** The exact `entity.contact?.field ?? entity.client?.field ?? entity.lead?.field` resolution already added at each of these call sites in today's contact-relation fixes — reuse the same resolved `contact` variable, don't re-derive it (except in `workflow.engine.ts`, where it must be added to `resolveClientEmail` first).

**Test scenarios:**
- Happy path: sending a proposal to a Contact-linked proposal stores `contactId` and `body` on the resulting `CommunicationLog` row.
- Happy path: a workflow-builder custom email sent to a Contact-linked invoice/proposal/contract stores `contactId` (exercising the `resolveClientEmail` refactor specifically).
- Edge case: a digest/cold-lead-alert email (sent to the freelancer, not a contact) stores `contactId: null`, no error.
- Edge case: a legacy `Client`-linked (not Contact-linked) send stores `contactId: null` — no regression for pre-migration data.

**Verification:** For each call site, a real send in a dev environment produces a `CommunicationLog` row with `contactId` populated when a contact exists, and `body` matching the actual rendered email.

---

### U3. Backfill `contactId` on historical `CommunicationLog` rows

**Goal:** Pre-existing email history is discoverable per contact wherever it can be derived.

**Requirements:** R7

**Dependencies:** U1

**Files:**
- `pakka-api/prisma/scripts/backfill-communication-log-contact-ids.ts` (new)

**Approach:** For every `CommunicationLog` row with `contactId IS NULL`, look up `entityId`/`entityType` against the corresponding table (`invoice`, `contract`, `proposal`, `meeting`, `message`→its thread) and copy `contactId` if found. Skip `entityType` values with no contact concept (`'user'`) and rows whose entity no longer exists.

**Patterns to follow:** `pakka-api/prisma/scripts/backfill-contact-ids.ts` (existing script from the unified-contact migration — same read-then-update-in-batches shape).

**Test scenarios:**
- Happy path: an `CommunicationLog` row with `entityType: 'invoice'` and an `entityId` pointing to a still-existing, contact-linked invoice gets `contactId` populated.
- Edge case: a row whose `entityId` points to a deleted invoice is left `contactId: null`, no error thrown.
- Edge case: a row with `entityType: 'user'` (digest email) is left untouched.

**Verification:** Script runs read-only in dry-run mode first (log intended updates without writing), matching the verification convention from the earlier contact migration; a follow-up real run reports counts of rows updated vs. left unlinked.

---

### U4. Backend: `GET /contacts/:id/history` endpoint

**Goal:** One endpoint returns the merged, paginated, contact-scoped communication timeline.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** U1, U2, U3

**Files:**
- `pakka-api/src/modules/contacts/contacts.service.ts` (new `getCommunicationHistory()` method)
- `pakka-api/src/modules/contacts/contacts.controller.ts` (new route)
- `pakka-api/src/modules/contacts/dto/query-contact-history.dto.ts` (new, extends `PaginationDto`)

**Approach:** Query `CommunicationLog` (`where: { contactId, workspaceId, entityType: { not: 'message' } }` — see KTD-4's deduplication note), `Message` via the existing `getThreadByContactId()` resolution, and `Meeting` (`where: { contactId, status: { not: 'CANCELLED' } }`) in parallel. Map each to a common shape (`id`, `kind`, `occurredAt`, `title`, `body` when present, `status` for emails), concatenate, sort by `occurredAt` descending, then paginate in-memory to the requested `page`/`limit` (three small per-contact queries, not worth a DB-level UNION for this scale). `kind` for the email branch reads from `CommunicationLog.channel` (currently always `'EMAIL'` → `kind: 'email'`) rather than being hardcoded — this is the one place that will need a one-line addition, not a rewrite, when WhatsApp/SMS channels are added later.

**Technical design:**
```
type HistoryEntry =
  | { kind: 'email',   occurredAt, title: subject,                     body: body|null,       status, error? }
  | { kind: 'message', occurredAt, title: firstNWords(message.body),   body: message.body,    direction: senderType }
  | { kind: 'meeting', occurredAt, title: meeting.title,                body: agenda|null,     status }
```
Message entries derive `title` from a truncated snippet of `message.body` (matching how emails use `subject`) — a static `'Message'` label would make every message row in the collapsed timeline look identical, defeating the point of a scannable list.

**Patterns to follow:** `meetings.service.ts` `findAll()` for the `{ items, total, page, limit }` response shape; `messages.service.ts` `getThreadByContactId()` for message resolution.

**Test scenarios:**
- Happy path: a contact with 2 emails, 1 message, 1 meeting returns 4 entries sorted by timestamp descending.
- Edge case: a contact with no communications returns `{ items: [], total: 0 }`, not an error.
- Edge case: pagination — a contact with 25 entries and `limit=20` returns exactly 20 on page 1, 5 on page 2.
- Integration: an email entry's `body` is `null` for a pre-U2 historical row and populated for a post-U2 row, both rendering without error downstream.
- Error path: requesting history for a contact ID in a different workspace returns 404 (matching the existing `findFirst({ id, workspaceId })` authorization pattern used elsewhere in this module).

**Verification:** Endpoint returns the documented shape for a contact with mixed communication types; workspace-scoping is enforced (cannot fetch another workspace's contact history).

---

### U5. Frontend: `useContactHistory` hook

**Goal:** A dedicated, paginated data hook for the new endpoint, consistent with existing per-tab hook conventions.

**Requirements:** R1

**Dependencies:** U4

**Files:**
- `pakka-app/src/features/contacts/hooks/useContactHistory.ts` (new)

**Approach:** Mirrors `useMessages.ts`'s dedicated-hook-per-tab convention rather than extending the large eager `useContact()` payload — History has its own pagination needs that shouldn't bloat the main contact fetch. Uses React Query's `useInfiniteQuery` (not a plain `useQuery` + manual page state) — this is genuinely new to the codebase, not a reuse of an existing hook, since no infinite/load-more pattern exists anywhere in `pakka-app` today. `getNextPageParam` derives the next page number from the response's `page`/`total`/`limit`; pages accumulate into a flat `items` array for the UI to render.

**Patterns to follow:** `pakka-app/src/features/contacts/hooks/useMessages.ts` for query key shape; the endpoint's `{ items, total, page, limit }` shape (U4) for `getNextPageParam` math. No existing `useInfiniteQuery` usage to mirror — this introduces the pattern to the codebase.

**Test expectation:** none — thin data-fetching hook, covered by the endpoint's own test scenarios (U4) and the UI's manual verification (U6).

**Verification:** Hook exposes accumulated `items`, `total`, `isLoading` (initial fetch), `isFetchingNextPage` (load-more in flight), `isError`, and `fetchNextPage`/`hasNextPage`, matching `useInfiniteQuery`'s standard return shape.

---

### U6. Frontend: Communication History tab on `ContactPage`

**Goal:** Users can see and browse the merged timeline from the Contact page.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** U5

**Files:**
- `pakka-app/src/pages/app/ContactPage.tsx` (add `'history'` to the `Tab` union, add tab button, add panel branch)
- `pakka-app/src/features/contacts/components/ContactHistoryTab.tsx` (new)

**Approach:** New tab entry alongside `projects` / `messages` / `meetings`. Each history entry renders with an icon by `kind`, timestamp, and title; entries with `body` are expandable inline; email entries without `body` (pre-migration) show a small "Content not captured" note instead of an empty expand affordance. Failed email sends show a distinct status badge, with the underlying `CommunicationLog.error` text available on hover/expand rather than just a generic "failed" label. "Load more" button at the bottom calls `fetchNextPage()` from `useContactHistory` and shows a small inline spinner while `isFetchingNextPage`. Initial tab load shows a skeleton (matching the loading-state convention used elsewhere on this page) while `isLoading`; a fetch failure (`isError`) shows a retry affordance distinct from the empty state.

**Sanitization:** Expanded `body` content (both `email` and `message` kinds) is rendered through a sanitizing step before display — add `dompurify` (new dependency; not currently installed) and sanitize on render, not just at write time, so the safety of what's shown doesn't depend on trusting every past write path. This matters specifically for stored email HTML, which can originate from freelancer-authored custom templates (`workflow.engine.ts`'s `sendCustomEmail`), not only fixed system templates. (Note: `MessageBubble.tsx` in the existing Inbox feature renders message bodies via raw `dangerouslySetInnerHTML` with no sanitization today — a pre-existing gap this plan doesn't introduce and isn't fixing, but the new History tab should not repeat it for either content type it displays.)

**Accessibility:** Expand/collapse controls are real, keyboard-operable buttons (`<button aria-expanded>`), not click-only divs. Kind icons and status badges carry accessible text (e.g. `aria-label`), not icon-only meaning.

**Patterns to follow:** `ContactPage.tsx`'s existing `TabButton` and panel-switch structure (lines ~397-448 per the current file); `ContactProjectAccordion.tsx` for per-item expand/collapse styling and loading-skeleton convention.

**Test scenarios:**
- Happy path: switching to the History tab renders emails, messages, and meetings in one descending-chronological list.
- Edge case: a contact with zero history shows an empty state, not a blank panel.
- Edge case: an email entry with no `body` shows the "content not captured" indicator instead of an expand control.
- Edge case: a failed email send is visually distinguishable (status badge) from a successful one, and its error detail is accessible on hover/expand.
- Edge case: initial load shows a skeleton, not a blank panel; a fetch failure shows a retry control, not a silent blank state.
- Edge case: a `body` containing a `<script>` tag or inline event handler renders as inert text/markup, not executed.
- Integration: clicking "Load more" appends the next page without losing scroll position or duplicating entries already shown, and shows its own loading indicator distinct from the initial-load skeleton.
- Integration: expand/collapse controls are operable via keyboard alone (Tab + Enter/Space), not just mouse click.

**Verification:** Manually exercise the tab against a contact with real mixed history (some pre- and post-migration emails, at least one message, one meeting) and confirm all entry states — including loading, fetch-error, and keyboard operability — render correctly.

---

## Scope Boundaries

**In scope:** Email (automated sends), portal messages, and meetings — merged into one read-only, per-contact timeline with pagination.

**Deferred for later:**
- WhatsApp and SMS channels — no integration exists for either; `docs/clearwork_communication_system.md` already scopes WhatsApp as a distinct, larger future effort. `CommunicationLog.channel` is ready to hold them (U1) once those integrations exist and their real data shape is known — this plan does not guess at that shape today.
- Any two-way "reply from history" action — history is read-only; replying still happens through the existing Inbox/Messages tab.
- Full-text search across history — out of scope for the first cut; revisit if usage shows it's needed.
- Data-erasure path for retained `CommunicationLog.body` on contact deletion — the `ON DELETE SET NULL` FK (U1) means the row survives with `contactId` cleared, but the PII in `body` itself isn't purged. No current hard-delete flow for Contact exists to make this urgent today, but it's a real gap for whoever owns retention policy to resolve before this data is treated as compliance-safe.

**Outside this feature's identity:**
- This is not a notification center (that's the existing in-app `Notification` model, unrelated) and not an audit-log UI for compliance purposes, even though the retained email body incidentally supports future audit needs.

---

## Risks & Dependencies

- **Data volume growth**: `CommunicationLog.body` storing full HTML indefinitely for every automated send (reminders, digests) will grow the table meaningfully over time. No retention/archival policy is in scope for this plan — flagged as a future operational concern, not blocking here given current data volume is small (single-digit thousands of rows).
- **Dependency on pending migration `20260709_003`**: that migration (enforcing `contactId NOT NULL` on `Thread`) is still unapplied from earlier work. KTD-3's reuse of `getThreadByContactId()` means this plan inherits whatever behavior that method already has for legacy threads — it does not need to wait for `003`, but also doesn't resolve it.
- **PII in a new location**: email bodies (client names, amounts, links) become queryable in one more place than before. No new exposure beyond what already exists in outbound email, but centralizing it slightly increases blast radius if the database were ever compromised — worth a mention, not a blocker, given the data already exists in the sent messages themselves.
- **Some legacy `Thread` rows may still lack `contactId`**: migration `20260709_003` (enforcing `contactId NOT NULL` on `Thread`) is still pending — an unknown number of contacts' portal messages may not surface in the merged timeline until that migration lands or a fallback is added. Sizing this gap (how many `Thread` rows currently lack `contactId`) before shipping would clarify how urgent it is.
- **Pre-existing unsanitized rendering in `MessageBubble.tsx`**: the existing Inbox feature already renders message bodies via raw `dangerouslySetInnerHTML` with no sanitization — a gap this plan doesn't introduce and isn't fixing, but worth a follow-up given the new History tab is about to hold ClearWork's second-ever consumer of stored message HTML.
- **Single-use links in retained email bodies**: automated emails may embed signed portal-access or payment links; storing and re-displaying that HTML indefinitely means a token originally scoped to one recipient's inbox stays clickable to anyone with contact-view access, for as long as the row exists. Not addressed in this plan — worth checking whether current templates embed such tokens before this ships broadly.

---

## Sources & Research

- Local repo research confirmed `CommunicationLog` is currently write-only (no reader anywhere in the codebase) and has no `contactId`/body field.
- Institutional learnings from today's earlier bug fixes (commits `84b8411`, `c9fd3e7`) confirm the binding convention: always resolve `contact` before `client`/`lead`, never read `client` alone — applied throughout this plan's write-path units (U2).
- `docs/clearwork_communication_system.md` (WhatsApp integration spec) independently anticipated a "communication timeline" concept and explicitly deferred it as a future feature — confirms this plan doesn't conflict with or duplicate planned WhatsApp work, and its schema references predate the Contact migration (uses `Client ID`), which this plan does not carry forward.
