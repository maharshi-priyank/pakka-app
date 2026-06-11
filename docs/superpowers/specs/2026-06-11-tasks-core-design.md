# Tasks — Spec 1: Core Tasks

## Goal

Add a first-class Tasks system to Rupway: a global task list, per-project task lists, and a right slide-in detail panel — matching Dubsado's URL structure and UX pattern.

## Scope

This spec covers **Spec 1 of 4**:
- Spec 1 (this): Core tasks — model, CRUD, global list, project tab, slide-in panel
- Spec 2: Task boards — Kanban with custom columns, global + per-project
- Spec 3: Comments & Files — thread on each task
- Spec 4: Assignees — Studio plan only, assign tasks to team members

## What Already Exists

- `ProjectPage` — has 7 tabs (Overview, Proposals, Contracts, Invoices, Time, Files, Notes) managed by local `useState`. Tasks tab will be added and promoted to a real nested route.
- No Task model, no tasks module, no tasks routes anywhere.

---

## Data Model

### New Prisma model — `Task`

```prisma
model Task {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  status      TaskStatus @default(TODO)
  dueDate     DateTime?
  includeTime Boolean    @default(false)
  isPrivate   Boolean    @default(false)
  projectId   String?
  project     Project?   @relation(fields: [projectId], references: [id], onDelete: SetNull)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

enum TaskStatus {
  TODO
  COMPLETED
}
```

**Notes:**
- `userId` follows the existing schema convention (no separate workspace model).
- `status` as a Prisma enum — extensible to `IN_PROGRESS`, `BLOCKED` etc. in a future migration.
- `projectId` is nullable — tasks exist independently, project link is optional.
- `includeTime` controls whether the due date displays with time or date-only in the UI.
- `isPrivate` hides the task from team members (relevant once Spec 4 lands; stored now for forward compatibility).
- `Project` model gets a new `tasks Task[]` back-relation.

---

## Backend

### New module: `pakka-api/src/modules/tasks/`

Files:
- `tasks.module.ts`
- `tasks.controller.ts`
- `tasks.service.ts`
- `dto/create-task.dto.ts`
- `dto/update-task.dto.ts`
- `dto/list-tasks.dto.ts`

### API endpoints — all under `/tasks`, all require `JwtAuthGuard`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List tasks for user (query: `status`, `projectId`, `search`) |
| POST | `/tasks` | Create task |
| GET | `/tasks/:id` | Get single task |
| PATCH | `/tasks/:id` | Update any field |
| DELETE | `/tasks/:id` | Delete task |

**List query params:**
- `status`: `TODO` | `COMPLETED` | omit for all
- `projectId`: filter to a specific project
- `search`: substring match on `title`

**Ownership guard:** every operation checks `task.userId === req.user.id`. Return 404 (not 403) on mismatch to avoid enumeration.

### DTOs

```typescript
// create-task.dto.ts
class CreateTaskDto {
  @IsString() @IsNotEmpty() title: string
  @IsOptional() @IsDateString() dueDate?: string
  @IsOptional() @IsBoolean() includeTime?: boolean
  @IsOptional() @IsBoolean() isPrivate?: boolean
  @IsOptional() @IsString() projectId?: string
}

// update-task.dto.ts — extends PartialType(CreateTaskDto), adds:
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus

// list-tasks.dto.ts
class ListTasksDto {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus
  @IsOptional() @IsString() projectId?: string
  @IsOptional() @IsString() search?: string
}
```

### Service — `tasks.service.ts`

```typescript
list(userId, query)   → prisma.task.findMany({ where: { userId, ...filters }, orderBy: { createdAt: 'desc' } })
create(userId, dto)   → prisma.task.create({ data: { ...dto, userId } })
findOne(userId, id)   → find + ownership check
update(userId, id, dto) → findOne + prisma.task.update
delete(userId, id)    → findOne + prisma.task.delete
```

Response shape for list and single:
```json
{
  "id": "...",
  "title": "...",
  "status": "TODO",
  "dueDate": "2026-06-23T09:00:00.000Z",
  "includeTime": true,
  "isPrivate": false,
  "projectId": "...",
  "project": { "id": "...", "name": "..." },
  "createdAt": "..."
}
```

`project` is included via `prisma.task.findMany({ include: { project: { select: { id, name } } } })`.

---

## Frontend

### New files

```
src/pages/app/TasksPage.tsx                        — global task list page
src/features/tasks/hooks/useTasks.ts               — React Query hooks
src/features/tasks/components/TaskSlideIn.tsx      — right panel detail
src/features/tasks/components/TaskRow.tsx          — single row in table
src/features/tasks/components/ProjectTasksTab.tsx  — project-scoped tasks tab
```

### Routes — added to `App.tsx` / router

```
/app/tasks                    → <TasksPage />
/app/tasks/:taskId            → <TasksPage /> (slide-in opens from URL param)
/app/projects/:id/tasks       → ProjectPage with Tasks tab active + ProjectTasksTab
/app/projects/:id/tasks/:taskId → same + slide-in open
```

**ProjectPage change:** Add `tasks` to the tab type. When the Tasks tab is clicked, `navigate('/app/projects/:id/tasks')` instead of `setTab('tasks')`. All other tabs keep local state. The Tasks tab route renders `<ProjectTasksTab projectId={id} />` inside the existing project page layout.

### Hooks — `useTasks.ts`

```typescript
useTasks(params?: { status?, projectId?, search? })  // GET /tasks
useTask(id: string)                                   // GET /tasks/:id
useCreateTask()                                       // POST /tasks
useUpdateTask()                                       // PATCH /tasks/:id
useDeleteTask()                                       // DELETE /tasks/:id
```

All use TanStack Query v5. `useCreateTask`, `useUpdateTask`, `useDeleteTask` invalidate `['tasks']` on success.

### TasksPage — `/app/tasks`

**Layout:**
- Header: "Tasks" title + "New Task" button (top-left, opens slide-in with empty form)
- Sub-nav: Tasks | Task Boards (Task Boards links to `/app/tasks/task-boards`, grayed out with "Coming soon" until Spec 2)
- Filter tabs: All · To Do · Completed (drives `status` query param)
- Search input
- Table with columns: Task (checkbox + title), Project (chip, if linked), Due Date, Created Date

**Task completion:** clicking the circle checkbox on a row calls `useUpdateTask({ status: 'COMPLETED' })` inline — no panel needed for that.

**Empty state:** "No tasks yet — create your first task" with a New Task button.

### TaskSlideIn — right panel

**Trigger:** clicking a task row navigates to `/:taskId` URL param; the page reads the param and opens the panel.

**Panel width:** 420px, slides in from the right, overlay backdrop on mobile only.

**Fields:**
- Title: auto-resize textarea, auto-focused on open
- Due Date: date picker + "Include time" toggle below
- Project: searchable combobox showing user's projects, clearable (X button), "None" option
- Private task: toggle with helper text "Only visible to you"
- Assigned to: hidden in Spec 1, added in Spec 4

**Header:** shows project name + client name if linked (matches Dubsado). Actions: copy link icon, delete icon, Save button.

**Tabs:** "Task Details" only in Spec 1. "Comments & Files" tab added in Spec 3 (tab can be rendered but disabled/grayed).

**Close:** clicking backdrop or pressing Escape navigates back to the list URL (removes `:taskId` segment).

### ProjectTasksTab — inside ProjectPage

Renders inside the existing project page layout when `tab === 'tasks'`.

**Layout:** same as TasksPage but:
- Pre-filtered by `projectId`
- "New Task" button pre-fills `projectId` in the slide-in
- Sub-nav: Tasks | Task Boards (same pattern)
- No "Project" column in the table (redundant — already in project context)

### Sidebar nav

Add "Tasks" entry to `AppShell` sidebar between Leads and Calendar with `CheckSquare` icon from lucide-react, linking to `/app/tasks`.

---

## URL Structure Summary

```
Global:
  /app/tasks                             — list (status=all default)
  /app/tasks?status=TODO                 — filter
  /app/tasks/:taskId                     — list + slide-in
  /app/tasks/task-boards                 — (Spec 2)
  /app/tasks/task-boards/:boardId        — (Spec 2)

Project-scoped:
  /app/projects/:id/tasks                — project task list
  /app/projects/:id/tasks/:taskId        — list + slide-in
  /app/projects/:id/tasks/task-boards    — (Spec 2)
```

---

## Out of Scope (later specs)

- Task boards / Kanban (Spec 2)
- Comments & file attachments on tasks (Spec 3)
- Assignees / team member assignment (Spec 4)
- Task notifications / reminders
- Recurring tasks
- Time tracking link from tasks

---

## Acceptance Criteria

1. `/app/tasks` shows global task list with All / To Do / Completed filter tabs
2. Creating a task from the "New Task" button opens slide-in with empty form; save adds to list
3. Clicking a task row opens slide-in; URL updates to `/app/tasks/:taskId`; refreshing the URL re-opens the same task
4. Checking the circle checkbox marks a task Completed; unchecking restores To Do
5. Project field in slide-in is optional; if set, task appears under that project's Tasks tab
6. `/app/projects/:id/tasks` shows only tasks linked to that project; "New Task" pre-fills the project
7. Navigating to `/app/projects/:id/tasks/:taskId` opens the correct task in the slide-in within project context
8. Private task toggle saves and persists
9. Delete from slide-in removes task and closes panel
10. No TypeScript errors in either repo
