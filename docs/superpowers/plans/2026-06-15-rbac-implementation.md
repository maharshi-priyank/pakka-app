# RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a DB-backed role system (Owner/Admin/Member/Viewer) with granular permissions, gated UI, and multi-workspace membership support.

**Architecture:** New `workspace_roles` and `workspace_role_permissions` tables. `WorkspaceMember` gains `workspaceRoleId` FK. Backend `PermissionsService` bootstraps system role permissions into memory at startup. Frontend `useWorkspacePermissions` fetches the current user's permission array; `<Can>` component gates UI elements.

**Tech Stack:** NestJS + Prisma v7 + PostgreSQL (Supabase), React + Vite + TanStack Query v5

**Spec:** `/Users/mvaghela/Documents/MyProjects/pakka-app/docs/superpowers/specs/2026-06-15-rbac-design.md`

**Repos:**
- API: `/Users/mvaghela/Documents/MyProjects/pakka-api`
- App: `/Users/mvaghela/Documents/MyProjects/pakka-app`

**Critical constraints:**
- Cannot use `npx prisma migrate dev`. Pattern: write SQL → `npx prisma db execute --file migration.sql --schema prisma/schema.prisma` → `npx prisma migrate resolve --applied <name>` → `npx prisma generate`
- Migration files: `prisma/migrations/<timestamp_name>/migration.sql`
- Global JwtAuthGuard via APP_GUARD — no `@UseGuards()` needed for auth
- ResponseTransformInterceptor wraps responses as `{ data: T }` — frontend uses `r.data.data`
- DTOs must be classes with class-validator decorators
- TanStack Query v5: `invalidateQueries({ queryKey: [...] })`
- Frontend: `cn()` from clsx, lucide-react icons only, no emojis

---

## Task 1: Prisma Schema Changes

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Rename WorkspaceRole enum to LegacyMemberRole**

Find and replace in schema.prisma:
```prisma
# BEFORE (line ~28):
enum WorkspaceRole {
  OWNER
  MEMBER
}

# AFTER:
enum LegacyMemberRole {
  OWNER
  MEMBER
}
```

Also update WorkspaceMember field reference:
```prisma
# BEFORE:
role        WorkspaceRole @default(MEMBER)

# AFTER:
role        LegacyMemberRole @default(MEMBER)
```

- [ ] **Step 2: Add Permission enum after LegacyMemberRole**

```prisma
enum Permission {
  VIEW_LEADS
  MANAGE_LEADS
  VIEW_CLIENTS
  MANAGE_CLIENTS
  VIEW_PROJECTS
  MANAGE_PROJECTS
  VIEW_TASKS
  MANAGE_TASKS
  VIEW_INBOX
  SEND_MESSAGES
  VIEW_PROPOSALS
  MANAGE_PROPOSALS
  SEND_PROPOSALS
  VIEW_CONTRACTS
  MANAGE_CONTRACTS
  SEND_CONTRACTS
  VIEW_INVOICES
  MANAGE_INVOICES
  SEND_INVOICES
  RECORD_PAYMENTS
  VIEW_REPORTS
  VIEW_CALENDAR
  MANAGE_CALENDAR
  VIEW_FORMS
  MANAGE_FORMS
  VIEW_AUTOMATIONS
  MANAGE_AUTOMATIONS
  MANAGE_WORKSPACE_SETTINGS
  MANAGE_BILLING
  MANAGE_MEMBERS
  MANAGE_INTEGRATIONS
}
```

- [ ] **Step 3: Add WorkspaceRole model and WorkspaceRolePermission model**

Add after the `Workspace` model:

```prisma
model WorkspaceRole {
  id          String                    @id @default(cuid())
  key         String                    @unique
  name        String
  description String?
  isSystem    Boolean                   @default(true)
  sortOrder   Int                       @default(0)
  permissions WorkspaceRolePermission[]
  members     WorkspaceMember[]
  createdAt   DateTime                  @default(now())

  @@map("workspace_roles")
}

model WorkspaceRolePermission {
  id         String        @id @default(cuid())
  roleId     String
  role       WorkspaceRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission

  @@unique([roleId, permission])
  @@index([roleId])
  @@map("workspace_role_permissions")
}
```

- [ ] **Step 4: Update WorkspaceMember to add workspaceRoleId**

In the `WorkspaceMember` model, add:
```prisma
  workspaceRoleId String
  workspaceRole   WorkspaceRole @relation(fields: [workspaceRoleId], references: [id])
```

Full model after change:
```prisma
model WorkspaceMember {
  id              String           @id @default(cuid())
  userId          String
  workspaceId     String
  role            LegacyMemberRole @default(MEMBER)
  workspaceRoleId String
  workspaceRole   WorkspaceRole    @relation(fields: [workspaceRoleId], references: [id])
  joinedAt        DateTime         @default(now())

  user      User      @relation(fields: [userId],      references: [id], onDelete: Cascade)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([userId])
  @@index([workspaceId])
  @@map("workspace_members")
}
```

- [ ] **Step 5: Update TeamInvite to add optional workspaceRoleId**

In the `TeamInvite` model, add:
```prisma
  workspaceRoleId String?
```

(No relation declared — it's stored as plain text and resolved at accept-time.)

---

## Task 2: SQL Migration + Apply

**Files:**
- Create: `pakka-api/prisma/migrations/20260615000001_rbac_workspace_roles/migration.sql`

- [ ] **Step 1: Create migration directory and file**

```bash
mkdir -p /Users/mvaghela/Documents/MyProjects/pakka-api/prisma/migrations/20260615000001_rbac_workspace_roles
```

- [ ] **Step 2: Write migration SQL**

Create the file with this content:

```sql
-- Rename WorkspaceRole enum to LegacyMemberRole
ALTER TYPE "WorkspaceRole" RENAME TO "LegacyMemberRole";

-- Create Permission enum
CREATE TYPE "Permission" AS ENUM (
  'VIEW_LEADS', 'MANAGE_LEADS',
  'VIEW_CLIENTS', 'MANAGE_CLIENTS',
  'VIEW_PROJECTS', 'MANAGE_PROJECTS',
  'VIEW_TASKS', 'MANAGE_TASKS',
  'VIEW_INBOX', 'SEND_MESSAGES',
  'VIEW_PROPOSALS', 'MANAGE_PROPOSALS', 'SEND_PROPOSALS',
  'VIEW_CONTRACTS', 'MANAGE_CONTRACTS', 'SEND_CONTRACTS',
  'VIEW_INVOICES', 'MANAGE_INVOICES', 'SEND_INVOICES', 'RECORD_PAYMENTS',
  'VIEW_REPORTS',
  'VIEW_CALENDAR', 'MANAGE_CALENDAR',
  'VIEW_FORMS', 'MANAGE_FORMS',
  'VIEW_AUTOMATIONS', 'MANAGE_AUTOMATIONS',
  'MANAGE_WORKSPACE_SETTINGS', 'MANAGE_BILLING', 'MANAGE_MEMBERS', 'MANAGE_INTEGRATIONS'
);

-- Create workspace_roles table
CREATE TABLE "workspace_roles" (
  "id"          TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "is_system"   BOOLEAN NOT NULL DEFAULT true,
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_roles_key_key" UNIQUE ("key")
);

-- Create workspace_role_permissions table
CREATE TABLE "workspace_role_permissions" (
  "id"         TEXT NOT NULL,
  "role_id"    TEXT NOT NULL,
  "permission" "Permission" NOT NULL,
  CONSTRAINT "workspace_role_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_role_permissions_role_id_permission_key" UNIQUE ("role_id", "permission"),
  CONSTRAINT "workspace_role_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "workspace_roles"("id") ON DELETE CASCADE
);

CREATE INDEX "workspace_role_permissions_role_id_idx" ON "workspace_role_permissions"("role_id");

-- Add workspace_role_id to workspace_members (nullable initially)
ALTER TABLE "workspace_members" ADD COLUMN "workspace_role_id" TEXT;

-- Add workspace_role_id to team_invites (nullable)
ALTER TABLE "team_invites" ADD COLUMN "workspace_role_id" TEXT;

-- Seed 4 preset roles
INSERT INTO "workspace_roles" ("id", "key", "name", "description", "is_system", "sort_order") VALUES
  (gen_random_uuid()::text, 'OWNER',  'Owner',  'Full access to all workspace features',     true, 0),
  (gen_random_uuid()::text, 'ADMIN',  'Admin',  'Full access except billing management',     true, 1),
  (gen_random_uuid()::text, 'MEMBER', 'Member', 'Operational access, no financial data',     true, 2),
  (gen_random_uuid()::text, 'VIEWER', 'Viewer', 'Read-only access to operational sections',  true, 3);

-- Seed OWNER permissions (all)
INSERT INTO "workspace_role_permissions" ("id", "role_id", "permission")
SELECT gen_random_uuid()::text, r.id, p.permission::"Permission"
FROM "workspace_roles" r
CROSS JOIN (VALUES
  ('VIEW_LEADS'), ('MANAGE_LEADS'), ('VIEW_CLIENTS'), ('MANAGE_CLIENTS'),
  ('VIEW_PROJECTS'), ('MANAGE_PROJECTS'), ('VIEW_TASKS'), ('MANAGE_TASKS'),
  ('VIEW_INBOX'), ('SEND_MESSAGES'), ('VIEW_PROPOSALS'), ('MANAGE_PROPOSALS'),
  ('SEND_PROPOSALS'), ('VIEW_CONTRACTS'), ('MANAGE_CONTRACTS'), ('SEND_CONTRACTS'),
  ('VIEW_INVOICES'), ('MANAGE_INVOICES'), ('SEND_INVOICES'), ('RECORD_PAYMENTS'),
  ('VIEW_REPORTS'), ('VIEW_CALENDAR'), ('MANAGE_CALENDAR'), ('VIEW_FORMS'),
  ('MANAGE_FORMS'), ('VIEW_AUTOMATIONS'), ('MANAGE_AUTOMATIONS'),
  ('MANAGE_WORKSPACE_SETTINGS'), ('MANAGE_BILLING'), ('MANAGE_MEMBERS'), ('MANAGE_INTEGRATIONS')
) AS p(permission)
WHERE r.key = 'OWNER';

-- Seed ADMIN permissions (all except MANAGE_BILLING)
INSERT INTO "workspace_role_permissions" ("id", "role_id", "permission")
SELECT gen_random_uuid()::text, r.id, p.permission::"Permission"
FROM "workspace_roles" r
CROSS JOIN (VALUES
  ('VIEW_LEADS'), ('MANAGE_LEADS'), ('VIEW_CLIENTS'), ('MANAGE_CLIENTS'),
  ('VIEW_PROJECTS'), ('MANAGE_PROJECTS'), ('VIEW_TASKS'), ('MANAGE_TASKS'),
  ('VIEW_INBOX'), ('SEND_MESSAGES'), ('VIEW_PROPOSALS'), ('MANAGE_PROPOSALS'),
  ('SEND_PROPOSALS'), ('VIEW_CONTRACTS'), ('MANAGE_CONTRACTS'), ('SEND_CONTRACTS'),
  ('VIEW_INVOICES'), ('MANAGE_INVOICES'), ('SEND_INVOICES'), ('RECORD_PAYMENTS'),
  ('VIEW_REPORTS'), ('VIEW_CALENDAR'), ('MANAGE_CALENDAR'), ('VIEW_FORMS'),
  ('MANAGE_FORMS'), ('VIEW_AUTOMATIONS'), ('MANAGE_AUTOMATIONS'),
  ('MANAGE_WORKSPACE_SETTINGS'), ('MANAGE_MEMBERS'), ('MANAGE_INTEGRATIONS')
) AS p(permission)
WHERE r.key = 'ADMIN';

-- Seed MEMBER permissions (operational, no financial)
INSERT INTO "workspace_role_permissions" ("id", "role_id", "permission")
SELECT gen_random_uuid()::text, r.id, p.permission::"Permission"
FROM "workspace_roles" r
CROSS JOIN (VALUES
  ('VIEW_LEADS'), ('MANAGE_LEADS'), ('VIEW_CLIENTS'), ('MANAGE_CLIENTS'),
  ('VIEW_PROJECTS'), ('MANAGE_PROJECTS'), ('VIEW_TASKS'), ('MANAGE_TASKS'),
  ('VIEW_INBOX'), ('SEND_MESSAGES'), ('VIEW_PROPOSALS'), ('MANAGE_PROPOSALS'),
  ('VIEW_CONTRACTS'), ('MANAGE_CONTRACTS'),
  ('VIEW_CALENDAR'), ('MANAGE_CALENDAR'),
  ('VIEW_FORMS'), ('VIEW_AUTOMATIONS')
) AS p(permission)
WHERE r.key = 'MEMBER';

-- Seed VIEWER permissions (read-only)
INSERT INTO "workspace_role_permissions" ("id", "role_id", "permission")
SELECT gen_random_uuid()::text, r.id, p.permission::"Permission"
FROM "workspace_roles" r
CROSS JOIN (VALUES
  ('VIEW_LEADS'), ('VIEW_CLIENTS'), ('VIEW_PROJECTS'), ('VIEW_TASKS'),
  ('VIEW_INBOX'), ('VIEW_PROPOSALS'), ('VIEW_CONTRACTS'),
  ('VIEW_CALENDAR'), ('VIEW_FORMS'), ('VIEW_AUTOMATIONS')
) AS p(permission)
WHERE r.key = 'VIEWER';

-- Populate workspace_role_id on existing workspace_members
UPDATE "workspace_members" wm
SET "workspace_role_id" = wr.id
FROM "workspace_roles" wr
WHERE (wm.role::text = 'OWNER'  AND wr.key = 'OWNER')
   OR (wm.role::text = 'MEMBER' AND wr.key = 'MEMBER');

-- Make workspace_role_id NOT NULL and add FK constraint
ALTER TABLE "workspace_members"
  ALTER COLUMN "workspace_role_id" SET NOT NULL;

ALTER TABLE "workspace_members"
  ADD CONSTRAINT "workspace_members_workspace_role_id_fkey"
  FOREIGN KEY ("workspace_role_id") REFERENCES "workspace_roles"("id");
```

- [ ] **Step 3: Apply migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260615000001_rbac_workspace_roles/migration.sql --schema prisma/schema.prisma
```

Expected: no errors. If enum cast fails, check PostgreSQL version supports `'value'::"EnumType"` syntax (Supabase is PG 15+, supported).

- [ ] **Step 4: Mark migration as applied**

```bash
npx prisma migrate resolve --applied 20260615000001_rbac_workspace_roles
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: client generated with new models `WorkspaceRole`, `WorkspaceRolePermission`, `Permission` enum, `LegacyMemberRole` enum.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors from the enum rename (`WorkspaceRole` → `LegacyMemberRole` in any TS files that reference it).

---

## Task 3: PermissionsModule (Backend)

**Files:**
- Create: `pakka-api/src/modules/permissions/permissions.module.ts`
- Create: `pakka-api/src/modules/permissions/permissions.service.ts`
- Create: `pakka-api/src/common/decorators/require-permission.decorator.ts`
- Create: `pakka-api/src/common/guards/workspace-permission.guard.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create require-permission decorator**

`pakka-api/src/common/decorators/require-permission.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common'

export const PERMISSION_KEY = 'required_permission'
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission)
```

- [ ] **Step 2: Create PermissionsService**

`pakka-api/src/modules/permissions/permissions.service.ts`:
```ts
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PermissionsService implements OnModuleInit {
  private systemRolePermissions = new Map<string, Set<string>>()

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const roles = await this.prisma.workspaceRole.findMany({
      where:   { isSystem: true },
      include: { permissions: true },
    })
    for (const role of roles) {
      this.systemRolePermissions.set(
        role.key,
        new Set(role.permissions.map(p => p.permission as string)),
      )
    }
  }

  async hasPermission(userId: string, workspaceId: string, permission: string): Promise<boolean> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where:   { userId_workspaceId: { userId, workspaceId } },
      include: { workspaceRole: true },
    })
    if (!membership) return false

    const cached = this.systemRolePermissions.get(membership.workspaceRole.key)
    if (cached) return cached.has(permission)

    // Custom role fallback (future: isSystem = false)
    const perm = await this.prisma.workspaceRolePermission.findUnique({
      where: { roleId_permission: { roleId: membership.workspaceRoleId, permission: permission as any } },
    })
    return !!perm
  }

  async getPermissions(userId: string, workspaceId: string): Promise<string[]> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where:   { userId_workspaceId: { userId, workspaceId } },
      include: { workspaceRole: true },
    })
    if (!membership) return []

    const cached = this.systemRolePermissions.get(membership.workspaceRole.key)
    if (cached) return [...cached]

    const perms = await this.prisma.workspaceRolePermission.findMany({
      where: { roleId: membership.workspaceRoleId },
    })
    return perms.map(p => p.permission as string)
  }

  async listRoles() {
    return this.prisma.workspaceRole.findMany({
      orderBy: { sortOrder: 'asc' },
    })
  }
}
```

- [ ] **Step 3: Create WorkspacePermissionGuard**

`pakka-api/src/common/guards/workspace-permission.guard.ts`:
```ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { User } from '@prisma/client'
import { PERMISSION_KEY } from '../decorators/require-permission.decorator'
import { PermissionsService } from '../../modules/permissions/permissions.service'

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!permission) return true

    const request = context.switchToHttp().getRequest()
    const user: User = request.user
    if (!user?.activeWorkspaceId) return false

    const allowed = await this.permissions.hasPermission(user.id, user.activeWorkspaceId, permission)
    if (!allowed) throw new ForbiddenException('Insufficient permissions.')
    return true
  }
}
```

- [ ] **Step 4: Create PermissionsModule**

`pakka-api/src/modules/permissions/permissions.module.ts`:
```ts
import { Global, Module } from '@nestjs/common'
import { PermissionsService } from './permissions.service'

@Global()
@Module({
  providers: [PermissionsService],
  exports:   [PermissionsService],
})
export class PermissionsModule {}
```

- [ ] **Step 5: Register in AppModule**

In `pakka-api/src/app.module.ts`:
1. Import `PermissionsModule` from `./modules/permissions/permissions.module`
2. Import `WorkspacePermissionGuard` from `./common/guards/workspace-permission.guard`
3. Add `PermissionsModule` to `imports` array (after `PrismaModule`)
4. Add to `providers` after the existing `APP_GUARD` entries:
```ts
{ provide: APP_GUARD, useClass: WorkspacePermissionGuard },
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: Workspaces API — Roles + My Permissions Endpoints

**Files:**
- Modify: `pakka-api/src/modules/workspaces/workspaces.service.ts`
- Modify: `pakka-api/src/modules/workspaces/workspaces.controller.ts`
- Modify: `pakka-api/src/modules/workspaces/workspaces.module.ts`

- [ ] **Step 1: Update WorkspacesService**

In `workspaces.service.ts`, inject `PermissionsService` and add two methods:

Add to constructor:
```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly permissionsService: PermissionsService,
) {}
```

Add methods:
```ts
async getRoles() {
  return this.permissionsService.listRoles()
}

async getMyPermissions(userId: string, workspaceId: string) {
  return this.permissionsService.getPermissions(userId, workspaceId)
}
```

Also update `listForUser` to return the role key from the new system:
```ts
async listForUser(userId: string) {
  const memberships = await this.prisma.workspaceMember.findMany({
    where:   { userId },
    include: { workspace: true, workspaceRole: true },
    orderBy: { joinedAt: 'asc' },
  })
  return memberships.map(m => ({
    ...m.workspace,
    role:     m.workspaceRole.key,   // now returns 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    roleId:   m.workspaceRoleId,
    roleName: m.workspaceRole.name,
  }))
}
```

- [ ] **Step 2: Add controller endpoints**

In `workspaces.controller.ts`, add two routes at the top (before `:id` routes to avoid param conflicts):
```ts
@Get('roles')
@ApiOperation({ summary: 'List available workspace roles' })
getRoles() {
  return this.workspacesService.getRoles()
}

@Get('my-permissions')
@ApiOperation({ summary: 'Get current user permissions for their active workspace' })
getMyPermissions(@CurrentUser() user: User) {
  return this.workspacesService.getMyPermissions(user.id, user.activeWorkspaceId!)
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
```

---

## Task 5: Team Invite — Multi-workspace + Role Support

**Files:**
- Modify: `pakka-api/src/modules/team/dto/invite-member.dto.ts`
- Modify: `pakka-api/src/modules/team/team.service.ts`

- [ ] **Step 1: Update InviteMemberDto**

`pakka-api/src/modules/team/dto/invite-member.dto.ts`:
```ts
import { IsEmail, IsOptional, IsString } from 'class-validator'

export class InviteMemberDto {
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  roleId?: string  // workspace_roles.id — defaults to MEMBER role if omitted
}
```

- [ ] **Step 2: Update team.controller.ts to pass roleId**

In `team.controller.ts`, update the invite handler:
```ts
@Post('invite')
invite(@CurrentUser() user: User, @Body() dto: InviteMemberDto) {
  return this.team.invite(user, dto.email, dto.roleId)
}
```

- [ ] **Step 3: Update TeamService.invite to accept roleId**

In `team.service.ts`, change the `invite` signature and pass `roleId` to the invite record:

```ts
async invite(owner: User, email: string, roleId?: string) {
  // ... existing plan/seat checks ...

  // Resolve role — default to MEMBER if not provided
  let resolvedRoleId = roleId
  if (!resolvedRoleId) {
    const memberRole = await this.prisma.workspaceRole.findUnique({ where: { key: 'MEMBER' } })
    resolvedRoleId = memberRole!.id
  }

  // ... existing duplicate check ...

  await this.prisma.teamInvite.upsert({
    where:  { ownerId_email: { ownerId: owner.id, email } },
    create: { ownerId: owner.id, email, token, expiresAt, workspaceRoleId: resolvedRoleId },
    update: { token, expiresAt, accepted: false, workspaceRoleId: resolvedRoleId },
  })

  // ... rest of email sending ...
}
```

- [ ] **Step 4: Remove multi-workspace block + update acceptInvite**

In `team.service.ts`, `acceptInvite` method:

1. **Delete line 136** (the block):
```ts
// DELETE THIS LINE:
if (user.ownerId) throw new BadRequestException('You are already a member of another workspace.')
```

2. Update the `$transaction` to use `workspaceRoleId` from the invite:

```ts
// After fetching invite, resolve role id
const workspaceRoleId = invite.workspaceRoleId ?? (
  await this.prisma.workspaceRole.findUnique({ where: { key: 'MEMBER' } })
)!.id

await this.prisma.$transaction([
  this.prisma.user.update({
    where: { id: userId },
    data:  { ownerId: invite.ownerId, activeWorkspaceId: invite.ownerId },
  }),
  this.prisma.workspaceMember.upsert({
    where:  { userId_workspaceId: { userId, workspaceId: invite.ownerId } },
    create: { userId, workspaceId: invite.ownerId, role: 'MEMBER', workspaceRoleId },
    update: { workspaceRoleId },
  }),
])
```

- [ ] **Step 5: Update workspaces.service.ts create() to use OWNER workspaceRoleId**

In `workspaces.service.ts`, `create()` method — the `workspaceMember.create` call needs `workspaceRoleId`:

```ts
async create(userId: string, userPlan: string, dto: CreateWorkspaceDto) {
  // ... existing limit check ...

  const id = nanoid(21)
  const ownerRole = await this.prisma.workspaceRole.findUnique({ where: { key: 'OWNER' } })

  await this.prisma.$transaction([
    this.prisma.workspace.create({ data: { id, name: dto.name } }),
    this.prisma.workspaceMember.create({
      data: { userId, workspaceId: id, role: 'OWNER', workspaceRoleId: ownerRole!.id },
    }),
    this.prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: id } }),
  ])
  return { id, name: dto.name }
}
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: Frontend — Permission Types + useWorkspacePermissions

**Files:**
- Create: `pakka-app/src/types/permissions.ts`
- Create: `pakka-app/src/features/settings/hooks/useWorkspacePermissions.ts`
- Modify: `pakka-app/src/features/settings/hooks/useWorkspaces.ts`

- [ ] **Step 1: Create Permission type constants**

`pakka-app/src/types/permissions.ts`:
```ts
export const Permission = {
  VIEW_LEADS:                'VIEW_LEADS',
  MANAGE_LEADS:              'MANAGE_LEADS',
  VIEW_CLIENTS:              'VIEW_CLIENTS',
  MANAGE_CLIENTS:            'MANAGE_CLIENTS',
  VIEW_PROJECTS:             'VIEW_PROJECTS',
  MANAGE_PROJECTS:           'MANAGE_PROJECTS',
  VIEW_TASKS:                'VIEW_TASKS',
  MANAGE_TASKS:              'MANAGE_TASKS',
  VIEW_INBOX:                'VIEW_INBOX',
  SEND_MESSAGES:             'SEND_MESSAGES',
  VIEW_PROPOSALS:            'VIEW_PROPOSALS',
  MANAGE_PROPOSALS:          'MANAGE_PROPOSALS',
  SEND_PROPOSALS:            'SEND_PROPOSALS',
  VIEW_CONTRACTS:            'VIEW_CONTRACTS',
  MANAGE_CONTRACTS:          'MANAGE_CONTRACTS',
  SEND_CONTRACTS:            'SEND_CONTRACTS',
  VIEW_INVOICES:             'VIEW_INVOICES',
  MANAGE_INVOICES:           'MANAGE_INVOICES',
  SEND_INVOICES:             'SEND_INVOICES',
  RECORD_PAYMENTS:           'RECORD_PAYMENTS',
  VIEW_REPORTS:              'VIEW_REPORTS',
  VIEW_CALENDAR:             'VIEW_CALENDAR',
  MANAGE_CALENDAR:           'MANAGE_CALENDAR',
  VIEW_FORMS:                'VIEW_FORMS',
  MANAGE_FORMS:              'MANAGE_FORMS',
  VIEW_AUTOMATIONS:          'VIEW_AUTOMATIONS',
  MANAGE_AUTOMATIONS:        'MANAGE_AUTOMATIONS',
  MANAGE_WORKSPACE_SETTINGS: 'MANAGE_WORKSPACE_SETTINGS',
  MANAGE_BILLING:            'MANAGE_BILLING',
  MANAGE_MEMBERS:            'MANAGE_MEMBERS',
  MANAGE_INTEGRATIONS:       'MANAGE_INTEGRATIONS',
} as const

export type Permission = typeof Permission[keyof typeof Permission]
```

- [ ] **Step 2: Create useWorkspacePermissions hook**

`pakka-app/src/features/settings/hooks/useWorkspacePermissions.ts`:
```ts
import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Permission } from '@/types/permissions'

export function useWorkspacePermissions() {
  const { data: permissions = [] } = useQuery({
    queryKey: ['workspace-permissions'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: Permission[] }>('/workspaces/my-permissions')
      return data.data
    },
    staleTime: 60_000,
  })

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  )

  return { permissions, hasPermission }
}
```

Note: this query is automatically invalidated on workspace switch because `useSwitchWorkspace` calls `qc.invalidateQueries()` (no args = invalidates all).

- [ ] **Step 3: Update Workspace type in useWorkspaces.ts**

In `pakka-app/src/features/settings/hooks/useWorkspaces.ts`, update the `role` field:
```ts
// BEFORE:
role: 'OWNER' | 'MEMBER'

// AFTER:
role:     'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
roleId:   string
roleName: string
```

---

## Task 7: Can Component + Route Permission Guard

**Files:**
- Create: `pakka-app/src/components/Can.tsx`
- Create: `pakka-app/src/hooks/usePermissionRedirect.ts`

- [ ] **Step 1: Create Can component**

`pakka-app/src/components/Can.tsx`:
```tsx
import { type ReactNode } from 'react'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import type { Permission } from '@/types/permissions'

interface CanProps {
  permission: Permission
  children:   ReactNode
  fallback?:  ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = useWorkspacePermissions()
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}
```

- [ ] **Step 2: Create usePermissionRedirect hook**

`pakka-app/src/hooks/usePermissionRedirect.ts`:
```ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import type { Permission } from '@/types/permissions'

export function usePermissionRedirect(permission: Permission, redirectTo = '/dashboard') {
  const { hasPermission, permissions } = useWorkspacePermissions()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect once permissions have loaded (non-empty array)
    if (permissions.length > 0 && !hasPermission(permission)) {
      navigate(redirectTo, { replace: true })
    }
  }, [permissions, hasPermission, permission, navigate, redirectTo])
}
```

---

## Task 8: Sidebar Permission Gating

**Files:**
- Modify: `pakka-app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read current nav items structure**

The nav items array is at the top of Sidebar.tsx (lines ~29-43). It currently includes all items including `invoices` and `reports`.

- [ ] **Step 2: Add permission field to nav items**

Update the nav items array type and entries:

```tsx
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'

// Add permission to the nav item type:
type NavItem = {
  id:         string
  icon:       LucideIcon
  label:      string
  href:       string
  tourId?:    string
  permission?: Permission  // if set, item is hidden when user lacks this permission
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard' },
  { id: 'leads',       icon: Users,           label: 'Leads',       href: '/leads',       permission: Permission.VIEW_LEADS },
  { id: 'clients',     icon: Building2,       label: 'Clients',     href: '/clients',     permission: Permission.VIEW_CLIENTS },
  { id: 'projects',    icon: FolderKanban,    label: 'Projects',    href: '/projects',    permission: Permission.VIEW_PROJECTS },
  { id: 'tasks',       icon: CheckSquare,     label: 'Tasks',       href: '/tasks',       permission: Permission.VIEW_TASKS },
  { id: 'inbox',       icon: MessageSquare,   label: 'Inbox',       href: '/inbox',       permission: Permission.VIEW_INBOX },
  { id: 'proposals',   icon: FileText,        label: 'Proposals',   href: '/proposals',   permission: Permission.VIEW_PROPOSALS },
  { id: 'contracts',   icon: PenLine,         label: 'Contracts',   href: '/contracts',   permission: Permission.VIEW_CONTRACTS },
  { id: 'invoices',    icon: Receipt,         label: 'Invoices',    href: '/invoices',    permission: Permission.VIEW_INVOICES },
  { id: 'reports',     icon: BarChart3,       label: 'Reports',     href: '/reports',     permission: Permission.VIEW_REPORTS },
  { id: 'calendar',    icon: CalendarDays,    label: 'Calendar',    href: '/calendar',    permission: Permission.VIEW_CALENDAR },
  { id: 'forms',       icon: ClipboardList,   label: 'Forms',       href: '/forms',       permission: Permission.VIEW_FORMS },
  { id: 'automations', icon: Zap,             label: 'Automations', href: '/automations', permission: Permission.VIEW_AUTOMATIONS },
]
```

- [ ] **Step 3: Filter nav items in component body**

Inside the `Sidebar` component, add:
```tsx
const { hasPermission } = useWorkspacePermissions()

const visibleNavItems = NAV_ITEMS.filter(item =>
  !item.permission || hasPermission(item.permission)
)
```

Then render `visibleNavItems` instead of the original array.

- [ ] **Step 4: TypeScript check frontend**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

---

## Task 9: Gate Send Buttons in ProposalEditor + ContractEditor

**Files:**
- Modify: `pakka-app/src/features/proposals/components/ProposalEditor.tsx`
- Modify: `pakka-app/src/features/contracts/components/ContractEditor.tsx`

- [ ] **Step 1: Gate Send button in ProposalEditor**

In `ProposalEditor.tsx`:

1. Add import at the top:
```tsx
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'
```

2. Inside the component, add:
```tsx
const { hasPermission } = useWorkspacePermissions()
const canSendProposal = hasPermission(Permission.SEND_PROPOSALS)
```

3. Find the existing `canSend` variable (line ~242):
```tsx
// BEFORE:
const canSend = isEdit && (proposal?.status === 'DRAFT' || ...)

// AFTER:
const canSend = isEdit && canSendProposal && (proposal?.status === 'DRAFT' || ...)
```

- [ ] **Step 2: Gate Send button in ContractEditor**

Read `pakka-app/src/features/contracts/components/ContractEditor.tsx` to find the send button pattern, then apply same approach:

1. Add imports:
```tsx
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'
```

2. Add inside component:
```tsx
const { hasPermission } = useWorkspacePermissions()
```

3. Gate the send button / `canSend` variable with `hasPermission(Permission.SEND_CONTRACTS)`.

---

## Task 10: Gate InvoiceEditor Send + Settings Tabs

**Files:**
- Modify: `pakka-app/src/features/invoices/components/InvoiceEditor.tsx`
- Modify: `pakka-app/src/pages/app/SettingsPage.tsx`

- [ ] **Step 1: Gate Send + Record Payment in InvoiceEditor**

In `InvoiceEditor.tsx`:

1. Add imports:
```tsx
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'
```

2. Inside component:
```tsx
const { hasPermission } = useWorkspacePermissions()
const canSendInvoice    = hasPermission(Permission.SEND_INVOICES)
const canRecordPayment  = hasPermission(Permission.RECORD_PAYMENTS)
```

3. Gate the Send button by wrapping it:
```tsx
{canSendInvoice && (
  <button onClick={handleSend} ...>
    ...Send invoice
  </button>
)}
```

4. Gate any "Record payment" / "Mark paid" button with `canRecordPayment`.

- [ ] **Step 2: Gate Settings tabs based on permissions**

In `pakka-app/src/pages/app/SettingsPage.tsx`:

1. Add imports:
```tsx
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { Permission } from '@/types/permissions'
```

2. Inside component:
```tsx
const { hasPermission } = useWorkspacePermissions()
```

3. Update TABS array to be a filtered list:
```tsx
const ALL_TABS = [
  { key: 'profile',       label: 'Profile',        icon: User       },
  { key: 'business',      label: 'Business',       icon: Building2  },
  { key: 'public',        label: 'Public Profile', icon: Globe      },
  { key: 'notifications', label: 'Notifications',  icon: Bell       },
  { key: 'integrations',  label: 'Integrations',   icon: Puzzle,     permission: Permission.MANAGE_INTEGRATIONS },
  { key: 'billing',       label: 'Billing',        icon: CreditCard, permission: Permission.MANAGE_BILLING },
  { key: 'team',          label: 'Team',           icon: Users,      permission: Permission.MANAGE_MEMBERS },
] as const

// Inside component, derive visible tabs:
const TABS = ALL_TABS.filter(t => !('permission' in t) || hasPermission(t.permission as Permission))
```

Note: The type for TABS will need adjustment since filtering a `const` array changes the type. Cast as needed.

---

## Task 11: Protect Invoices + Reports Routes

**Files:**
- Modify: `pakka-app/src/pages/app/InvoicesPage.tsx` (or whichever page is at `/invoices`)
- Modify: `pakka-app/src/pages/app/ReportsPage.tsx`

- [ ] **Step 1: Find the invoices page component**

The route at `/invoices` is:
```
path: '/invoices' → lazy import '@/pages/app/InvoicesPage'
```

Read `pakka-app/src/pages/app/InvoicesPage.tsx` to find the top-level component.

- [ ] **Step 2: Add redirect in InvoicesPage**

At the top of the `InvoicesPage` component:
```tsx
import { usePermissionRedirect } from '@/hooks/usePermissionRedirect'
import { Permission } from '@/types/permissions'

// Inside component:
usePermissionRedirect(Permission.VIEW_INVOICES)
```

- [ ] **Step 3: Add redirect in ReportsPage**

Same pattern for `ReportsPage.tsx`:
```tsx
import { usePermissionRedirect } from '@/hooks/usePermissionRedirect'
import { Permission } from '@/types/permissions'

// Inside component:
usePermissionRedirect(Permission.VIEW_REPORTS)
```

---

## Task 12: TeamTab Role Selector + Invite Flow Update

**Files:**
- Modify: `pakka-app/src/features/team/components/TeamTab.tsx`
- Modify: `pakka-app/src/features/team/hooks/useTeam.ts` (or wherever `useInviteMember` is defined)

- [ ] **Step 1: Add useWorkspaceRoles hook**

In `pakka-app/src/features/settings/hooks/useWorkspacePermissions.ts`, add a second export:
```ts
export interface WorkspaceRole {
  id:          string
  key:         string
  name:        string
  description: string | null
  isSystem:    boolean
  sortOrder:   number
}

export function useWorkspaceRoles() {
  return useQuery({
    queryKey: ['workspace-roles'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: WorkspaceRole[] }>('/workspaces/roles')
      return data.data
    },
    staleTime: Infinity, // system roles never change
  })
}
```

- [ ] **Step 2: Update useInviteMember hook to accept roleId**

Find `pakka-app/src/features/team/hooks/useTeam.ts`. Update `useInviteMember`:

```ts
// BEFORE:
mutationFn: async (email: string) =>
  api.post('/team/invite', { email }).then(r => r.data)

// AFTER:
mutationFn: async ({ email, roleId }: { email: string; roleId?: string }) =>
  api.post('/team/invite', { email, roleId }).then(r => r.data)
```

- [ ] **Step 3: Update TeamTab invite form to include role selector**

In `TeamTab.tsx`:

1. Add imports:
```tsx
import { useWorkspaceRoles } from '@/features/settings/hooks/useWorkspacePermissions'
```

2. Add state:
```tsx
const { data: roles = [] } = useWorkspaceRoles()
const [selectedRoleId, setSelectedRoleId] = useState<string>('')

// Set default to MEMBER role once roles load
useEffect(() => {
  if (roles.length && !selectedRoleId) {
    const memberRole = roles.find(r => r.key === 'MEMBER')
    if (memberRole) setSelectedRoleId(memberRole.id)
  }
}, [roles, selectedRoleId])
```

3. Update handleInvite:
```tsx
function handleInvite(e: React.FormEvent) {
  e.preventDefault()
  if (!email.trim()) return
  invite({ email: email.trim(), roleId: selectedRoleId || undefined }, {
    onSuccess: () => setEmail(''),
  })
}
```

4. Add role selector to invite form (after email input, before button):
```tsx
<select
  value={selectedRoleId}
  onChange={e => setSelectedRoleId(e.target.value)}
  className="h-9 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4E] bg-white dark:bg-[#262838] text-[13px] text-[#101828] dark:text-[#ECEEF3] px-3 outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
>
  {roles.filter(r => r.key !== 'OWNER').map(r => (
    <option key={r.id} value={r.id}>{r.name}</option>
  ))}
</select>
```

(OWNER role excluded from invite — can't invite someone as owner.)

---

## Task 13: WorkspaceSwitcher — Show Role Name + Grouping

**Files:**
- Modify: `pakka-app/src/features/settings/components/WorkspaceSwitcher.tsx`

- [ ] **Step 1: Update role label**

In `WorkspaceSwitcher.tsx`, find:
```tsx
const roleLabel = role === 'OWNER' ? 'Owner' : 'Member'
```

Replace with:
```tsx
const roleLabel = active?.roleName ?? (role === 'OWNER' ? 'Owner' : 'Member')
```

- [ ] **Step 2: Group workspace list into "My workspaces" and "Invited workspaces"**

In the workspace list dropdown, separate into two groups:
```tsx
const myWorkspaces     = workspaces.filter(w => w.role === 'OWNER')
const invitedWorkspaces = workspaces.filter(w => w.role !== 'OWNER')
```

Render:
```tsx
{myWorkspaces.length > 0 && (
  <>
    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#98A2B3]">My Workspaces</p>
    {myWorkspaces.map(ws => <WorkspaceItem key={ws.id} ws={ws} />)}
  </>
)}
{invitedWorkspaces.length > 0 && (
  <>
    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#98A2B3] mt-1">Invited</p>
    {invitedWorkspaces.map(ws => <WorkspaceItem key={ws.id} ws={ws} />)}
  </>
)}
```

Where `WorkspaceItem` is the existing item render logic extracted to a local component or inline.

- [ ] **Step 3: Update role badge in workspace list item**

Find the line showing `ws.role === 'OWNER' ? 'Owner' : 'Member'` and replace with `ws.roleName ?? (ws.role === 'OWNER' ? 'Owner' : 'Member')`.

---

## Verification

- [ ] `npx tsc --noEmit` in pakka-api — 0 errors
- [ ] `npx tsc --noEmit` in pakka-app — 0 errors
- [ ] Log in as workspace OWNER — all nav items visible, all send buttons visible, all settings tabs visible
- [ ] Invite a test user with MEMBER role — invite form shows role selector
- [ ] Accept invite — new `WorkspaceMember` row has correct `workspaceRoleId`
- [ ] Switch to invited workspace as MEMBER — Invoices and Reports nav items hidden
- [ ] As MEMBER — Proposals/Contracts "Send to client" button hidden
- [ ] As MEMBER — Settings shows only Profile / Business / Public Profile / Notifications tabs
- [ ] As OWNER — Settings shows all 7 tabs including Billing and Team
- [ ] Navigate directly to `/invoices` as MEMBER — redirected to `/dashboard`
- [ ] Navigate directly to `/reports` as MEMBER — redirected to `/dashboard`
- [ ] Create a second workspace invite from a different owner — no "already member" error (multi-workspace fix)
