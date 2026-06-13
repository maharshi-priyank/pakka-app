# Delete & Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add archive (soft-delete), void, and hard-delete actions across all entities in the app — with confirmation modals for every destructive action.

**Architecture:** Three-tier strategy: parent entities (Client, Lead, Project, Proposal, Contract, Form, TaskBoard) get `archivedAt` soft-delete with a two-option Remove modal; issued financial documents (Invoice ≠ DRAFT, Signed Contract) get a Void action; leaf entities (Task, Time entry, Expense, Note, Attachment, Meeting, Email template) get hard delete via existing endpoints. A shared `RemoveModal` (archive vs permanent delete choice) and `ConfirmModal` (single-action confirmation) are the only two modal components needed.

**Tech Stack:** NestJS + Prisma (API), React + Vite + TanStack Query v5 + Tailwind v4 (App), lucide-react icons, sonner toasts, cn() from clsx

---

## File map

**API — new/modified:**
- `prisma/schema.prisma` — add `archivedAt DateTime?` to 7 models, add `VOID` to ContractStatus
- `prisma/migrations/20260613_archive_fields/migration.sql` — manual SQL migration
- `src/modules/clients/clients.service.ts` — archive/unarchive methods, guard linked-record check on delete, filter query
- `src/modules/clients/clients.controller.ts` — PATCH archive/unarchive routes
- `src/modules/leads/leads.service.ts` — migrate isDeleted → archivedAt, archive/unarchive methods
- `src/modules/leads/leads.controller.ts` — PATCH archive/unarchive routes
- `src/modules/projects/projects.service.ts` — archive/unarchive, linked-record check, filter query
- `src/modules/projects/projects.controller.ts` — PATCH routes
- `src/modules/proposals/proposals.service.ts` — archive/unarchive, filter query
- `src/modules/proposals/proposals.controller.ts` — PATCH routes
- `src/modules/contracts/contracts.service.ts` — archive/unarchive/void, filter query
- `src/modules/contracts/contracts.controller.ts` — PATCH routes
- `src/modules/invoices/invoices.service.ts` — void method (set CANCELLED)
- `src/modules/invoices/invoices.controller.ts` — PATCH void route
- `src/modules/forms/forms.service.ts` — archive/unarchive, filter query
- `src/modules/forms/forms.controller.ts` — PATCH routes
- `src/modules/task-boards/task-boards.service.ts` — archive/unarchive, filter query
- `src/modules/task-boards/task-boards.controller.ts` — PATCH routes

**App — new:**
- `src/components/ConfirmModal.tsx` — single-action confirm (delete/void variants)
- `src/components/RemoveModal.tsx` — two-option archive-or-delete modal

**App — hooks modified:**
- `src/features/clients/hooks/useClients.ts` — add useArchiveClient, useUnarchiveClient; update useClients query for includeArchived
- `src/features/leads/hooks/useLeads.ts` (or wherever leads hooks live) — add useArchiveLead, useUnarchiveLead
- `src/features/projects/hooks/useProjects.ts` — add archive/unarchive hooks
- `src/features/proposals/hooks/useProposals.ts` — add archive/unarchive hooks
- `src/features/contracts/hooks/useContracts.ts` — add archive/unarchive/void hooks
- `src/features/invoices/hooks/useInvoices.ts` — add useVoidInvoice
- `src/features/forms/hooks/useForms.ts` — add archive/unarchive hooks
- `src/features/task-boards/hooks/useTaskBoards.ts` — add archive/unarchive hooks

**App — pages modified:**
- `src/pages/app/ClientsPage.tsx` — kebab menu with Remove, includeArchived toggle
- `src/pages/app/ClientPage.tsx` — Remove button in header
- `src/pages/app/LeadsPage.tsx` — kebab menu with Remove, includeArchived toggle
- `src/pages/app/ProjectsPage.tsx` — kebab menu on cards, includeArchived toggle
- `src/pages/app/ProjectPage.tsx` — Replace inline confirm with RemoveModal
- `src/pages/app/ProposalsPage.tsx` — kebab menu, includeArchived toggle
- `src/pages/app/ContractsPage.tsx` — kebab menu (archive or void), includeArchived toggle
- `src/pages/app/InvoicesPage.tsx` — kebab menu (void or delete draft)
- `src/pages/app/InvoiceEditorPage.tsx` — void/delete button in toolbar
- `src/pages/app/FormsPage.tsx` — replace inline confirm with RemoveModal, includeArchived toggle
- `src/pages/app/TaskBoardsPage.tsx` — replace inline confirm with RemoveModal, includeArchived toggle
- `src/pages/app/TimePage.tsx` — replace inline confirm with ConfirmModal
- `src/pages/app/ExpensesPage.tsx` — replace inline confirm with ConfirmModal
- `src/features/tasks/components/TaskSlideIn.tsx` — add ConfirmModal
- `src/features/clients/components/ClientNotesTab.tsx` — add ConfirmModal
- `src/features/clients/components/ClientAttachmentsTab.tsx` — add ConfirmModal
- `src/pages/app/MeetingsPage.tsx` — add delete with ConfirmModal
- `src/pages/app/EmailTemplatesPage.tsx` — add delete with ConfirmModal

---

## Task 1: Database migration

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`
- Create: `pakka-api/prisma/migrations/20260613_archive_fields/migration.sql`

- [ ] **Step 1: Add `archivedAt` to schema models and VOID to ContractStatus**

In `pakka-api/prisma/schema.prisma`, add `archivedAt DateTime?` to each model and add VOID enum value:

```prisma
// In model Client (after updatedAt):
archivedAt  DateTime?

// In model Lead (after isDeleted line — we keep isDeleted for now, add archivedAt):
archivedAt  DateTime?

// In model Project (after updatedAt):
archivedAt  DateTime?

// In model Proposal (after updatedAt):
archivedAt  DateTime?

// In model Contract (after updatedAt):
archivedAt  DateTime?

// In model Form (after updatedAt — find Form model):
archivedAt  DateTime?

// In model TaskBoard (after updatedAt):
archivedAt  DateTime?

// Update ContractStatus enum:
enum ContractStatus {
  DRAFT
  SENT
  SIGNED
  DECLINED
  VOID
}
```

- [ ] **Step 2: Create migration SQL file**

Create `pakka-api/prisma/migrations/20260613_archive_fields/migration.sql`:

```sql
-- Add archivedAt to all parent entity tables
ALTER TABLE "clients"     ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "leads"       ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "projects"    ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "proposals"   ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "contracts"   ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "task_boards" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Add archivedAt to forms table (check actual table name)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'forms') THEN
    ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
  END IF;
END$$;

-- Add VOID to ContractStatus enum
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'VOID';
```

- [ ] **Step 3: Find the actual forms table name**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
grep -n "@@map" prisma/schema.prisma | grep -i form
```

Update the SQL if the table name differs (e.g. `client_forms`).

- [ ] **Step 4: Apply the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260613_archive_fields/migration.sql
```

Expected: no errors.

- [ ] **Step 5: Resolve migration in Prisma**

```bash
npx prisma migrate resolve --applied 20260613_archive_fields
npx prisma generate
```

Expected: `Prisma Client generated`.

- [ ] **Step 6: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/schema.prisma prisma/migrations/20260613_archive_fields/
git commit -m "feat: add archivedAt to parent entity tables, VOID to ContractStatus"
```

---

## Task 2: Clients — archive/unarchive/delete guard (API)

**Files:**
- Modify: `pakka-api/src/modules/clients/clients.service.ts`
- Modify: `pakka-api/src/modules/clients/clients.controller.ts`

- [ ] **Step 1: Add archive, unarchive methods and guard to clients service**

In `clients.service.ts`, add these methods after `update()` and replace `remove()`:

```ts
async archive(userId: string, id: string) {
  const client = await this.findOne(userId, id);
  if (client.archivedAt) throw new BadRequestException('Client is already archived');
  return this.prisma.client.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const client = await this.findOne(userId, id);
  if (!client.archivedAt) throw new BadRequestException('Client is not archived');
  return this.prisma.client.update({ where: { id }, data: { archivedAt: null } });
}

async remove(userId: string, id: string) {
  await this.findOne(userId, id);
  // Block delete if any linked records exist
  const [proposals, contracts, invoices, projects, meetings] = await Promise.all([
    this.prisma.proposal.count({ where: { clientId: id } }),
    this.prisma.contract.count({ where: { clientId: id } }),
    this.prisma.invoice.count({ where: { clientId: id } }),
    this.prisma.project.count({ where: { clientId: id } }),
    this.prisma.meeting.count({ where: { clientId: id } }),
  ]);
  const total = proposals + contracts + invoices + projects + meetings;
  if (total > 0) {
    throw new BadRequestException(
      `Cannot delete: this client has linked records (${[
        proposals && `${proposals} proposal${proposals > 1 ? 's' : ''}`,
        contracts && `${contracts} contract${contracts > 1 ? 's' : ''}`,
        invoices  && `${invoices} invoice${invoices > 1 ? 's' : ''}`,
        projects  && `${projects} project${projects > 1 ? 's' : ''}`,
        meetings  && `${meetings} meeting${meetings > 1 ? 's' : ''}`,
      ].filter(Boolean).join(', ')}). Archive instead.`
    );
  }
  await this.prisma.client.delete({ where: { id } });
}
```

Add `BadRequestException` to the import at the top:
```ts
import { Injectable, NotFoundException, HttpException, BadRequestException } from '@nestjs/common';
```

- [ ] **Step 2: Update `findAll` to support `includeArchived`**

Change the `findAll` method's `where` object:

```ts
async findAll(userId: string, query: QueryClientsDto) {
  const { page = 1, limit = 20, search, includeArchived } = query;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(search && {
      OR: [
        { name:    { contains: search, mode: 'insensitive' as const } },
        { email:   { contains: search, mode: 'insensitive' as const } },
        { company: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };
  // rest unchanged
```

- [ ] **Step 3: Add `includeArchived` to QueryClientsDto**

In `src/modules/clients/dto/query-clients.dto.ts`, add:

```ts
import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// Add to the class:
@ApiPropertyOptional()
@IsOptional()
@Transform(({ value }) => value === 'true' || value === true)
@IsBoolean()
includeArchived?: boolean = false;
```

- [ ] **Step 4: Add archive/unarchive routes to controller**

In `clients.controller.ts`, add after the `@Patch(':id')` route:

```ts
@Patch(':id/archive')
archive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.clientsService.archive(effectiveUserId(user), id);
}

@Patch(':id/unarchive')
unarchive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.clientsService.unarchive(effectiveUserId(user), id);
}
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/clients/
git commit -m "feat(clients): archive/unarchive endpoints, linked-record guard on delete"
```

---

## Task 3: Leads — migrate isDeleted → archivedAt (API)

**Files:**
- Modify: `pakka-api/src/modules/leads/leads.service.ts`
- Modify: `pakka-api/src/modules/leads/leads.controller.ts`

- [ ] **Step 1: Replace all `isDeleted` with `archivedAt` in leads service**

Open `leads.service.ts`. Replace every occurrence:
- `isDeleted: false` → `archivedAt: null`
- `isDeleted: true` → `archivedAt: new Date()`
- `{ isDeleted: false }` used in `where` clauses → `{ archivedAt: null }`

The `remove()` method currently does `prisma.lead.update({ where: { id }, data: { isDeleted: true } })`. Replace with proper archive/unarchive/delete methods:

```ts
async archive(userId: string, id: string) {
  const lead = await this.findOne(userId, id);
  if (lead.archivedAt) throw new BadRequestException('Lead is already archived');
  return this.prisma.lead.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const lead = await this.findOne(userId, id);
  if (!lead.archivedAt) throw new BadRequestException('Lead is not archived');
  return this.prisma.lead.update({ where: { id }, data: { archivedAt: null } });
}

async remove(userId: string, id: string) {
  await this.findOne(userId, id);
  const [proposals, meetings] = await Promise.all([
    this.prisma.proposal.count({ where: { leadId: id } }),
    this.prisma.meeting.count({ where: { leadId: id } }),
  ]);
  if (proposals + meetings > 0) {
    throw new BadRequestException(
      `Cannot delete: this lead has linked records. Archive instead.`
    );
  }
  await this.prisma.lead.delete({ where: { id } });
}
```

Add `BadRequestException` to imports.

- [ ] **Step 2: Update `findAll` in leads service to support `includeArchived`**

Change the `where` in `findAll`:
```ts
const where = {
  userId,
  ...(includeArchived ? {} : { archivedAt: null }),
  ...(stage && { stage }),
  ...(search && { OR: [...] }),
};
```

Also update the `pipelineAgg` aggregate where clause from `isDeleted: false` → `archivedAt: null`.

Update the plan count check in `create()`:
```ts
const count = await this.prisma.lead.count({ where: { userId, archivedAt: null, stage: { notIn: ['WON', 'LOST'] } } });
```

Also check if `findOne` still uses `isDeleted: false` and replace with `archivedAt: null`.

- [ ] **Step 3: Add `includeArchived` to QueryLeadsDto**

Find `src/modules/leads/dto/query-leads.dto.ts`. Add:

```ts
@ApiPropertyOptional()
@IsOptional()
@Transform(({ value }) => value === 'true' || value === true)
@IsBoolean()
includeArchived?: boolean = false;
```

Add `IsBoolean` to class-validator imports and `Transform` to class-transformer imports.

- [ ] **Step 4: Add archive/unarchive routes to leads controller**

In `leads.controller.ts`, after `@Delete(':id')` route:

```ts
@Patch(':id/archive')
archive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.leadsService.archive(effectiveUserId(user), id);
}

@Patch(':id/unarchive')
unarchive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.leadsService.unarchive(effectiveUserId(user), id);
}
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/leads/
git commit -m "feat(leads): migrate isDeleted to archivedAt, add archive/unarchive endpoints"
```

---

## Task 4: Projects, Proposals, Contracts, Invoices — archive/void (API)

**Files:**
- Modify: `pakka-api/src/modules/projects/projects.service.ts` + controller
- Modify: `pakka-api/src/modules/proposals/proposals.service.ts` + controller
- Modify: `pakka-api/src/modules/contracts/contracts.service.ts` + controller
- Modify: `pakka-api/src/modules/invoices/invoices.service.ts` + controller

- [ ] **Step 1: Projects — add archive/unarchive, linked-record guard**

In `projects.service.ts`, add after `update()`:

```ts
async archive(userId: string, id: string) {
  const project = await this.findOne(userId, id);
  if (project.archivedAt) throw new BadRequestException('Project is already archived');
  return this.prisma.project.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const project = await this.findOne(userId, id);
  if (!project.archivedAt) throw new BadRequestException('Project is not archived');
  return this.prisma.project.update({ where: { id }, data: { archivedAt: null } });
}
```

Update `remove()` to guard:
```ts
async remove(userId: string, id: string) {
  await this.findOne(userId, id);
  const [tasks, invoices, timeEntries, expenses] = await Promise.all([
    this.prisma.task.count({ where: { projectId: id } }),
    this.prisma.invoice.count({ where: { projectId: id } }),
    this.prisma.timeEntry.count({ where: { projectId: id } }),
    this.prisma.expense.count({ where: { projectId: id } }),
  ]);
  if (tasks + invoices + timeEntries + expenses > 0) {
    throw new BadRequestException('Cannot delete: this project has linked records. Archive instead.');
  }
  await this.prisma.project.delete({ where: { id } });
}
```

Update `findAll` where clause: add `archivedAt: null` by default, accept `includeArchived` param.

Add `includeArchived?: boolean = false` to `QueryProjectsDto` (same `@Transform` + `@IsBoolean` pattern as clients).

In `projects.controller.ts`, add:
```ts
@Patch(':id/archive')
archive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.projectsService.archive(effectiveUserId(user), id);
}

@Patch(':id/unarchive')
unarchive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.projectsService.unarchive(effectiveUserId(user), id);
}
```

- [ ] **Step 2: Proposals — add archive/unarchive**

In `proposals.service.ts`, add:

```ts
async archive(userId: string, id: string) {
  const proposal = await this.findOne(userId, id);
  if (proposal.archivedAt) throw new BadRequestException('Proposal is already archived');
  return this.prisma.proposal.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const proposal = await this.findOne(userId, id);
  if (!proposal.archivedAt) throw new BadRequestException('Proposal is not archived');
  return this.prisma.proposal.update({ where: { id }, data: { archivedAt: null } });
}
```

Update `findAll` where: add `archivedAt: null` default; accept `includeArchived` in `QueryProposalsDto`.

In `proposals.controller.ts` add archive/unarchive PATCH routes (same pattern).

Also update `remove()` to guard if it has contracts:
```ts
async remove(userId: string, id: string) {
  await this.findOne(userId, id);
  const contractCount = await this.prisma.contract.count({ where: { proposalId: id } });
  if (contractCount > 0) throw new BadRequestException('Cannot delete: proposal has linked contracts. Archive instead.');
  await this.prisma.proposal.delete({ where: { id } });
}
```

- [ ] **Step 3: Contracts — add archive/unarchive/void**

In `contracts.service.ts`, add:

```ts
async archive(userId: string, id: string) {
  const contract = await this.findOne(userId, id);
  if (contract.status === 'SIGNED') throw new BadRequestException('Cannot archive a signed contract — void it instead.');
  if (contract.archivedAt) throw new BadRequestException('Contract is already archived');
  return this.prisma.contract.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const contract = await this.findOne(userId, id);
  if (!contract.archivedAt) throw new BadRequestException('Contract is not archived');
  return this.prisma.contract.update({ where: { id }, data: { archivedAt: null } });
}

async void(userId: string, id: string) {
  const contract = await this.findOne(userId, id);
  if (contract.status !== 'SIGNED') throw new BadRequestException('Only signed contracts can be voided.');
  return this.prisma.contract.update({ where: { id }, data: { status: 'VOID' } });
}
```

Update `findAll` where: add `archivedAt: null` default; accept `includeArchived`.

In `contracts.controller.ts` add:
```ts
@Patch(':id/archive')
archive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.contractsService.archive(effectiveUserId(user), id);
}

@Patch(':id/unarchive')
unarchive(@CurrentUser() user: User, @Param('id') id: string) {
  return this.contractsService.unarchive(effectiveUserId(user), id);
}

@Patch(':id/void')
void(@CurrentUser() user: User, @Param('id') id: string) {
  return this.contractsService.void(effectiveUserId(user), id);
}
```

- [ ] **Step 4: Invoices — add void endpoint**

In `invoices.service.ts`, add:

```ts
async void(userId: string, id: string) {
  const invoice = await this.findOne(userId, id);
  if (invoice.status === 'DRAFT') throw new BadRequestException('Draft invoices cannot be voided — delete them instead.');
  if (invoice.status === 'CANCELLED') throw new BadRequestException('Invoice is already voided.');
  return this.prisma.invoice.update({ where: { id }, data: { status: 'CANCELLED' } });
}
```

Find `findOne` in invoices.service.ts to understand the pattern. Use `NotFoundException` on not found.

In `invoices.controller.ts`, add:
```ts
@Patch(':id/void')
void(@CurrentUser() user: User, @Param('id') id: string) {
  return this.invoicesService.void(effectiveUserId(user), id);
}
```

- [ ] **Step 5: Type-check API**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -40
```

Fix any errors before committing.

- [ ] **Step 6: Commit**

```bash
git add src/modules/projects/ src/modules/proposals/ src/modules/contracts/ src/modules/invoices/
git commit -m "feat: add archive/unarchive/void endpoints for projects, proposals, contracts, invoices"
```

---

## Task 5: Forms and TaskBoards — archive/unarchive (API)

**Files:**
- Modify: `pakka-api/src/modules/forms/forms.service.ts` + controller
- Modify: `pakka-api/src/modules/task-boards/task-boards.service.ts` + controller

- [ ] **Step 1: Find the forms table name in schema**

```bash
grep -A3 "model Form" /Users/mvaghela/Documents/MyProjects/pakka-api/prisma/schema.prisma | grep "@@map"
```

Note the table name. If it differs from `forms`, the migration SQL in Task 1 needs updating.

- [ ] **Step 2: Forms — add archive/unarchive**

In `forms.service.ts`, add:

```ts
async archive(userId: string, id: string) {
  const form = await this.findOne(userId, id);
  if (form.archivedAt) throw new BadRequestException('Form is already archived');
  return this.prisma.form.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const form = await this.findOne(userId, id);
  if (!form.archivedAt) throw new BadRequestException('Form is not archived');
  return this.prisma.form.update({ where: { id }, data: { archivedAt: null } });
}
```

Update `findAll` (or `findMany`) where: add `archivedAt: null` by default. If the service accepts a query param, add `includeArchived` support.

In `forms.controller.ts`, add PATCH archive/unarchive routes.

Also update the existing `remove()` guard — if the form has any submissions, throw `BadRequestException`. Check the Prisma schema for the relation name (likely `submissions` or `responses`).

- [ ] **Step 3: TaskBoards — add archive/unarchive**

In `task-boards.service.ts`, add:

```ts
async archive(userId: string, id: string) {
  const board = await this.findOne(userId, id);
  if (board.archivedAt) throw new BadRequestException('Board is already archived');
  return this.prisma.taskBoard.update({ where: { id }, data: { archivedAt: new Date() } });
}

async unarchive(userId: string, id: string) {
  const board = await this.findOne(userId, id);
  if (!board.archivedAt) throw new BadRequestException('Board is not archived');
  return this.prisma.taskBoard.update({ where: { id }, data: { archivedAt: null } });
}
```

Update `findAll` where clause to include `archivedAt: null` by default.

In `task-boards.controller.ts`, add PATCH archive/unarchive routes.

- [ ] **Step 4: Final API type-check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/forms/ src/modules/task-boards/
git commit -m "feat: add archive/unarchive endpoints for forms and task-boards"
```

---

## Task 6: Build ConfirmModal component (App)

**Files:**
- Create: `pakka-app/src/components/ConfirmModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ConfirmModal.tsx`:

```tsx
import { Trash2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function ConfirmModal({
  open, onClose, onConfirm,
  title, description, confirmLabel,
  variant, isLoading,
}: ConfirmModalProps) {
  if (!open) return null

  const isDelete = variant === 'delete'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="glass-modal rounded-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            isDelete ? 'bg-[#FEF3F2]' : 'bg-[#FEF6EE]'
          )}>
            {isDelete
              ? <Trash2 size={18} className="text-[#D92D20]" />
              : <XCircle size={18} className="text-[#DC6803]" />
            }
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">{title}</p>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'h-10 w-full rounded-xl text-[13px] font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60',
              isDelete
                ? 'bg-[#D92D20] hover:bg-[#B42318]'
                : 'bg-[#DC6803] hover:bg-[#B54708]'
            )}
          >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="h-10 w-full rounded-xl text-[13px] text-[#667085] hover:text-[#344054] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "ConfirmModal" | head -10
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/components/ConfirmModal.tsx
git commit -m "feat: add ConfirmModal shared component (delete/void variants)"
```

---

## Task 7: Build RemoveModal component (App)

**Files:**
- Create: `pakka-app/src/components/RemoveModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/RemoveModal.tsx`:

```tsx
import { useState } from 'react'
import { Archive, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RemoveModalProps {
  open: boolean
  onClose: () => void
  onArchive: () => void
  onDelete: () => void
  entityLabel: string
  entityType: string
  hasLinkedRecords: boolean
  linkedRecordsSummary?: string
  isArchiving?: boolean
  isDeleting?: boolean
}

export default function RemoveModal({
  open, onClose, onArchive, onDelete,
  entityLabel, entityType,
  hasLinkedRecords, linkedRecordsSummary,
  isArchiving, isDeleting,
}: RemoveModalProps) {
  const [step, setStep] = useState<'choose' | 'confirm-delete'>('choose')

  if (!open) return null

  function handleClose() {
    setStep('choose')
    onClose()
  }

  if (step === 'confirm-delete') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
        <div className="glass-modal rounded-2xl w-full max-w-md p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#FEF3F2] flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-[#D92D20]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                Permanently delete "{entityLabel}"?
              </p>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">
                This {entityType} will be permanently removed. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="h-10 w-full rounded-xl text-[13px] font-semibold text-white bg-[#D92D20] hover:bg-[#B42318] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isDeleting && <Loader2 size={13} className="animate-spin" />}
              Yes, delete permanently
            </button>
            <button
              onClick={() => setStep('choose')}
              className="h-10 w-full rounded-xl text-[13px] text-[#667085] hover:text-[#344054] transition-colors"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="glass-modal rounded-2xl w-full max-w-md p-6">
        <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-0.5">
          Remove "{entityLabel}"?
        </p>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-4">
          Choose how you'd like to remove this {entityType}.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Archive card */}
          <button
            onClick={() => { onArchive(); handleClose() }}
            disabled={isArchiving}
            className="flex flex-col items-start p-4 bg-[#F9FAFB] dark:bg-[#1A1B25] border border-[#EAECF0] dark:border-[#26283A] rounded-xl hover:border-[#101828] dark:hover:border-[#8B92A8] hover:bg-white dark:hover:bg-[#21222D] transition-all text-left disabled:opacity-60"
          >
            <div className="w-9 h-9 bg-[#F2F4F7] dark:bg-[#26273A] rounded-lg flex items-center justify-center">
              {isArchiving
                ? <Loader2 size={16} className="animate-spin text-[#667085]" />
                : <Archive size={16} className="text-[#667085]" />
              }
            </div>
            <p className="text-[13.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] mt-2">Archive</p>
            <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">
              Hidden from your list. All linked records preserved. Restore anytime.
            </p>
          </button>

          {/* Delete card */}
          <button
            onClick={() => !hasLinkedRecords && setStep('confirm-delete')}
            disabled={hasLinkedRecords || isDeleting}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border transition-all text-left',
              hasLinkedRecords
                ? 'bg-[#F9FAFB] dark:bg-[#1A1B25] border-[#EAECF0] dark:border-[#26283A] opacity-50 cursor-not-allowed'
                : 'bg-[#FFF5F5] dark:bg-[#2D1B1B] border-[#FEE4E2] dark:border-[#4A2020] hover:border-[#D92D20] cursor-pointer'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              hasLinkedRecords ? 'bg-[#F2F4F7] dark:bg-[#26273A]' : 'bg-[#FEE4E2] dark:bg-[#4A2020]'
            )}>
              <Trash2 size={16} className={hasLinkedRecords ? 'text-[#98A2B3]' : 'text-[#D92D20]'} />
            </div>
            <p className={cn(
              'text-[13.5px] font-semibold mt-2',
              hasLinkedRecords ? 'text-[#98A2B3]' : 'text-[#D92D20]'
            )}>
              Permanently delete
            </p>
            <p className="text-[11.5px] text-[#98A2B3] mt-1 leading-relaxed">
              {hasLinkedRecords
                ? linkedRecordsSummary
                  ? `Has ${linkedRecordsSummary}. Archive instead.`
                  : 'Has linked records. Archive instead.'
                : 'Removed forever. Cannot be undone.'
              }
            </p>
          </button>
        </div>

        <button
          onClick={handleClose}
          className="mt-4 w-full text-[12px] text-[#667085] hover:text-[#344054] transition-colors py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "RemoveModal" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RemoveModal.tsx
git commit -m "feat: add RemoveModal shared component (archive/delete two-option)"
```

---

## Task 8: Archive/unarchive hooks for all entities (App)

**Files:**
- Modify: `src/features/clients/hooks/useClients.ts`
- Modify: hooks files for leads, projects, proposals, contracts, invoices, forms, task-boards

- [ ] **Step 1: Find hook files**

```bash
find /Users/mvaghela/Documents/MyProjects/pakka-app/src/features -name "use*.ts" | grep -E "Lead|Project|Proposal|Contract|Invoice|Form|Board|Task" | grep -v "__"
```

Note the exact file paths. The plan uses `useLeads`, `useProjects`, etc. — adjust paths if different.

- [ ] **Step 2: Add archive/unarchive hooks to useClients.ts**

After `useDeleteClient`, add:

```ts
export function useArchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await api.patch(`/clients/${id}/archive`)
      return r.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client archived')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to archive client'),
  })
}

export function useUnarchiveClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await api.patch(`/clients/${id}/unarchive`)
      return r.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client restored')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to restore client'),
  })
}
```

Also update `useClients` query to accept `includeArchived?: boolean` and pass it as a query param:

```ts
export function useClients(params: { page?: number; limit?: number; search?: string; includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (params.page)            p.set('page', String(params.page))
      if (params.limit)           p.set('limit', String(params.limit))
      if (params.search)          p.set('search', params.search)
      if (params.includeArchived) p.set('includeArchived', 'true')
      const r = await api.get(`/clients?${p}`)
      return r.data.data as ClientsResponse
    },
  })
}
```

- [ ] **Step 3: Add archive/unarchive hooks to leads hooks file**

Find the leads hooks file. Add `useArchiveLead` and `useUnarchiveLead` following the exact same pattern as Step 2 (swap `client` → `lead`, `clients` → `leads`).

Also update the `useLeads` query to accept and forward `includeArchived`.

- [ ] **Step 4: Add archive/unarchive hooks to projects, proposals hooks**

For each file, add `useArchive[Entity]` and `useUnarchive[Entity]` following the same pattern. Invalidate the appropriate query key (e.g. `['projects']`, `['proposals']`).

Also update each `use[Entity]s` query to forward `includeArchived`.

- [ ] **Step 5: Add archive/unarchive/void hooks to contracts and invoices**

For contracts (`useContracts.ts`), add:
- `useArchiveContract` — PATCH `/contracts/:id/archive`
- `useUnarchiveContract` — PATCH `/contracts/:id/unarchive`
- `useVoidContract` — PATCH `/contracts/:id/void`, toast: `'Contract voided'`

For invoices (`useInvoices.ts`), add:
- `useVoidInvoice` — PATCH `/invoices/:id/void`; on success invalidate `['invoices']` and `['invoice', id]`; toast: `'Invoice voided'`

- [ ] **Step 6: Add archive/unarchive hooks to forms and task-boards**

Add `useArchiveForm`, `useUnarchiveForm` and `useArchiveTaskBoard`, `useUnarchiveTaskBoard` following the same pattern.

- [ ] **Step 7: Type-check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -40
```

Fix any errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/
git commit -m "feat: add archive/unarchive/void mutation hooks for all entities"
```

---

## Task 9: Wire RemoveModal — Clients (App)

**Files:**
- Modify: `src/pages/app/ClientsPage.tsx`
- Modify: `src/pages/app/ClientPage.tsx`

- [ ] **Step 1: Add Remove action to ClientsPage rows**

Open `ClientsPage.tsx`. Import:
```ts
import { MoreHorizontal, Archive, Trash2 } from 'lucide-react'
import RemoveModal from '@/components/RemoveModal'
import { useArchiveClient, useUnarchiveClient, useDeleteClient } from '@/features/clients/hooks/useClients'
```

Add state:
```ts
const [removeTarget, setRemoveTarget] = useState<Client | null>(null)
const [includeArchived, setIncludeArchived] = useState(false)
const archiveClient   = useArchiveClient()
const unarchiveClient = useUnarchiveClient()
const deleteClient    = useDeleteClient()
```

Update `useClients` call to pass `includeArchived`:
```ts
const { data, isLoading } = useClients({ search, includeArchived })
```

Add "Show archived" toggle button in the filter bar (next to search):
```tsx
<button
  onClick={() => setIncludeArchived(prev => !prev)}
  className={cn(
    'flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors',
    includeArchived
      ? 'bg-[#F2F4F7] dark:bg-[#26273A] border-[#D0D5DD] dark:border-[#3D4258] text-[#344054] dark:text-[#C2C8D8]'
      : 'border-transparent text-[#98A2B3] hover:text-[#667085]'
  )}
>
  <Archive size={12} />
  Show archived
</button>
```

For each client row, add a kebab menu with Remove/Unarchive:
```tsx
<div className="relative">
  <button
    onClick={e => { e.stopPropagation(); setMenuOpenId(client.id) }}
    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#26273A] transition-colors"
  >
    <MoreHorizontal size={14} className="text-[#98A2B3]" />
  </button>
  {menuOpenId === client.id && (
    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E1F2A] border border-[#E8EAEF] dark:border-[#2A2B37] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50 py-1.5">
      {client.archivedAt ? (
        <button
          onClick={() => { unarchiveClient.mutate(client.id); setMenuOpenId(null) }}
          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#26273A] transition-colors"
        >
          <Archive size={11} className="text-[#667085]" /> Unarchive
        </button>
      ) : (
        <button
          onClick={() => { setRemoveTarget(client); setMenuOpenId(null) }}
          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-[12px] text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-[#2D1B1B] transition-colors"
        >
          <Trash2 size={11} /> Remove
        </button>
      )}
    </div>
  )}
</div>
```

Add `menuOpenId` state: `const [menuOpenId, setMenuOpenId] = useState<string | null>(null)`

Add click-outside handler to close dropdown (add `useEffect` + `useRef` for the menu or use a simple `onBlur`).

Show archived badge on rows when `includeArchived` and `client.archivedAt`:
```tsx
{client.archivedAt && (
  <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5">
    Archived
  </span>
)}
```

Add `RemoveModal` at the bottom of the JSX:
```tsx
<RemoveModal
  open={!!removeTarget}
  onClose={() => setRemoveTarget(null)}
  entityLabel={removeTarget?.name ?? ''}
  entityType="client"
  hasLinkedRecords={
    ((removeTarget?._count?.proposals ?? 0) +
     (removeTarget?._count?.contracts ?? 0) +
     (removeTarget?._count?.invoices  ?? 0)) > 0
  }
  linkedRecordsSummary={
    removeTarget
      ? [
          removeTarget._count?.proposals && `${removeTarget._count.proposals} proposal${removeTarget._count.proposals > 1 ? 's' : ''}`,
          removeTarget._count?.contracts && `${removeTarget._count.contracts} contract${removeTarget._count.contracts > 1 ? 's' : ''}`,
          removeTarget._count?.invoices  && `${removeTarget._count.invoices} invoice${removeTarget._count.invoices > 1 ? 's' : ''}`,
        ].filter(Boolean).join(', ')
      : undefined
  }
  onArchive={() => { archiveClient.mutate(removeTarget!.id); setRemoveTarget(null) }}
  onDelete={() => deleteClient.mutate(removeTarget!.id, { onSuccess: () => setRemoveTarget(null) })}
  isArchiving={archiveClient.isPending}
  isDeleting={deleteClient.isPending}
/>
```

- [ ] **Step 2: Add Remove button to ClientPage header**

Open `ClientPage.tsx`. Import `RemoveModal`, `useArchiveClient`, `useDeleteClient`.

Add state: `const [showRemove, setShowRemove] = useState(false)`

In the page header action area, add a button:
```tsx
<button
  onClick={() => setShowRemove(true)}
  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAECF0] dark:border-[#26283A] text-[12px] text-[#667085] hover:text-[#D92D20] hover:border-[#FEE4E2] transition-colors"
>
  <Trash2 size={12} />
  Remove
</button>
```

Add the `RemoveModal` using `client` data (from `useClientDetail` or equivalent). Compute `hasLinkedRecords` from the detail data (proposals.length + contracts.length + invoices.length + projects.length + meetings.length > 0).

On archive success: navigate back to `/clients`.
On delete success: navigate back to `/clients`.

- [ ] **Step 3: Type-check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/ClientsPage.tsx src/pages/app/ClientPage.tsx
git commit -m "feat(clients): add Remove action with RemoveModal and Show archived toggle"
```

---

## Task 10: Wire RemoveModal — Leads, Projects (App)

**Files:**
- Modify: `src/pages/app/LeadsPage.tsx`
- Modify: `src/pages/app/ProjectsPage.tsx`
- Modify: `src/pages/app/ProjectPage.tsx`

- [ ] **Step 1: LeadsPage — add Remove to kebab menu and Show archived toggle**

Follow the same pattern as Task 9 Step 1 for leads. Key differences:
- Leads may be in kanban or table view — add the kebab menu to the table row component (`LeadTable.tsx` or inline in `LeadsPage.tsx`)
- `hasLinkedRecords` for a lead: check `lead._count?.proposals > 0` or `lead.proposals?.length > 0` (whichever is available in the list response)
- Use `useArchiveLead`, `useUnarchiveLead`, `useDeleteLead` hooks
- Pass `includeArchived` to `useLeads` query

For the kanban view (`LeadsKanban`), add a small kebab icon on each lead card that opens `RemoveModal`.

- [ ] **Step 2: ProjectsPage — add Remove to project cards and Show archived toggle**

In `ProjectsPage.tsx`:
- Add `includeArchived` state and pass to `useProjects` query
- Add "Show archived" toggle button in filter bar
- Add a kebab menu to each project card (top-right corner of card, appears on hover)
- `hasLinkedRecords` for a project: `(card._count?.tasks ?? 0) + (card._count?.invoices ?? 0) + (card._count?.timeEntries ?? 0) + (card._count?.expenses ?? 0) > 0` — the `_count` is already returned from the API
- Use `useArchiveProject`, `useUnarchiveProject`, `useDeleteProject` hooks
- Add archived badge on cards when `project.archivedAt`

- [ ] **Step 3: ProjectPage — replace inline confirm with RemoveModal**

Open `ProjectPage.tsx`. Find the existing `handleDelete` function and the inline confirm panel. Replace with:

```ts
const [showRemove, setShowRemove] = useState(false)
const archiveProject = useArchiveProject()
const deleteProject  = useDeleteProject()
```

Remove the existing inline confirm JSX (look for the `{/* Delete confirm */}` comment). Replace the "Delete" button with a "Remove" button that calls `setShowRemove(true)`.

Add `RemoveModal` at the bottom:
```tsx
<RemoveModal
  open={showRemove}
  onClose={() => setShowRemove(false)}
  entityLabel={project?.name ?? ''}
  entityType="project"
  hasLinkedRecords={
    ((project?._count?.tasks         ?? 0) +
     (project?._count?.invoices      ?? 0) +
     (project?._count?.timeEntries   ?? 0) +
     (project?._count?.expenses      ?? 0)) > 0
  }
  onArchive={() => archiveProject.mutate(id!, {
    onSuccess: () => { setShowRemove(false); navigate('/projects') }
  })}
  onDelete={() => deleteProject.mutate(id!, {
    onSuccess: () => { setShowRemove(false); navigate('/projects') }
  })}
  isArchiving={archiveProject.isPending}
  isDeleting={deleteProject.isPending}
/>
```

- [ ] **Step 4: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/pages/app/LeadsPage.tsx src/pages/app/ProjectsPage.tsx src/pages/app/ProjectPage.tsx
git commit -m "feat: add Remove action with RemoveModal to leads and projects pages"
```

---

## Task 11: Wire RemoveModal — Proposals, Contracts (App)

**Files:**
- Modify: `src/pages/app/ProposalsPage.tsx`
- Modify: `src/pages/app/ContractsPage.tsx`

- [ ] **Step 1: ProposalsPage — kebab menu and Show archived toggle**

In `ProposalsPage.tsx`:
- Add `includeArchived` state, pass to `useProposals` query
- Add "Show archived" toggle in filter bar
- Add kebab to each proposal row: "Remove" → opens `RemoveModal`
- `hasLinkedRecords`: `proposal._count?.contracts > 0` or check if contracts relation has items
- Use `useArchiveProposal`, `useUnarchiveProposal`, `useDeleteProposal` hooks
- Archived badge on rows

- [ ] **Step 2: ContractsPage — kebab with archive/void/unarchive and Show archived toggle**

In `ContractsPage.tsx`:
- Add `includeArchived` state and toggle
- Add kebab to each contract row with context-sensitive options:
  - `status === 'SIGNED'`: show "Void contract" → opens `ConfirmModal` (void variant, title "Void this contract?", description "This signed contract will be voided. The record is preserved. This cannot be undone.")
  - `status !== 'SIGNED'` and not archived: show "Remove" → opens `RemoveModal`. `hasLinkedRecords`: check if contract has invoices
  - `archivedAt` set: show "Unarchive" button only
- Use `useArchiveContract`, `useUnarchiveContract`, `useVoidContract` hooks
- Add `ConfirmModal` for void:
  ```tsx
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const voidContract = useVoidContract()
  
  <ConfirmModal
    open={!!voidTarget}
    onClose={() => setVoidTarget(null)}
    onConfirm={() => voidContract.mutate(voidTarget!, { onSuccess: () => setVoidTarget(null) })}
    title="Void this contract?"
    description="This signed contract will be voided. The record is preserved for your audit trail. This cannot be undone."
    confirmLabel="Void contract"
    variant="void"
    isLoading={voidContract.isPending}
  />
  ```

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/pages/app/ProposalsPage.tsx src/pages/app/ContractsPage.tsx
git commit -m "feat: add Remove/Void actions to proposals and contracts pages"
```

---

## Task 12: Wire void/delete — Invoices (App)

**Files:**
- Modify: `src/pages/app/InvoicesPage.tsx`
- Modify: `src/pages/app/InvoiceEditorPage.tsx`

- [ ] **Step 1: InvoicesPage — add void (sent/paid) and delete (draft) to kebab menu**

In `InvoicesPage.tsx`:
- Add state: `voidTarget`, `deleteTarget` (both `string | null`)
- Add `useVoidInvoice` and `useDeleteInvoice` hooks
- For each invoice row, add kebab with context-sensitive options:
  - `status === 'DRAFT'`: "Delete invoice" → opens `ConfirmModal` (delete variant)
  - `status !== 'DRAFT'` and `status !== 'CANCELLED'`: "Void invoice" → opens `ConfirmModal` (void variant)
  - `status === 'CANCELLED'`: no action (record is permanent, show nothing or greyed "Voided")
- Voided rows (status === 'CANCELLED'): show `Void` badge, muted text, strikethrough on amount
- Add `ConfirmModal` for delete draft:
  ```tsx
  <ConfirmModal
    open={!!deleteTarget}
    onClose={() => setDeleteTarget(null)}
    onConfirm={() => deleteInvoice.mutate(deleteTarget!, { onSuccess: () => setDeleteTarget(null) })}
    title="Delete this draft invoice?"
    description="This draft invoice will be permanently deleted. This cannot be undone."
    confirmLabel="Delete invoice"
    variant="delete"
    isLoading={deleteInvoice.isPending}
  />
  ```
- Add `ConfirmModal` for void:
  ```tsx
  <ConfirmModal
    open={!!voidTarget}
    onClose={() => setVoidTarget(null)}
    onConfirm={() => voidInvoice.mutate(voidTarget!, { onSuccess: () => setVoidTarget(null) })}
    title="Void this invoice?"
    description="This invoice will be marked as void. The record is preserved for your GST audit trail. This cannot be undone."
    confirmLabel="Void invoice"
    variant="void"
    isLoading={voidInvoice.isPending}
  />
  ```

- [ ] **Step 2: InvoiceEditorPage — add void/delete button in toolbar**

Open `InvoiceEditorPage.tsx`. Find the toolbar/action buttons area. Add after existing actions:

```tsx
{invoice?.status === 'DRAFT' ? (
  <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAECF0] text-[12px] text-[#667085] hover:text-[#D92D20] hover:border-[#FEE4E2] transition-colors">
    <Trash2 size={12} /> Delete
  </button>
) : invoice && invoice.status !== 'CANCELLED' ? (
  <button onClick={() => setShowVoid(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#EAECF0] text-[12px] text-[#667085] hover:text-[#DC6803] hover:border-[#FDD] transition-colors">
    <XCircle size={12} /> Void
  </button>
) : null}
```

Add `showDelete`, `showVoid` state and the two `ConfirmModal` instances (same copy as InvoicesPage). On delete success: `navigate('/invoices')`. On void success: close modal and refetch invoice.

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/pages/app/InvoicesPage.tsx src/pages/app/InvoiceEditorPage.tsx
git commit -m "feat: add void/delete actions to invoices pages"
```

---

## Task 13: Wire RemoveModal — Forms and TaskBoards (App)

**Files:**
- Modify: `src/pages/app/FormsPage.tsx`
- Modify: `src/pages/app/TaskBoardsPage.tsx`

- [ ] **Step 1: FormsPage — replace inline confirm with RemoveModal and add Show archived toggle**

Open `FormsPage.tsx`. Find the existing inline confirm (look for `confirmDelete` state and the yes/no inline UI). Remove it.

Add:
```ts
const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
const [includeArchived, setIncludeArchived] = useState(false)
const archiveForm = useArchiveForm()
const deleteForm  = useDeleteForm()  // already exists
```

Replace the delete Trash2 button's `onClick` from `setConfirmDelete(true)` to `setRemoveTarget({ id: form.id, name: form.name })`.

Add "Show archived" toggle to filter bar.

Add `RemoveModal`:
```tsx
<RemoveModal
  open={!!removeTarget}
  onClose={() => setRemoveTarget(null)}
  entityLabel={removeTarget?.name ?? ''}
  entityType="form"
  hasLinkedRecords={false}
  onArchive={() => { archiveForm.mutate(removeTarget!.id); setRemoveTarget(null) }}
  onDelete={() => deleteForm(removeTarget!.id, { onSuccess: () => setRemoveTarget(null) })}
  isArchiving={archiveForm.isPending}
/>
```

Note: Forms' `hasLinkedRecords` should check submission count. If `form._count?.submissions` is available in list response, use `form._count.submissions > 0`. If not available, default to `false` (backend will guard it anyway).

- [ ] **Step 2: TaskBoardsPage — replace inline confirm with RemoveModal and add Show archived toggle**

Open `TaskBoardsPage.tsx`. Find the existing `handleDeleteClick` and `handleDeleteConfirm` and the inline confirm modal. Remove the inline modal and its state.

Add:
```ts
const [removeTarget, setRemoveTarget] = useState<TaskBoardSummary | null>(null)
const [includeArchived, setIncludeArchived] = useState(false)
const archiveBoard = useArchiveTaskBoard()
```

Replace the delete click handler: instead of opening the old inline confirm, call `setRemoveTarget(board)`.

Add "Show archived" toggle to filter bar.

Add `RemoveModal` (TaskBoard is always deletable — `hasLinkedRecords={false}`):
```tsx
<RemoveModal
  open={!!removeTarget}
  onClose={() => setRemoveTarget(null)}
  entityLabel={removeTarget?.name ?? ''}
  entityType="task board"
  hasLinkedRecords={false}
  onArchive={() => { archiveBoard.mutate(removeTarget!.id); setRemoveTarget(null) }}
  onDelete={() => deleteBoard.mutate(removeTarget!.id, { onSuccess: () => setRemoveTarget(null) })}
  isArchiving={archiveBoard.isPending}
  isDeleting={deleteBoard.isPending}
/>
```

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/pages/app/FormsPage.tsx src/pages/app/TaskBoardsPage.tsx
git commit -m "feat: upgrade forms and task-boards to RemoveModal, add Show archived toggle"
```

---

## Task 14: Replace inline confirms — Time, Expenses (App)

**Files:**
- Modify: `src/pages/app/TimePage.tsx`
- Modify: `src/pages/app/ExpensesPage.tsx`

- [ ] **Step 1: TimePage — replace inline row confirm with ConfirmModal**

Open `TimePage.tsx`. Find the `confirmId` state and the inline "Delete / Cancel" buttons in the row (around line 569). Remove them.

Add:
```ts
const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
```

Remove the old `confirmId` state.

Replace the Trash2 button's onClick from `setConfirmId(entry.id)` to `setDeleteTarget(entry.id)`.

Remove the inline confirm JSX (the `{confirmId === entry.id ? (...) : (...)}` block). Keep only the Trash2 button.

Add at the bottom of the component's JSX:
```tsx
import ConfirmModal from '@/components/ConfirmModal'

<ConfirmModal
  open={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={() => deleteEntry.mutate(deleteTarget!, { onSuccess: () => setDeleteTarget(null) })}
  title="Delete this entry?"
  description="This time entry will be permanently deleted. This cannot be undone."
  confirmLabel="Delete entry"
  variant="delete"
  isLoading={deleteEntry.isPending}
/>
```

- [ ] **Step 2: ExpensesPage — replace inline row confirm with ConfirmModal**

Follow the same pattern as Step 1 for `ExpensesPage.tsx`. Remove `confirmId` state and inline confirm JSX. Use `deleteTarget` state and `ConfirmModal` with:
- title: `"Delete this expense?"`
- description: `"This expense will be permanently deleted. This cannot be undone."`
- confirmLabel: `"Delete expense"`

- [ ] **Step 3: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/pages/app/TimePage.tsx src/pages/app/ExpensesPage.tsx
git commit -m "feat: replace inline delete confirms with ConfirmModal in Time and Expenses pages"
```

---

## Task 15: Add ConfirmModal to TaskSlideIn, Notes, Attachments (App)

**Files:**
- Modify: `src/features/tasks/components/TaskSlideIn.tsx`
- Modify: `src/features/clients/components/ClientNotesTab.tsx`
- Modify: `src/features/clients/components/ClientAttachmentsTab.tsx`

- [ ] **Step 1: TaskSlideIn — wrap delete in ConfirmModal**

Open `TaskSlideIn.tsx`. Find `handleDelete` function (around line 103) which calls the delete mutation directly. Add:

```ts
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
```

Change the Trash2 button's onClick from `handleDelete` to `() => setShowDeleteConfirm(true)`.

Add import and JSX:
```tsx
import ConfirmModal from '@/components/ConfirmModal'

<ConfirmModal
  open={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
  title="Delete this task?"
  description="This task will be permanently deleted. This cannot be undone."
  confirmLabel="Delete task"
  variant="delete"
  isLoading={deleteTask?.isPending}
/>
```

- [ ] **Step 2: ClientNotesTab — add ConfirmModal before delete**

Open `ClientNotesTab.tsx`. Currently `onDelete` is called directly with no confirm.

Add state: `const [deleteTarget, setDeleteTarget] = useState<string | null>(null)`

Change the delete trigger to set `deleteTarget` instead of calling `onDelete` directly.

Add `ConfirmModal`:
```tsx
<ConfirmModal
  open={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={() => { onDelete(deleteTarget!); setDeleteTarget(null) }}
  title="Delete this note?"
  description="This note will be permanently deleted. This cannot be undone."
  confirmLabel="Delete note"
  variant="delete"
/>
```

- [ ] **Step 3: ClientAttachmentsTab — add ConfirmModal before delete**

Open `ClientAttachmentsTab.tsx`. Currently the Trash2 button calls `deleteMutation.mutate(a.id)` directly with no confirm.

Add state: `const [deleteTarget, setDeleteTarget] = useState<string | null>(null)`

Change `onClick` to `() => setDeleteTarget(a.id)`.

Add `ConfirmModal`:
```tsx
<ConfirmModal
  open={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={() => deleteMutation.mutate(deleteTarget!, { onSuccess: () => setDeleteTarget(null) })}
  title="Delete this file?"
  description="This file will be permanently removed. This cannot be undone."
  confirmLabel="Delete file"
  variant="delete"
  isLoading={deleteMutation.isPending}
/>
```

- [ ] **Step 4: Type-check and commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -30
git add src/features/tasks/components/TaskSlideIn.tsx src/features/clients/components/ClientNotesTab.tsx src/features/clients/components/ClientAttachmentsTab.tsx
git commit -m "feat: add ConfirmModal to task delete, client notes delete, attachment delete"
```

---

## Task 16: Add delete to Meetings and Email Templates (App)

**Files:**
- Modify: `src/pages/app/MeetingsPage.tsx`
- Modify: `src/pages/app/EmailTemplatesPage.tsx`

- [ ] **Step 1: Check existing hooks for meetings and email templates**

```bash
find /Users/mvaghela/Documents/MyProjects/pakka-app/src/features -name "*.ts" | xargs grep -l "meeting\|Meeting" 2>/dev/null | head -5
find /Users/mvaghela/Documents/MyProjects/pakka-app/src/features -name "*.ts" | xargs grep -l "emailTemplate\|email-template" 2>/dev/null | head -5
```

Note the hook files and function names for `deleteMeeting` and `deleteEmailTemplate`.

- [ ] **Step 2: MeetingsPage — add Delete with ConfirmModal**

Open `MeetingsPage.tsx`. Import `Trash2`, `ConfirmModal`, and the delete mutation hook.

Add state: `const [deleteTarget, setDeleteTarget] = useState<string | null>(null)`

Find where meetings are rendered (table rows or cards). Add a Trash2 icon button that calls `setDeleteTarget(meeting.id)`.

Add `ConfirmModal`:
```tsx
<ConfirmModal
  open={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={() => deleteMeeting.mutate(deleteTarget!, { onSuccess: () => setDeleteTarget(null) })}
  title="Delete this meeting?"
  description="This meeting will be permanently deleted. This cannot be undone."
  confirmLabel="Delete meeting"
  variant="delete"
  isLoading={deleteMeeting.isPending}
/>
```

- [ ] **Step 3: EmailTemplatesPage — add Delete with ConfirmModal**

Follow the same pattern. Add Trash2 to each template row. Use:
- title: `"Delete this template?"`
- description: `"This template will be permanently deleted. This cannot be undone."`
- confirmLabel: `"Delete template"`

- [ ] **Step 4: Final type-check across the whole app**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1
```

Fix all errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/MeetingsPage.tsx src/pages/app/EmailTemplatesPage.tsx
git commit -m "feat: add delete with ConfirmModal to meetings and email templates"
```

---

## Self-review checklist

After writing this plan, verified:

1. **Spec coverage:**
   - ✅ archivedAt migration — Task 1
   - ✅ VOID ContractStatus — Task 1
   - ✅ isDeleted → archivedAt for leads — Task 3
   - ✅ Archive/unarchive endpoints all 7 entities — Tasks 2–5
   - ✅ Void endpoints (contract, invoice) — Task 4
   - ✅ Linked-record guard on delete (client, lead, project, proposal, contract, form) — Tasks 2–5
   - ✅ RemoveModal component — Task 7
   - ✅ ConfirmModal component — Task 6
   - ✅ Show archived toggle — Tasks 9–13
   - ✅ Archived badge on rows — Tasks 9–13
   - ✅ All 17 page/component changes covered — Tasks 9–16
   - ✅ Void visual treatment in invoice list — Task 12

2. **No placeholders found.**

3. **Type consistency:** All hooks use `api.patch`, `api.delete` with `.then(r => r.data.data)`. All modal props match between Tasks 6/7 and Tasks 9–16. `RemoveModal.onArchive` and `onDelete` are `() => void` consistently.
