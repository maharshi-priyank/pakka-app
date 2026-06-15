# Workspace Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate ClearWork from a single-workspace-per-user model to a true multi-workspace architecture using ID-aliasing (zero data backfill).

**Architecture:** Create `Workspace` + `WorkspaceMember` tables (workspace.id = user.id for all existing users), rename `userId → workspaceId` on 28 entity tables, replace `effectiveUserId()` with a DB-backed `resolveWorkspaceId()` resolver, then add workspace switcher UI.

**Tech Stack:** NestJS + Prisma v7 + PostgreSQL (Supabase), React + Vite + TanStack Query v5 + Tailwind v4

**Supabase migration pattern:** Write SQL → `npx prisma db execute --file <file> --schema prisma/schema.prisma` → `npx prisma migrate resolve --applied <name>` → `npx prisma generate`

---

## File Map

### New files — API
- `prisma/migrations/20260615_phase1_workspace_tables/migration.sql` — Phase 1 forward migration
- `prisma/migrations/20260615_phase1_workspace_tables/rollback.sql` — Phase 1 rollback
- `prisma/migrations/20260615_phase2_rename_entity_columns/migration.sql` — Phase 2 forward
- `prisma/migrations/20260615_phase2_rename_entity_columns/rollback.sql` — Phase 2 rollback
- `prisma/migrations/20260615_phase3_team_invite_rename/migration.sql` — Phase 3d forward
- `prisma/migrations/20260615_phase3_team_invite_rename/rollback.sql` — Phase 3d rollback
- `prisma/migrations/20260615_phase3_user_cleanup/migration.sql` — Phase 3e forward
- `prisma/migrations/20260615_phase3_user_cleanup/rollback.sql` — Phase 3e rollback
- `src/modules/workspaces/workspaces.module.ts`
- `src/modules/workspaces/workspaces.controller.ts`
- `src/modules/workspaces/workspaces.service.ts`
- `src/modules/workspaces/workspace.resolver.ts` — `resolveWorkspaceId()` function
- `src/modules/workspaces/dto/create-workspace.dto.ts`
- `src/modules/workspaces/dto/update-workspace.dto.ts`

### Modified files — API
- `prisma/schema.prisma` — add Workspace/WorkspaceMember, rename userId→workspaceId on 28 models, remove ownerId from User, add activeWorkspaceId to User
- `src/app.module.ts` — register WorkspacesModule
- `src/modules/users/users.service.ts` — getMe returns workspace fields via join; add updateActiveWorkspace
- `src/modules/users/users.controller.ts` — add PATCH /users/active-workspace
- `src/modules/team/team.service.ts` — replace ownerId with WorkspaceMember rows
- All 15 entity controllers — remove `effectiveUserId(user)`, pass `user` to service
- All 15 entity services — change `(userId: string)` → `(user: UserRef)`, call `resolveWorkspaceId`
- Gap services (meetings, expenses, time-entries, reports, automations) — same service update

### New files — App
- `src/features/workspaces/hooks/useWorkspaces.ts` — workspace API hooks
- `src/features/workspaces/components/WorkspaceSwitcher.tsx`
- `src/features/workspaces/components/CreateWorkspaceModal.tsx`

### Modified files — App
- `src/components/layout/Sidebar.tsx` — add WorkspaceSwitcher before user section
- `src/contexts/WorkspaceContext.tsx` — read from workspace API instead of profile
- `src/features/settings/hooks/useProfile.ts` — add activeWorkspaceId; remove workspace fields post-Phase 4
- `src/features/settings/components/BusinessTab.tsx` — use workspace endpoints

---

## Task 1: Phase 1 DB migration — create workspaces + workspace_members tables

**Files:**
- Create: `prisma/migrations/20260615_phase1_workspace_tables/migration.sql`
- Create: `prisma/migrations/20260615_phase1_workspace_tables/rollback.sql`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Create migration directory and write forward SQL**

```bash
mkdir -p /Users/mvaghela/Documents/MyProjects/pakka-api/prisma/migrations/20260615_phase1_workspace_tables
```

Write `prisma/migrations/20260615_phase1_workspace_tables/migration.sql`:

```sql
-- Phase 1: Add Workspace + WorkspaceMember tables + active_workspace_id on users
-- Additive only — no existing columns changed

CREATE TABLE workspaces (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  logo_url            TEXT,
  business_name       TEXT,
  gst_number          TEXT,
  pan_number          TEXT,
  business_type       TEXT,
  razorpay_account_id TEXT,
  razorpay_key_id     TEXT,
  razorpay_key_secret TEXT,
  bank_name           TEXT,
  bank_account_name   TEXT,
  bank_account_number TEXT,
  bank_ifsc           TEXT,
  upi_id              TEXT,
  upi_qr_url          TEXT,
  country             TEXT,
  currency            TEXT,
  tax_label           TEXT,
  iban_number         TEXT,
  swift_code          TEXT,
  routing_number      TEXT,
  default_hsn_sac     TEXT,
  default_lut_number  TEXT,
  email_signature     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);
CREATE INDEX idx_workspace_members_user_id      ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- Add active_workspace_id to users (nullable — set when user switches workspace)
ALTER TABLE users ADD COLUMN active_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;

-- Seed workspaces from existing owner users
INSERT INTO workspaces (
  id, name, logo_url, business_name, gst_number, pan_number, business_type,
  razorpay_account_id, razorpay_key_id, razorpay_key_secret,
  bank_name, bank_account_name, bank_account_number, bank_ifsc,
  upi_id, upi_qr_url, country, currency, tax_label,
  iban_number, swift_code, routing_number,
  default_hsn_sac, default_lut_number, email_signature,
  created_at, updated_at
)
SELECT
  id,
  COALESCE(business_name, name),
  logo_url, business_name, gst_number, pan_number, business_type,
  razorpay_account_id, razorpay_key_id, razorpay_key_secret,
  bank_name, bank_account_name, bank_account_number, bank_ifsc,
  upi_id, upi_qr_url, country, currency, tax_label,
  iban_number, swift_code, routing_number,
  default_hsn_sac, default_lut_number, email_signature,
  created_at, updated_at
FROM users
WHERE owner_id IS NULL;

-- Seed WorkspaceMember: owners
INSERT INTO workspace_members (id, user_id, workspace_id, role, joined_at)
SELECT gen_random_uuid()::text, id, id, 'OWNER', created_at
FROM users WHERE owner_id IS NULL;

-- Seed WorkspaceMember: team members join their owner's workspace
INSERT INTO workspace_members (id, user_id, workspace_id, role, joined_at)
SELECT gen_random_uuid()::text, id, owner_id, 'MEMBER', created_at
FROM users WHERE owner_id IS NOT NULL;

-- Set active_workspace_id for each user to their primary workspace
UPDATE users u
SET active_workspace_id = COALESCE(u.owner_id, u.id)
WHERE EXISTS (SELECT 1 FROM workspaces w WHERE w.id = COALESCE(u.owner_id, u.id));
```

- [ ] **Step 2: Write rollback SQL**

Write `prisma/migrations/20260615_phase1_workspace_tables/rollback.sql`:

```sql
-- Phase 1 rollback: remove workspace tables and active_workspace_id
ALTER TABLE users DROP COLUMN IF EXISTS active_workspace_id;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
```

- [ ] **Step 3: Run the forward migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260615_phase1_workspace_tables/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260615_phase1_workspace_tables
```

- [ ] **Step 4: Verify row counts**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT
  (SELECT COUNT(*) FROM users WHERE owner_id IS NULL) AS owner_users,
  (SELECT COUNT(*) FROM workspaces)                   AS workspaces,
  (SELECT COUNT(*) FROM workspace_members WHERE role = 'OWNER') AS owner_members,
  (SELECT COUNT(*) FROM workspace_members WHERE role = 'MEMBER') AS team_members,
  (SELECT COUNT(*) FROM users WHERE owner_id IS NOT NULL) AS team_users;
SQL
```

Expected: `owner_users = workspaces = owner_members`, `team_members = team_users`.

- [ ] **Step 5: Update schema.prisma — add Workspace, WorkspaceMember, WorkspaceRole enum**

Add after the existing `SubscriptionStatus` enum in `prisma/schema.prisma`:

```prisma
enum WorkspaceRole {
  OWNER
  MEMBER
}

model Workspace {
  id                  String   @id
  name                String
  logoUrl             String?
  businessName        String?
  gstNumber           String?
  panNumber           String?
  businessType        String?
  razorpayAccountId   String?
  razorpayKeyId       String?
  razorpayKeySecret   String?
  bankName            String?
  bankAccountName     String?
  bankAccountNumber   String?
  bankIfsc            String?
  upiId               String?
  upiQrUrl            String?
  country             String?
  currency            String?
  taxLabel            String?
  ibanNumber          String?
  swiftCode           String?
  routingNumber       String?
  defaultHsnSac       String?
  defaultLutNumber    String?
  emailSignature      String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  members             WorkspaceMember[]
  activeUsers         User[]   @relation("ActiveWorkspace")

  @@map("workspaces")
}

model WorkspaceMember {
  id          String        @id @default(cuid())
  userId      String
  workspaceId String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  user      User      @relation(fields: [userId],      references: [id], onDelete: Cascade)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([userId])
  @@index([workspaceId])
  @@map("workspace_members")
}
```

Add to the `User` model (after `ownerId`/`owner`/`teamMembers` lines, before `leads`):

```prisma
  activeWorkspaceId   String?
  activeWorkspace     Workspace?       @relation("ActiveWorkspace", fields: [activeWorkspaceId], references: [id], onDelete: SetNull)
  workspaceMemberships WorkspaceMember[]
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma generate
```

Expected: no errors.

- [ ] **Step 7: Commit Phase 1**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/
git commit -m "feat: Phase 1 — add workspaces + workspace_members tables (ID-aliasing seed)"
```

---

## Task 2: Phase 2 DB migration — rename userId → workspaceId on 28 entity tables

**Files:**
- Create: `prisma/migrations/20260615_phase2_rename_entity_columns/migration.sql`
- Create: `prisma/migrations/20260615_phase2_rename_entity_columns/rollback.sql`

> **Important:** Run this migration before updating schema.prisma. The Prisma client still generates from the old schema until Task 3.

- [ ] **Step 1: Write the forward migration SQL**

Create `prisma/migrations/20260615_phase2_rename_entity_columns/migration.sql`:

```sql
-- Phase 2: Rename user_id → workspace_id on all 28 entity tables
-- Drop old FKs (→ users), rename column, add new FKs (→ workspaces)
-- All values are unchanged — workspace.id = user.id for all existing data

-- leads
ALTER TABLE leads DROP CONSTRAINT IF EXISTS "leads_user_id_fkey";
ALTER TABLE leads RENAME COLUMN user_id TO workspace_id;
ALTER TABLE leads ADD CONSTRAINT "leads_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS "clients_user_id_fkey";
ALTER TABLE clients RENAME COLUMN user_id TO workspace_id;
ALTER TABLE clients ADD CONSTRAINT "clients_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- proposals
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS "proposals_user_id_fkey";
ALTER TABLE proposals RENAME COLUMN user_id TO workspace_id;
ALTER TABLE proposals ADD CONSTRAINT "proposals_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- contracts
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS "contracts_user_id_fkey";
ALTER TABLE contracts RENAME COLUMN user_id TO workspace_id;
ALTER TABLE contracts ADD CONSTRAINT "contracts_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- invoices
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS "invoices_user_id_fkey";
ALTER TABLE invoices RENAME COLUMN user_id TO workspace_id;
ALTER TABLE invoices ADD CONSTRAINT "invoices_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";
ALTER TABLE projects RENAME COLUMN user_id TO workspace_id;
ALTER TABLE projects ADD CONSTRAINT "projects_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS "tasks_user_id_fkey";
ALTER TABLE tasks RENAME COLUMN user_id TO workspace_id;
ALTER TABLE tasks ADD CONSTRAINT "tasks_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- task_boards
ALTER TABLE task_boards DROP CONSTRAINT IF EXISTS "task_boards_user_id_fkey";
ALTER TABLE task_boards RENAME COLUMN user_id TO workspace_id;
ALTER TABLE task_boards ADD CONSTRAINT "task_boards_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- meetings
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS "meetings_user_id_fkey";
ALTER TABLE meetings RENAME COLUMN user_id TO workspace_id;
ALTER TABLE meetings ADD CONSTRAINT "meetings_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- time_entries
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS "time_entries_user_id_fkey";
ALTER TABLE time_entries RENAME COLUMN user_id TO workspace_id;
ALTER TABLE time_entries ADD CONSTRAINT "time_entries_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- expenses
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS "expenses_user_id_fkey";
ALTER TABLE expenses RENAME COLUMN user_id TO workspace_id;
ALTER TABLE expenses ADD CONSTRAINT "expenses_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- threads
ALTER TABLE threads DROP CONSTRAINT IF EXISTS "threads_user_id_fkey";
ALTER TABLE threads RENAME COLUMN user_id TO workspace_id;
ALTER TABLE threads ADD CONSTRAINT "threads_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE notifications RENAME COLUMN user_id TO workspace_id;
ALTER TABLE notifications ADD CONSTRAINT "notifications_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- push_subscriptions
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS "push_subscriptions_user_id_fkey";
ALTER TABLE push_subscriptions RENAME COLUMN user_id TO workspace_id;
ALTER TABLE push_subscriptions ADD CONSTRAINT "push_subscriptions_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- intake_forms
ALTER TABLE intake_forms DROP CONSTRAINT IF EXISTS "intake_forms_user_id_fkey";
ALTER TABLE intake_forms RENAME COLUMN user_id TO workspace_id;
ALTER TABLE intake_forms ADD CONSTRAINT "intake_forms_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- automation_rules
ALTER TABLE automation_rules DROP CONSTRAINT IF EXISTS "automation_rules_user_id_fkey";
ALTER TABLE automation_rules RENAME COLUMN user_id TO workspace_id;
ALTER TABLE automation_rules ADD CONSTRAINT "automation_rules_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- automation_workflows
ALTER TABLE automation_workflows DROP CONSTRAINT IF EXISTS "automation_workflows_user_id_fkey";
ALTER TABLE automation_workflows RENAME COLUMN user_id TO workspace_id;
ALTER TABLE automation_workflows ADD CONSTRAINT "automation_workflows_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- workflow_runs
ALTER TABLE workflow_runs DROP CONSTRAINT IF EXISTS "workflow_runs_user_id_fkey";
ALTER TABLE workflow_runs RENAME COLUMN user_id TO workspace_id;
ALTER TABLE workflow_runs ADD CONSTRAINT "workflow_runs_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- email_templates
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS "email_templates_user_id_fkey";
ALTER TABLE email_templates RENAME COLUMN user_id TO workspace_id;
ALTER TABLE email_templates ADD CONSTRAINT "email_templates_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- attachments
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS "attachments_user_id_fkey";
ALTER TABLE attachments RENAME COLUMN user_id TO workspace_id;
ALTER TABLE attachments ADD CONSTRAINT "attachments_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- client_notes
ALTER TABLE client_notes DROP CONSTRAINT IF EXISTS "client_notes_user_id_fkey";
ALTER TABLE client_notes RENAME COLUMN user_id TO workspace_id;
ALTER TABLE client_notes ADD CONSTRAINT "client_notes_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- project_notes
ALTER TABLE project_notes DROP CONSTRAINT IF EXISTS "project_notes_user_id_fkey";
ALTER TABLE project_notes RENAME COLUMN user_id TO workspace_id;
ALTER TABLE project_notes ADD CONSTRAINT "project_notes_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- proposal_templates
ALTER TABLE proposal_templates DROP CONSTRAINT IF EXISTS "proposal_templates_user_id_fkey";
ALTER TABLE proposal_templates RENAME COLUMN user_id TO workspace_id;
ALTER TABLE proposal_templates ADD CONSTRAINT "proposal_templates_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- email_logs
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS "email_logs_user_id_fkey";
ALTER TABLE email_logs RENAME COLUMN user_id TO workspace_id;
ALTER TABLE email_logs ADD CONSTRAINT "email_logs_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- billing_events
ALTER TABLE billing_events DROP CONSTRAINT IF EXISTS "billing_events_user_id_fkey";
ALTER TABLE billing_events RENAME COLUMN user_id TO workspace_id;
ALTER TABLE billing_events ADD CONSTRAINT "billing_events_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- promo_redemptions
ALTER TABLE promo_redemptions DROP CONSTRAINT IF EXISTS "promo_redemptions_user_id_fkey";
ALTER TABLE promo_redemptions RENAME COLUMN user_id TO workspace_id;
ALTER TABLE promo_redemptions ADD CONSTRAINT "promo_redemptions_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- public_profile_enquiries
ALTER TABLE public_profile_enquiries DROP CONSTRAINT IF EXISTS "public_profile_enquiries_user_id_fkey";
ALTER TABLE public_profile_enquiries RENAME COLUMN user_id TO workspace_id;
ALTER TABLE public_profile_enquiries ADD CONSTRAINT "public_profile_enquiries_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- user_expense_categories
ALTER TABLE user_expense_categories DROP CONSTRAINT IF EXISTS "user_expense_categories_user_id_fkey";
ALTER TABLE user_expense_categories RENAME COLUMN user_id TO workspace_id;
ALTER TABLE user_expense_categories ADD CONSTRAINT "user_expense_categories_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
```

- [ ] **Step 2: Write rollback SQL**

Create `prisma/migrations/20260615_phase2_rename_entity_columns/rollback.sql`:

```sql
-- Phase 2 rollback: rename workspace_id back to user_id and restore FKs to users
ALTER TABLE leads                    DROP CONSTRAINT IF EXISTS "leads_workspace_id_fkey";
ALTER TABLE leads                    RENAME COLUMN workspace_id TO user_id;
ALTER TABLE leads                    ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE clients                  DROP CONSTRAINT IF EXISTS "clients_workspace_id_fkey";
ALTER TABLE clients                  RENAME COLUMN workspace_id TO user_id;
ALTER TABLE clients                  ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE proposals                DROP CONSTRAINT IF EXISTS "proposals_workspace_id_fkey";
ALTER TABLE proposals                RENAME COLUMN workspace_id TO user_id;
ALTER TABLE proposals                ADD CONSTRAINT "proposals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE contracts                DROP CONSTRAINT IF EXISTS "contracts_workspace_id_fkey";
ALTER TABLE contracts                RENAME COLUMN workspace_id TO user_id;
ALTER TABLE contracts                ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE invoices                 DROP CONSTRAINT IF EXISTS "invoices_workspace_id_fkey";
ALTER TABLE invoices                 RENAME COLUMN workspace_id TO user_id;
ALTER TABLE invoices                 ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE projects                 DROP CONSTRAINT IF EXISTS "projects_workspace_id_fkey";
ALTER TABLE projects                 RENAME COLUMN workspace_id TO user_id;
ALTER TABLE projects                 ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE tasks                    DROP CONSTRAINT IF EXISTS "tasks_workspace_id_fkey";
ALTER TABLE tasks                    RENAME COLUMN workspace_id TO user_id;
ALTER TABLE tasks                    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE task_boards              DROP CONSTRAINT IF EXISTS "task_boards_workspace_id_fkey";
ALTER TABLE task_boards              RENAME COLUMN workspace_id TO user_id;
ALTER TABLE task_boards              ADD CONSTRAINT "task_boards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE meetings                 DROP CONSTRAINT IF EXISTS "meetings_workspace_id_fkey";
ALTER TABLE meetings                 RENAME COLUMN workspace_id TO user_id;
ALTER TABLE meetings                 ADD CONSTRAINT "meetings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE time_entries             DROP CONSTRAINT IF EXISTS "time_entries_workspace_id_fkey";
ALTER TABLE time_entries             RENAME COLUMN workspace_id TO user_id;
ALTER TABLE time_entries             ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE expenses                 DROP CONSTRAINT IF EXISTS "expenses_workspace_id_fkey";
ALTER TABLE expenses                 RENAME COLUMN workspace_id TO user_id;
ALTER TABLE expenses                 ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE threads                  DROP CONSTRAINT IF EXISTS "threads_workspace_id_fkey";
ALTER TABLE threads                  RENAME COLUMN workspace_id TO user_id;
ALTER TABLE threads                  ADD CONSTRAINT "threads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notifications            DROP CONSTRAINT IF EXISTS "notifications_workspace_id_fkey";
ALTER TABLE notifications            RENAME COLUMN workspace_id TO user_id;
ALTER TABLE notifications            ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions       DROP CONSTRAINT IF EXISTS "push_subscriptions_workspace_id_fkey";
ALTER TABLE push_subscriptions       RENAME COLUMN workspace_id TO user_id;
ALTER TABLE push_subscriptions       ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE intake_forms             DROP CONSTRAINT IF EXISTS "intake_forms_workspace_id_fkey";
ALTER TABLE intake_forms             RENAME COLUMN workspace_id TO user_id;
ALTER TABLE intake_forms             ADD CONSTRAINT "intake_forms_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE automation_rules         DROP CONSTRAINT IF EXISTS "automation_rules_workspace_id_fkey";
ALTER TABLE automation_rules         RENAME COLUMN workspace_id TO user_id;
ALTER TABLE automation_rules         ADD CONSTRAINT "automation_rules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE automation_workflows     DROP CONSTRAINT IF EXISTS "automation_workflows_workspace_id_fkey";
ALTER TABLE automation_workflows     RENAME COLUMN workspace_id TO user_id;
ALTER TABLE automation_workflows     ADD CONSTRAINT "automation_workflows_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workflow_runs            DROP CONSTRAINT IF EXISTS "workflow_runs_workspace_id_fkey";
ALTER TABLE workflow_runs            RENAME COLUMN workspace_id TO user_id;
ALTER TABLE workflow_runs            ADD CONSTRAINT "workflow_runs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_templates          DROP CONSTRAINT IF EXISTS "email_templates_workspace_id_fkey";
ALTER TABLE email_templates          RENAME COLUMN workspace_id TO user_id;
ALTER TABLE email_templates          ADD CONSTRAINT "email_templates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attachments              DROP CONSTRAINT IF EXISTS "attachments_workspace_id_fkey";
ALTER TABLE attachments              RENAME COLUMN workspace_id TO user_id;
ALTER TABLE attachments              ADD CONSTRAINT "attachments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE client_notes             DROP CONSTRAINT IF EXISTS "client_notes_workspace_id_fkey";
ALTER TABLE client_notes             RENAME COLUMN workspace_id TO user_id;
ALTER TABLE client_notes             ADD CONSTRAINT "client_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE project_notes            DROP CONSTRAINT IF EXISTS "project_notes_workspace_id_fkey";
ALTER TABLE project_notes            RENAME COLUMN workspace_id TO user_id;
ALTER TABLE project_notes            ADD CONSTRAINT "project_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE proposal_templates       DROP CONSTRAINT IF EXISTS "proposal_templates_workspace_id_fkey";
ALTER TABLE proposal_templates       RENAME COLUMN workspace_id TO user_id;
ALTER TABLE proposal_templates       ADD CONSTRAINT "proposal_templates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE email_logs               DROP CONSTRAINT IF EXISTS "email_logs_workspace_id_fkey";
ALTER TABLE email_logs               RENAME COLUMN workspace_id TO user_id;
ALTER TABLE email_logs               ADD CONSTRAINT "email_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE billing_events           DROP CONSTRAINT IF EXISTS "billing_events_workspace_id_fkey";
ALTER TABLE billing_events           RENAME COLUMN workspace_id TO user_id;
ALTER TABLE billing_events           ADD CONSTRAINT "billing_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE promo_redemptions        DROP CONSTRAINT IF EXISTS "promo_redemptions_workspace_id_fkey";
ALTER TABLE promo_redemptions        RENAME COLUMN workspace_id TO user_id;
ALTER TABLE promo_redemptions        ADD CONSTRAINT "promo_redemptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public_profile_enquiries DROP CONSTRAINT IF EXISTS "public_profile_enquiries_workspace_id_fkey";
ALTER TABLE public_profile_enquiries RENAME COLUMN workspace_id TO user_id;
ALTER TABLE public_profile_enquiries ADD CONSTRAINT "public_profile_enquiries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_expense_categories  DROP CONSTRAINT IF EXISTS "user_expense_categories_workspace_id_fkey";
ALTER TABLE user_expense_categories  RENAME COLUMN workspace_id TO user_id;
ALTER TABLE user_expense_categories  ADD CONSTRAINT "user_expense_categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

- [ ] **Step 3: Run the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260615_phase2_rename_entity_columns/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260615_phase2_rename_entity_columns
```

- [ ] **Step 4: Update schema.prisma — rename userId → workspaceId on all 28 entity models**

For each of the 28 models, change:
```prisma
  userId    String
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
```
to:
```prisma
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
```

Also remove the corresponding `User` relation list entries (e.g. `leads Lead[]`) from the `User` model and add them to the `Workspace` model.

The 28 models and their field names to change:

| Model | Old field | Old relation | New field | New relation |
|-------|-----------|-------------|-----------|-------------|
| Lead | userId / user | leads Lead[] on User | workspaceId / workspace | leads Lead[] on Workspace |
| Client | userId / user | clients Client[] on User | workspaceId / workspace | clients Client[] on Workspace |
| Proposal | userId / user | proposals Proposal[] on User | workspaceId / workspace | proposals Proposal[] on Workspace |
| Contract | userId / user | contracts Contract[] on User | workspaceId / workspace | contracts Contract[] on Workspace |
| Invoice | userId / user | invoices Invoice[] on User | workspaceId / workspace | invoices Invoice[] on Workspace |
| Project | userId / user | projects Project[] on User | workspaceId / workspace | projects Project[] on Workspace |
| Task | userId / user | tasks Task[] on User | workspaceId / workspace | tasks Task[] on Workspace |
| TaskBoard | userId / user | taskBoards TaskBoard[] on User | workspaceId / workspace | taskBoards TaskBoard[] on Workspace |
| Meeting | userId / user | meetings Meeting[] on User | workspaceId / workspace | meetings Meeting[] on Workspace |
| TimeEntry | userId / user | timeEntries TimeEntry[] on User | workspaceId / workspace | timeEntries TimeEntry[] on Workspace |
| Expense | userId / user | expenses Expense[] on User | workspaceId / workspace | expenses Expense[] on Workspace |
| Thread | userId / user | threads Thread[] on User | workspaceId / workspace | threads Thread[] on Workspace |
| Notification | userId / user | notifications Notification[] on User | workspaceId / workspace | notifications Notification[] on Workspace |
| PushSubscription | userId / user | pushSubscriptions PushSubscription[] on User | workspaceId / workspace | pushSubscriptions PushSubscription[] on Workspace |
| IntakeForm | userId / user | intakeForms IntakeForm[] on User | workspaceId / workspace | intakeForms IntakeForm[] on Workspace |
| AutomationRule | userId / user | automationRules AutomationRule[] on User | workspaceId / workspace | automationRules AutomationRule[] on Workspace |
| AutomationWorkflow | userId / user | automationWorkflows AutomationWorkflow[] on User | workspaceId / workspace | automationWorkflows AutomationWorkflow[] on Workspace |
| WorkflowRun | userId / user | workflowRuns WorkflowRun[] on User | workspaceId / workspace | workflowRuns WorkflowRun[] on Workspace |
| EmailTemplate | userId / user | emailTemplates EmailTemplate[] on User | workspaceId / workspace | emailTemplates EmailTemplate[] on Workspace |
| Attachment | userId / user | attachments Attachment[] on User | workspaceId / workspace | attachments Attachment[] on Workspace |
| ClientNote | userId / user | clientNotes ClientNote[] on User | workspaceId / workspace | clientNotes ClientNote[] on Workspace |
| ProjectNote | userId / user | projectNotes ProjectNote[] on User | workspaceId / workspace | projectNotes ProjectNote[] on Workspace |
| ProposalTemplate | userId / user | proposalTemplates ProposalTemplate[] on User | workspaceId / workspace | proposalTemplates ProposalTemplate[] on Workspace |
| EmailLog | userId / user | emailLogs EmailLog[] on User | workspaceId / workspace | emailLogs EmailLog[] on Workspace |
| BillingEvent | userId / user | billingEvents BillingEvent[] on User | workspaceId / workspace | billingEvents BillingEvent[] on Workspace |
| PromoRedemption | userId / user | promoRedemptions PromoRedemption[] on User | workspaceId / workspace | promoRedemptions PromoRedemption[] on Workspace |
| PublicProfileEnquiry | userId / user | profileEnquiries PublicProfileEnquiry[] on User | workspaceId / workspace | profileEnquiries PublicProfileEnquiry[] on Workspace |
| UserExpenseCategory | userId / user | expenseCategories UserExpenseCategory[] on User | workspaceId / workspace | expenseCategories UserExpenseCategory[] on Workspace |

Add all those `Workspace` relation lists to the `Workspace` model block added in Task 1.

- [ ] **Step 5: Regenerate Prisma client + type check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma generate
npx tsc --noEmit 2>&1 | head -40
```

Expected: many TS errors (services still use `userId`) — that's fine. Confirm `prisma generate` itself succeeded without errors.

- [ ] **Step 6: Commit Phase 2 (DB migration + schema files only)**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/
git commit -m "feat: Phase 2 — rename userId→workspaceId on 28 entity tables + update schema.prisma"
```

---

## Task 3: Phase 3a — WorkspacesModule with resolver

**Files:**
- Create: `src/modules/workspaces/workspace.resolver.ts`
- Create: `src/modules/workspaces/workspaces.service.ts`
- Create: `src/modules/workspaces/workspaces.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create workspace.resolver.ts**

```typescript
// src/modules/workspaces/workspace.resolver.ts
import { NotFoundException } from '@nestjs/common'
import { PrismaService }     from '../../prisma/prisma.service'

export type WorkspaceRef = { id: string; activeWorkspaceId?: string | null }

export async function resolveWorkspaceId(
  user: WorkspaceRef,
  prisma: PrismaService,
): Promise<string> {
  // 1. Use user's active workspace selection if they're a member
  if (user.activeWorkspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: user.activeWorkspaceId } },
    })
    if (member) return member.workspaceId
  }
  // 2. Fall back to workspace where user is OWNER
  const ownerRow = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
  })
  if (ownerRow) return ownerRow.workspaceId
  // 3. Fall back to any workspace membership
  const anyRow = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
  })
  if (anyRow) return anyRow.workspaceId
  throw new NotFoundException('No workspace found for this user')
}
```

- [ ] **Step 2: Create workspaces.service.ts (stub — full CRUD added in Task 9)**

```typescript
// src/modules/workspaces/workspaces.service.ts
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { WorkspaceRef, resolveWorkspaceId } from './workspace.resolver'
import { Plan } from '@prisma/client'

const WORKSPACE_LIMITS: Record<Plan, number> = {
  FREE:   1,
  SOLO:   1,
  STUDIO: 3,
}

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: WorkspaceRef): Promise<string> {
    return resolveWorkspaceId(user, this.prisma)
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where:   { userId },
      include: { workspace: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })
    return memberships.map(m => ({
      ...m.workspace,
      role:    m.role,
      isOwner: m.role === 'OWNER',
    }))
  }

  async findOne(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where:   { userId_workspaceId: { userId, workspaceId } },
      include: { workspace: true },
    })
    if (!member) throw new NotFoundException('Workspace not found')
    return { ...member.workspace, role: member.role }
  }

  async create(user: { id: string; plan: Plan }, name: string, businessName?: string) {
    const limit = WORKSPACE_LIMITS[user.plan]
    const owned = await this.prisma.workspaceMember.count({
      where: { userId: user.id, role: 'OWNER' },
    })
    if (owned >= limit) {
      throw new ForbiddenException(
        `Your plan allows ${limit} workspace${limit === 1 ? '' : 's'}. Upgrade to Studio to create more.`
      )
    }
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { id: `ws_${Date.now()}_${user.id.slice(-6)}`, name, businessName },
      })
      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
      })
      return workspace
    })
  }

  async update(workspaceId: string, userId: string, data: Partial<{
    name: string; businessName: string; gstNumber: string; panNumber: string;
    businessType: string; razorpayAccountId: string; razorpayKeyId: string;
    razorpayKeySecret: string; bankName: string; bankAccountName: string;
    bankAccountNumber: string; bankIfsc: string; upiId: string; upiQrUrl: string;
    country: string; currency: string; taxLabel: string; ibanNumber: string;
    swiftCode: string; routingNumber: string; defaultHsnSac: string;
    defaultLutNumber: string; emailSignature: string; logoUrl: string;
  }>) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    if (!member) throw new NotFoundException('Workspace not found')
    if (member.role !== 'OWNER') throw new ForbiddenException('Only workspace owners can update settings')
    return this.prisma.workspace.update({ where: { id: workspaceId }, data })
  }

  async delete(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    if (!member || member.role !== 'OWNER') throw new ForbiddenException('Only the workspace owner can delete it')
    const entityCount = await this.prisma.client.count({ where: { workspaceId } })
    if (entityCount > 0) throw new BadRequestException('Remove all clients before deleting the workspace')
    await this.prisma.workspace.delete({ where: { id: workspaceId } })
    return { message: 'Workspace deleted' }
  }
}
```

- [ ] **Step 3: Create workspaces.module.ts**

```typescript
// src/modules/workspaces/workspaces.module.ts
import { Module }           from '@nestjs/common'
import { WorkspacesService }    from './workspaces.service'
import { WorkspacesController } from './workspaces.controller'
import { PrismaModule }         from '../../prisma/prisma.module'

@Module({
  imports:     [PrismaModule],
  providers:   [WorkspacesService],
  controllers: [WorkspacesController],
  exports:     [WorkspacesService],
})
export class WorkspacesModule {}
```

- [ ] **Step 4: Create workspaces.controller.ts (stub — routes added in Task 9)**

```typescript
// src/modules/workspaces/workspaces.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { User }        from '@prisma/client'
import { WorkspacesService } from './workspaces.service'

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.workspaces.listForUser(user.id)
  }

  @Post()
  create(@CurrentUser() user: User, @Body() body: { name: string; businessName?: string }) {
    return this.workspaces.create(user, body.name, body.businessName)
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.workspaces.findOne(id, user.id)
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() body: any) {
    return this.workspaces.update(id, user.id, body)
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.workspaces.delete(id, user.id)
  }
}
```

- [ ] **Step 5: Register WorkspacesModule in app.module.ts**

In `src/app.module.ts`, add `WorkspacesModule` to the `imports` array:
```typescript
import { WorkspacesModule } from './modules/workspaces/workspaces.module'
// add WorkspacesModule to imports: [...]
```

- [ ] **Step 6: Type check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | grep -v "userId\|user_id" | head -20
```

The workspace module itself should be clean. Remaining errors are all `userId` references in entity services — fixed in Task 4.

- [ ] **Step 7: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/workspaces/ src/app.module.ts
git commit -m "feat: Phase 3a — WorkspacesModule with resolveWorkspaceId resolver"
```

---

## Task 4: Phase 3b — Update all entity services to use resolveWorkspaceId

**Files (all in `src/modules/`):**
- Modify: `clients/clients.service.ts`
- Modify: `leads/leads.service.ts`
- Modify: `proposals/proposals.service.ts`
- Modify: `contracts/contracts.service.ts`
- Modify: `invoices/invoices.service.ts`
- Modify: `projects/projects.service.ts`
- Modify: `tasks/tasks.service.ts`
- Modify: `task-boards/task-boards.service.ts`
- Modify: `messages/messages.service.ts`
- Modify: `attachments/attachments.service.ts`
- Modify: `meetings/meetings.service.ts`
- Modify: `expenses/expenses.service.ts`
- Modify: `time-entries/time-entries.service.ts`
- Modify: `reports/reports.service.ts`
- Modify: `automations/automations.service.ts` (or `automation.service.ts`)
- Modify: `notifications/notifications.service.ts`
- Modify: `forms/forms.service.ts`
- Modify: `email-templates/email-templates.service.ts`

**Pattern to apply to every service:**

1. Add import at top:
```typescript
import { resolveWorkspaceId, WorkspaceRef } from '../workspaces/workspace.resolver'
```

2. Change every method signature from `(userId: string, ...)` to `(user: WorkspaceRef, ...)`.

3. At the start of each method body, replace any `userId`/`effectiveUserId` reference:
```typescript
// BEFORE
async findAll(userId: string, query: QueryClientsDto) {
  return this.prisma.client.findMany({ where: { userId } })
}

// AFTER
async findAll(user: WorkspaceRef, query: QueryClientsDto) {
  const workspaceId = await resolveWorkspaceId(user, this.prisma)
  return this.prisma.client.findMany({ where: { workspaceId } })
}
```

4. In all Prisma queries, replace `{ userId }` with `{ workspaceId }`.

**Full example — `clients.service.ts`:**

```typescript
// At top, add:
import { resolveWorkspaceId, WorkspaceRef } from '../workspaces/workspace.resolver'

// Change every method:
async create(user: WorkspaceRef, dto: CreateClientDto) {
  const workspaceId = await resolveWorkspaceId(user, this.prisma)
  const plan = effectivePlan(await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { plan: true, planExpiresAt: true, subscriptionStatus: true } }))
  const limit = CLIENT_LIMITS[plan]
  if (isFinite(limit)) {
    const count = await this.prisma.client.count({ where: { workspaceId } })
    if (count >= limit) throw new HttpException(...)
  }
  const client = await this.prisma.client.create({ data: { ...dto, workspaceId, portalToken: nanoid(21) } })
  this.eventEmitter.emit('client.created', { entityId: client.id, userId: user.id })
  return client
}

async findAll(user: WorkspaceRef, query: QueryClientsDto) {
  const workspaceId = await resolveWorkspaceId(user, this.prisma)
  return this.prisma.client.findMany({ where: { workspaceId, ...buildFilters(query) } })
}

async findOne(user: WorkspaceRef, id: string) {
  const workspaceId = await resolveWorkspaceId(user, this.prisma)
  const client = await this.prisma.client.findFirst({ where: { id, workspaceId }, include: { ... } })
  if (!client) throw new NotFoundException('Client not found')
  return client
}
// same pattern for update, remove, createNote, deleteNote, etc.
```

**Apply same pattern to all services listed above.** For each service, `userId` string param → `user: WorkspaceRef`, and `where: { userId }` → `where: { workspaceId }` after calling `resolveWorkspaceId`.

> Note: For `effectivePlan()` calls that currently take a user object with plan fields — continue fetching those from `this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { plan, planExpiresAt, subscriptionStatus } })`. The plan/billing fields stay on User.

- [ ] **Step 1: Update clients.service.ts** (full transform as shown above)

- [ ] **Step 2: Update leads.service.ts** — same pattern

- [ ] **Step 3: Update proposals.service.ts** — same pattern

- [ ] **Step 4: Update contracts.service.ts** — same pattern

- [ ] **Step 5: Update invoices.service.ts** — same pattern

- [ ] **Step 6: Update projects.service.ts** — same pattern

- [ ] **Step 7: Update tasks.service.ts** — same pattern

- [ ] **Step 8: Update task-boards/task-boards.service.ts** — same pattern

- [ ] **Step 9: Update messages/messages.service.ts** — same pattern

- [ ] **Step 10: Update attachments/attachments.service.ts** — same pattern

- [ ] **Step 11: Update meetings/meetings.service.ts** — same pattern (was using raw `user.id`)

- [ ] **Step 12: Update expenses/expenses.service.ts** — same pattern (was using raw `user.id`)

- [ ] **Step 13: Update time-entries/time-entries.service.ts** — same pattern (was using raw `user.id`)

- [ ] **Step 14: Update reports/reports.service.ts** — same pattern (was using raw `user.id`)

- [ ] **Step 15: Update automations service** — same pattern (was using raw `user.id`)

- [ ] **Step 16: Update notifications/notifications.service.ts** — same pattern

- [ ] **Step 17: Update forms/forms.service.ts** and email-templates/email-templates.service.ts — same pattern

- [ ] **Step 18: Type check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | grep "error TS" | head -30
```

Expected: errors now in controllers (passing `user.id` string to methods expecting `WorkspaceRef`) — fixed next task.

- [ ] **Step 19: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/
git commit -m "feat: Phase 3b — entity services use resolveWorkspaceId (WorkspaceRef pattern)"
```

---

## Task 5: Phase 3c — Update all controllers to pass user object (drop effectiveUserId)

**Files:** All entity controllers that currently call `effectiveUserId(user)`.

**Pattern:**
```typescript
// BEFORE
import { effectiveUserId } from '../users/effective-user-id'
// ...
create(@CurrentUser() user: User, @Body() dto: CreateClientDto) {
  return this.clientsService.create(effectiveUserId(user), dto)
}

// AFTER (remove the import, pass user directly)
create(@CurrentUser() user: User, @Body() dto: CreateClientDto) {
  return this.clientsService.create(user, dto)
}
```

Controllers to update (remove `effectiveUserId(user)` → `user`):
- `clients/clients.controller.ts`
- `leads/leads.controller.ts`
- `proposals/proposals.controller.ts`
- `contracts/contracts.controller.ts`
- `invoices/invoices.controller.ts`
- `projects/projects.controller.ts`
- `tasks/tasks.controller.ts`
- `task-boards/task-boards.controller.ts`
- `messages/messages.controller.ts`
- `attachments/attachments.controller.ts`
- `meetings/meetings.controller.ts`
- `expenses/expenses.controller.ts`
- `time-entries/time-entries.controller.ts`
- `reports/reports.controller.ts`
- `automations/automations.controller.ts`
- `notifications/notifications.controller.ts`
- `forms/forms.controller.ts`
- `email-templates/email-templates.controller.ts`

- [ ] **Step 1: Update all controllers** — for each, remove `effectiveUserId` import and call, replace with `user` directly.

- [ ] **Step 2: Type check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: no errors (or only unrelated errors).

- [ ] **Step 3: Remove effectiveUserId.ts**

```bash
rm /Users/mvaghela/Documents/MyProjects/pakka-api/src/modules/users/effective-user-id.ts
npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/
git commit -m "feat: Phase 3c — controllers pass user object, remove effectiveUserId helper"
```

---

## Task 6: Phase 3d — Team service: replace ownerId with WorkspaceMember

**Files:**
- Create: `prisma/migrations/20260615_phase3_team_invite_rename/migration.sql`
- Create: `prisma/migrations/20260615_phase3_team_invite_rename/rollback.sql`
- Modify: `prisma/schema.prisma` — update `TeamInvite` model
- Modify: `src/modules/team/team.service.ts`
- Modify: `src/modules/team/team.controller.ts`

- [ ] **Step 1: Write team_invites migration SQL**

Create `prisma/migrations/20260615_phase3_team_invite_rename/migration.sql`:

```sql
-- Rename team_invites.owner_id → workspace_id (values unchanged, workspace.id = user.id)
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS "team_invites_owner_id_fkey";
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS "team_invites_owner_id_email_key";
ALTER TABLE team_invites RENAME COLUMN owner_id TO workspace_id;
ALTER TABLE team_invites ADD CONSTRAINT "team_invites_workspace_id_fkey"
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE team_invites ADD CONSTRAINT "team_invites_workspace_id_email_key"
  UNIQUE (workspace_id, email);
```

Create `prisma/migrations/20260615_phase3_team_invite_rename/rollback.sql`:

```sql
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS "team_invites_workspace_id_fkey";
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS "team_invites_workspace_id_email_key";
ALTER TABLE team_invites RENAME COLUMN workspace_id TO owner_id;
ALTER TABLE team_invites ADD CONSTRAINT "team_invites_owner_id_fkey"
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE team_invites ADD CONSTRAINT "team_invites_owner_id_email_key" UNIQUE (owner_id, email);
```

- [ ] **Step 2: Run the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260615_phase3_team_invite_rename/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260615_phase3_team_invite_rename
```

- [ ] **Step 3: Update TeamInvite model in schema.prisma**

Change:
```prisma
model TeamInvite {
  id        String   @id @default(cuid())
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  email     String
  token     String   @unique
  accepted  Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@unique([ownerId, email])
  @@map("team_invites")
}
```
to:
```prisma
model TeamInvite {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  email       String
  token       String    @unique
  accepted    Boolean   @default(false)
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  @@unique([workspaceId, email])
  @@map("team_invites")
}
```

Add `teamInvites TeamInvite[]` to the `Workspace` model. Remove `teamInvitesSent TeamInvite[]` from `User` model.

- [ ] **Step 4: Rewrite team.service.ts**

Replace the entire `team.service.ts` with the new WorkspaceMember-based implementation:

```typescript
// src/modules/team/team.service.ts
import { Injectable, HttpException, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService }    from '@nestjs/config'
import { PrismaService }    from '../../prisma/prisma.service'
import { EmailService }     from '../email/email.service'
import { nanoid }           from 'nanoid'
import { effectivePlan }    from '../users/effective-plan'
import { resolveWorkspaceId, WorkspaceRef } from '../workspaces/workspace.resolver'

const TEAM_SEAT_LIMIT = { STUDIO: 1 } as const

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
    private readonly email:   EmailService,
  ) {}

  async getTeam(user: WorkspaceRef) {
    const workspaceId = await resolveWorkspaceId(user, this.prisma)
    const [members, invites] = await Promise.all([
      this.prisma.workspaceMember.findMany({
        where:   { workspaceId, role: 'MEMBER' },
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      }),
      this.prisma.teamInvite.findMany({
        where:   { workspaceId, accepted: false, expiresAt: { gt: new Date() } },
        select:  { id: true, email: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return {
      members: members.map(m => m.user),
      invites,
    }
  }

  async invite(owner: WorkspaceRef & { plan: string; email: string; name: string; businessName?: string | null }, email: string) {
    const workspaceId = await resolveWorkspaceId(owner, this.prisma)
    if (effectivePlan(owner as any) !== 'STUDIO') {
      throw new HttpException({ message: 'Team members are a Studio plan feature.', code: 'PLAN_LIMIT' }, 402)
    }
    const memberCount = await this.prisma.workspaceMember.count({ where: { workspaceId, role: 'MEMBER' } })
    if (memberCount >= TEAM_SEAT_LIMIT.STUDIO) {
      throw new BadRequestException('Studio plan includes 1 team member seat. Remove the current member to invite a new one.')
    }
    if (email.toLowerCase() === owner.email.toLowerCase()) throw new BadRequestException('You cannot invite yourself.')
    const alreadyMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, user: { email } },
    })
    if (alreadyMember) throw new BadRequestException('This person is already a team member.')

    const token     = nanoid(32)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await this.prisma.teamInvite.upsert({
      where:  { workspaceId_email: { workspaceId, email } },
      create: { workspaceId, email, token, expiresAt },
      update: { token, expiresAt, accepted: false },
    })

    const appUrl     = this.config.get<string>('frontendUrl') ?? 'https://app.getclearwork.in'
    const inviteUrl  = `${appUrl}/accept-invite?token=${token}`
    const senderName = owner.businessName ?? owner.name

    await this.email.send({
      userId:      owner.id,
      templateKey: 'team_invite',
      to:          email,
      subject:     `${senderName} invited you to join their ClearWork workspace`,
      html: `<p>Hi,</p><p><strong>${senderName}</strong> has invited you to join their ClearWork workspace.</p><p><a href="${inviteUrl}" style="background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Accept invite</a></p>`,
    })

    return { message: 'Invite sent.' }
  }

  async cancelInvite(user: WorkspaceRef, inviteId: string) {
    const workspaceId = await resolveWorkspaceId(user, this.prisma)
    const invite = await this.prisma.teamInvite.findFirst({ where: { id: inviteId, workspaceId } })
    if (!invite) throw new NotFoundException('Invite not found.')
    await this.prisma.teamInvite.delete({ where: { id: inviteId } })
    return { message: 'Invite cancelled.' }
  }

  async removeMember(owner: WorkspaceRef, memberId: string) {
    const workspaceId = await resolveWorkspaceId(owner, this.prisma)
    const member = await this.prisma.workspaceMember.findFirst({ where: { userId: memberId, workspaceId, role: 'MEMBER' } })
    if (!member) throw new NotFoundException('Team member not found.')
    await this.prisma.workspaceMember.delete({ where: { id: member.id } })
    return { message: 'Team member removed.' }
  }

  async getInvitePreview(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where:   { token },
      select:  { email: true, accepted: true, expiresAt: true, workspace: { select: { name: true, businessName: true } } },
    })
    if (!invite) throw new NotFoundException('Invite not found or already used.')
    if (invite.accepted) throw new BadRequestException('This invite has already been accepted.')
    if (invite.expiresAt < new Date()) throw new BadRequestException('This invite has expired.')
    return {
      inviteeEmail: invite.email,
      senderName:   invite.workspace.businessName ?? invite.workspace.name,
    }
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.teamInvite.findUnique({ where: { token } })
    if (!invite) throw new NotFoundException('Invite not found or already used.')
    if (invite.accepted) throw new BadRequestException('This invite has already been accepted.')
    if (invite.expiresAt < new Date()) throw new BadRequestException('This invite has expired.')

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found.')
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException('This invite was sent to a different email address.')
    }
    const existing = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } },
    })
    if (existing) throw new BadRequestException('You are already a member of this workspace.')

    await this.prisma.$transaction([
      this.prisma.workspaceMember.create({ data: { userId, workspaceId: invite.workspaceId, role: 'MEMBER' } }),
      this.prisma.teamInvite.update({ where: { token }, data: { accepted: true } }),
      this.prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: invite.workspaceId } }),
    ])
    return { message: 'You have joined the workspace.' }
  }

  async leaveTeam(user: WorkspaceRef) {
    const workspaceId = await resolveWorkspaceId(user, this.prisma)
    const member = await this.prisma.workspaceMember.findFirst({ where: { userId: user.id, workspaceId, role: 'MEMBER' } })
    if (!member) throw new BadRequestException('You are not a team member of this workspace.')
    await this.prisma.$transaction([
      this.prisma.workspaceMember.delete({ where: { id: member.id } }),
      this.prisma.user.update({ where: { id: user.id }, data: { activeWorkspaceId: null } }),
    ])
    return { message: 'You have left the workspace.' }
  }
}
```

- [ ] **Step 5: Update team.controller.ts to pass user object**

Change all `owner.id`/`effectiveUserId` calls to pass `owner` (the full user) directly:
```typescript
@Get()
getTeam(@CurrentUser() owner: User) {
  return this.team.getTeam(owner)
}

@Post('invite')
invite(@CurrentUser() owner: User, @Body('email') email: string) {
  return this.team.invite(owner as any, email)
}

@Delete('invite/:id')
cancelInvite(@CurrentUser() owner: User, @Param('id') id: string) {
  return this.team.cancelInvite(owner, id)
}

@Delete('member/:id')
removeMember(@CurrentUser() owner: User, @Param('id') memberId: string) {
  return this.team.removeMember(owner, memberId)
}

@Post('leave')
leaveTeam(@CurrentUser() user: User) {
  return this.team.leaveTeam(user)
}
```

- [ ] **Step 6: Regenerate Prisma client + type check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma generate
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 7: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/ src/modules/team/
git commit -m "feat: Phase 3d — team service uses WorkspaceMember; TeamInvite.workspaceId"
```

---

## Task 7: Phase 3e — User model cleanup (remove ownerId + business profile fields)

**Files:**
- Create: `prisma/migrations/20260615_phase3_user_cleanup/migration.sql`
- Create: `prisma/migrations/20260615_phase3_user_cleanup/rollback.sql`
- Modify: `prisma/schema.prisma` — remove ownerId + business fields from User
- Modify: `src/modules/users/users.service.ts` — getMe joins workspace for backwards compat

- [ ] **Step 1: Write migration SQL**

Create `prisma/migrations/20260615_phase3_user_cleanup/migration.sql`:

```sql
-- Phase 3e: Remove ownerId and business profile fields from users table
-- Business profile fields now live in workspaces table
ALTER TABLE users
  DROP COLUMN IF EXISTS owner_id,
  DROP COLUMN IF EXISTS business_name,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS gst_number,
  DROP COLUMN IF EXISTS pan_number,
  DROP COLUMN IF EXISTS business_type,
  DROP COLUMN IF EXISTS razorpay_account_id,
  DROP COLUMN IF EXISTS razorpay_key_id,
  DROP COLUMN IF EXISTS razorpay_key_secret,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_ifsc,
  DROP COLUMN IF EXISTS upi_id,
  DROP COLUMN IF EXISTS upi_qr_url,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS tax_label,
  DROP COLUMN IF EXISTS iban_number,
  DROP COLUMN IF EXISTS swift_code,
  DROP COLUMN IF EXISTS routing_number,
  DROP COLUMN IF EXISTS default_hsn_sac,
  DROP COLUMN IF EXISTS default_lut_number,
  DROP COLUMN IF EXISTS email_signature;
```

Create `prisma/migrations/20260615_phase3_user_cleanup/rollback.sql`:

```sql
-- Phase 3e rollback: restore business profile columns to users table
ALTER TABLE users
  ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN business_name TEXT,
  ADD COLUMN logo_url TEXT,
  ADD COLUMN gst_number TEXT,
  ADD COLUMN pan_number TEXT,
  ADD COLUMN business_type TEXT,
  ADD COLUMN razorpay_account_id TEXT,
  ADD COLUMN razorpay_key_id TEXT,
  ADD COLUMN razorpay_key_secret TEXT,
  ADD COLUMN bank_name TEXT,
  ADD COLUMN bank_account_name TEXT,
  ADD COLUMN bank_account_number TEXT,
  ADD COLUMN bank_ifsc TEXT,
  ADD COLUMN upi_id TEXT,
  ADD COLUMN upi_qr_url TEXT,
  ADD COLUMN country TEXT,
  ADD COLUMN currency TEXT,
  ADD COLUMN tax_label TEXT,
  ADD COLUMN iban_number TEXT,
  ADD COLUMN swift_code TEXT,
  ADD COLUMN routing_number TEXT,
  ADD COLUMN default_hsn_sac TEXT,
  ADD COLUMN default_lut_number TEXT,
  ADD COLUMN email_signature TEXT;
-- Note: data is in workspaces table — you'd need to copy it back
```

- [ ] **Step 2: Update schema.prisma — remove ownerId + business fields from User model**

Remove from the `User` model:
- `ownerId`, `owner`, `teamMembers` fields (lines ~110-113)
- All business profile fields: `businessName`, `logoUrl`, `gstNumber`, `panNumber`, `businessType`, `razorpayAccountId`, `razorpayKeyId`, `razorpayKeySecret`, `bankName`, `bankAccountName`, `bankAccountNumber`, `bankIfsc`, `upiId`, `upiQrUrl`, `country`, `currency`, `taxLabel`, `ibanNumber`, `swiftCode`, `routingNumber`, `defaultHsnSac`, `defaultLutNumber`, `emailSignature`

Also remove the `teamInvitesSent` relation from User (moved to Workspace in Task 6).

- [ ] **Step 3: Update users.service.ts — getMe joins workspace for backwards compat**

The `GET /users/me` response must still return workspace fields so the frontend doesn't break before Phase 4 is deployed. Update `getMe()` (or whichever method returns the user profile):

```typescript
async getMe(userId: string) {
  const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
  // Join the user's primary workspace for backwards-compat field proxying
  const membership = await this.prisma.workspaceMember.findFirst({
    where:   { userId, role: 'OWNER' },
    include: { workspace: true },
  })
  const ws = membership?.workspace
  return {
    ...user,
    // Proxy workspace fields so existing frontend reads profile.businessName etc. still work
    businessName:       ws?.businessName       ?? null,
    logoUrl:            ws?.logoUrl            ?? null,
    gstNumber:          ws?.gstNumber          ?? null,
    panNumber:          ws?.panNumber          ?? null,
    businessType:       ws?.businessType       ?? null,
    razorpayKeyId:      ws?.razorpayKeyId      ?? null,
    razorpayKeySecret:  ws?.razorpayKeySecret  ?? null,
    bankName:           ws?.bankName           ?? null,
    bankAccountName:    ws?.bankAccountName    ?? null,
    bankAccountNumber:  ws?.bankAccountNumber  ?? null,
    bankIfsc:           ws?.bankIfsc           ?? null,
    upiId:              ws?.upiId              ?? null,
    upiQrUrl:           ws?.upiQrUrl           ?? null,
    country:            ws?.country            ?? null,
    currency:           ws?.currency           ?? null,
    taxLabel:           ws?.taxLabel           ?? null,
    ibanNumber:         ws?.ibanNumber         ?? null,
    swiftCode:          ws?.swiftCode          ?? null,
    routingNumber:      ws?.routingNumber      ?? null,
    defaultHsnSac:      ws?.defaultHsnSac      ?? null,
    defaultLutNumber:   ws?.defaultLutNumber   ?? null,
    emailSignature:     ws?.emailSignature     ?? null,
    workspaceId:        ws?.id                 ?? null,
  }
}
```

Also update `updateProfile()` — when business profile fields are included in the body, route them to workspace instead of user:

```typescript
async updateProfile(userId: string, data: any) {
  const workspaceFields = ['businessName','logoUrl','gstNumber','panNumber','businessType',
    'razorpayAccountId','razorpayKeyId','razorpayKeySecret','bankName','bankAccountName',
    'bankAccountNumber','bankIfsc','upiId','upiQrUrl','country','currency','taxLabel',
    'ibanNumber','swiftCode','routingNumber','defaultHsnSac','defaultLutNumber','emailSignature']
  const wsData   = Object.fromEntries(Object.entries(data).filter(([k]) => workspaceFields.includes(k)))
  const userOnly = Object.fromEntries(Object.entries(data).filter(([k]) => !workspaceFields.includes(k)))

  const [user] = await Promise.all([
    Object.keys(userOnly).length > 0 ? this.prisma.user.update({ where: { id: userId }, data: userOnly }) : this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    Object.keys(wsData).length > 0 ? this.prisma.$executeRaw`
      UPDATE workspaces w SET ${Object.entries(wsData).map(([k,v]) => `${k} = ${v}`)}
      WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ${userId} AND role = 'OWNER')
    ` : Promise.resolve(),
  ])
  // Note: use prisma.workspace.updateMany for the workspace update in real code:
  // await this.prisma.workspace.updateMany({ where: { members: { some: { userId, role: 'OWNER' } } }, data: wsData })
  return this.getMe(userId)
}
```

> **Simpler approach for updateProfile**: Use `prisma.workspace.updateMany({ where: { members: { some: { userId, role: 'OWNER' } } }, data: wsData })` — not the raw SQL shown above.

- [ ] **Step 4: Run the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260615_phase3_user_cleanup/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260615_phase3_user_cleanup
npx prisma generate
```

- [ ] **Step 5: Type check both repos**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: 0 errors.

- [ ] **Step 6: Commit Phase 3e**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/ src/modules/users/
git commit -m "feat: Phase 3e — remove ownerId + business fields from User; getMe proxies workspace fields"
```

---

## Task 8: Phase 4a — Frontend workspace hooks + PATCH active-workspace endpoint

**Files:**
- Modify: `src/modules/users/users.controller.ts` (API)
- Modify: `src/modules/users/users.service.ts` (API)
- Create: `src/features/workspaces/hooks/useWorkspaces.ts` (App)

- [ ] **Step 1: Add PATCH /users/active-workspace in users.controller.ts**

```typescript
@Patch('active-workspace')
setActiveWorkspace(@CurrentUser() user: User, @Body('workspaceId') workspaceId: string) {
  return this.users.updateActiveWorkspace(user.id, workspaceId)
}
```

- [ ] **Step 2: Add updateActiveWorkspace in users.service.ts**

```typescript
async updateActiveWorkspace(userId: string, workspaceId: string) {
  const member = await this.prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  if (!member) throw new NotFoundException('You are not a member of that workspace')
  await this.prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: workspaceId } })
  return { workspaceId }
}
```

- [ ] **Step 3: Type check API**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

- [ ] **Step 4: Commit API changes**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/users/
git commit -m "feat: Phase 4a — PATCH /users/active-workspace endpoint"
```

- [ ] **Step 5: Create src/features/workspaces/hooks/useWorkspaces.ts in pakka-app**

```typescript
// src/features/workspaces/hooks/useWorkspaces.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api }   from '@/lib/api'

export interface WorkspaceItem {
  id:           string
  name:         string
  businessName: string | null
  logoUrl:      string | null
  role:         'OWNER' | 'MEMBER'
  isOwner:      boolean
}

export function useWorkspaces() {
  return useQuery<WorkspaceItem[]>({
    queryKey: ['workspaces'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: WorkspaceItem[] }>('/workspaces')
      return data.data
    },
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; businessName?: string }) =>
      api.post<{ data: WorkspaceItem }>('/workspaces', body).then(r => r.data.data),
    onSuccess: () => {
      toast.success('Workspace created')
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create workspace')
    },
  })
}

export function useSwitchWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) =>
      api.patch('/users/active-workspace', { workspaceId }),
    onSuccess: () => {
      // Invalidate all entity queries so they reload with new workspace data
      qc.invalidateQueries()
    },
    onError: () => toast.error('Failed to switch workspace'),
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<WorkspaceItem & Record<string, unknown>>) =>
      api.patch(`/workspaces/${workspaceId}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('Workspace updated')
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => toast.error('Failed to update workspace'),
  })
}
```

- [ ] **Step 6: Type check App**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

- [ ] **Step 7: Commit App hook**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/workspaces/
git commit -m "feat: Phase 4a — workspace hooks (useWorkspaces, useCreateWorkspace, useSwitchWorkspace)"
```

---

## Task 9: Phase 4b — WorkspaceSwitcher + CreateWorkspaceModal UI

**Files:**
- Create: `src/features/workspaces/components/WorkspaceSwitcher.tsx`
- Create: `src/features/workspaces/components/CreateWorkspaceModal.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create CreateWorkspaceModal.tsx**

```tsx
// src/features/workspaces/components/CreateWorkspaceModal.tsx
import { useState }  from 'react'
import { X, Building2 } from 'lucide-react'
import { useCreateWorkspace } from '../hooks/useWorkspaces'
import { useSwitchWorkspace } from '../hooks/useWorkspaces'
import { cn } from '@/lib/utils'

interface Props {
  open:     boolean
  onClose:  () => void
}

export default function CreateWorkspaceModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const { mutate: create, isPending } = useCreateWorkspace()
  const { mutate: switchWs }          = useSwitchWorkspace()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    create({ name: name.trim() }, {
      onSuccess: (ws) => {
        switchWs(ws.id)
        onClose()
        setName('')
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#EAECF0] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Building2 size={15} className="text-[#6366F1]" />
            </div>
            <h2 className="text-[15px] font-bold text-[#101828]">Create workspace</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#1E293B] mb-1.5">Workspace name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Agency"
              className="w-full h-10 px-3 text-[13.5px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10 bg-[#F9FAFB] focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-xl border border-[#D0D5DD] text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isPending}
              className={cn(
                'flex-1 h-9 rounded-xl text-[13px] font-semibold text-white transition-colors',
                name.trim() && !isPending ? 'bg-[#6366F1] hover:bg-[#5558E8]' : 'bg-[#6366F1]/50 cursor-not-allowed'
              )}>
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create WorkspaceSwitcher.tsx**

```tsx
// src/features/workspaces/components/WorkspaceSwitcher.tsx
import { useState }  from 'react'
import { Check, ChevronDown, Plus, Settings, Building2 } from 'lucide-react'
import { useWorkspaces, useSwitchWorkspace } from '../hooks/useWorkspaces'
import { useProfile }            from '@/features/settings/hooks/useProfile'
import { cn }                    from '@/lib/utils'
import CreateWorkspaceModal      from './CreateWorkspaceModal'
import { useNavigate }           from 'react-router-dom'

export default function WorkspaceSwitcher() {
  const [open, setOpen]         = useState(false)
  const [showCreate, setCreate] = useState(false)
  const navigate                = useNavigate()

  const { data: workspaces = [] }     = useWorkspaces()
  const { data: profile }             = useProfile()
  const { mutate: switchWs }          = useSwitchWorkspace()

  const activeId      = profile?.activeWorkspaceId ?? null
  const activeWs      = workspaces.find(w => w.id === activeId) ?? workspaces[0]
  const initials      = (activeWs?.name ?? 'W').slice(0, 2).toUpperCase()
  const canCreate     = (profile?.plan === 'STUDIO') || workspaces.length === 0
  const atLimit       = !canCreate

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl hover:bg-gray-50 transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
            {initials}
          </div>
          <span className="flex-1 text-left text-[13px] font-semibold text-[#0F172A] truncate">
            {activeWs?.name ?? 'My Workspace'}
          </span>
          <ChevronDown size={13} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-white rounded-2xl border border-[#EAECF0] shadow-xl z-40 py-1.5 overflow-hidden">
              {workspaces.length > 0 && (
                <div className="px-2 pb-1">
                  <p className="px-2 pt-1 pb-0.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Workspaces</p>
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => { switchWs(ws.id); setOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {ws.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#101828] truncate">{ws.name}</p>
                        <p className="text-[11px] text-gray-400">{ws.isOwner ? 'Owner' : 'Member'}</p>
                      </div>
                      {ws.id === activeId && <Check size={13} className="text-[#6366F1] shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              <div className="h-px bg-gray-100 mx-2 my-1" />

              <div className="px-2 pb-1">
                <button
                  onClick={() => { navigate('/settings'); setOpen(false) }}
                  className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors text-[13px] text-[#344054]"
                >
                  <Settings size={13} className="text-gray-400" />
                  Workspace settings
                </button>

                <button
                  disabled={atLimit}
                  onClick={() => { if (!atLimit) { setCreate(true); setOpen(false) } }}
                  title={atLimit ? 'Upgrade to Studio to create multiple workspaces' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2 py-2 rounded-xl transition-colors text-[13px]',
                    atLimit ? 'text-gray-300 cursor-not-allowed' : 'text-[#344054] hover:bg-gray-50'
                  )}
                >
                  <Plus size={13} className={atLimit ? 'text-gray-300' : 'text-gray-400'} />
                  Create workspace
                  {atLimit && <span className="ml-auto text-[10px] text-indigo-400 font-semibold">Studio only</span>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateWorkspaceModal open={showCreate} onClose={() => setCreate(false)} />
    </>
  )
}
```

- [ ] **Step 3: Add WorkspaceSwitcher to Sidebar.tsx**

In `src/components/layout/Sidebar.tsx`, find the `{/* User + sign out */}` section (around line 239) and add the switcher just above it:

```tsx
import WorkspaceSwitcher from '@/features/workspaces/components/WorkspaceSwitcher'

// In the bottom section, before the user/sign out button:
<div className="h-px bg-gray-100 my-1.5" />

<WorkspaceSwitcher />

<div className="h-px bg-gray-100 my-1.5" />

{/* User + sign out — existing button unchanged */}
```

- [ ] **Step 4: Type check + build check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
npm run build 2>&1 | tail -10
```

Expected: 0 errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/workspaces/ src/components/layout/Sidebar.tsx
git commit -m "feat: Phase 4b — WorkspaceSwitcher + CreateWorkspaceModal in sidebar"
```

---

## Task 10: Phase 4c — Settings WorkspaceTab + WorkspaceContext update

**Files:**
- Modify: `src/contexts/WorkspaceContext.tsx`
- Modify: `src/features/settings/hooks/useProfile.ts` — add `activeWorkspaceId` + `workspaceId` fields
- Modify: `src/features/settings/components/BusinessTab.tsx` — use workspace endpoint

- [ ] **Step 1: Update useProfile.ts — add workspaceId + activeWorkspaceId to UserProfile interface**

In `src/features/settings/hooks/useProfile.ts`, add to the `UserProfile` interface:
```typescript
  workspaceId:       string | null  // proxied from getMe
  activeWorkspaceId: string | null
```

These are now returned by the proxied `GET /users/me` response (set up in Task 7).

- [ ] **Step 2: Update WorkspaceContext.tsx — read from workspace API**

Replace the current implementation that reads `profile?.country` etc. with the workspace from `useWorkspaces()`:

```tsx
// src/contexts/WorkspaceContext.tsx
import { createContext, useContext, type ReactNode } from 'react'
import { useWorkspaces }       from '@/features/workspaces/hooks/useWorkspaces'
import { useProfile }          from '@/features/settings/hooks/useProfile'
import { getCountryDefaults, type BankFieldType } from '@/lib/countryDefaults'

export interface WorkspaceSettings {
  workspaceId: string | null
  country:     string
  currency:    string
  locale:      string
  taxLabel:    string
  taxRate:     number
  bankFields:  BankFieldType
  isIndia:     boolean
}

const WorkspaceContext = createContext<WorkspaceSettings>({
  workspaceId: null,
  country:     'IN',
  currency:    'INR',
  locale:      'en-IN',
  taxLabel:    'GST',
  taxRate:     18,
  bankFields:  'india',
  isIndia:     true,
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: workspaces = [] } = useWorkspaces()
  const { data: profile }         = useProfile()

  const activeId = profile?.activeWorkspaceId ?? null
  const activeWs = workspaces.find(w => w.id === activeId) ?? workspaces[0]

  // Fall back to profile proxy if workspace data not loaded yet
  const country  = (activeWs as any)?.country  ?? profile?.country  ?? 'IN'
  const defaults = getCountryDefaults(country)
  const currency = (activeWs as any)?.currency ?? profile?.currency ?? defaults.currency
  const taxLabel = (activeWs as any)?.taxLabel ?? profile?.taxLabel ?? defaults.taxLabel

  return (
    <WorkspaceContext.Provider value={{
      workspaceId: activeWs?.id ?? null,
      country,
      currency,
      locale:     defaults.locale,
      taxLabel,
      taxRate:    defaults.taxRate,
      bankFields: defaults.bankFields,
      isIndia:    country === 'IN',
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceSettings {
  return useContext(WorkspaceContext)
}
```

- [ ] **Step 3: Update BusinessTab.tsx — PATCH workspace instead of profile**

In `src/features/settings/components/BusinessTab.tsx`, import and use `useUpdateWorkspace` instead of `useUpdateProfile` for the business fields form:

```typescript
import { useUpdateWorkspace }   from '@/features/workspaces/hooks/useWorkspaces'
import { useWorkspace }         from '@/contexts/WorkspaceContext'

// Inside the component:
const { workspaceId } = useWorkspace()
const { mutate: updateWorkspace, isPending } = useUpdateWorkspace(workspaceId ?? '')

// In the submit handler, call updateWorkspace(formData) instead of updateProfile(formData)
```

- [ ] **Step 4: Type check + build check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
npm run build 2>&1 | tail -10
```

Expected: 0 errors, build succeeds.

- [ ] **Step 5: Final commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/contexts/WorkspaceContext.tsx src/features/settings/
git commit -m "feat: Phase 4c — WorkspaceContext reads workspace API; BusinessTab patches workspace"
```

---

## Verification Checklist (run after all tasks)

1. `SELECT COUNT(*) FROM workspaces` = `SELECT COUNT(*) FROM users WHERE owner_id IS NULL` (before cleanup) 
2. `\d leads` shows `workspace_id` column (not `user_id`) with FK → workspaces
3. `GET /workspaces` returns the user's workspace list
4. `POST /workspaces` with Studio plan creates a second workspace
5. `POST /workspaces` with Free plan returns 403 with upgrade message
6. `PATCH /users/active-workspace` switches workspace; subsequent `GET /clients` returns the new workspace's data
7. Team invite flow: invite sent, accepted by new user → `workspace_members` row created with role MEMBER
8. WorkspaceSwitcher appears in sidebar and lists all workspaces
9. Switching workspace in UI re-fetches all entity data
10. Settings > Business tab saves to workspace (not user) — verify in DB: `SELECT business_name FROM workspaces WHERE id = '<your-id>'`
11. `npm run build` in pakka-app exits 0
12. `npx tsc --noEmit` in pakka-api exits 0

---

## Rollback Reference

| Phase | Trigger rollback if… | Command |
|-------|---------------------|---------|
| Phase 1 | workspace_members seeded incorrectly | `npx prisma db execute --file prisma/migrations/20260615_phase1_workspace_tables/rollback.sql` |
| Phase 2 | entity queries return empty / FK errors | `npx prisma db execute --file prisma/migrations/20260615_phase2_rename_entity_columns/rollback.sql` |
| Phase 3d | team invites broken | `npx prisma db execute --file prisma/migrations/20260615_phase3_team_invite_rename/rollback.sql` |
| Phase 3e | getMe returns wrong profile data | `npx prisma db execute --file prisma/migrations/20260615_phase3_user_cleanup/rollback.sql` |
| Phase 4 | UI broken | Revert frontend commits — zero DB impact |
