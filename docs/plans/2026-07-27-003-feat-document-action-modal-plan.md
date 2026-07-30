---
title: "feat: Document Action Modal — intercept document clicks with a QuickView modal"
type: feat
date: 2026-07-27
status: draft
origin: user request (session 2026-07-27)
---

# feat: Document Action Modal

## Summary

All five document list pages (Proposals, Contracts, Invoices, Time Entries, Expenses) currently navigate directly to the edit page when a row is clicked. This makes accidental navigation easy and gives users no quick-access to secondary actions (Download, Duplicate, Delete) without opening the full editor.

The fix intercepts row clicks across all five pages and opens a centered `QuickViewModal` showing the document's key details plus context-appropriate CTAs: primary **Edit** (navigate/open editor), secondary **Download** (open public view in new tab — Proposals and Invoices only), and optional tertiary actions via the existing `extraActions` slot. Clicking outside or pressing Escape closes the modal.

Infrastructure already exists: `QuickViewModal` (base component), `ProposalQuickView`, `ContractQuickView`, and `InvoiceQuickView` are all built but never wired to their list pages. The core work is **enhancing the base + wiring + creating two new QuickViews** for Time and Expenses.

---

## Problem Frame

| Page | Current click behaviour | Target behaviour |
|---|---|---|
| Proposals | `navigate(/proposals/:id)` | Open `ProposalQuickView` modal → Edit navigates |
| Contracts | `navigate(/contracts/:id)` | Open `ContractQuickView` modal → Edit navigates |
| Invoices | `navigate(/invoices/:id)` | Open `InvoiceQuickView` modal → Edit navigates |
| Time Entries | `handleOpenEdit(entry)` inline | Open `TimeEntryQuickView` modal → Edit opens inline form |
| Expenses | `openEditForm(expense)` inline | Open `ExpenseQuickView` modal → Edit opens inline form |

---

## Requirements

- R1: Clicking any document row opens a centered modal with title, type context (subtitle/status badge), and key metadata. Direct navigation on row click is removed.
- R2: Modal has a primary Edit CTA that navigates to the editor page (Proposals, Contracts, Invoices) or opens the inline form (Time, Expenses).
- R3: Modal has a secondary Download CTA for Proposals (opens `/p/:slug` in new tab) and Invoices (opens `/invoice/:id` in new tab). Contracts, Time, and Expenses have no Download button.
- R4: Clicking outside the modal or pressing Escape closes it without navigation.
- R5: Edit button uses the app's indigo primary color (`#3538CD`), not `bg-gray-900`.
- R6: `QuickViewModal` base accepts `downloadAction?: () => void` and `downloadLabel?: string` props; the Download button renders only when `downloadAction` is provided.
- R7: `QuickViewModal` base accepts `updatedAt?: string` to show "Modified <date>" in the header beneath the subtitle. Optional — skipped if not provided.
- R8: `ProposalSnap` is extended with `slug?: string` so the public-view URL can be constructed without an extra fetch.
- R9: The solution is reusable: all document types share the same `QuickViewModal` base. Per-entity QuickView components handle entity-specific display only.
- R10: Modal animations (fade + scale) and keyboard accessibility (Escape) remain unchanged — they are already implemented correctly in `QuickViewModal`.

---

## Key Technical Decisions

**KTD-1 — Wire existing infrastructure, do not rebuild**
`QuickViewModal`, `ProposalQuickView`, `ContractQuickView`, and `InvoiceQuickView` are already built. The work is wiring them to their pages and extending the base for Download. No new modal component is needed.

**KTD-2 — Download: open public view URL in new tab**
`window.open(url, '_blank', 'noreferrer')` is the correct approach for "download" here — the public view pages (`/p/:slug`, `/invoice/:id`) have their own print/PDF controls. This avoids a backend download endpoint and works with the existing public routes.

**KTD-3 — Proposal slug in snap**
The public URL `/p/:slug` requires the proposal's `slug` field. `ProposalSnap` is extended with `slug?: string`. The list page already has the slug from the list query result — it is included in the snap when building state.

**KTD-4 — Time / Expense: QuickView Edit calls existing inline-form opener**
`TimePage` uses `handleOpenEdit(entry)` and `ExpensesPage` uses `openEditForm(expense)` to open inline side panels. The QuickView `onEdit` handler closes the modal then calls these functions, so the existing inline-form pattern is fully preserved.

**KTD-5 — Snap state pattern (ProposalSnap | null)**
Each wired page holds a `useState<EntitySnap | null>(null)`. Null = modal closed. Truthy = modal open with that snap. This is the lightest state approach and avoids prop-drilling.

**KTD-6 — No changes to list query/API**
All data needed for the modal is already returned by the existing list queries. Adding `slug` and `updatedAt` fields to the snap types only requires reading them off the already-fetched row objects — no new network requests.

---

## High-Level Technical Design

```
ProposalsPage  ContractsPage  InvoicesPage  TimePage  ExpensesPage
      │               │              │          │           │
  row click        row click     row click  row click   row click
      │               │              │          │           │
  setState          setState      setState   setState    setState
  (ProposalSnap)  (ContractSnap) (InvoiceSnap) (TESnap)  (ExpSnap)
      │               │              │          │           │
      ▼               ▼              ▼          ▼           ▼
ProposalQuickView  ContractQV  InvoiceQV   TimeEntryQV  ExpenseQV
      │               │              │          │           │
      └───────────────┴──────────────┴──────────┴───────────┘
                              │
                        QuickViewModal
                     (enhanced: Download,
                      indigo Edit btn,
                      updatedAt header)
```

**QuickViewModal footer layout after U1:**
```
[extraActions]  ──────── flex-1 ────────  [Close]  [Download?]  [Edit ↗]
```

Download button: secondary style (`btn-secondary` class), only rendered when `downloadAction` prop is provided.

---

## Implementation Units

### U1. Enhance `QuickViewModal` base

**Goal:** Add Download button support and indigo Edit button; add optional `updatedAt` header field.

**Requirements:** R5, R6, R7

**Dependencies:** none

**Files:**
- `src/components/shared/QuickViewModal.tsx`

**Approach:**
- Add props: `downloadAction?: () => void`, `downloadLabel?: string` (default: `'Download'`), `updatedAt?: string`
- Header: if `updatedAt` is provided, render `<p className="text-[11px] text-gray-400 mt-0.5">Modified {formatDate(updatedAt)}</p>` below the existing subtitle `<p>`
- Footer: add Download button between Close and Edit, only when `downloadAction` is truthy. Style: `btn-secondary text-[12.5px] h-9 px-4` (matches Close button style). Icon: `Download` from lucide-react (size 11).
- Edit button: change `bg-gray-900 hover:bg-gray-800` to `bg-[#3538CD] hover:bg-[#2D31B3]`
- Import `Download` from lucide-react; import `formatDate` from `@/lib/utils`
- No other changes to animation, Escape handler, or backdrop.

**Patterns to follow:** Existing `btn-secondary` class already used on the Close button. Existing lucide-react icon size pattern (size 11 on the ExternalLink in Edit button).

**Test scenarios:**
- With no `downloadAction` prop: footer renders `[Close] [Edit]` only; no Download button visible.
- With `downloadAction` prop: footer renders `[Close] [Download] [Edit]`.
- With custom `downloadLabel`: Download button shows that label.
- With `updatedAt`: header shows the formatted date below subtitle.
- Without `updatedAt`: no modified line appears.
- Edit button is visibly indigo, not dark gray.
- All existing animation/Escape/backdrop behavior unchanged.

**Verification:** Open any wired QuickView in browser; confirm Edit button is indigo; confirm Download appears only for Proposals/Invoices.

---

### U2. Wire `ProposalsPage` + enhance `ProposalQuickView`

**Goal:** Replace `navigate()` on proposal row click with modal state; add Download CTA via public view URL.

**Requirements:** R1, R2, R3, R8, R9

**Dependencies:** U1

**Files:**
- `src/pages/app/ProposalsPage.tsx`
- `src/features/proposals/components/ProposalQuickView.tsx`

**Approach:**
- `ProposalSnap`: add `slug?: string` field. When building the snap from the row object, include `slug: p.slug ?? undefined`.
- `ProposalQuickView` props: add `onDownload?: () => void`. The component passes it through to `QuickViewModal` as `downloadAction={onDownload}` and `downloadLabel="View / Download"`.
- `ProposalQuickView` also passes `updatedAt={proposal.updatedAt}` if `ProposalSnap` includes it (add `updatedAt?: string` to snap). Otherwise omit.
- In `ProposalsPage`: add `const [proposalSnap, setProposalSnap] = useState<ProposalSnap | null>(null)`.
- All `onOpen={p => navigate(...)}` calls (lines ~397, ~406) become `onOpen={p => setProposalSnap({ id: p.id, title: p.title, status: p.status, totalAmount: p.totalAmount, createdAt: p.createdAt, clientName: p.clientName, projectName: p.projectName, slug: p.slug })}`.
- Render `<ProposalQuickView proposal={proposalSnap} onClose={() => setProposalSnap(null)} onDownload={proposalSnap?.slug ? () => window.open(`/p/${proposalSnap.slug}`, '_blank', 'noreferrer') : undefined} />` at the bottom of the JSX tree (outside table/list).
- `ProposalQuickView`'s internal `navigate` call stays: `onEdit={() => { onClose(); navigate(`/proposals/${proposal.id}`) }}`.

**Patterns to follow:** Existing `useState<ContractSnap | null>` pattern (will be introduced in U3 — U2 establishes the pattern first). The `window.open` download pattern in `ContactProjectAccordion`'s external link.

**Test scenarios:**
- Clicking a proposal row opens the modal with the proposal's title and status badge.
- Modal shows "View / Download" button; clicking it opens `/p/<slug>` in a new tab without closing the modal first.
- Clicking "Open Proposal" (Edit CTA) closes the modal and navigates to `/proposals/:id`.
- Clicking backdrop or pressing Escape closes the modal without navigation.
- Proposals with no slug: no Download button appears.
- TypeScript: `ProposalSnap` export is used cleanly in both `ProposalQuickView` and the page.

**Verification:** In browser — click a proposal row; confirm modal opens. Click Download; confirm new tab opens at `/p/<slug>`. Click Edit; confirm navigation to editor.

---

### U3. Wire `ContractsPage`

**Goal:** Replace `navigate()` on contract row click with modal state. No download action.

**Requirements:** R1, R2, R9

**Dependencies:** U1

**Files:**
- `src/pages/app/ContractsPage.tsx`

**Approach:**
- Add `const [contractSnap, setContractSnap] = useState<ContractSnap | null>(null)`.
- All `onOpen={(c) => navigate(...)}` / `onClick={(c) => navigate(...)}` calls (lines ~292, ~302) become `setContractSnap(...)` calls with the snap fields: `{ id, title, status, sentAt, signedAt, createdAt, clientName, projectName }`.
- Render `<ContractQuickView contract={contractSnap} onClose={() => setContractSnap(null)} />` at the bottom of the JSX tree.
- `ContractQuickView`'s `onEdit` continues to `navigate(/contracts/:id)` — no change needed inside the component.
- No `downloadAction` or `onDownload` prop — the Download button is absent for Contracts.
- Import `ContractSnap` from `@/features/contracts/components/ContractQuickView`.

**Patterns to follow:** U2 pattern.

**Test scenarios:**
- Clicking a contract row opens the modal with the contract's title, status, and dates.
- No Download button visible.
- Edit CTA navigates to `/contracts/:id`.
- Escape / backdrop closes without navigation.

**Verification:** In browser — click a contract row; confirm modal opens with no Download button; confirm Edit navigates.

---

### U4. Wire `InvoicesPage` + enhance `InvoiceQuickView`

**Goal:** Replace `navigate()` on invoice row click with modal state; add Download CTA via public view URL.

**Requirements:** R1, R2, R3, R9

**Dependencies:** U1

**Files:**
- `src/pages/app/InvoicesPage.tsx`
- `src/features/invoices/components/InvoiceQuickView.tsx`

**Approach:**
- `InvoiceQuickView` props: add `onDownload?: () => void`. Pass through to `QuickViewModal` as `downloadAction`.
- `InvoiceSnap`: add `updatedAt?: string` (optional). Pass through to `QuickViewModal` as `updatedAt`.
- In `InvoicesPage`: add `const [invoiceSnap, setInvoiceSnap] = useState<InvoiceSnap | null>(null)`.
- All `onOpen={(inv) => navigate(...)}` / `onClick={(i) => navigate(...)}` calls (lines ~268, ~278) become `setInvoiceSnap(...)` with snap fields: `{ id, invoiceNumber, status, total, amountPaid, dueDate, createdAt, clientName, projectName }`.
- Render `<InvoiceQuickView invoice={invoiceSnap} onClose={() => setInvoiceSnap(null)} onDownload={invoiceSnap ? () => window.open(`/invoice/${invoiceSnap.id}`, '_blank', 'noreferrer') : undefined} />` at the bottom of the JSX tree.
- Download label: `"View / Download"`.

**Patterns to follow:** U2 pattern.

**Test scenarios:**
- Clicking an invoice row opens the modal with invoice number, total, status, and due date.
- "View / Download" button opens `/invoice/:id` in a new tab.
- Edit CTA navigates to `/invoices/:id`.
- Escape / backdrop closes without navigation.

**Verification:** In browser — click an invoice row; confirm modal opens with Download button; confirm new tab opens at `/invoice/<id>`.

---

### U5. Create `TimeEntryQuickView` + wire `TimePage`

**Goal:** New QuickView component for time entries; wire `TimePage` to open it on row click instead of directly opening the edit form.

**Requirements:** R1, R2, R9 (no download)

**Dependencies:** U1

**Files:**
- `src/features/time-entries/components/TimeEntryQuickView.tsx` (create)
- `src/pages/app/TimePage.tsx`

**Approach:**

**`TimeEntrySnap` interface** (defined in the new file):
```typescript
export interface TimeEntrySnap {
  id:          string
  description: string
  date:        string
  durationMins: number
  hourlyRate?:  number | null
  isBilled:    boolean
  projectName?: string
  contactName?: string
}
```

**`TimeEntryQuickView` component:**
- Props: `snap: TimeEntrySnap | null`, `onClose: () => void`, `onEdit: () => void`
- Returns `null` when `snap` is null.
- Wraps `QuickViewModal` with `open={!!snap}`, `editLabel="Edit Entry"`, no `downloadAction`.
- Body fields (using `QVField`): Date, Duration (format `durationMins` to `Xh Ym`), Hourly Rate (if present), Billed status, Project (if present), Contact (if present).
- No status badge — time entries have no status field.

**`TimePage` wiring:**
- Add `const [timeSnap, setTimeSnap] = useState<TimeEntrySnap | null>(null)` and `const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)`.
- On row click (currently calls `handleOpenEdit(entry)` directly): instead call `setTimeSnap({ id, description, date, durationMins, hourlyRate, isBilled, projectName: entry.project?.name, contactName: entry.contact?.name })` and `setActiveEntry(entry)`.
- QuickView `onEdit`: `() => { setTimeSnap(null); if (activeEntry) handleOpenEdit(activeEntry) }`.
- QuickView `onClose`: `() => { setTimeSnap(null); setActiveEntry(null) }`.
- Render `<TimeEntryQuickView snap={timeSnap} onClose={...} onEdit={...} />` near the bottom of the JSX tree.
- Import `TimeEntrySnap` and `TimeEntryQuickView` from the new component file.

**Patterns to follow:** `QVField` usage pattern from `ProposalQuickView`. Duration formatting: `Math.floor(mins/60)h ${mins%60}m` (omit minutes if 0, omit hours if 0).

**Test scenarios:**
- Clicking a time entry row opens the modal showing date, duration, project, and contact.
- "Edit Entry" CTA closes the modal and opens the existing inline edit form for that entry.
- Escape / backdrop closes without opening the form.
- `TimeEntry` object is correctly passed to `handleOpenEdit` (same object, not just the snap).

**Verification:** In browser — click a time entry; confirm modal shows correctly; click Edit Entry; confirm inline form opens pre-filled with the correct entry.

---

### U6. Create `ExpenseQuickView` + wire `ExpensesPage`

**Goal:** New QuickView component for expenses; wire `ExpensesPage` to open it on row click instead of directly opening the edit form.

**Requirements:** R1, R2, R9 (no download)

**Dependencies:** U1

**Files:**
- `src/features/expenses/components/ExpenseQuickView.tsx` (create)
- `src/pages/app/ExpensesPage.tsx`

**Approach:**

**`ExpenseSnap` interface** (defined in the new file):
```typescript
export interface ExpenseSnap {
  id:          string
  description: string
  category:    string
  amount:      string | number
  date:        string
  vendor?:     string | null
  isBillable:  boolean
  isBilled:    boolean
  projectName?: string
  contactName?: string
}
```

**`ExpenseQuickView` component:**
- Props: `snap: ExpenseSnap | null`, `onClose: () => void`, `onEdit: () => void`
- Returns `null` when `snap` is null.
- Wraps `QuickViewModal` with `open={!!snap}`, `editLabel="Edit Expense"`, no `downloadAction`.
- Body fields: Category, Amount (`formatCurrency(Number(snap.amount))`), Date, Vendor (if present), Billable (Yes/No), Billed (Yes/No), Project (if present), Contact (if present).
- No status badge.

**`ExpensesPage` wiring:**
- Add `const [expenseSnap, setExpenseSnap] = useState<ExpenseSnap | null>(null)` and `const [activeExpense, setActiveExpense] = useState<Expense | null>(null)`.
- On row click (currently calls `openEditForm(expense)` directly): instead set snap + active expense.
- QuickView `onEdit`: `() => { setExpenseSnap(null); if (activeExpense) openEditForm(activeExpense) }`.
- Render `<ExpenseQuickView snap={expenseSnap} onClose={...} onEdit={...} />` near the bottom of the JSX tree.

**Patterns to follow:** U5 pattern.

**Test scenarios:**
- Clicking an expense row opens the modal showing category, amount, date, and vendor.
- "Edit Expense" CTA closes the modal and opens the existing inline edit form for that expense.
- Escape / backdrop closes without opening the form.
- Full `Expense` object is correctly passed to `openEditForm`.

**Verification:** In browser — click an expense; confirm modal shows correctly; click Edit Expense; confirm inline form opens pre-filled.

---

## Scope Boundaries

**In scope:**
- `QuickViewModal` base enhancement (Download button, indigo Edit, `updatedAt`)
- Wiring Proposals, Contracts, Invoices list pages to their existing QuickView components
- New `TimeEntryQuickView` + wiring `TimePage`
- New `ExpenseQuickView` + wiring `ExpensesPage`
- `ProposalSnap` extension with `slug`

**Deferred:**
- Duplicate action: no existing duplicate API for any entity — deferred until duplicate endpoints exist
- Share action: no sharing mechanism currently exists — deferred
- Delete action from modal: destructive action from modal adds cognitive load — keep deletion in the editor page for now
- `ContactProjectAccordion` document rows: those mini-rows in the contact page are a different surface; they continue to navigate directly for now

**Out of scope:**
- Backend changes
- Any changes to the editor pages themselves
- Any changes to non-list views (detail pages, dashboards)

---

## Risks & Dependencies

| Risk | Likelihood | Mitigation |
|---|---|---|
| `proposal.slug` is null on older proposals (created before slug was added) | Medium | `onDownload` is only passed when `snap.slug` is truthy; no Download button renders for slug-less proposals |
| `window.open` blocked by browser popup blocker | Low | `window.open` in a direct click handler is not subject to popup blocking (only async `open` calls are blocked) |
| `TimePage` row click handler signature differs from what's expected | Low | Read `TimePage` row click wiring before implementing U5 to confirm handler call site |
| `ExpensesPage` row click uses a different pattern (table vs list) than assumed | Low | Read `ExpensesPage` before implementing U6 |
| Dark mode: indigo `#3538CD` on Edit button may not have a dark-mode variant | Low | `#3538CD` is already used throughout the app for primary CTAs in light and dark mode — verify dark mode renders correctly |
