---
title: "feat: Contact Overview tab"
type: feat
date: 2026-08-02
status: draft
---

# feat: Contact Overview tab

## Summary

`ContactPage.tsx` currently opens on **Projects** and has no "home" view — a freelancer wanting a fast read on a client (how much they've billed/collected, whether anything's overdue, what happened recently) has to click into Projects, Meetings, and History separately and do the math themselves.

This plan adds a new **Overview** tab, shown first and as the default, with: a stats row (total billed, total paid, outstanding, total hours), a monthly revenue bar chart, a monthly hours bar chart, an inline-editable notes field, an upcoming-actions row (overdue follow-up, unpaid invoice count, next meeting), and a recent-documents list (last 3 proposals/contracts/invoices).

This is the first of a longer roadmap (Documents, Invoices, Timesheet, and an upgraded Activity tab were discussed and validated separately) — this plan covers Overview only. No other tabs, no sidebar layout changes, no new sub-navigation.

---

## Problem Frame

| Today | Target |
|---|---|
| `ContactPage.tsx` opens on Projects; no summary view exists | A new Overview tab, shown first, is the default landing tab |
| Total billed/paid/outstanding and hours logged require manually reading through Projects → each proposal/contract/invoice | One stats row surfaces all four numbers immediately |
| No visual sense of revenue or hours trend for this specific client | Two 6-month bar charts (revenue, hours), mirroring the dashboard's existing `RevenueChartWidget` pattern |
| `contact.notes` is a read-only sidebar field, edited only via the full Edit Contact modal | Notes become inline-editable directly on Overview |
| Overdue follow-ups, unpaid invoices, and the next meeting are each buried in different tabs/fields | One "Upcoming actions" row surfaces all three at a glance |
| Recent proposals/contracts/invoices require opening the Projects accordion | Last 3 documents (any type) shown directly, with status chips |

---

## Requirements

- R1: A new "Overview" tab appears first in `ContactPage.tsx`'s tab bar and is the tab shown by default when a contact is opened.
- R2: A stats row shows total billed, total paid, outstanding, and total hours logged for this contact.
- R3: A bar chart shows monthly revenue (paid invoices) for this contact over the last 6 months.
- R4: A bar chart shows monthly hours logged for this contact over the last 6 months.
- R5: Notes are inline-editable on the Overview tab, persisting to the existing `contact.notes` field.
- R6: An "upcoming actions" row shows: overdue follow-up (if any), count of unpaid invoices, and the next scheduled meeting (if any).
- R7: A "recent documents" list shows the 3 most recently created proposals/contracts/invoices (mixed, sorted by creation date), each with a type + status chip.

---

## Key Technical Decisions

**KTD-1 — No new "aggregation" endpoint; extend `useContact()` and add one lean hours-only endpoint**

The original framing assumed one `GET /contacts/:id/overview` endpoint would need to compute everything (stats, both charts, recent docs). Research into the existing `ContactsService.findOne()` (`pakka-api/src/modules/contacts/contacts.service.ts:136`) shows it **already includes** `proposals`, `contracts`, and `invoices` (id/title/status/amount/dates) in its Prisma `include` — this data is already sent to the frontend on every contact page load today, it's just untyped and unused by `Contact` (`pakka-app/src/features/contacts/schemas/contact.schema.ts:81`). Extending that interface costs nothing on the wire and unlocks, entirely client-side:

- Stats: totalBilled (`sum(invoice.total)` where status not in `DRAFT`/`CANCELLED`), totalPaid (`sum(invoice.amountPaid)`), outstanding (`totalBilled - totalPaid`) — using `amountPaid` rather than the `SENT`/`OVERDUE`-only outstanding check in `reports.service.ts`'s `revenueReport()`, because `amountPaid` correctly reflects `PARTIAL`-status invoices (that older pattern would count a partially-paid invoice as fully outstanding — not fixing that pattern here, just not repeating its gap in new code)
- Monthly revenue chart — bucket `contact.invoices` by `paidAt` month, `status === 'PAID'`, same logic as `dashboard.service.ts`'s `getRevenueChart()` but computed client-side since the full invoice list is already in hand
- Recent documents — merge `contact.proposals` + `contact.contracts` + `contact.invoices`, sort by `createdAt` desc, take 3
- Unpaid invoice count (for the upcoming-actions row) — `contact.invoices.filter(i => !['DRAFT','PAID','CANCELLED'].includes(i.status)).length`
- Next meeting and overdue follow-up (upcoming-actions row) — already fully available today via `contact.meetings` and `contact.followUpAt`, no changes needed

**What's genuinely missing:** `findOne()` does not include time entries at all, so total hours and the monthly hours chart cannot be derived from `useContact()`. Adding time entries to `findOne()`'s include was considered and rejected — that method backs every tab on `ContactPage`, and pulling every time entry on every page load (not just when Overview is open) is unnecessary over-fetch for tabs that never touch hours. Instead, one new lean endpoint, scoped to exactly what's missing:

`GET /contacts/:id/overview` → `{ totalHours: number, monthlyHours: { month: string, hours: number }[] }`

This is a smaller endpoint than originally scoped (no stats, no revenue chart, no recent docs — all of that now comes free from `useContact()`), fetched only while the Overview tab is mounted.

**KTD-2 — Revenue chart shows paid revenue only, not "paid + outstanding" as originally sketched**

Stacking paid vs. outstanding in one bar chart adds a second series and a legend for a first cut, and outstanding is already visible in the stats row and the upcoming-actions unpaid count. Matching `RevenueChartWidget`'s existing single-series convention (paid revenue only, current month highlighted) keeps this consistent with the one existing chart in the app and avoids introducing a second chart pattern. Can be revisited if a stacked view is explicitly wanted later.

**KTD-3 — 6-month window, not 12**

`RevenueChartWidget`/`getRevenueChart()` use 6 months as the app's existing convention for this exact kind of chart. Matching it here avoids introducing a second window convention with no stated reason for 12 in the original ask beyond "6–12".

**KTD-4 — Notes: reuse `contact.notes` + `useUpdateContact`, not the existing `notesList`/multi-note API**

`ContactsService` already exposes `listNotes`/`createNote`/`deleteNote` against a separate `ContactNote[]` model (`notesList` on `Contact`, currently fetched by `findOne()` but rendered nowhere in the frontend). That's a structured, timestamped, multi-entry model — a bigger feature than "one editable text field," and building an Overview UI around it now would be scope creep beyond what was asked and confirmed. This plan inline-edits the existing single `contact.notes` string via the already-existing `PATCH /contacts/:id` (`useUpdateContact`). The unused `notesList` API is left as-is for a possible future "Notes" tab — explicitly out of scope here (see Scope Boundaries).

**KTD-5 — Save notes on blur, not on every keystroke**

`useUpdateContact()` fires a success toast ("Contact updated") on every call — acceptable for a deliberate save action, not for autosave-per-keystroke. The notes textarea holds local state and calls the mutation only on blur (and only if the value actually changed), matching how the existing `EditContactModal` commits changes as one explicit action rather than continuously.

---

## High-Level Technical Design

```
Overview tab data flow

  ContactPage (already calls useContact(id) for all tabs)
        │
        ├─ contact.invoices / .proposals / .contracts  ──► client-side: stats, revenue chart, recent docs, unpaid count
        ├─ contact.meetings / .followUpAt               ──► client-side: upcoming actions
        └─ contact.notes                                 ──► inline edit → useUpdateContact (existing PATCH /contacts/:id)

  ContactOverviewTab (new, mounted only when activeTab === 'overview')
        │  GET /contacts/:id/overview
        ▼
  ContactsController → ContactsService.getOverviewStats()
        │
        ├─ prisma.timeEntry.aggregate({ where: { workspaceId, contactId } })                       → totalHours
        └─ 6× prisma.timeEntry.aggregate({ where: { ..., date: { gte, lte } } })  (month loop,      → monthlyHours
             mirrors dashboard.service.ts's getRevenueChart() loop shape)
        │
        ▼
  { totalHours, monthlyHours: [{ month, hours }] }
```

---

## Implementation Units

### U1. Backend: extend `Contact` frontend type; add `GET /contacts/:id/overview`

**Goal:** Expose the one genuinely missing data source (hours), and type the already-returned proposals/contracts/invoices so the frontend can use them.

**Requirements:** R2, R3, R4, R6, R7

**Dependencies:** None

**Files:**
- `pakka-api/src/modules/contacts/contacts.service.ts` — new `getOverviewStats(workspaceId, contactId)` method
- `pakka-api/src/modules/contacts/contacts.controller.ts` — new `GET :id/overview` route
- `pakka-app/src/features/contacts/schemas/contact.schema.ts` — extend `Contact` interface with `proposals?`, `contracts?`, `invoices?` (typed to match `findOne()`'s existing `select` shapes exactly)

**Approach:** In `getOverviewStats()`, verify the contact exists in the workspace first (`findFirst({ id, workspaceId })`, same pattern as `getCommunicationHistory()` at `contacts.service.ts:177`), then run a 6-iteration month loop identical in shape to `dashboard.service.ts`'s `getRevenueChart()` (`dashboard.service.ts:164`), but aggregating `prisma.timeEntry` (`_sum: { durationMins: true }`, `where: { workspaceId, contactId, date: { gte, lte } }`) instead of invoices, converting `durationMins` to hours (`/60`, rounded to 1 decimal). `totalHours` is a separate all-time aggregate (no date filter) over the same `where`. Route follows the existing `:id/history` route's placement and auth pattern in the controller (`@Get(':id/overview')`, same `resolveWorkspaceId(user)` call).

For the frontend type extension, match field-for-field: `proposals: { id, title, status, totalAmount, createdAt, acceptedAt }[]`, `contracts: { id, title, status, createdAt, sentAt, signedAt }[]`, `invoices: { id, invoiceNumber, status, total, dueDate, createdAt, paidAt }[]` — `status` values reuse the existing `ProposalStatus`/`ContractStatus`/`InvoiceStatus` unions already defined in each feature's own schema file; import them rather than re-declaring. Treat `totalAmount`/`total` defensively with `Number(...)` when computing sums — the codebase is inconsistent about whether these Decimal fields serialize as `string` or `number` (`invoice.schema.ts` types `total` as `number`, `proposal.schema.ts` types `totalAmount` as `string`), so don't assume either.

**Patterns to follow:** `dashboard.service.ts:164`'s `getRevenueChart()` for the month-loop/aggregate shape; `contacts.service.ts:177`'s `getCommunicationHistory()` for the contact-existence check and controller wiring; `contacts.service.ts:136`'s `findOne()` `select` blocks as the exact source of truth for the new type fields.

**Test scenarios:**
- Happy path: a contact with time entries in 3 of the last 6 months returns `monthlyHours` with correct sums for those 3 months and `0` for the other 3, plus a correct all-time `totalHours`.
- Edge case: a contact with zero time entries returns `{ totalHours: 0, monthlyHours: [{month, hours: 0} × 6] }`, not an error.
- Error path: requesting overview for a contact ID in a different workspace returns 404 (matches the existing `findFirst({ id, workspaceId })` convention).

**Verification:** `GET /contacts/:id/overview` returns the documented shape for a contact with real time-entry history; TypeScript check (`npx tsc --noEmit --skipLibCheck`) passes with the extended `Contact` type.

---

### U2. Frontend: `useContactOverview` hook

**Goal:** A dedicated, tab-scoped data hook for the new endpoint.

**Requirements:** R4

**Dependencies:** U1

**Files:**
- `pakka-app/src/features/contacts/hooks/useContactOverview.ts` (new)

**Approach:** Standard `useQuery` (not infinite — this is a single small payload, not a paginated list). `enabled: !!contactId` only; the hook itself doesn't need to know whether the Overview tab is active — `ContactOverviewTab` only mounts (and this hook only runs) when `activeTab === 'overview'`, which is what avoids the over-fetch KTD-1 flags.

**Patterns to follow:** `pakka-app/src/features/contacts/hooks/useContactHistory.ts` for query key shape and the `api.get` call convention (this hook is simpler — no `useInfiniteQuery` needed here, unlike History's paginated feed).

**Test expectation:** none — thin data-fetching hook, covered by U1's endpoint tests and U3's manual verification.

**Verification:** Hook exposes `data` (`{ totalHours, monthlyHours }`), `isLoading`, `isError`, matching standard `useQuery` return shape.

---

### U3. Frontend: `ContactOverviewTab` component

**Goal:** Render the full Overview tab — stats, both charts, notes, upcoming actions, recent docs.

**Requirements:** R2, R3, R4, R5, R6, R7

**Dependencies:** U1, U2

**Files:**
- `pakka-app/src/features/contacts/components/ContactOverviewTab.tsx` (new)

**Approach:**
- **Stats row** — 4 cards (Total Billed, Total Paid, Outstanding, Total Hours) computed from `contact.invoices` (client-side, per KTD-1) for the first 3, and `overview.totalHours` (from U2) for the 4th. Format money with `formatCurrency(amount, contact.currency ?? 'INR')` (`@/lib/utils`) — use the contact's own currency, matching the convention already used elsewhere on this page (`ContactPage.tsx`'s deal-value `FieldRow`), not the workspace-level `useCurrency()` used in dashboard widgets, since a contact's invoices are always in that contact's currency.
- **Revenue chart** — `BarChart`/`Bar`/`XAxis`/`YAxis`/`Tooltip`/`ResponsiveContainer`/`Cell` from `recharts` (already a dependency, `^3.8.1` — no new package). Bucket `contact.invoices` client-side into the same 6-month shape `RevenueChartWidget` renders, reusing its exact JSX structure (`barSize={28}`, `radius={[5,5,0,0]}`, current-month `Cell` highlight, `isDark` from `useThemeStore()`, tooltip `formatter` using `formatCurrency(value, contact.currency ?? 'INR')`).
- **Hours chart** — same `RevenueChartWidget` structural pattern, fed by `overview.monthlyHours` (U2), `Y`-axis-hidden bar chart, tooltip showing `"${value}h"`.
- **Notes** — a `<textarea>` seeded from `contact.notes`, local state, `onBlur` calls `useUpdateContact().mutate({ id: contact.id, notes: value })` only if changed (KTD-5). No character-limit UI beyond the existing `notes.max(2000)` schema constraint (`contact.schema.ts:26`) — rely on the existing zod validation surfacing a toast error on save if exceeded, consistent with how the Edit Contact modal already handles this field.
- **Upcoming actions row** — 3 small items: overdue follow-up (reuse the exact `isOverdueFollowUp` check already computed in `ContactPage.tsx` for the sidebar `FieldRow`, passed down as a prop rather than recomputed), unpaid invoice count (client-side filter per KTD-1), next meeting (`contact.meetings` sorted ascending by `scheduledAt`, first entry with `scheduledAt > now`). Any item with nothing to show is simply omitted, not rendered as empty.
- **Recent documents** — merge `contact.proposals`, `contact.contracts`, `contact.invoices` into one array tagged with `kind`, sort by `createdAt` desc, `slice(0, 3)`. Status chip color follows the loose, existing convention in this codebase (green-ish for paid/signed/accepted, amber for sent/pending, gray for draft, red for overdue/declined) — no shared `StatusBadge` component exists yet in this codebase to reuse; build a small inline chip local to this file rather than introducing a new shared component for a 3-item list.
- **Empty/loading states** — stats cards and both charts show a skeleton (`animate-pulse` divs, matching `ContactHistoryTab.tsx`'s and `RevenueChartWidget.tsx`'s existing skeleton conventions) while `overview` (U2) is loading; the two client-side-derived sections (recent docs, upcoming actions) have no loading state of their own since `contact` is already loaded before any tab renders.

**Patterns to follow:** `pakka-app/src/features/dashboard/widgets/RevenueChartWidget.tsx` for both charts (structure, skeleton, empty state); `pakka-app/src/features/contacts/components/ContactHistoryTab.tsx` for the loading-skeleton and card styling convention used elsewhere on this page; `ContactPage.tsx`'s `FieldRow` component for label/value row styling if useful for the upcoming-actions row.

**Test scenarios:**
- Happy path: a contact with invoices in multiple statuses, meetings, and a follow-up date renders all 4 stats, both charts, and a non-empty upcoming-actions row correctly.
- Edge case: a brand-new contact with zero invoices/meetings/proposals/contracts/time entries renders all stats as ₹0/0h, both charts in their empty state, an empty upcoming-actions row (not 3 blank items), and no recent-docs list (not an empty box).
- Edge case: editing notes and blurring without changing the value does not fire a mutation (no unnecessary "Contact updated" toast).
- Edge case: editing notes and blurring after a real change fires exactly one `useUpdateContact` call with the new value.
- Integration: outstanding stat visually reconciles with the unpaid-invoice count in the upcoming-actions row for the same contact (both derived from the same `contact.invoices`, sanity-checkable by hand during manual verification).

**Verification:** Manually exercise the tab against a contact with a real mix of paid/unpaid invoices, logged time entries across several months, an overdue follow-up, and an upcoming meeting; confirm every section renders correct, mutually consistent numbers.

---

### U4. Frontend: wire Overview into `ContactPage.tsx`

**Goal:** Overview is the first tab and the default landing tab.

**Requirements:** R1

**Dependencies:** U3

**Files:**
- `pakka-app/src/pages/app/ContactPage.tsx`

**Approach:** Add `'overview'` to the `Tab` union (`ContactPage.tsx:26`), change `useState<Tab>('projects')` to `useState<Tab>('overview')` (`ContactPage.tsx:81`), add a new `TabButton` before Projects (icon: `LayoutDashboard` from `lucide-react`, matching this file's existing per-tab icon convention — `FolderKanban` for Projects, `MessageCircle` for Messages, etc.), and add the `activeTab === 'overview'` panel branch rendering `<ContactOverviewTab contact={contact} isOverdueFollowUp={isOverdueFollowUp} overview={...} />` alongside the existing `projects`/`messages`/`meetings`/`history` branches (`ContactPage.tsx:432-458`).

**Patterns to follow:** The existing 4 `TabButton` + panel-branch pairs in this exact file (`ContactPage.tsx:400-458`) — this unit is purely mechanical, adding a 5th pair in the same shape, placed first.

**Test scenarios:**
- Happy path: opening any contact lands on Overview by default.
- Happy path: switching tabs and back preserves the usual per-tab state behavior already present for the other tabs (no new state-preservation logic needed — matches existing tab-switch behavior).

**Verification:** Navigate to a contact from the Contacts list; confirm Overview renders first without an extra click, and that Projects/Messages/Meetings/History still work unchanged.

---

## Scope Boundaries

**In scope:** One new Overview tab: stats row, 2 monthly bar charts (revenue, hours), inline-editable notes, upcoming-actions row, recent-documents list (top 3). One new lean backend endpoint for hours data. Frontend `Contact` type extended to surface already-returned proposals/contracts/invoices.

**Deferred for later** (per the validated 7-tab roadmap discussion — not part of this plan):
- Documents tab (flat proposals+contracts list, filterable) — Phase 1 candidate, frontend-only against existing `contactId` query params
- Invoices tab (flat invoices list with filters, summary footer) — Phase 1 candidate, frontend-only; `?contactId=` already works server-side on `GET /invoices` (`query-invoices.dto.ts`)
- Timesheet tab (all time entries for this contact, grouped) — needs `contactId` added to `QueryTimeEntriesDto` and `TimeEntriesQuery` (currently absent on both, unlike Invoices' equivalent), which this plan does not touch since Overview's hours data comes from the new dedicated endpoint (U1) instead of the time-entries list endpoint
- Activity tab upgrade (rename History, add proposal/invoice lifecycle events, stage changes, automation events) — a meaningfully separate unit of work on top of the already-shipped `ContactHistoryTab`
- Multi-note / timestamped notes (the existing but unused `notesList`/`ContactNote` API) — see KTD-4

**Outside this feature's identity:**
- Not a replacement for the sidebar — the sidebar (contact info, portal link) stays as-is; Overview is a tab, not a layout change (matches the explicit "Overview as first tab preserves sidebar layout" decision from the discussion).
- Not a general-purpose reporting/analytics view — the existing `reports.service.ts` revenue/GST/client reports are a separate, workspace-wide feature; this is a single-contact summary.

---

## Risks & Dependencies

- **Currency assumption**: stats and the revenue chart format money using the contact's own `currency` field, which can be `null` on older contacts created before per-contact currency existed (falls back to `'INR'`). If a contact's invoices were created under a different currency than its current `currency` field (e.g. the contact's currency was changed after invoices existed), the displayed total would use the contact's *current* currency symbol on amounts that may have been entered in a different one — this is a pre-existing ambiguity in how the app handles currency changes on established contacts, not something this plan introduces or resolves.
- **`amountPaid`-based outstanding vs. the existing `reports.service.ts` convention**: this plan's outstanding calculation (KTD-1) is intentionally more correct for `PARTIAL` invoices than the older `SENT`/`OVERDUE`-only check in `revenueReport()`/`clientReport()`. The two will show different "outstanding" numbers if a workspace has partially-paid invoices — worth being aware of if a user compares this tab's number against a workspace-level report, though not a bug in either.
- **`notesList`/`ContactNote` remains unused after this plan**: already fetched by `findOne()`, still rendered nowhere. Not a regression this plan causes, but flagged since a future "Notes" tab (deferred) would be the natural place to finally use it.

---

## Sources & Research

- `pakka-api/src/modules/contacts/contacts.service.ts` (`findOne()`, `getCommunicationHistory()`) — confirmed proposals/contracts/invoices/meetings/notesList are already fetched and returned by the existing contact-detail endpoint, just untyped on the frontend.
- `pakka-app/src/features/contacts/schemas/contact.schema.ts` — confirmed the `Contact` interface omits `proposals`/`contracts`/`invoices` despite the backend already sending them.
- `pakka-api/src/modules/dashboard/dashboard.service.ts` (`getRevenueChart()`) — the month-loop/aggregate pattern this plan's new endpoint and client-side revenue bucketing both mirror.
- `pakka-api/src/modules/reports/reports.service.ts` (`revenueReport()`) — existing outstanding-calculation convention; deliberately not repeated here (KTD-1).
- `pakka-app/src/features/dashboard/widgets/RevenueChartWidget.tsx` — the only existing Recharts usage in this codebase; both new charts follow its structure directly.
- `pakka-app/src/features/contacts/components/ContactHistoryTab.tsx` and `pakka-app/src/pages/app/ContactPage.tsx` — tab-bar wiring convention and loading-skeleton/card styling this plan's new tab follows.
- `pakka-api/src/modules/invoices/dto/query-invoices.dto.ts` vs. `pakka-api/src/modules/time-entries/dto/query-time-entries.dto.ts` — confirmed Invoices already supports `?contactId=` server-side while Time Entries does not; recorded as a Phase-1/Phase-2 boundary note for the deferred Timesheet tab, not something this plan needs to fix.
- No upstream `docs/brainstorms/` requirements document exists for this feature — planned directly from the confirmed scope discussion in-session.
