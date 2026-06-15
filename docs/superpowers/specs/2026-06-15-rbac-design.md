# RBAC Design — Preset Roles with Permission Matrix

## Overview

Introduce role-based access control (RBAC) to ClearWork workspaces. Replace the current binary `OWNER | MEMBER` enum with a DB-backed role system that supports preset roles (Owner, Admin, Member, Viewer), a granular permission matrix, and a clean extensibility path to custom roles in future sprints.

Simultaneously: remove the hard single-workspace constraint so a user can be a member of multiple external workspaces (multi-workspace membership).

---

## Data Model

### New models

```prisma
model WorkspaceRole {
  id          String                    @id @default(cuid())
  key         String                    @unique  // "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
  name        String                             // "Owner" | "Admin" | "Member" | "Viewer"
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
  @@map("workspace_role_permissions")
}
```

### Changes to WorkspaceMember

Add `workspaceRoleId` FK alongside the legacy `role` enum (kept for backward compat during migration):

```prisma
model WorkspaceMember {
  id              String        @id @default(cuid())
  userId          String
  workspaceId     String
  role            LegacyMemberRole @default(MEMBER)  // renamed from WorkspaceRole, kept for compat
  workspaceRoleId String
  workspaceRole   WorkspaceRole @relation(fields: [workspaceRoleId], references: [id])
  joinedAt        DateTime      @default(now())
  ...
}
```

### Rename existing enum

`WorkspaceRole` enum → `LegacyMemberRole` to free the name for the new model.

---

## Permission Enum

```prisma
enum Permission {
  VIEW_LEADS        MANAGE_LEADS
  VIEW_CLIENTS      MANAGE_CLIENTS
  VIEW_PROJECTS     MANAGE_PROJECTS
  VIEW_TASKS        MANAGE_TASKS
  VIEW_INBOX        SEND_MESSAGES
  VIEW_PROPOSALS    MANAGE_PROPOSALS    SEND_PROPOSALS
  VIEW_CONTRACTS    MANAGE_CONTRACTS    SEND_CONTRACTS
  VIEW_INVOICES     MANAGE_INVOICES     SEND_INVOICES     RECORD_PAYMENTS
  VIEW_REPORTS
  VIEW_CALENDAR     MANAGE_CALENDAR
  VIEW_FORMS        MANAGE_FORMS
  VIEW_AUTOMATIONS  MANAGE_AUTOMATIONS
  MANAGE_WORKSPACE_SETTINGS
  MANAGE_BILLING
  MANAGE_MEMBERS
  MANAGE_INTEGRATIONS
}
```

---

## Preset Roles Matrix

| Permission | OWNER | ADMIN | MEMBER | VIEWER |
|---|:---:|:---:|:---:|:---:|
| VIEW_LEADS / MANAGE_LEADS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_CLIENTS / MANAGE_CLIENTS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_PROJECTS / MANAGE_PROJECTS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_TASKS / MANAGE_TASKS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_INBOX / SEND_MESSAGES | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_PROPOSALS / MANAGE_PROPOSALS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| SEND_PROPOSALS | ✓ | ✓ | — | — |
| VIEW_CONTRACTS / MANAGE_CONTRACTS | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| SEND_CONTRACTS | ✓ | ✓ | — | — |
| VIEW_INVOICES / MANAGE_INVOICES | ✓ / ✓ | ✓ / ✓ | — / — | — / — |
| SEND_INVOICES / RECORD_PAYMENTS | ✓ / ✓ | ✓ / ✓ | — / — | — / — |
| VIEW_REPORTS | ✓ | ✓ | — | — |
| VIEW_CALENDAR / MANAGE_CALENDAR | ✓ / ✓ | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| VIEW_FORMS / MANAGE_FORMS | ✓ / ✓ | ✓ / ✓ | ✓ / — | ✓ / — |
| VIEW_AUTOMATIONS / MANAGE_AUTOMATIONS | ✓ / ✓ | ✓ / ✓ | ✓ / — | ✓ / — |
| MANAGE_WORKSPACE_SETTINGS | ✓ | ✓ | — | — |
| MANAGE_BILLING | ✓ | — | — | — |
| MANAGE_MEMBERS | ✓ | ✓ | — | — |
| MANAGE_INTEGRATIONS | ✓ | ✓ | — | — |

---

## Backend Architecture

### PermissionsService

- On module init (`onModuleInit`): loads all system `WorkspaceRole` records + their `WorkspaceRolePermission` rows into a `Map<roleKey, Set<Permission>>`.
- `hasPermission(userId, workspaceId, permission)`: looks up `WorkspaceMember` (userId + workspaceId), gets `workspaceRole.key`, checks the in-memory map. Zero extra DB queries for system roles.
- When custom roles ship: if `isSystem = false`, fall through to a DB lookup.

### @RequirePermission decorator

```ts
@RequirePermission(Permission.VIEW_REPORTS)
@Get('reports')
getReports(@CurrentUser() user: User) { ... }
```

Sets metadata on the handler via `Reflector`.

### WorkspacePermissionGuard

Global guard (added to APP_GUARD after JwtAuthGuard). Reads `@RequirePermission` metadata. If no metadata → passes through. If metadata present → resolves user's active workspace from `user.activeWorkspaceId`, calls `permissionsService.hasPermission(...)`, throws `ForbiddenException` on fail.

### New API endpoints

- `GET /workspaces/roles` — returns the list of available `WorkspaceRole` records (for invite role selector in frontend)
- `GET /workspaces/my-permissions` — returns `Permission[]` for the calling user's active workspace

---

## Frontend Architecture

### useWorkspacePermissions hook

```ts
export function useWorkspacePermissions() {
  const { data: permissions = [] } = useQuery({
    queryKey: ['workspace-permissions'],
    queryFn: () => api.get('/workspaces/my-permissions').then(r => r.data.data as Permission[]),
    staleTime: 60_000,
  })
  const hasPermission = useCallback((p: Permission) => permissions.includes(p), [permissions])
  return { permissions, hasPermission }
}
```

Invalidated on workspace switch (already done by `qc.invalidateQueries()` in `useSwitchWorkspace`).

### Can component

```tsx
export function Can({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { hasPermission } = useWorkspacePermissions()
  return hasPermission(permission) ? <>{children}</> : null
}
```

### Navigation gating

Sidebar filters nav items based on permissions:
- Invoices → requires `VIEW_INVOICES`
- Reports → requires `VIEW_REPORTS`

Routes also protected: navigating to `/invoices` or `/reports` without permission redirects to `/dashboard`.

### Action gating

- "Send Proposal" button → `SEND_PROPOSALS`
- "Send Contract" button → `SEND_CONTRACTS`
- "Send Invoice" button → `SEND_INVOICES`
- "Record Payment" → `RECORD_PAYMENTS`

### Settings gating

- Billing tab → `MANAGE_BILLING` (OWNER only)
- Team tab → `MANAGE_MEMBERS`
- Integrations tab → `MANAGE_INTEGRATIONS`

---

## Invite Flow Changes

`TeamInvite` model gains a `workspaceRoleId` field (nullable, defaults to MEMBER role key on accept).
`POST /team/invite` body gains optional `roleId: string` (validated against available workspace roles).
Invite email unchanged.
Accept flow: `WorkspaceMember` is created with the invite's `workspaceRoleId`.

---

## Multi-Workspace Membership

Remove the guard in `team.service.ts:136`:
```ts
// REMOVED: if (user.ownerId) throw new BadRequestException('You are already a member of another workspace.')
```

A user can now have multiple `WorkspaceMember` rows (one per workspace). `user.activeWorkspaceId` determines the current context. The workspace switcher groups workspaces as "My workspaces" (OWNER role) and "Invited workspaces" (ADMIN/MEMBER/VIEWER role).

---

## Migration Strategy

Single SQL migration file:
1. Create `workspace_roles` and `workspace_role_permissions` tables
2. Seed 4 system roles + their permissions using subqueries (no hardcoded IDs)
3. `ALTER TABLE workspace_members ADD COLUMN workspace_role_id TEXT REFERENCES workspace_roles(id)`
4. `UPDATE workspace_members` SET `workspace_role_id` based on existing `role` enum value
5. `ALTER TABLE workspace_members ALTER COLUMN workspace_role_id SET NOT NULL`

---

## Extensibility Path

- Custom roles: add a workspace-owned `WorkspaceRole` with `isSystem = false` and a custom `WorkspaceRolePermission` set. The permission service's hot path handles both system (memory) and custom (DB).
- New preset: seed a new system role row + permissions. No schema change, no code change.
- UI for custom roles: workspace owners get a "Roles" settings tab where they create roles and drag-toggle permissions.
