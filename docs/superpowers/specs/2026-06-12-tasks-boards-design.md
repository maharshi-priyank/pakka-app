# Tasks — Spec 2: Task Boards (Kanban)

## Goal

Add a Kanban board view to the Tasks feature: global boards, per-project boards, user-defined columns, drag-and-drop cards, and bidirectional sync with the list view's `TODO/COMPLETED` status.

## Scope

This is **Spec 2 of 4**. Builds directly on Spec 1 (Core Tasks).

- Spec 1 (done): Core tasks — model, CRUD, global list, project tab, slide-in panel
- **Spec 2 (this):** Task Boards — Kanban with custom columns, global + per-project
- Spec 3: Comments & Files — thread on each task
- Spec 4: Assignees — Studio plan only

---

## Data Model

### Changes to `Task`

Two new fields:

```prisma
columnId  String?
column    BoardColumn? @relation(fields: [columnId], references: [id], onDelete: SetNull)
position  Int          @default(0)
```

- `columnId` — which board column this task lives in. `null` = unassigned (appears in Inbox on the board).
- `position` — sort order within a column. Used for drag-to-reorder within a column.

Add index: `@@index([columnId])`

### New model — `TaskBoard`

```prisma
model TaskBoard {
  id        String        @id @default(cuid())
  userId    String
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId String?
  project   Project?      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String
  position  Int           @default(0)
  columns   BoardColumn[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@index([userId])
  @@index([projectId])
  @@map("task_boards")
}
```

- `projectId = null` → global board
- `projectId = <id>` → project-scoped board
- `position` controls ordering when a user has multiple boards

### New model — `BoardColumn`

```prisma
model BoardColumn {
  id       String    @id @default(cuid())
  boardId  String
  board    TaskBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name     String
  position Int       @default(0)
  isDone   Boolean   @default(false)
  color    String?
  tasks    Task[]

  @@index([boardId])
  @@map("board_columns")
}
```

- `isDone = true` → moving a task into this column also sets `task.status = COMPLETED`. Moving out sets it back to `TODO`.
- `color` — optional hex string (e.g. `"#6366F1"`), shown as a dot/stripe on the column header.
- Only one column should have `isDone = true` per board (not enforced at DB level, but enforced in service logic: setting `isDone = true` on a column clears it on all siblings).

### Back-relations to add

- `User` model: `taskBoards TaskBoard[]`
- `Project` model: `taskBoards TaskBoard[]`

---

## Default Board Auto-Creation

When `GET /task-boards` returns an empty array, the frontend calls `POST /task-boards` with `{ name: "My Board" }` (or `{ name: "Project Board", projectId }` for project context). The service auto-creates three default columns:

| Name | position | isDone | color |
|------|----------|--------|-------|
| To Do | 0 | false | null |
| In Progress | 1 | false | `#F59E0B` |
| Done | 2 | true | `#10B981` |

This happens once per context. Subsequent visits load the existing board.

---

## Backend

### New module: `pakka-api/src/modules/task-boards/`

Files:
- `task-boards.module.ts`
- `task-boards.controller.ts`
- `task-boards.service.ts`

### Endpoints

#### Boards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/task-boards` | List boards for user (`?projectId=` filters to project boards) |
| POST | `/task-boards` | Create board (auto-creates 3 default columns) |
| GET | `/task-boards/:id` | Get board with columns and tasks per column |
| PATCH | `/task-boards/:id` | Rename board or update position |
| DELETE | `/task-boards/:id` | Delete board; tasks in its columns get `columnId = null` |

#### Columns (nested under boards)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/task-boards/:id/columns` | Add a column |
| PATCH | `/task-boards/:id/columns/:colId` | Rename, reorder, toggle `isDone`, set color |
| DELETE | `/task-boards/:id/columns/:colId` | Delete column; tasks in it get `columnId = null` |

**Ownership guard:** All board and column operations check `board.userId === effectiveUserId(user)`. Return 404 on mismatch.

**`GET /task-boards/:id` response shape:**

```json
{
  "id": "...",
  "name": "My Board",
  "projectId": null,
  "position": 0,
  "columns": [
    {
      "id": "...",
      "name": "To Do",
      "position": 0,
      "isDone": false,
      "color": null,
      "tasks": [ { ...task fields... } ]
    }
  ]
}
```

Tasks within each column are ordered by `position ASC, createdAt ASC`.

#### Task movement — existing endpoint extended

`PATCH /tasks/:id` already handles all task updates. Two new fields are now accepted:

- `columnId?: string | null` — assigns/removes the task from a column
- `position?: number` — reorder within column

**Sync logic in `TasksService.update`:**

```typescript
if (dto.columnId !== undefined) {
  if (dto.columnId === null) {
    // Moved to Inbox — clear status
    data.status = 'TODO'
  } else {
    const col = await this.prisma.boardColumn.findUnique({
      where: { id: dto.columnId },
      select: { isDone: true, board: { select: { userId: true } } },
    })
    if (!col || col.board.userId !== userId) throw new NotFoundException()
    data.status = col.isDone ? 'COMPLETED' : 'TODO'
  }
}
```

### DTOs

```typescript
// CreateBoardDto
class CreateBoardDto {
  @IsString() @IsNotEmpty() name: string
  @IsOptional() @IsString() projectId?: string
}

// UpdateBoardDto
class UpdateBoardDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsInt() @Min(0) position?: number
}

// CreateColumnDto
class CreateColumnDto {
  @IsString() @IsNotEmpty() name: string
  @IsOptional() @IsBoolean() isDone?: boolean
  @IsOptional() @IsString() color?: string
}

// UpdateColumnDto
class UpdateColumnDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsInt() @Min(0) position?: number
  @IsOptional() @IsBoolean() isDone?: boolean
  @IsOptional() @IsString() color?: string
}
```

`UpdateTaskDto` in `tasks.service.ts` gets two new optional fields:
```typescript
@IsOptional() @IsString() columnId?: string | null
@IsOptional() @IsInt() @Min(0) position?: number
```

---

## Frontend

### New files

```
src/features/tasks/hooks/useTaskBoards.ts           — React Query hooks for boards + columns
src/pages/app/TaskBoardsPage.tsx                    — global board picker + board view
src/features/tasks/components/TaskBoardView.tsx     — Kanban board (columns + drag-and-drop)
src/features/tasks/components/BoardColumnCard.tsx   — single column: header + card list + add card
src/features/tasks/components/TaskCard.tsx          — single task card
```

### Drag and drop library

Install `@dnd-kit/core` and `@dnd-kit/sortable` (not `react-beautiful-dnd` — it's deprecated).

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Routes (replacing current `<Navigate>` redirects)

```typescript
// Replace the two task-boards Navigate redirects in router/index.tsx:

{ path: '/tasks/task-boards', lazy: () => import('@/pages/app/TaskBoardsPage').then(m => ({ Component: m.default })) },
{ path: '/tasks/task-boards/:boardId', lazy: () => import('@/pages/app/TaskBoardsPage').then(m => ({ Component: m.default })) },
{ path: '/projects/:id/tasks/task-boards', lazy: () => import('@/pages/app/ProjectPage').then(m => ({ Component: m.default })) },
{ path: '/projects/:id/tasks/task-boards/:boardId', lazy: () => import('@/pages/app/ProjectPage').then(m => ({ Component: m.default })) },
```

### `useTaskBoards.ts` hooks

```typescript
useTaskBoards(params?: { projectId?: string })  // GET /task-boards
useTaskBoard(id: string)                         // GET /task-boards/:id (with columns + tasks)
useCreateBoard()                                 // POST /task-boards
useUpdateBoard()                                 // PATCH /task-boards/:id
useDeleteBoard()                                 // DELETE /task-boards/:id
useCreateColumn()                                // POST /task-boards/:id/columns
useUpdateColumn()                                // PATCH /task-boards/:id/columns/:colId
useDeleteColumn()                                // DELETE /task-boards/:id/columns/:colId
```

All mutations invalidate `['task-boards']`. `useUpdateTask` (existing) is reused for card movement — its `onSuccess` also invalidates `['task-boards']` when a `columnId` change is detected.

### `TaskBoardsPage` layout

- Header: page title + "New Board" button
- Sub-nav: **Tasks** link → `/tasks` | **Task Boards** (active)
- Board tab bar: one tab per board (name + "×" to delete), "+" to add board
- Below tabs: `<TaskBoardView boardId={selectedId} />`
- On load: if `useTaskBoards` returns empty, auto-call `useCreateBoard({ name: "My Board" })`, then navigate to the new board

### `TaskBoardView` layout

```
[ Inbox (unassigned) ] [ To Do ] [ In Progress ] [ Done ] [ + Add Column ]
     card                card         card          card
     card                             card
```

- Horizontally scrollable, each column is fixed width (280px)
- **Inbox** is a virtual read-only left column — shows tasks where `columnId = null` (for this user/project context). Not a real `BoardColumn`. Cards can be dragged OUT of Inbox but not into it.
- Each real column has: color dot + name + task count + `…` menu (Rename / Mark as Done / Delete) + card list + "**+ Add task**" at bottom
- "**+ Add Column**" button at the far right adds a new column inline
- Dragging a card between columns → optimistic `useUpdateTask({ id, columnId, position })`
- Dragging a card within a column → optimistic reorder (position update)
- Dragging a column → optimistic `useUpdateColumn({ position })`

### `BoardColumnCard` component

Props: `column: BoardColumn & { tasks: Task[] }`, `onAddTask`, `onUpdateColumn`, `onDeleteColumn`

Header shows:
- Color dot (if `color` set)
- Column name (click to rename inline)
- Task count badge
- `…` dropdown: Rename, Mark as Done / Unmark, Set color, Delete

### `TaskCard` component

Props: `task: Task`, `onClick` (opens `TaskSlideIn`)

Shows: checkbox (toggle COMPLETED inline), title, due date chip (if set), project chip (global board only), private lock icon (if `isPrivate`).

Clicking the card title area → navigates to `listUrl/:taskId` to open `TaskSlideIn` (same pattern as the list view).

### ProjectPage changes

`ProjectTasksTab` currently renders for all `/projects/:id/tasks*` routes. It needs to detect the board subroute and render the board instead:

```typescript
const isBoardRoute = location.pathname.includes('/task-boards')
// render TaskBoardView when isBoardRoute, ProjectTasksTab list otherwise
```

The Tasks tab sub-nav in `ProjectTasksTab` links:
- "Tasks" → `/projects/:id/tasks`
- "Task Boards" → `/projects/:id/tasks/task-boards` (was `cursor-not-allowed`, now a real link)

---

## URL Structure

```
Global:
  /tasks/task-boards                    — board picker (default board opens directly)
  /tasks/task-boards/:boardId           — specific board

Project-scoped:
  /projects/:id/tasks/task-boards       — project board picker
  /projects/:id/tasks/task-boards/:boardId — specific project board
```

Slide-in URLs still work from board cards: clicking a card navigates to `/tasks/:taskId` (or `/projects/:id/tasks/:taskId`), opening `TaskSlideIn` on top of the board.

---

## Sync: Board ↔ List View

| Action | Board effect | List effect |
|--------|-------------|-------------|
| Drag card to `isDone` column | card in that column | `status = COMPLETED`, checkbox checked |
| Drag card to non-done column | card in that column | `status = TODO`, checkbox unchecked |
| Drag card to Inbox | card in Inbox | `status = TODO` |
| Check checkbox in list view | no board change | `status = COMPLETED` |
| Create task from board "+ Add task" | card in that column | appears in list view |
| Create task from list view | appears in Inbox | appears in list view |

The last row means checking the checkbox in the list view does **not** move the card to the done column — it only changes the status. This intentional asymmetry avoids unexpected card jumps on the board.

---

## Acceptance Criteria

1. `/tasks/task-boards` auto-creates "My Board" with To Do / In Progress / Done on first visit
2. Board shows all user tasks: column-assigned cards in their columns, unassigned tasks in Inbox
3. Dragging a card to Done column marks it COMPLETED in the list view; dragging back marks TODO
4. Column reorder via drag updates `position`; card reorder within a column updates `position`
5. "Add Column" adds a new column inline; column rename works inline
6. `isDone` can be toggled on any column via the `…` menu; only one column per board is `isDone = true` (previous done column is cleared)
7. "New Board" creates an additional board; tab bar switches between boards
8. Delete board: tasks move to Inbox (columnId = null)
9. Delete column: tasks in it move to Inbox
10. Per-project board at `/projects/:id/tasks/task-boards` shows only that project's tasks
11. Clicking a task card opens `TaskSlideIn` — URL updates to `/:taskId`; slide-in closes back to board URL
12. Zero TypeScript errors in both repos
