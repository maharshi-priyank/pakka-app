# Task Boards (Kanban) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full Kanban board view to Tasks — global + per-project, custom columns, drag-and-drop cards, bidirectional sync with list view status.

**Architecture:** New `TaskBoard` + `BoardColumn` models extend the existing `Task` model with `columnId` and `position`. A new `task-boards` NestJS module handles board/column CRUD. The frontend adds `@dnd-kit` for drag-and-drop, new React Query hooks, and new page/component files. The existing `PATCH /tasks/:id` endpoint is extended to accept `columnId` and sync `task.status` automatically based on the column's `isDone` flag.

**Tech Stack:** NestJS + Prisma + PostgreSQL (Supabase), React + Vite + TanStack Query v5, Tailwind v4, lucide-react, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

---

## File Map

**API — Create:**
- `pakka-api/src/modules/task-boards/task-boards.module.ts`
- `pakka-api/src/modules/task-boards/task-boards.service.ts`
- `pakka-api/src/modules/task-boards/task-boards.controller.ts`
- `pakka-api/prisma/migrations/20260612_task_boards/migration.sql` (manual SQL)

**API — Modify:**
- `pakka-api/prisma/schema.prisma` — add `columnId`, `position` to `Task`; add `TaskBoard`, `BoardColumn` models; add back-relations to `User` and `Project`
- `pakka-api/src/modules/tasks/tasks.service.ts` — extend `UpdateTaskDto` + `CreateTaskDto`, add `columnId` sync logic
- `pakka-api/src/app.module.ts` — register `TaskBoardsModule`

**App — Create:**
- `pakka-app/src/features/tasks/hooks/useTaskBoards.ts`
- `pakka-app/src/features/tasks/components/TaskCard.tsx`
- `pakka-app/src/features/tasks/components/BoardColumnCard.tsx`
- `pakka-app/src/features/tasks/components/TaskBoardView.tsx`
- `pakka-app/src/pages/app/TaskBoardsPage.tsx`

**App — Modify:**
- `pakka-app/src/features/tasks/hooks/useTasks.ts` — add `columnId`, `position` to interfaces; update `useUpdateTask` invalidation
- `pakka-app/src/router/index.tsx` — replace 2 Navigate redirects with 4 real lazy routes
- `pakka-app/src/pages/app/TasksPage.tsx` — "Task Boards" span → Link
- `pakka-app/src/features/tasks/components/ProjectTasksTab.tsx` — board route detection + sub-nav link

---

## Task 1: Prisma Schema — Add TaskBoard + BoardColumn + Task fields

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`
- Create: `pakka-api/prisma/migrations/20260612_task_boards/migration.sql`

- [ ] **Step 1: Open schema and add fields to `Task` model**

In `pakka-api/prisma/schema.prisma`, locate the `Task` model (around line 700) and add these three lines before `createdAt`:

```prisma
columnId  String?
column    BoardColumn? @relation(fields: [columnId], references: [id], onDelete: SetNull)
position  Int          @default(0)
```

Also add to `Task`'s `@@index` block:
```prisma
@@index([columnId])
```

- [ ] **Step 2: Add `TaskBoard` and `BoardColumn` models to schema**

Append after the `Task` model:

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

model BoardColumn {
  id      String    @id @default(cuid())
  boardId String
  board   TaskBoard @relation(fields: [boardId], references: [id], onDelete: Cascade)
  name    String
  position Int      @default(0)
  isDone  Boolean   @default(false)
  color   String?
  tasks   Task[]

  @@index([boardId])
  @@map("board_columns")
}
```

- [ ] **Step 3: Add back-relations to `User` and `Project` models**

In the `User` model, add:
```prisma
taskBoards TaskBoard[]
```

In the `Project` model, add:
```prisma
taskBoards TaskBoard[]
```

- [ ] **Step 4: Write the migration SQL file**

Create directory `pakka-api/prisma/migrations/20260612_task_boards/` and write `migration.sql`:

```sql
-- CreateTable task_boards
CREATE TABLE "task_boards" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "projectId" TEXT,
  "name"      TEXT NOT NULL,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable board_columns
CREATE TABLE "board_columns" (
  "id"       TEXT NOT NULL,
  "boardId"  TEXT NOT NULL,
  "name"     TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "isDone"   BOOLEAN NOT NULL DEFAULT false,
  "color"    TEXT,
  CONSTRAINT "board_columns_pkey" PRIMARY KEY ("id")
);

-- AlterTable tasks — add columnId and position
ALTER TABLE "tasks" ADD COLUMN "columnId" TEXT;
ALTER TABLE "tasks" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "task_boards_userId_idx" ON "task_boards"("userId");
CREATE INDEX "task_boards_projectId_idx" ON "task_boards"("projectId");
CREATE INDEX "board_columns_boardId_idx" ON "board_columns"("boardId");
CREATE INDEX "tasks_columnId_idx" ON "tasks"("columnId");

-- AddForeignKey
ALTER TABLE "task_boards" ADD CONSTRAINT "task_boards_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_boards" ADD CONSTRAINT "task_boards_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "task_boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_columnId_fkey"
  FOREIGN KEY ("columnId") REFERENCES "board_columns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 5: Apply migration (Supabase drift pattern — do NOT use `prisma migrate dev`)**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma db execute --file prisma/migrations/20260612_task_boards/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260612_task_boards
npx prisma generate
```

Expected: no errors, Prisma Client regenerated.

- [ ] **Step 6: Verify schema compiles**

```bash
npx prisma validate
```

Expected: "The schema at `prisma/schema.prisma` is valid"

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260612_task_boards/
git commit -m "feat(tasks): add TaskBoard + BoardColumn models, columnId+position on Task"
```

---

## Task 2: Extend `tasks.service.ts` — columnId/position + sync logic

**Files:**
- Modify: `pakka-api/src/modules/tasks/tasks.service.ts`

- [ ] **Step 1: Open the file and add new imports**

At the top of the file where class-validator imports appear, ensure `IsInt`, `Min`, `ValidateIf`, `IsString` are imported (they may already be there — only add missing ones):

```typescript
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, ValidateIf } from 'class-validator'
```

- [ ] **Step 2: Add `columnId` and `position` to `CreateTaskDto`**

Locate `class CreateTaskDto` and add two optional fields:

```typescript
@IsOptional()
@IsString()
columnId?: string | null

@IsOptional()
@IsInt()
@Min(0)
position?: number
```

- [ ] **Step 3: Add `columnId` and `position` to `UpdateTaskDto`**

Locate `class UpdateTaskDto` and add:

```typescript
@IsOptional()
@ValidateIf((o) => o.columnId !== null)
@IsString()
columnId?: string | null

@IsOptional()
@IsInt()
@Min(0)
position?: number
```

- [ ] **Step 4: Update `TASK_INCLUDE` constant to include column**

Find the `TASK_INCLUDE` constant (or wherever Prisma select/include for tasks is defined) and add:

```typescript
column: {
  select: { id: true, name: true, isDone: true, color: true }
}
```

If there is no `TASK_INCLUDE` constant and includes are inline in each method, add the above to each `prisma.task.findMany`, `prisma.task.findUnique`, and `prisma.task.update` include/select.

- [ ] **Step 5: Replace status assignment in `update()` method with columnId-aware sync logic**

Find the `update` method. Locate where `data.status = dto.status` is assigned (or the general dto spread). Replace with:

```typescript
// columnId sync takes priority over explicit status
if (dto.columnId !== undefined) {
  if (dto.columnId === null) {
    data.columnId = null
    data.status = 'TODO'
  } else {
    const col = await this.prisma.boardColumn.findUnique({
      where: { id: dto.columnId },
      select: { isDone: true, board: { select: { userId: true } } },
    })
    if (!col || col.board.userId !== userId) throw new NotFoundException('Column not found')
    data.columnId = dto.columnId
    data.status = col.isDone ? 'COMPLETED' : 'TODO'
  }
} else if (dto.status !== undefined) {
  data.status = dto.status
}
```

Also add `position` to the data object when provided:
```typescript
if (dto.position !== undefined) {
  data.position = dto.position
}
```

- [ ] **Step 6: Add `columnId` assignment in `create()` method**

In the `create` method, when building the Prisma create data, add:
```typescript
...(dto.columnId !== undefined && { columnId: dto.columnId }),
position: dto.position ?? 0,
```

- [ ] **Step 7: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/tasks/tasks.service.ts
git commit -m "feat(tasks): add columnId+position to task DTOs, sync status from column isDone"
```

---

## Task 3: New `task-boards` NestJS module

**Files:**
- Create: `pakka-api/src/modules/task-boards/task-boards.service.ts`
- Create: `pakka-api/src/modules/task-boards/task-boards.controller.ts`
- Create: `pakka-api/src/modules/task-boards/task-boards.module.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create `task-boards.service.ts`**

```typescript
// pakka-api/src/modules/task-boards/task-boards.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator'

export class CreateBoardDto {
  @IsString() @IsNotEmpty() name: string
  @IsOptional() @IsString() projectId?: string
}

export class UpdateBoardDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsInt() @Min(0) position?: number
}

export class CreateColumnDto {
  @IsString() @IsNotEmpty() name: string
  @IsOptional() @IsBoolean() isDone?: boolean
  @IsOptional() @IsString() color?: string
}

export class UpdateColumnDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string
  @IsOptional() @IsInt() @Min(0) position?: number
  @IsOptional() @IsBoolean() isDone?: boolean
  @IsOptional() @IsString() color?: string
}

const DEFAULT_COLUMNS = [
  { name: 'To Do',       position: 0, isDone: false, color: null },
  { name: 'In Progress', position: 1, isDone: false, color: '#F59E0B' },
  { name: 'Done',        position: 2, isDone: true,  color: '#10B981' },
]

const BOARD_INCLUDE = {
  columns: {
    orderBy: { position: 'asc' as const },
    include: {
      tasks: {
        orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
        include: {
          project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
        },
      },
    },
  },
}

@Injectable()
export class TaskBoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, projectId?: string) {
    return this.prisma.taskBoard.findMany({
      where: { userId, projectId: projectId ?? null },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, position: true, projectId: true, createdAt: true },
    })
  }

  async create(userId: string, dto: CreateBoardDto) {
    const board = await this.prisma.taskBoard.create({
      data: {
        userId,
        projectId: dto.projectId ?? null,
        name: dto.name,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
      include: BOARD_INCLUDE,
    })
    return board
  }

  async findOne(userId: string, boardId: string) {
    const board = await this.prisma.taskBoard.findUnique({
      where: { id: boardId },
      include: BOARD_INCLUDE,
    })
    if (!board || board.userId !== userId) throw new NotFoundException('Board not found')
    return board
  }

  async update(userId: string, boardId: string, dto: UpdateBoardDto) {
    await this.assertOwner(userId, boardId)
    return this.prisma.taskBoard.update({
      where: { id: boardId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    })
  }

  async remove(userId: string, boardId: string) {
    await this.assertOwner(userId, boardId)
    // Nullify columnId on tasks in this board's columns before cascade delete
    const columns = await this.prisma.boardColumn.findMany({ where: { boardId }, select: { id: true } })
    const colIds = columns.map(c => c.id)
    if (colIds.length) {
      await this.prisma.task.updateMany({ where: { columnId: { in: colIds } }, data: { columnId: null } })
    }
    await this.prisma.taskBoard.delete({ where: { id: boardId } })
  }

  async createColumn(userId: string, boardId: string, dto: CreateColumnDto) {
    await this.assertOwner(userId, boardId)
    const maxPos = await this.prisma.boardColumn.aggregate({
      where: { boardId },
      _max: { position: true },
    })
    const position = (maxPos._max.position ?? -1) + 1
    return this.prisma.boardColumn.create({
      data: { boardId, name: dto.name, position, isDone: dto.isDone ?? false, color: dto.color ?? null },
    })
  }

  async updateColumn(userId: string, boardId: string, colId: string, dto: UpdateColumnDto) {
    await this.assertColumnOwner(userId, boardId, colId)
    // If setting isDone=true, clear it on siblings first
    if (dto.isDone === true) {
      await this.prisma.boardColumn.updateMany({
        where: { boardId, isDone: true, id: { not: colId } },
        data: { isDone: false },
      })
    }
    return this.prisma.boardColumn.update({
      where: { id: colId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.isDone !== undefined && { isDone: dto.isDone }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    })
  }

  async removeColumn(userId: string, boardId: string, colId: string) {
    await this.assertColumnOwner(userId, boardId, colId)
    await this.prisma.task.updateMany({ where: { columnId: colId }, data: { columnId: null } })
    await this.prisma.boardColumn.delete({ where: { id: colId } })
  }

  private async assertOwner(userId: string, boardId: string) {
    const board = await this.prisma.taskBoard.findUnique({ where: { id: boardId }, select: { userId: true } })
    if (!board || board.userId !== userId) throw new NotFoundException('Board not found')
  }

  private async assertColumnOwner(userId: string, boardId: string, colId: string) {
    const col = await this.prisma.boardColumn.findUnique({
      where: { id: colId },
      select: { boardId: true, board: { select: { userId: true } } },
    })
    if (!col || col.boardId !== boardId || col.board.userId !== userId) throw new NotFoundException('Column not found')
  }
}
```

- [ ] **Step 2: Create `task-boards.controller.ts`**

```typescript
// pakka-api/src/modules/task-boards/task-boards.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { User } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { effectiveUserId } from '../auth/utils/effective-user-id'
import {
  TaskBoardsService,
  CreateBoardDto,
  UpdateBoardDto,
  CreateColumnDto,
  UpdateColumnDto,
} from './task-boards.service'

@Controller('task-boards')
export class TaskBoardsController {
  constructor(private readonly boards: TaskBoardsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('projectId') projectId?: string) {
    return this.boards.list(effectiveUserId(user), projectId)
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBoardDto) {
    return this.boards.create(effectiveUserId(user), dto)
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.boards.findOne(effectiveUserId(user), id)
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boards.update(effectiveUserId(user), id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.boards.remove(effectiveUserId(user), id)
  }

  @Post(':id/columns')
  createColumn(@CurrentUser() user: User, @Param('id') boardId: string, @Body() dto: CreateColumnDto) {
    return this.boards.createColumn(effectiveUserId(user), boardId, dto)
  }

  @Patch(':id/columns/:colId')
  updateColumn(
    @CurrentUser() user: User,
    @Param('id') boardId: string,
    @Param('colId') colId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.boards.updateColumn(effectiveUserId(user), boardId, colId, dto)
  }

  @Delete(':id/columns/:colId')
  removeColumn(
    @CurrentUser() user: User,
    @Param('id') boardId: string,
    @Param('colId') colId: string,
  ) {
    return this.boards.removeColumn(effectiveUserId(user), boardId, colId)
  }
}
```

- [ ] **Step 3: Create `task-boards.module.ts`**

```typescript
// pakka-api/src/modules/task-boards/task-boards.module.ts
import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { TaskBoardsController } from './task-boards.controller'
import { TaskBoardsService } from './task-boards.service'

@Module({
  imports: [PrismaModule],
  controllers: [TaskBoardsController],
  providers: [TaskBoardsService],
})
export class TaskBoardsModule {}
```

- [ ] **Step 4: Register `TaskBoardsModule` in `app.module.ts`**

Open `pakka-api/src/app.module.ts`. Add to the imports array:
```typescript
import { TaskBoardsModule } from './modules/task-boards/task-boards.module'
// ... in @Module imports:
TaskBoardsModule,
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/task-boards/ src/app.module.ts
git commit -m "feat(task-boards): add TaskBoardsModule with board + column CRUD endpoints"
```

---

## Task 4: Frontend — install dnd-kit, update `useTasks.ts`, create `useTaskBoards.ts`

**Files:**
- Modify: `pakka-app/src/features/tasks/hooks/useTasks.ts`
- Create: `pakka-app/src/features/tasks/hooks/useTaskBoards.ts`

- [ ] **Step 1: Install dnd-kit packages**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to `node_modules`, no peer dep errors.

- [ ] **Step 2: Update `Task` interface and inputs in `useTasks.ts`**

Open `pakka-app/src/features/tasks/hooks/useTasks.ts`.

Add to `Task` interface (after `updatedAt`):
```typescript
columnId: string | null
position: number
```

Add to `CreateTaskInput` interface:
```typescript
columnId?: string | null
```

Add to `UpdateTaskInput` interface:
```typescript
columnId?: string | null
position?: number
```

- [ ] **Step 3: Update `useUpdateTask` to also invalidate `['task-boards']`**

In `useUpdateTask`, change `onSuccess` to:

```typescript
onSuccess: (_, { id, columnId }) => {
  qc.invalidateQueries({ queryKey: KEYS.lists() })
  qc.invalidateQueries({ queryKey: KEYS.detail(id) })
  if (columnId !== undefined) {
    qc.invalidateQueries({ queryKey: ['task-boards'] })
  }
},
```

- [ ] **Step 4: Create `useTaskBoards.ts`**

```typescript
// pakka-app/src/features/tasks/hooks/useTaskBoards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task } from './useTasks'

export interface BoardColumn {
  id:       string
  boardId:  string
  name:     string
  position: number
  isDone:   boolean
  color:    string | null
}

export interface BoardColumnWithTasks extends BoardColumn {
  tasks: Task[]
}

export interface TaskBoard {
  id:        string
  userId:    string
  projectId: string | null
  name:      string
  position:  number
  columns:   BoardColumnWithTasks[]
  createdAt: string
  updatedAt: string
}

export interface TaskBoardSummary {
  id:        string
  name:      string
  position:  number
  projectId: string | null
  createdAt: string
}

export interface CreateBoardInput {
  name:       string
  projectId?: string
}

export interface UpdateBoardInput {
  id:        string
  name?:     string
  position?: number
}

export interface CreateColumnInput {
  boardId: string
  name:    string
  isDone?: boolean
  color?:  string
}

export interface UpdateColumnInput {
  boardId:   string
  colId:     string
  name?:     string
  position?: number
  isDone?:   boolean
  color?:    string
}

const KEYS = {
  all:    ['task-boards'] as const,
  lists:  () => [...KEYS.all, 'list'] as const,
  list:   (params: object) => [...KEYS.lists(), params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useTaskBoards(params?: { projectId?: string }) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn: async () => {
      const { data } = await api.get<{ data: TaskBoardSummary[] }>('/task-boards', { params })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useTaskBoard(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: TaskBoard }>(`/task-boards/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data } = await api.post<{ data: TaskBoard }>('/task-boards', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateBoardInput) => {
      const { data } = await api.patch<{ data: TaskBoardSummary }>(`/task-boards/${id}`, rest)
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/task-boards/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, ...rest }: CreateColumnInput) => {
      const { data } = await api.post<{ data: BoardColumn }>(`/task-boards/${boardId}/columns`, rest)
      return data.data
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
    },
  })
}

export function useUpdateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, colId, ...rest }: UpdateColumnInput) => {
      const { data } = await api.patch<{ data: BoardColumn }>(
        `/task-boards/${boardId}/columns/${colId}`,
        rest,
      )
      return data.data
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
    },
  })
}

export function useDeleteColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ boardId, colId }: { boardId: string; colId: string }) => {
      await api.delete(`/task-boards/${boardId}/columns/${colId}`)
    },
    onSuccess: (_, { boardId }) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(boardId) })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/hooks/useTasks.ts src/features/tasks/hooks/useTaskBoards.ts package.json package-lock.json
git commit -m "feat(task-boards): install dnd-kit, extend useTasks interfaces, add useTaskBoards hooks"
```

---

## Task 5: `TaskCard.tsx` + `BoardColumnCard.tsx` components

**Files:**
- Create: `pakka-app/src/features/tasks/components/TaskCard.tsx`
- Create: `pakka-app/src/features/tasks/components/BoardColumnCard.tsx`

- [ ] **Step 1: Create `TaskCard.tsx`**

```typescript
// pakka-app/src/features/tasks/components/TaskCard.tsx
import { useState } from 'react'
import { Circle, CheckCircle2, Loader2, Lock, Calendar, FolderOpen } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useUpdateTask, type Task } from '../hooks/useTasks'

interface Props {
  task:         Task
  onClick:      () => void
  showProject?: boolean
}

export default function TaskCard({ task, onClick, showProject }: Props) {
  const [toggling, setToggling]  = useState(false)
  const updateTask               = useUpdateTask()
  const done                     = task.status === 'COMPLETED'

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try {
      await updateTask.mutateAsync({ id: task.id, status: done ? 'TODO' : 'COMPLETED' })
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-3 cursor-pointer',
        'hover:border-[#C7D7FD] dark:hover:border-[#3B4267] hover:shadow-sm transition-all select-none',
        done && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="mt-0.5 shrink-0"
        >
          {toggling
            ? <Loader2 size={14} className="animate-spin text-[#98A2B3]" />
            : done
              ? <CheckCircle2 size={14} className="text-[#6366F1]" />
              : <Circle size={14} className="text-[#D0D5DD] hover:text-[#6366F1] transition-colors" />
          }
        </button>
        <span className={cn(
          'text-[13px] font-medium leading-snug flex-1 min-w-0',
          done ? 'line-through text-[#98A2B3] dark:text-[#545C74]' : 'text-[#101828] dark:text-[#ECEEF3]',
        )}>
          {task.title}
        </span>
        {task.isPrivate && (
          <Lock size={11} className="text-[#98A2B3] shrink-0 mt-0.5" />
        )}
      </div>

      {(task.dueDate || (showProject && task.project)) && (
        <div className="flex items-center gap-2 mt-2 pl-5 flex-wrap">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#8B92A8]">
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {showProject && task.project && (
            <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full text-[#344054] dark:text-[#C2C8D8]">
              <FolderOpen size={10} />
              {task.project.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `BoardColumnCard.tsx`**

```typescript
// pakka-app/src/features/tasks/components/BoardColumnCard.tsx
import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Check, Trash2, Pencil, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateTask } from '../hooks/useTasks'
import { useUpdateColumn, useDeleteColumn, type BoardColumnWithTasks } from '../hooks/useTaskBoards'
import TaskCard from './TaskCard'

interface Props {
  column:        BoardColumnWithTasks
  boardId:       string
  onCardClick:   (taskId: string) => void
  showProject?:  boolean
}

export default function BoardColumnCard({ column, boardId, onCardClick, showProject }: Props) {
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [renaming,      setRenaming]      = useState(false)
  const [nameInput,     setNameInput]     = useState(column.name)
  const [addingTask,    setAddingTask]    = useState(false)
  const [newTaskTitle,  setNewTaskTitle]  = useState('')
  const renameRef  = useRef<HTMLInputElement>(null)
  const newTaskRef = useRef<HTMLInputElement>(null)

  const updateColumn = useUpdateColumn()
  const deleteColumn = useDeleteColumn()
  const createTask   = useCreateTask()

  useEffect(() => { if (renaming) renameRef.current?.focus() }, [renaming])
  useEffect(() => { if (addingTask) newTaskRef.current?.focus() }, [addingTask])

  async function handleRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === column.name) { setRenaming(false); return }
    await updateColumn.mutateAsync({ boardId, colId: column.id, name: trimmed })
    setRenaming(false)
  }

  async function handleMarkDone() {
    await updateColumn.mutateAsync({ boardId, colId: column.id, isDone: !column.isDone })
    setMenuOpen(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete column "${column.name}"? Tasks will move to Inbox.`)) return
    await deleteColumn.mutateAsync({ boardId, colId: column.id })
    setMenuOpen(false)
  }

  async function handleAddTask() {
    const title = newTaskTitle.trim()
    if (!title) { setAddingTask(false); return }
    await createTask.mutateAsync({ title, columnId: column.id })
    setNewTaskTitle('')
    setAddingTask(false)
  }

  const colorDot = column.color
    ? <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: column.color }} />
    : null

  return (
    <div className="flex flex-col bg-[#F8F9FB] dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] w-[280px] shrink-0 max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {colorDot}
        {renaming ? (
          <input
            ref={renameRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            className="flex-1 text-[13px] font-semibold bg-transparent border-b border-[#6366F1] outline-none text-[#101828] dark:text-[#ECEEF3]"
          />
        ) : (
          <span
            className="flex-1 text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate cursor-pointer"
            onClick={() => setRenaming(true)}
          >
            {column.name}
          </span>
        )}
        {column.isDone && <Check size={12} className="text-[#10B981] shrink-0" />}
        <span className="text-[11px] text-[#98A2B3] bg-[#F2F4F7] dark:bg-[#21222D] px-1.5 py-0.5 rounded-full shrink-0">
          {column.tasks.length}
        </span>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-0.5 rounded hover:bg-[#EAECF0] dark:hover:bg-[#26283A] transition-colors"
          >
            <MoreHorizontal size={14} className="text-[#667085]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { setRenaming(true); setMenuOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                onClick={handleMarkDone}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                <Check size={12} /> {column.isDone ? 'Unmark as Done' : 'Mark as Done'}
              </button>
              <div className="my-1 border-t border-[#EAECF0] dark:border-[#26283A]" />
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[#F04438] hover:bg-[#FEF3F2] dark:hover:bg-[#2D1B1B]"
              >
                <Trash2 size={12} /> Delete column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2 min-h-[40px]">
        {column.tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onCardClick(task.id)}
            showProject={showProject}
          />
        ))}
      </div>

      {/* Add task */}
      <div className="px-3 pb-3 pt-1">
        {addingTask ? (
          <div className="flex flex-col gap-1.5">
            <input
              ref={newTaskRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTaskTitle('') } }}
              placeholder="Task title..."
              className="form-input text-[12px] h-7 w-full"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAddTask}
                disabled={createTask.isPending}
                className="flex-1 btn-primary text-[11px] h-6 flex items-center justify-center gap-1"
              >
                {createTask.isPending ? <Loader2 size={10} className="animate-spin" /> : 'Add'}
              </button>
              <button
                onClick={() => { setAddingTask(false); setNewTaskTitle('') }}
                className="flex-1 text-[11px] h-6 border border-[#EAECF0] dark:border-[#26283A] rounded-md text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors w-full"
          >
            <Plus size={13} /> Add task
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/tasks/components/TaskCard.tsx src/features/tasks/components/BoardColumnCard.tsx
git commit -m "feat(task-boards): add TaskCard and BoardColumnCard components"
```

---

## Task 6: `TaskBoardView.tsx` — DnD orchestrator

**Files:**
- Create: `pakka-app/src/features/tasks/components/TaskBoardView.tsx`

- [ ] **Step 1: Create `TaskBoardView.tsx`**

```typescript
// pakka-app/src/features/tasks/components/TaskBoardView.tsx
import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Loader2, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTasks, useUpdateTask, type Task } from '../hooks/useTasks'
import {
  useTaskBoard,
  useUpdateColumn,
  useCreateColumn,
  type BoardColumnWithTasks,
} from '../hooks/useTaskBoards'
import TaskCard from './TaskCard'
import BoardColumnCard from './BoardColumnCard'
import TaskSlideIn from './TaskSlideIn'

interface Props {
  boardId:     string
  projectId?:  string
  listUrl:     string
}

function SortableCard({ task, onClick, showProject }: { task: Task; onClick: () => void; showProject?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card:${task.id}`,
    data: { type: 'card', task },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} showProject={showProject} />
    </div>
  )
}

function SortableColumn({ column, boardId, onCardClick, showProject, children }: {
  column: BoardColumnWithTasks
  boardId: string
  onCardClick: (id: string) => void
  showProject?: boolean
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col:${column.id}`,
    data: { type: 'column', column },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
    >
      <BoardColumnCard
        column={column}
        boardId={boardId}
        onCardClick={onCardClick}
        showProject={showProject}
      />
    </div>
  )
}

export default function TaskBoardView({ boardId, projectId, listUrl }: Props) {
  const { taskId }    = useParams<{ taskId?: string }>()
  const navigate      = useNavigate()
  const updateTask    = useUpdateTask()
  const updateColumn  = useUpdateColumn()
  const createColumn  = useCreateColumn()

  const { data: board, isLoading } = useTaskBoard(boardId)
  const { data: inboxTasks = [] }  = useTasks({
    projectId,
    // We filter client-side for tasks with columnId === null
  })

  const unassigned = inboxTasks.filter(t => t.columnId === null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName,   setNewColName]   = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const colIds = board?.columns.map(c => `col:${c.id}`) ?? []

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData   = over.data.current

    if (activeData?.type === 'column' && overData?.type === 'column') {
      const cols       = board!.columns
      const oldIndex   = cols.findIndex(c => `col:${c.id}` === active.id)
      const newIndex   = cols.findIndex(c => `col:${c.id}` === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const colId = activeData.column.id
      await updateColumn.mutateAsync({ boardId, colId, position: newIndex })
      return
    }

    if (activeData?.type === 'card') {
      const taskId    = activeData.task.id
      const overId    = String(over.id)
      const targetColId = overId.startsWith('col:')
        ? overId.replace('col:', '')
        : overData?.task?.columnId ?? null

      if (targetColId === null) return // dragging INTO inbox not allowed
      await updateTask.mutateAsync({ id: taskId, columnId: targetColId })
    }
  }

  async function handleAddColumn() {
    const name = newColName.trim()
    if (!name) { setAddingColumn(false); return }
    await createColumn.mutateAsync({ boardId, name })
    setNewColName('')
    setAddingColumn(false)
  }

  function openTask(id: string) {
    navigate(`${listUrl}/${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
      </div>
    )
  }

  if (!board) return null

  const activeCard = activeId?.startsWith('card:')
    ? [...(board.columns.flatMap(c => c.tasks)), ...unassigned].find(t => `card:${t.id}` === activeId)
    : null

  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {/* Inbox — virtual read-only left column */}
          <div className="flex flex-col bg-[#F8F9FB] dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] w-[280px] shrink-0 max-h-[calc(100vh-220px)]">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <Inbox size={13} className="text-[#98A2B3]" />
              <span className="flex-1 text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8]">Inbox</span>
              <span className="text-[11px] text-[#98A2B3] bg-[#F2F4F7] dark:bg-[#21222D] px-1.5 py-0.5 rounded-full">
                {unassigned.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3 min-h-[40px]">
              <SortableContext items={unassigned.map(t => `card:${t.id}`)} strategy={verticalListSortingStrategy}>
                {unassigned.map(task => (
                  <SortableCard
                    key={task.id}
                    task={task}
                    onClick={() => openTask(task.id)}
                    showProject={!projectId}
                  />
                ))}
              </SortableContext>
              {unassigned.length === 0 && (
                <p className="text-[11px] text-[#D0D5DD] text-center py-4">No unassigned tasks</p>
              )}
            </div>
          </div>

          {/* Real columns */}
          <SortableContext items={colIds} strategy={horizontalListSortingStrategy}>
            {board.columns.map(col => (
              <SortableContext
                key={col.id}
                items={col.tasks.map(t => `card:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <SortableColumn
                  column={col}
                  boardId={boardId}
                  onCardClick={openTask}
                  showProject={!projectId}
                />
              </SortableContext>
            ))}
          </SortableContext>

          {/* Add column */}
          <div className="shrink-0 w-[280px]">
            {addingColumn ? (
              <div className="bg-[#F8F9FB] dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-3 flex flex-col gap-2">
                <input
                  autoFocus
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') } }}
                  placeholder="Column name..."
                  className="form-input text-[13px] h-8"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddColumn} className="flex-1 btn-primary text-[12px] h-7">Add</button>
                  <button
                    onClick={() => { setAddingColumn(false); setNewColName('') }}
                    className="flex-1 text-[12px] h-7 border border-[#EAECF0] dark:border-[#26283A] rounded-md text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingColumn(true)}
                className="flex items-center gap-2 text-[13px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors px-1 py-2"
              >
                <Plus size={14} /> Add column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-1 shadow-lg opacity-90">
              <TaskCard task={activeCard} onClick={() => {}} showProject={!projectId} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskSlideIn
        open={slideInOpen}
        taskId={slideInId}
        defaultProjectId={projectId}
        listUrl={listUrl}
      />
    </>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/tasks/components/TaskBoardView.tsx
git commit -m "feat(task-boards): add TaskBoardView with DnD column/card drag-and-drop"
```

---

## Task 7: `TaskBoardsPage.tsx`

**Files:**
- Create: `pakka-app/src/pages/app/TaskBoardsPage.tsx`

- [ ] **Step 1: Create `TaskBoardsPage.tsx`**

```typescript
// pakka-app/src/pages/app/TaskBoardsPage.tsx
import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useTaskBoards,
  useCreateBoard,
  useDeleteBoard,
} from '@/features/tasks/hooks/useTaskBoards'
import TaskBoardView from '@/features/tasks/components/TaskBoardView'

interface Props {
  projectId?: string
}

export default function TaskBoardsPage({ projectId }: Props) {
  const { boardId }   = useParams<{ boardId?: string }>()
  const navigate      = useNavigate()

  const baseUrl       = projectId ? `/projects/${projectId}/tasks` : '/tasks'
  const boardsBaseUrl = `${baseUrl}/task-boards`

  const { data: boards = [], isLoading } = useTaskBoards({ projectId })
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()

  // Auto-create default board on first visit
  useEffect(() => {
    if (isLoading || boards.length > 0) return
    const name = projectId ? 'Project Board' : 'My Board'
    createBoard.mutateAsync({ name, projectId }).then(board => {
      navigate(`${boardsBaseUrl}/${board.id}`, { replace: true })
    })
  }, [isLoading, boards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to first board if no boardId in URL
  useEffect(() => {
    if (!boardId && boards.length > 0) {
      navigate(`${boardsBaseUrl}/${boards[0].id}`, { replace: true })
    }
  }, [boardId, boards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleNewBoard() {
    const name = prompt('Board name:', 'New Board')
    if (!name?.trim()) return
    const board = await createBoard.mutateAsync({ name: name.trim(), projectId })
    navigate(`${boardsBaseUrl}/${board.id}`)
  }

  async function handleDeleteBoard(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this board? Tasks will move to Inbox.')) return
    await deleteBoard.mutateAsync(id)
    const remaining = boards.filter(b => b.id !== id)
    if (remaining.length > 0) {
      navigate(`${boardsBaseUrl}/${remaining[0].id}`, { replace: true })
    } else {
      navigate(boardsBaseUrl, { replace: true })
    }
  }

  if (isLoading || (boards.length === 0 && createBoard.isPending)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-nav (only shown in standalone tasks page, not inside project) */}
      {!projectId && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[19px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Task Boards</h1>
          </div>
        </div>
      )}

      {!projectId && (
        <div className="flex items-center gap-1 text-[13px]">
          <Link
            to="/tasks"
            className="px-3 py-1.5 rounded-lg text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            Tasks
          </Link>
          <span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
            Task Boards
          </span>
        </div>
      )}

      {/* Board tab bar */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto">
        {boards.map(board => (
          <div key={board.id} className="relative group shrink-0">
            <Link
              to={`${boardsBaseUrl}/${board.id}`}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 transition-colors',
                board.id === boardId
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              {board.name}
              <button
                onClick={e => handleDeleteBoard(e, board.id)}
                className={cn(
                  'rounded-full p-0.5 transition-colors',
                  board.id === boardId
                    ? 'opacity-60 hover:opacity-100 hover:bg-[#EEF2FF] dark:hover:bg-[#1e1f2e]'
                    : 'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-[#F2F4F7] dark:hover:bg-[#21222D]',
                )}
              >
                <X size={11} />
              </button>
            </Link>
          </div>
        ))}
        <button
          onClick={handleNewBoard}
          disabled={createBoard.isPending}
          className="flex items-center gap-1 px-3 py-2 text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors shrink-0"
        >
          {createBoard.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New board
        </button>
      </div>

      {/* Board view */}
      {boardId ? (
        <TaskBoardView
          boardId={boardId}
          projectId={projectId}
          listUrl={baseUrl + (boardId ? `/task-boards/${boardId}` : '')}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/TaskBoardsPage.tsx
git commit -m "feat(task-boards): add TaskBoardsPage with board tab bar and auto-creation"
```

---

## Task 8: Router + sub-nav wiring

**Files:**
- Modify: `pakka-app/src/router/index.tsx`
- Modify: `pakka-app/src/pages/app/TasksPage.tsx`
- Modify: `pakka-app/src/features/tasks/components/ProjectTasksTab.tsx`

- [ ] **Step 1: Update `router/index.tsx` — replace 2 Navigate redirects with 4 real routes**

Open `pakka-app/src/router/index.tsx`.

Find and replace:
```typescript
{
  path: '/tasks/task-boards',
  element: <Navigate to="/tasks" replace />,
},
```
With:
```typescript
{
  path: '/tasks/task-boards',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/TaskBoardsPage')
    return { Component }
  },
},
{
  path: '/tasks/task-boards/:boardId',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/TaskBoardsPage')
    return { Component }
  },
},
```

Find and replace:
```typescript
{
  path: '/projects/:id/tasks/task-boards',
  element: <Navigate to="/tasks" replace />,
},
```
With:
```typescript
{
  path: '/projects/:id/tasks/task-boards',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/ProjectPage')
    return { Component }
  },
},
{
  path: '/projects/:id/tasks/task-boards/:boardId',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/ProjectPage')
    return { Component }
  },
},
```

Important: these routes must be placed **before** `/tasks/:taskId` and `/projects/:id/tasks/:taskId` respectively so the static `task-boards` segment wins over the dynamic `:taskId` parameter.

- [ ] **Step 2: Update `TasksPage.tsx` — "Task Boards" span → Link**

Open `pakka-app/src/pages/app/TasksPage.tsx`.

Add `Link` to the imports from `react-router-dom`:
```typescript
import { useParams, useNavigate, Link } from 'react-router-dom'
```

Find:
```typescript
<span className="px-3 py-1.5 rounded-lg text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed select-none" title="Coming soon">
  Task Boards
</span>
```

Replace with:
```typescript
<Link
  to="/tasks/task-boards"
  className="px-3 py-1.5 rounded-lg text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
>
  Task Boards
</Link>
```

- [ ] **Step 3: Update `ProjectTasksTab.tsx` — board route detection + Link + TaskBoardsPage render**

Open `pakka-app/src/features/tasks/components/ProjectTasksTab.tsx`.

Change the import line for react-router-dom to:
```typescript
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
```

Add `TaskBoardsPage` import at top:
```typescript
import TaskBoardsPage from '@/pages/app/TaskBoardsPage'
```

Add inside `ProjectTasksTab` function, right after the existing hooks:
```typescript
const location    = useLocation()
const isBoardRoute = location.pathname.includes('/task-boards')
```

Add immediately after those two lines (before the `return`):
```typescript
if (isBoardRoute) {
  return <TaskBoardsPage projectId={projectId} />
}
```

Find the "Task Boards" cursor-not-allowed span:
```typescript
<span className="px-3 py-1.5 rounded-lg text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed select-none" title="Coming soon">
  Task Boards
</span>
```

Replace with:
```typescript
<Link
  to={`/projects/${projectId}/tasks/task-boards`}
  className={cn(
    'px-3 py-1.5 rounded-lg text-[13px] transition-colors',
    isBoardRoute
      ? 'font-semibold text-[#344054] dark:text-[#C2C8D8] bg-[#F2F4F7] dark:bg-[#21222D]'
      : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
  )}
>
  Task Boards
</Link>
```

Also update the "Tasks" span to be a Link and highlight correctly:

Find:
```typescript
<span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
  Tasks
</span>
```

Replace with:
```typescript
<Link
  to={`/projects/${projectId}/tasks`}
  className={cn(
    'px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors',
    !isBoardRoute
      ? 'text-[#344054] dark:text-[#C2C8D8] bg-[#F2F4F7] dark:bg-[#21222D]'
      : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
  )}
>
  Tasks
</Link>
```

- [ ] **Step 4: Run final TypeScript check on both repos**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: 0 errors in both.

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/router/index.tsx src/pages/app/TasksPage.tsx src/features/tasks/components/ProjectTasksTab.tsx
git commit -m "feat(task-boards): wire routes, sub-nav links, and project tab board detection"
```

---

## Acceptance Checklist

After all 8 tasks are done, verify manually:

- [ ] `/tasks/task-boards` auto-creates "My Board" with To Do / In Progress / Done on first visit
- [ ] Board shows unassigned tasks in Inbox, column-assigned tasks in their columns
- [ ] Dragging a card to Done column sets `status = COMPLETED`; dragging to another column sets `TODO`
- [ ] Column reorder via drag updates positions; card reorder within a column updates positions
- [ ] "Add Column" inline form works; column rename by clicking name works
- [ ] `isDone` toggle via `…` menu works; only one done column per board
- [ ] "New board" button creates a second board; tab bar switches between boards
- [ ] Delete board: tasks move to Inbox (`columnId = null`)
- [ ] Delete column: tasks in it move to Inbox
- [ ] `/projects/:id/tasks/task-boards` shows only that project's tasks
- [ ] Clicking a card opens `TaskSlideIn` — URL updates to `/:taskId`; closing returns to board URL
- [ ] "Task Boards" sub-nav link in `TasksPage` navigates correctly
- [ ] "Task Boards" sub-nav link in `ProjectTasksTab` navigates correctly
- [ ] Zero TypeScript errors in both repos
