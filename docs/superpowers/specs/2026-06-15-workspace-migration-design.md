# Workspace Migration Design

**Date:** 2026-06-15  
**Status:** Approved  
**Approach:** Option A — ID-aliasing (zero data backfill)

---

## Overview

Transform ClearWork from a single-workspace-per-user model to a true multi-workspace architecture. Each workspace is independently branded, has its own business profile (GST, Razorpay, bank), and can have multiple members. Users can own or belong to multiple workspaces and switch between them.

The migration uses **ID-aliasing**: the new `Workspace` table is created with `id = user.id` for all existing users. Because every entity table already stores the owner's `user.id`, renaming those columns from `userId` → `workspaceId` requires zero data value changes — the values are already valid workspace IDs.

---

## Goals

- Multiple workspaces per user (plan-gated: SOLO = 1, STUDIO = 3)
- Workspace-level business profile: name, logo, GST/PAN, Razorpay, bank/UPI
- User-level personal data: plan/billing, OAuth integrations, public profile, stats
- RBAC-ready role system: OWNER | MEMBER (ADMIN extensible later)
- Owner controls all workspace integrations
- Workspace switcher UI in sidebar
- Full rollback capability at each phase

---

## Approach: Option A — ID-Aliasing

**Why this works**: `effectiveUserId(user)` already writes the workspace owner's `user.id` to every entity row. This means the owner's `user.id` IS the workspace ID — we just need to create the Workspace table to make it official.

**Key properties**:
- No data backfill required on any of the 28 entity tables
- Phase 2 (column renames) is reversible in seconds — values never change
- Each phase produces one git commit with an independent rollback path

---

## Data Model

### New: `Workspace` model

Business profile fields move from `User` to `Workspace`. The workspace `id` equals the owner's `user.id` for all existing workspaces.

```prisma
model Workspace {
  id                  String   @id
  name                String                         // COALESCE(businessName, user.name) on seed
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

  members     WorkspaceMember[]
  leads       Lead[]
  clients     Client[]
  proposals   Proposal[]
  contracts   Contract[]
  invoices    Invoice[]
  // ... all 28 entity relations

  @@map("workspaces")
}
```

### New: `WorkspaceMember` model

Replaces the self-referential `ownerId` on `User`. Supports RBAC extension later (add ADMIN between OWNER and MEMBER).

```prisma
enum WorkspaceRole {
  OWNER
  MEMBER
}

model WorkspaceMember {
  id            String        @id @default(cuid())
  userId        String
  workspaceId   String
  role          WorkspaceRole @default(MEMBER)
  joinedAt      DateTime      @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([userId])
  @@index([workspaceId])
  @@map("workspace_members")
}
```

### Updated: `User` model

Remove all business-profile fields and `ownerId` self-reference. Keep personal fields:

**Stay on User**: `id`, `email`, `name`, plan/billing fields (`plan`, `planExpiresAt`, `cashfreeSubscriptionId`, `cashfreePlanId`, `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, `billingAnchorDate`), all OAuth tokens (Google, Outlook, ClickUp, Canva, Flodesk), `onboardingComplete`, public profile fields, stats fields.

Add to User:
```prisma
activeWorkspaceId   String?   // which workspace the user is currently viewing
workspaceMemberships WorkspaceMember[]
```

### 28 Entity Models

All 28 models rename `userId` → `workspaceId` and update their relation from `User` → `Workspace`:

`Attachment`, `AutomationRule`, `AutomationWorkflow`, `BillingEvent`, `Client`, `ClientNote`, `Contract`, `EmailLog`, `EmailTemplate`, `Expense`, `IntakeForm`, `Invoice`, `Lead`, `Meeting`, `Notification`, `Project`, `ProjectNote`, `PromoRedemption`, `Proposal`, `ProposalTemplate`, `PublicProfileEnquiry`, `PushSubscription`, `Task`, `TaskBoard`, `Thread`, `TimeEntry`, `UserExpenseCategory`, `WorkflowRun`

---

## Plan Limits

| Plan | Max Workspaces | Enforcement |
|------|---------------|-------------|
| FREE | 1 | Server-side at POST /workspaces |
| SOLO | 1 | Server-side at POST /workspaces |
| STUDIO | 3 | Server-side at POST /workspaces |

Returns `403 ForbiddenException` with message: `"Your plan allows 1 workspace. Upgrade to Studio to create more."`

---

## Migration Phases

### Phase 1 — Add Workspace + WorkspaceMember tables

**Goal**: Create the new tables and seed them from existing User data. All existing services continue to use `effectiveUserId()` unchanged.

**Migration SQL**:

```sql
-- 1. Create workspaces table
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  business_name TEXT,
  gst_number TEXT,
  pan_number TEXT,
  business_type TEXT,
  razorpay_account_id TEXT,
  razorpay_key_id TEXT,
  razorpay_key_secret TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  upi_id TEXT,
  upi_qr_url TEXT,
  country TEXT,
  currency TEXT,
  tax_label TEXT,
  iban_number TEXT,
  swift_code TEXT,
  routing_number TEXT,
  default_hsn_sac TEXT,
  default_lut_number TEXT,
  email_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create workspace_members table
CREATE TABLE workspace_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);
CREATE INDEX idx_wm_user_id ON workspace_members(user_id);
CREATE INDEX idx_wm_workspace_id ON workspace_members(workspace_id);

-- 3. Seed workspaces from users (owners only — non-owners share the owner's workspace)
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
  COALESCE(business_name, name) AS name,
  logo_url, business_name, gst_number, pan_number, business_type,
  razorpay_account_id, razorpay_key_id, razorpay_key_secret,
  bank_name, bank_account_name, bank_account_number, bank_ifsc,
  upi_id, upi_qr_url, country, currency, tax_label,
  iban_number, swift_code, routing_number,
  default_hsn_sac, default_lut_number, email_signature,
  created_at, updated_at
FROM users
WHERE owner_id IS NULL;  -- only workspace owners get a workspace row

-- 4. Seed WorkspaceMember: owners
INSERT INTO workspace_members (id, user_id, workspace_id, role, joined_at)
SELECT gen_random_uuid()::text, id, id, 'OWNER', created_at
FROM users
WHERE owner_id IS NULL;

-- 5. Seed WorkspaceMember: team members (they join the owner's workspace)
INSERT INTO workspace_members (id, user_id, workspace_id, role, joined_at)
SELECT gen_random_uuid()::text, id, owner_id, 'MEMBER', created_at
FROM users
WHERE owner_id IS NOT NULL;
```

**Verification**: `SELECT COUNT(*) FROM workspaces` should equal `SELECT COUNT(*) FROM users WHERE owner_id IS NULL`.

**Schema changes**: Add `Workspace`, `WorkspaceMember`, `WorkspaceRole` enum to schema.prisma. Do NOT yet change entity models or remove User fields.

**Rollback**:
```sql
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
```

---

### Phase 2 — Rename userId → workspaceId on 28 entity tables

**Goal**: Rename the column on all entity tables. Values are unchanged (Option A guarantee).

**Migration SQL** (single transaction):

```sql
ALTER TABLE leads            RENAME COLUMN user_id TO workspace_id;
ALTER TABLE clients          RENAME COLUMN user_id TO workspace_id;
ALTER TABLE proposals        RENAME COLUMN user_id TO workspace_id;
ALTER TABLE contracts        RENAME COLUMN user_id TO workspace_id;
ALTER TABLE invoices         RENAME COLUMN user_id TO workspace_id;
ALTER TABLE projects         RENAME COLUMN user_id TO workspace_id;
ALTER TABLE tasks            RENAME COLUMN user_id TO workspace_id;
ALTER TABLE task_boards      RENAME COLUMN user_id TO workspace_id;
ALTER TABLE meetings         RENAME COLUMN user_id TO workspace_id;
ALTER TABLE time_entries     RENAME COLUMN user_id TO workspace_id;
ALTER TABLE expenses         RENAME COLUMN user_id TO workspace_id;
ALTER TABLE threads          RENAME COLUMN user_id TO workspace_id;
ALTER TABLE notifications    RENAME COLUMN user_id TO workspace_id;
ALTER TABLE push_subscriptions RENAME COLUMN user_id TO workspace_id;
ALTER TABLE intake_forms     RENAME COLUMN user_id TO workspace_id;
ALTER TABLE automation_rules RENAME COLUMN user_id TO workspace_id;
ALTER TABLE automation_workflows RENAME COLUMN user_id TO workspace_id;
ALTER TABLE workflow_runs    RENAME COLUMN user_id TO workspace_id;
ALTER TABLE email_templates  RENAME COLUMN user_id TO workspace_id;
ALTER TABLE attachments      RENAME COLUMN user_id TO workspace_id;
ALTER TABLE client_notes     RENAME COLUMN user_id TO workspace_id;
ALTER TABLE project_notes    RENAME COLUMN user_id TO workspace_id;
ALTER TABLE proposal_templates RENAME COLUMN user_id TO workspace_id;
ALTER TABLE email_logs       RENAME COLUMN user_id TO workspace_id;
ALTER TABLE billing_events   RENAME COLUMN user_id TO workspace_id;
ALTER TABLE promo_redemptions RENAME COLUMN user_id TO workspace_id;
ALTER TABLE public_profile_enquiries RENAME COLUMN user_id TO workspace_id;
ALTER TABLE user_expense_categories  RENAME COLUMN user_id TO workspace_id;
```

**Schema changes**: Update all 28 models in schema.prisma — rename `userId → workspaceId`, change relation type from `User` to `Workspace`.

**FK constraint**: The renames do NOT break the FK constraints — Postgres renames the column, the FK target stays the same. But once Phase 2 is complete, the FK now points from `workspaceId` → `workspaces.id` (still valid, same values).

**Rollback**:
```sql
-- Reverse all 28 renames
ALTER TABLE leads RENAME COLUMN workspace_id TO user_id;
-- ... same pattern for all 28 tables
```

---

### Phase 3 — Service layer: replace effectiveUserId with workspace resolution

**Goal**: All services query by `workspaceId` resolved from `WorkspaceMember`. Remove `ownerId` from User.

**New workspace resolver** (`src/modules/workspaces/workspace.resolver.ts`):

```ts
export async function resolveWorkspaceId(
  user: { id: string; activeWorkspaceId?: string | null },
  prisma: PrismaService,
): Promise<string> {
  // If user has an active workspace selection, use it
  if (user.activeWorkspaceId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: user.activeWorkspaceId } },
    })
    if (member) return member.workspaceId
  }
  // Fall back: first workspace the user is an OWNER of
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { role: 'asc' }, // OWNER < MEMBER alphabetically — add explicit priority if needed
  })
  if (!member) throw new NotFoundException('No workspace found for this user')
  return member.workspaceId
}
```

**Service changes**:
- All controllers/services currently using `effectiveUserId(user)` replace it with `await resolveWorkspaceId(user, this.prisma)` 
- Fix gaps: `meetings.service`, `expenses.service`, `time-entries.service`, `reports.service`, `automations.service` — these currently use raw `user.id` and must switch to `resolveWorkspaceId`
- Remove `effectiveUserId.ts` once all callers are migrated

**User model changes**:
- Remove `ownerId`, `owner`, `teamMembers` self-relations from User
- Add `activeWorkspaceId String?` to User
- Remove all business-profile fields from User (they now live on Workspace)
- Add `workspaceMemberships WorkspaceMember[]` to User

**Team service**: `team.service.ts` creates a `WorkspaceMember` row when accepting an invite (instead of setting `ownerId` on User).

**Rollback**: Restore `effectiveUserId()` calls, restore `ownerId` usage in team service. The DB column renames from Phase 2 stay — this rollback is code-only.

---

### Phase 4 — Workspace switcher UI

**Goal**: Users can see their workspaces and switch between them. Create workspace flow with plan gates.

#### Workspace Switcher (sidebar)

Location: bottom-left of AppShell sidebar, above the user avatar / logout area.

UI pattern (Dubsado-style):
- Current workspace name + initials avatar
- Click opens a popover/dropdown:
  - List all workspaces the user is a member of (grouped: OWNER first, then MEMBER)
  - Checkmark on active workspace
  - "Create workspace" option (disabled with tooltip if at plan limit)
  - "Workspace settings" link

On switch: `PATCH /users/active-workspace` → updates `user.activeWorkspaceId` → invalidate all queries → navigate to `/dashboard`.

#### Create Workspace Modal

Fields: Workspace name (required), Business name (optional).
On submit: `POST /workspaces` → creates workspace + WorkspaceMember(role: OWNER) → switch to new workspace.

Plan gate server-side: count `WorkspaceMember` rows where `userId = user.id AND role = OWNER`. If at limit, return 403.

Plan gate UI: "Create workspace" button shows plan limit tooltip for FREE/SOLO: "Upgrade to Studio to create multiple workspaces."

#### Settings — Workspace Tab

Move all business-profile fields (GST, Razorpay, bank, UPI, currency, tax label) to "Workspace" tab. These map to `PATCH /workspaces/:id`.

Add "Team" section to workspace settings (existing team members panel moves here).

**User tab**: Personal integrations (Google, Outlook, ClickUp, Canva, Flodesk) stay at user level.

**Owner-only**: Razorpay keys, bank details, and integration configuration are visible but read-only for MEMBER role. OWNER can edit.

#### New API Endpoints

```
GET    /workspaces              — list workspaces user is a member of
POST   /workspaces              — create new workspace (plan-gated)
GET    /workspaces/:id          — get workspace details
PATCH  /workspaces/:id          — update workspace profile (OWNER only)
DELETE /workspaces/:id          — delete workspace (OWNER only, must have 0 entities)
PATCH  /users/active-workspace  — set activeWorkspaceId on User
```

**Rollback**: Remove workspace switcher component, restore flat settings layout. Zero DB impact.

---

## Controllers with Gaps (Phase 3 priority)

These currently use raw `user.id` instead of `effectiveUserId()`. Must be fixed in Phase 3:

| Module | Current | Fix |
|--------|---------|-----|
| meetings | `user.id` | `resolveWorkspaceId(user, prisma)` |
| expenses | `user.id` | `resolveWorkspaceId(user, prisma)` |
| time-entries | `user.id` | `resolveWorkspaceId(user, prisma)` |
| reports | `user.id` | `resolveWorkspaceId(user, prisma)` |
| automations | `user.id` | `resolveWorkspaceId(user, prisma)` |

---

## Rollback Summary

| Phase | Rollback Action | DB impact | Code impact |
|-------|----------------|-----------|-------------|
| Phase 4 | Remove workspace switcher UI, restore settings layout | None | Frontend only |
| Phase 3 | Revert services to `effectiveUserId()`, restore `ownerId` on User | None | Backend only |
| Phase 2 | `ALTER TABLE ... RENAME COLUMN workspace_id TO user_id` × 28 | Instant, no data change | schema.prisma |
| Phase 1 | `DROP TABLE workspace_members; DROP TABLE workspaces;` | Removes 2 empty(ish) tables | schema.prisma |

**Trigger conditions**: Any phase rollback should be triggered if API error rates spike, workspace resolution returns wrong data for existing team members, or entity queries start returning empty results.

**Rollback SQL file**: Each phase's rollback SQL must be committed alongside its forward migration file, named `YYYY-MM-DD-phase-N-rollback.sql`.

---

## RBAC Extension Path (future)

`WorkspaceRole` enum is designed for extension:
```
OWNER  → full control (billing, settings, integrations, delete workspace)
ADMIN  → can invite/remove members, edit workspace profile (add later)
MEMBER → read/write entities, cannot change workspace settings
```

Adding ADMIN requires only: new enum value + permission checks in workspace settings endpoints. No schema migration needed.

---

## Success Criteria

1. Existing user data is accessible as before — no entity queries return empty sets
2. Team members see their owner's workspace entities after migration
3. A STUDIO user can create a second workspace and entities created there are isolated from the first
4. Switching workspaces in the sidebar updates all data views
5. FREE/SOLO user sees "upgrade" message when trying to create a second workspace
6. All 28 entity tables have `workspaceId` column (not `userId`) in DB
7. `WorkspaceMember` table has correct OWNER/MEMBER rows for all users
8. Rollback SQL files committed alongside each forward migration
