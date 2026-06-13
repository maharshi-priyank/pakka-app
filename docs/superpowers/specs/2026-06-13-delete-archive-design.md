# Delete & Archive Design Spec

## Context

A user requested the ability to delete records across the app. After audit, the design uses a tiered strategy:
- **Archive** (soft delete) for parent entities that carry financial or relational history
- **Hard delete** for leaf entities with no downstream dependencies
- **Void** for financial documents that have been issued (GST compliance — issued invoices must stay on record)

All destructive actions require a confirmation modal before executing. No silent deletes anywhere.

---

## Tiers

### Tier 1 — Archive or Permanent Delete (user chooses)

Parent entities with relationships or financial history. When the user clicks "Remove", a **two-option modal** appears letting them choose:

- **Archive** — hidden from active list, all linked records preserved, fully reversible at any time
- **Permanently delete** — removed forever; only enabled when the entity has zero linked records (no projects, invoices, proposals, contracts, tasks, or time entries). If linked records exist, the delete option is visually disabled with the explanation "This [client] has linked records — archive instead."

The choice modal is the single entry point for both actions. There is no separate Archive button and Delete button — just one "Remove" action that opens the modal.

After choosing Archive: executes immediately (no second confirm — it's reversible).
After choosing Delete (when available): shows a second confirmation step — "Are you sure? This cannot be undone." — before executing.

Affected entities: **Client, Lead, Project, Proposal, Contract (unsigned), Form, TaskBoard**

Archive action: `PATCH /:id/archive` → sets `archivedAt = now()`
Unarchive action: `PATCH /:id/unarchive` → sets `archivedAt = null`
Delete action: `DELETE /:id` — backend guards: returns `BadRequestException` if any linked records exist
All list queries filter `archivedAt: null` by default; pass `?includeArchived=true` to include them.

**Linked record check per entity:**

| Entity | Blocks hard delete if... |
|--------|--------------------------|
| Client | has any proposals, contracts, invoices, projects, meetings, or time entries |
| Lead | has any proposals or meetings |
| Project | has any tasks, invoices, time entries, or expenses |
| Proposal | has any contracts |
| Contract | has any invoices |
| Form | has any submissions |
| TaskBoard | always deletable (tasks are not deleted, just unassigned from the board) |

### Tier 2 — Void (financial documents)

Issued financial documents must not be deleted — they are part of the GST audit trail. Instead, they can be **Voided**: the record persists with status `CANCELLED`, all monetary amounts are preserved, and the document is excluded from revenue calculations but remains visible in reports with a strikethrough treatment.

Affected entities: **Invoice (status ≠ DRAFT), Contract (status = SIGNED)**

Void action: `PATCH /:id/void` → sets `status = CANCELLED`
Draft invoice / unsigned contract: use Archive or Delete (see Tier 3 below).

### Tier 3 — Hard Delete

Leaf entities with no downstream financial or legal significance. Deleted permanently with no recovery. Modal warns "This cannot be undone."

Affected entities: **Task, Time entry, Expense, Note (client & project), Attachment, Meeting, Email template, Workflow, Draft Invoice, Draft Contract, Proposal Template (user-created)**

Action: existing `DELETE /:id` endpoints (all already exist on the backend).

---

## Database changes

### New `archivedAt` field

Add `archivedAt DateTime?` to the following Prisma models:

| Model | Table | Note |
|-------|-------|------|
| Client | clients | no existing soft-delete field |
| Lead | leads | has `isDeleted Boolean` — migrate to `archivedAt`, remove `isDeleted` |
| Project | projects | has `ProjectStatus` — ARCHIVED is distinct from CANCELLED; add `archivedAt` |
| Proposal | proposals | no existing soft-delete |
| Contract | contracts | no existing soft-delete |
| Form | forms | no existing soft-delete |
| TaskBoard | task_boards | no existing soft-delete |

### Enum additions

Add `VOID` to `ContractStatus` (for voiding signed contracts without touching `DECLINED`):
```prisma
enum ContractStatus {
  DRAFT
  SENT
  SIGNED
  DECLINED
  VOID      // new
}
```

`InvoiceStatus` already has `CANCELLED` — use that for voids. No new enum value needed.

### Migration strategy

Cannot use `prisma migrate dev` (Supabase drift). Pattern:
1. Write SQL manually → `npx prisma db execute --file migration.sql`
2. `npx prisma migrate resolve --applied <name>`

Single migration file covering all `archivedAt` additions + ContractStatus VOID + Lead `isDeleted` → `archivedAt` migration.

---

## API changes

### New endpoints per archivable entity

```
PATCH /clients/:id/archive        → { archivedAt: Date }
PATCH /clients/:id/unarchive      → { archivedAt: null }

PATCH /leads/:id/archive
PATCH /leads/:id/unarchive

PATCH /projects/:id/archive
PATCH /projects/:id/unarchive

PATCH /proposals/:id/archive
PATCH /proposals/:id/unarchive

PATCH /contracts/:id/archive      (only when status ≠ SIGNED)
PATCH /contracts/:id/unarchive
PATCH /contracts/:id/void         (only when status = SIGNED) → status = VOID

PATCH /invoices/:id/void          (only when status ≠ DRAFT) → status = CANCELLED
PATCH /invoices/:id/archive       (only when status = DRAFT)  — optional, or just DELETE

PATCH /forms/:id/archive
PATCH /forms/:id/unarchive

PATCH /task-boards/:id/archive
PATCH /task-boards/:id/unarchive
```

### Query filter update

All `findMany` service methods that list these entities must add:
```ts
where: { userId, archivedAt: null }   // default
// when ?includeArchived=true:
where: { userId }
```

Controllers accept optional `?includeArchived=true` query param and pass `includeArchived: boolean` to the service.

### Guard logic

- Archive endpoint throws `BadRequestException` if entity already archived
- Unarchive endpoint throws `BadRequestException` if entity not archived
- Void endpoint throws `BadRequestException` if invoice is DRAFT (use DELETE instead)
- Void contract throws `BadRequestException` if contract status ≠ SIGNED

---

## Frontend changes

### Modal components

#### 1. `RemoveModal` — two-option modal for parent entities

New file: `src/components/RemoveModal.tsx`

Used for Tier 1 entities (Client, Lead, Project, Proposal, Contract, Form, TaskBoard).

Props:
```ts
interface RemoveModalProps {
  open: boolean
  onClose: () => void
  onArchive: () => void
  onDelete: () => void
  entityLabel: string           // e.g. "Acme Corp", "Website Redesign"
  entityType: string            // e.g. "client", "project"
  hasLinkedRecords: boolean     // if true, delete option is disabled
  linkedRecordsSummary?: string // e.g. "3 invoices and 1 project"
  isArchiving?: boolean
  isDeleting?: boolean
}
```

Visual layout:
- Modal width: `max-w-md`, centered, white card, `rounded-2xl`, `p-6`
- Header: entity name in bold, subtitle "Choose how to remove this [entityType]"
- Two option cards side by side (`grid grid-cols-2 gap-3 mt-4`):

**Archive card** (always enabled):
```
bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-4 cursor-pointer
hover: border-[#101828] bg-white
```
- Icon: `Archive size={18}` in a `w-9 h-9 bg-[#F2F4F7] rounded-lg`
- Title: "Archive" (`text-[13.5px] font-semibold text-[#101828] mt-2`)
- Description: "Hidden from your list. All linked records preserved. Restore anytime." (`text-[11.5px] text-[#667085] mt-1`)

**Delete card** (conditionally enabled):
```
// enabled state:
bg-[#FFF5F5] border border-[#FEE4E2] rounded-xl p-4 cursor-pointer
hover: border-[#D92D20]

// disabled state (has linked records):
bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-4 opacity-50 cursor-not-allowed
```
- Icon: `Trash2 size={18}` in a `w-9 h-9 bg-[#FEE4E2] rounded-lg text-[#D92D20]` (gray bg when disabled)
- Title: "Permanently delete" (`text-[13.5px] font-semibold text-[#D92D20]` or `text-[#98A2B3]` when disabled)
- Description when enabled: "Removed forever. Cannot be undone." (`text-[11.5px] text-[#D92D20]/70`)
- Description when disabled: "Has [linkedRecordsSummary]. Archive instead." (`text-[11.5px] text-[#98A2B3]`)

Clicking Archive card → calls `onArchive()` and closes modal immediately.
Clicking Delete card (enabled) → advances to a second confirmation step within the same modal (replaces the two cards with: warning text "This will permanently delete this [entityType]. This cannot be undone." + red "Yes, delete permanently" button + "Go back" link).

Footer: `Cancel` text button (`text-[12px] text-[#667085]`)

#### 2. `ConfirmModal` — single-action modal for leaf entities and void

New file: `src/components/ConfirmModal.tsx`

Used for Tier 2 (void) and Tier 3 (hard delete) entities.

Props:
```ts
interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel: string
  variant: 'delete' | 'void'
  isLoading?: boolean
}
```

Visual treatment:
- `delete` variant: confirm button `bg-[#D92D20] text-white hover:bg-[#B42318]`
- `void` variant: confirm button `bg-[#DC6803] text-white hover:bg-[#B54708]`
- Modal width: `max-w-md`, centered, white card, `rounded-2xl`, `p-6`
- Icon in a colored circle at top: `Trash2` (delete, red bg), `XCircle` (void, amber bg)
- Cancel is always a plain text button below the confirm button

Standard confirmation copy:

| Action | Title | Description |
|--------|-------|-------------|
| Archive client | "Archive this client?" | "This client will be hidden from your active list. Their projects, invoices, and contracts are preserved. You can unarchive them at any time." |
| Archive project | "Archive this project?" | "This project will be hidden from your active list. All tasks, invoices, and linked documents are preserved." |
| Archive lead | "Archive this lead?" | "This lead will be hidden from your pipeline. You can unarchive them at any time." |
| Archive proposal | "Archive this proposal?" | "This proposal will be hidden. You can unarchive it at any time." |
| Archive contract | "Archive this contract?" | "This contract will be hidden. You can unarchive it at any time." |
| Void invoice | "Void this invoice?" | "This invoice will be marked as void. The record is preserved for your GST audit trail. This cannot be undone." |
| Void contract | "Void this contract?" | "This signed contract will be voided. The record is preserved. This cannot be undone." |
| Delete task | "Delete this task?" | "This task will be permanently deleted. This cannot be undone." |
| Delete time entry | "Delete this entry?" | "This time entry will be permanently deleted. This cannot be undone." |
| Delete expense | "Delete this expense?" | "This expense will be permanently deleted. This cannot be undone." |
| Delete note | "Delete this note?" | "This note will be permanently deleted. This cannot be undone." |
| Delete attachment | "Delete this file?" | "This file will be permanently removed. This cannot be undone." |
| Delete meeting | "Delete this meeting?" | "This meeting will be permanently deleted. This cannot be undone." |
| Delete form | "Delete this form?" | "This form and all its responses will be permanently deleted. This cannot be undone." |
| Delete email template | "Delete this template?" | "This template will be permanently deleted. This cannot be undone." |
| Delete task board | "Delete this board?" | "This board and all its columns will be permanently deleted. Tasks are not deleted. This cannot be undone." |
| Delete invoice (draft) | "Delete this draft invoice?" | "This draft invoice will be permanently deleted. This cannot be undone." |

### "Show archived" toggle

Add to filter bar of each archivable entity's list page:

```tsx
<button
  onClick={() => setIncludeArchived(prev => !prev)}
  className={cn("flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors",
    includeArchived
      ? "bg-[#F2F4F7] border-[#D0D5DD] text-[#344054]"
      : "border-transparent text-[#98A2B3] hover:text-[#667085]"
  )}
>
  <Archive size={12} />
  Show archived
</button>
```

When `includeArchived = true`, archived items render with:
- `opacity-60` on the row/card
- A small `Archived` chip: `text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5`
- Actions change: "Archive" button replaced by "Unarchive" button

Pages that need the toggle: ClientsPage, LeadsPage, ProjectsPage, ProposalsPage, ContractsPage, FormsPage, TaskBoardsPage.

### Action button placement

- **List pages (table rows)**: a "Remove" option in the row's kebab menu (`MoreHorizontal` dropdown) → opens `RemoveModal` (Tier 1) or `ConfirmModal` (Tier 3)
- **Detail/editor pages** (ProjectPage, ContractEditorPage, InvoiceEditorPage, ProposalEditorPage): "Remove" or "Void" button in the top-right toolbar alongside existing actions (Trash2 icon + label)
- **Slide-in panels** (TaskSlideIn): "Delete" text button in the panel footer, red, opens `ConfirmModal`

### Per-page changes

| Page | Change |
|------|--------|
| ClientsPage | Add kebab menu to each row → Archive, no full delete |
| ClientPage | Add Archive button in page header actions |
| LeadsPage | Add kebab menu to each row/card → Archive (migrate from isDeleted) |
| ProjectsPage | Add kebab menu to project card → Archive |
| ProjectPage | Replace inline confirm panel with ConfirmModal; add Archive option alongside existing Delete |
| ProposalsPage | Add kebab menu → Archive (draft/expired), Void (sent/accepted) |
| ContractsPage | Add kebab menu → Archive (draft/sent), Void (signed) |
| InvoicesPage | Add kebab menu → Delete (draft), Void (sent/paid/overdue) |
| InvoiceEditorPage | Add Void / Delete button in toolbar |
| FormsPage | Replace inline confirm with ConfirmModal |
| TaskBoardsPage | Replace existing inline confirm with ConfirmModal |
| TaskSlideIn | Add ConfirmModal, currently calls delete without confirm |
| TimePage | Replace inline confirm with ConfirmModal |
| ExpensesPage | Replace inline confirm with ConfirmModal |
| ClientNotesTab | Add ConfirmModal (currently no confirm) |
| ClientAttachmentsTab | Add ConfirmModal (currently no confirm) |
| MeetingsPage | Add Delete with ConfirmModal |
| EmailTemplatesPage | Add Delete with ConfirmModal |
| ProjectPage (notes) | Add ConfirmModal for note delete |

### TanStack Query hooks

New hooks needed per archivable entity (example pattern):
```ts
// useArchiveClient, useUnarchiveClient
export function useArchiveClient() {
  return useMutation({
    mutationFn: (id: string) => api.patch(`/clients/${id}/archive`).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })
}
```

Void hooks:
```ts
export function useVoidInvoice() {
  return useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/void`).then(r => r.data.data),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}
```

---

## UX rules

1. **Confirmation modal is mandatory for every destructive action** — no exceptions.
2. **Void is irreversible** — modal description explicitly states this. No unvoid.
3. **Archive is always reversible** — modal description says "You can unarchive at any time."
4. **Hard delete is always irreversible** — modal description says "This cannot be undone."
5. **Archived items do not appear in dashboard counts** — active client count, open invoice total, active project count all exclude archived.
6. **Archived items do not appear in linked record pickers** — when creating an invoice and selecting a client, archived clients are not shown in the dropdown. Same for project/client pickers across the app.
7. **Voided invoices are excluded from revenue totals** — but appear in the invoice list with a VOID badge and their original amounts, for audit purposes.
8. **Cascade on client archive** — archiving a client does NOT cascade-archive their projects/invoices. Each entity is independently archivable. The client's linked records remain accessible via those entities' own list pages (they're just no longer linked to an active client name, which shows as "Archived client").

---

## Visual treatment of archived/voided items in lists

### Archived rows (table view)
- Row background: no change (stays white)
- Row text: `text-[#98A2B3]` (muted gray)
- Status badge replaced with: `Archived` chip (amber-50 bg)
- Kebab menu shows: **Unarchive** (restores), no Archive option

### Voided invoice/contract rows
- Row background: no change
- All monetary columns: muted + ~~strikethrough~~ on amount
- Status badge: `Void` chip (gray-100 bg, gray text)
- No delete/archive option shown — record is permanent

---

## What this spec does NOT cover

- Bulk archive / bulk delete (future)
- Account-level data deletion (GDPR erasure) — separate admin flow
- Purging archived records after N days (future retention policy)
- Team member removal (separate flow in Settings)
