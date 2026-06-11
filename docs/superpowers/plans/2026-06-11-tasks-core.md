# Tasks Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core Tasks feature — global task list, per-project task list, and a right slide-in detail panel, with full CRUD.

**Architecture:** New `tasks` NestJS module mirrors the existing `projects` module pattern (service holds interfaces, controller uses `effectiveUserId`). Frontend adds a `src/features/tasks/` feature folder with hooks and components; `TasksPage` handles both list and slide-in via URL params; `ProjectPage` gains a Tasks tab that navigates to real routes. All 9 flat routes are added to the existing router.

**Tech Stack:** NestJS + Prisma + PostgreSQL (API); React + Vite + TanStack Query v5 + Tailwind v4 + lucide-react (App); React Router v6 with `createBrowserRouter`

---

## File Map

### pakka-api — create

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add `Task` model + `TaskStatus` enum |
| `src/modules/tasks/tasks.service.ts` | DTO interfaces + business logic (list, create, findOne, update, delete) |
| `src/modules/tasks/tasks.controller.ts` | 5 REST endpoints, auth via global guard, `effectiveUserId` |
| `src/modules/tasks/tasks.module.ts` | Module registration |

### pakka-api — modify

| File | Change |
|------|--------|
| `src/app.module.ts` | Import + register `TasksModule` |

### pakka-app — create

| File | Responsibility |
|------|---------------|
| `src/features/tasks/hooks/useTasks.ts` | TanStack Query hooks for all 5 CRUD operations |
| `src/features/tasks/components/TaskSlideIn.tsx` | 420px right-side panel: view + edit task details |
| `src/features/tasks/components/ProjectTasksTab.tsx` | Tasks list scoped to one project, embeds inside ProjectPage |
| `src/pages/app/TasksPage.tsx` | Global task list page; reads `:taskId` param to open slide-in |

### pakka-app — modify

| File | Change |
|------|--------|
| `src/router/index.tsx` | Add 4 tasks routes + 3 project/tasks routes |
| `src/pages/app/ProjectPage.tsx` | Add `tasks` tab that navigates to route; read `isTasksRoute` from URL |
| `src/components/layout/Sidebar.tsx` | Add Tasks nav entry with `CheckSquare` icon |

---

## Task 1: Prisma — Task model + migration

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Add Task model and TaskStatus enum to schema**

Open `pakka-api/prisma/schema.prisma`. After the `ProjectStatus` enum block, add:

```prisma
enum TaskStatus {
  TODO
  COMPLETED
}

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

  @@map("tasks")
}
```

Also add the back-relations:
- On the `User` model, add: `tasks Task[]`
- On the `Project` model, add: `tasks Task[]`

- [ ] **Step 2: Run prisma migrate dev**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma migrate dev --name add_tasks
```

Expected: Migration created and applied, `npx prisma generate` runs automatically. No errors.

- [ ] **Step 3: Verify generated client includes Task**

```bash
grep -r "TaskStatus\|findMany.*task" node_modules/.prisma/client/index.d.ts | head -5
```

Expected: Lines showing `TaskStatus` enum and task methods.

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Task model and TaskStatus enum"
```

---

## Task 2: Backend — Tasks module

**Files:**
- Create: `pakka-api/src/modules/tasks/tasks.service.ts`
- Create: `pakka-api/src/modules/tasks/tasks.controller.ts`
- Create: `pakka-api/src/modules/tasks/tasks.module.ts`
- Modify: `pakka-api/src/app.module.ts`

- [ ] **Step 1: Create tasks.service.ts**

```typescript
// pakka-api/src/modules/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

export interface CreateTaskDto {
  title:       string;
  dueDate?:    string;
  includeTime?: boolean;
  isPrivate?:  boolean;
  projectId?:  string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  status?: TaskStatus;
}

export interface ListTasksQuery {
  status?:    TaskStatus;
  projectId?: string;
  search?:    string;
}

const TASK_INCLUDE = {
  project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListTasksQuery) {
    const where: Record<string, unknown> = { userId };
    if (query.status)    where['status']    = query.status;
    if (query.projectId) where['projectId'] = query.projectId;
    if (query.search) {
      where['title'] = { contains: query.search, mode: 'insensitive' };
    }
    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: TASK_INCLUDE,
    });
  }

  async create(userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        userId,
        title:       dto.title,
        dueDate:     dto.dueDate ? new Date(dto.dueDate) : undefined,
        includeTime: dto.includeTime ?? false,
        isPrivate:   dto.isPrivate  ?? false,
        projectId:   dto.projectId,
      },
      include: TASK_INCLUDE,
    });
  }

  async findOne(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.findOne(userId, id);
    return this.prisma.task.update({
      where:  { id },
      data: {
        title:       dto.title,
        status:      dto.status,
        dueDate:     dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        includeTime: dto.includeTime,
        isPrivate:   dto.isPrivate,
        projectId:   dto.projectId !== undefined ? (dto.projectId || null) : undefined,
      },
      include: TASK_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.task.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Create tasks.controller.ts**

```typescript
// pakka-api/src/modules/tasks/tasks.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TasksService, CreateTaskDto, UpdateTaskDto, ListTasksQuery } from './tasks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { effectiveUserId } from '../users/effective-user-id';
import { TaskStatus, User } from '@prisma/client';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('status')    status?:    TaskStatus,
    @Query('projectId') projectId?: string,
    @Query('search')    search?:    string,
  ) {
    const query: ListTasksQuery = { status, projectId, search };
    return this.tasksService.list(effectiveUserId(user), query);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() body: CreateTaskDto,
  ) {
    return this.tasksService.create(effectiveUserId(user), body);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.tasksService.findOne(effectiveUserId(user), id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(effectiveUserId(user), id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.tasksService.remove(effectiveUserId(user), id);
  }
}
```

- [ ] **Step 3: Create tasks.module.ts**

```typescript
// pakka-api/src/modules/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [TasksController],
  providers:   [TasksService],
})
export class TasksModule {}
```

- [ ] **Step 4: Register TasksModule in app.module.ts**

In `pakka-api/src/app.module.ts`, add the import at the top:
```typescript
import { TasksModule } from './modules/tasks/tasks.module';
```

Then add `TasksModule` to the `imports` array (after `ProjectsModule`):
```typescript
    ProjectsModule,
    TasksModule,
    EmailTemplatesModule,
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/tasks/ src/app.module.ts
git commit -m "feat: add tasks CRUD module (5 endpoints)"
```

---

## Task 3: Frontend — useTasks hooks

**Files:**
- Create: `pakka-app/src/features/tasks/hooks/useTasks.ts`

- [ ] **Step 1: Create the hooks file**

Create directory first: `src/features/tasks/hooks/`

```typescript
// pakka-app/src/features/tasks/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type TaskStatus = 'TODO' | 'COMPLETED'

export interface TaskProject {
  id:     string
  name:   string
  client: { id: string; name: string } | null
}

export interface Task {
  id:          string
  userId:      string
  title:       string
  status:      TaskStatus
  dueDate:     string | null
  includeTime: boolean
  isPrivate:   boolean
  projectId:   string | null
  project:     TaskProject | null
  createdAt:   string
  updatedAt:   string
}

export interface CreateTaskInput {
  title:        string
  dueDate?:     string | null
  includeTime?: boolean
  isPrivate?:   boolean
  projectId?:   string | null
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id:      string
  status?: TaskStatus
}

const KEYS = {
  all:    ['tasks'] as const,
  lists:  () => [...KEYS.all, 'list'] as const,
  list:   (params: object) => [...KEYS.lists(), params] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useTasks(params?: {
  status?:    TaskStatus
  projectId?: string
  search?:    string
}) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn:  async () => {
      const { data } = await api.get<{ data: Task[] }>('/tasks', { params })
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn:  async () => {
      const { data } = await api.get<{ data: Task }>(`/tasks/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post<{ data: Task }>('/tasks', input)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateTaskInput) => {
      const { data } = await api.patch<{ data: Task }>(`/tasks/${id}`, rest)
      return data.data
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.lists() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lists() }),
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep -i "tasks" | head -20
```

Expected: No errors mentioning tasks files.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/tasks/
git commit -m "feat: add useTasks React Query hooks"
```

---

## Task 4: Frontend — TaskSlideIn component

**Files:**
- Create: `pakka-app/src/features/tasks/components/TaskSlideIn.tsx`

- [ ] **Step 1: Create TaskSlideIn.tsx**

```tsx
// pakka-app/src/features/tasks/components/TaskSlideIn.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Trash2, Loader2, Link2, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTask, useCreateTask, useUpdateTask, useDeleteTask, type Task } from '../hooks/useTasks'
import { useProjects } from '@/features/projects/hooks/useProjects'

interface Props {
  open:              boolean
  taskId?:           string       // undefined = new task form
  defaultProjectId?: string       // pre-fill project when creating from project context
  listUrl:           string       // URL to navigate to on close (e.g. '/tasks' or '/projects/abc/tasks')
}

export default function TaskSlideIn({ open, taskId, defaultProjectId, listUrl }: Props) {
  const navigate  = useNavigate()
  const isNew     = !taskId
  const { data: existing, isLoading } = useTask(taskId)
  const { data: projectsData } = useProjects()
  const projects  = projectsData?.projects ?? []

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title,       setTitle]       = useState('')
  const [dueDate,     setDueDate]     = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [projectId,   setProjectId]   = useState<string>('')
  const [isPrivate,   setIsPrivate]   = useState(false)
  const [showDel,     setShowDel]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Sync form state when existing task loads or taskId changes
  useEffect(() => {
    if (isNew) {
      setTitle('')
      setDueDate('')
      setIncludeTime(false)
      setProjectId(defaultProjectId ?? '')
      setIsPrivate(false)
    } else if (existing) {
      setTitle(existing.title)
      setDueDate(existing.dueDate
        ? (existing.includeTime
            ? new Date(existing.dueDate).toISOString().slice(0, 16)
            : new Date(existing.dueDate).toISOString().slice(0, 10))
        : '')
      setIncludeTime(existing.includeTime)
      setProjectId(existing.projectId ?? '')
      setIsPrivate(existing.isPrivate)
    }
  }, [existing, isNew, defaultProjectId, taskId])

  function close() {
    navigate(listUrl)
  }

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:       title.trim(),
        dueDate:     dueDate || null,
        includeTime,
        isPrivate,
        projectId:   projectId || null,
      }
      if (isNew) {
        const created = await createTask.mutateAsync(payload)
        navigate(`${listUrl}/${created.id}`.replace(/\/+/g, '/'))
      } else {
        await updateTask.mutateAsync({ id: taskId!, ...payload })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!taskId) return
    await deleteTask.mutateAsync(taskId)
    navigate(listUrl)
  }

  async function handleCheckboxToggle(task: Task) {
    await updateTask.mutateAsync({
      id:     task.id,
      status: task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED',
    })
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        onClick={close}
      />

      {/* Panel */}
      <div className={cn(
        'fixed right-0 top-0 bottom-0 z-40 w-full max-w-[420px]',
        'bg-white dark:bg-[#13141A] border-l border-[#EAECF0] dark:border-[#26283A]',
        'flex flex-col shadow-2xl',
        'transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A] shrink-0">
          <div className="min-w-0">
            {existing?.project && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5 truncate">
                {existing.project.name}
                {existing.project.client && <span> · {existing.project.client.name}</span>}
              </p>
            )}
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {isNew ? 'New task' : 'Task details'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isNew && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                  title="Copy link"
                >
                  <Link2 size={13} />
                </button>
                <button
                  onClick={() => setShowDel(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-red-950/20 transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
            <button
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading && !isNew ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-[#98A2B3]" />
            </div>
          ) : (
            <>
              {/* Title */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Task
                </label>
                <textarea
                  autoFocus
                  rows={2}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="form-input w-full resize-none text-[14px] font-medium"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Due date
                </label>
                <input
                  type={includeTime ? 'datetime-local' : 'date'}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="form-input w-full text-[13px]"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTime}
                    onChange={e => {
                      setIncludeTime(e.target.checked)
                      // When toggling, strip/keep time part of dueDate
                      if (dueDate) {
                        setDueDate(e.target.checked ? dueDate.slice(0, 16) : dueDate.slice(0, 10))
                      }
                    }}
                    className="rounded border-[#D0D5DD] text-[#6366F1]"
                  />
                  <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Include time</span>
                </label>
              </div>

              {/* Project */}
              <div>
                <label className="block text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5 uppercase tracking-wide">
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="form-input w-full text-[13px]"
                >
                  <option value="">None</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Private */}
              <div className="flex items-center justify-between py-3 border-t border-[#F2F4F7] dark:border-[#26283A]">
                <div className="flex items-center gap-2">
                  <Lock size={13} className="text-[#98A2B3]" />
                  <div>
                    <p className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">Private task</p>
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Only visible to you</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  onClick={() => setIsPrivate(v => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                    isPrivate ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    isPrivate ? 'translate-x-4' : 'translate-x-0',
                  )} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#F2F4F7] dark:border-[#26283A] shrink-0 flex gap-2">
          <button onClick={close} className="btn-secondary flex-1 text-[13px]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="btn-primary flex-1 text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : null}
            {isNew ? 'Create task' : 'Save'}
          </button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      {showDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDel(false)} />
          <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[#FEF3F2] dark:bg-red-950/40 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={18} className="text-[#D92D20]" />
            </div>
            <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-1">Delete task?</h3>
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-5">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDel(false)} className="btn-secondary flex-1 text-[13px]">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="flex-1 h-9 px-4 rounded-xl bg-[#D92D20] hover:bg-[#B42318] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {deleteTask.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "TaskSlideIn\|tasks/components" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/tasks/components/TaskSlideIn.tsx
git commit -m "feat: add TaskSlideIn right panel component"
```

---

## Task 5: Frontend — TasksPage (global)

**Files:**
- Create: `pakka-app/src/pages/app/TasksPage.tsx`

- [ ] **Step 1: Create TasksPage.tsx**

```tsx
// pakka-app/src/pages/app/TasksPage.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Circle, CheckCircle2, Loader2, Search } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useTasks, useUpdateTask, type Task, type TaskStatus } from '@/features/tasks/hooks/useTasks'
import TaskSlideIn from '@/features/tasks/components/TaskSlideIn'

type FilterTab = 'all' | 'TODO' | 'COMPLETED'

const FILTER_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'TODO',      label: 'To Do' },
  { value: 'COMPLETED', label: 'Completed' },
]

function TaskRow({ task, onOpen, onToggle }: {
  task:     Task
  onOpen:   (id: string) => void
  onToggle: (task: Task) => void
}) {
  const [toggling, setToggling] = useState(false)
  const done = task.status === 'COMPLETED'

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try { await onToggle(task) } finally { setToggling(false) }
  }

  return (
    <tr
      className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer"
      onClick={() => onOpen(task.id)}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <button onClick={handleToggle} disabled={toggling} className="flex items-center gap-2.5 group/row min-w-0">
          {toggling
            ? <Loader2 size={15} className="animate-spin text-[#98A2B3] shrink-0" />
            : done
              ? <CheckCircle2 size={15} className="text-[#6366F1] shrink-0" />
              : <Circle size={15} className="text-[#D0D5DD] group-hover/row:text-[#6366F1] shrink-0 transition-colors" />
          }
          <span className={cn(
            'text-[13px] font-medium text-left',
            done ? 'line-through text-[#98A2B3] dark:text-[#545C74]' : 'text-[#101828] dark:text-[#ECEEF3]',
          )}>
            {task.title}
          </span>
        </button>
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {task.project
          ? <span className="px-2 py-0.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full text-[11px] font-medium">{task.project.name}</span>
          : <span className="text-[#D0D5DD]">—</span>
        }
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {task.dueDate
          ? formatDate(task.dueDate)
          : <span className="text-[#D0D5DD]">—</span>
        }
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {formatDate(task.createdAt)}
      </td>
    </tr>
  )
}

export default function TasksPage() {
  const { taskId }  = useParams<{ taskId?: string }>()
  const navigate    = useNavigate()
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<FilterTab>('all')

  const { data: tasks, isLoading } = useTasks({
    status:    filter === 'all' ? undefined : filter as TaskStatus,
    search:    search || undefined,
  })

  const updateTask = useUpdateTask()

  function openTask(id: string) {
    navigate(`/tasks/${id}`)
  }

  function openNew() {
    navigate('/tasks/new')
  }

  // !!taskId covers both existing tasks (:taskId = cuid) and the new-task form (:taskId = 'new')
  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Tasks</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="btn-primary text-[13px] flex items-center gap-1.5 h-8 px-3"
          >
            <Plus size={13} /> New task
          </button>
        </div>
      </div>

      {/* Sub-nav: Tasks | Task Boards */}
      <div className="flex items-center gap-1 text-[13px]">
        <span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
          Tasks
        </span>
        <span className="px-3 py-1.5 rounded-lg text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed select-none" title="Coming soon">
          Task Boards
        </span>
      </div>

      {/* Filter + search bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-0.5 bg-white dark:bg-[#13141A]">
          {FILTER_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                filter === t.value
                  ? 'bg-[#6366F1] text-white'
                  : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="form-input w-full pl-8 text-[13px] h-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#98A2B3]" />
          </div>
        ) : !tasks?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">
              {search ? 'No tasks match your search' : 'No tasks yet — create your first task'}
            </p>
            {!search && (
              <button
                onClick={openNew}
                className="mt-2 flex items-center gap-1 text-[12px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors"
              >
                <Plus size={12} /> New task
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Task</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Project</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Due date</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onOpen={openTask}
                    onToggle={t => updateTask.mutateAsync({ id: t.id, status: t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED' })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in */}
      <TaskSlideIn
        open={slideInOpen}
        taskId={slideInId}
        listUrl="/tasks"
      />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "TasksPage\|tasks/pages" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/pages/app/TasksPage.tsx
git commit -m "feat: add global TasksPage with filter tabs and task rows"
```

---

## Task 6: Frontend — ProjectTasksTab

**Files:**
- Create: `pakka-app/src/features/tasks/components/ProjectTasksTab.tsx`

- [ ] **Step 1: Create ProjectTasksTab.tsx**

This is structurally the same as the table inside TasksPage, but pre-filtered by projectId, no Project column, and uses a different listUrl.

```tsx
// pakka-app/src/features/tasks/components/ProjectTasksTab.tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Circle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useTasks, useUpdateTask, type Task, type TaskStatus } from '../hooks/useTasks'
import TaskSlideIn from './TaskSlideIn'

type FilterTab = 'all' | 'TODO' | 'COMPLETED'

const FILTER_TABS: Array<{ value: FilterTab; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'TODO',      label: 'To Do' },
  { value: 'COMPLETED', label: 'Completed' },
]

interface Props {
  projectId: string
}

export default function ProjectTasksTab({ projectId }: Props) {
  const { taskId }  = useParams<{ taskId?: string }>()
  const navigate    = useNavigate()
  const [filter, setFilter] = useState<FilterTab>('all')
  const listUrl = `/projects/${projectId}/tasks`

  const { data: tasks, isLoading } = useTasks({
    projectId,
    status: filter === 'all' ? undefined : filter as TaskStatus,
  })

  const updateTask = useUpdateTask()

  function openTask(id: string) {
    navigate(`${listUrl}/${id}`)
  }

  function openNew() {
    navigate(`${listUrl}/new`)
  }

  const slideInOpen = !!taskId
  const slideInId   = taskId === 'new' ? undefined : taskId

  return (
    <div className="space-y-4">
      {/* Sub-nav + New task button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[13px]">
            <span className="font-semibold text-[#344054] dark:text-[#C2C8D8] px-3 py-1.5 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D]">
              Tasks
            </span>
            <span className="px-3 py-1.5 rounded-lg text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed select-none" title="Coming soon">
              Task Boards
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-0.5 bg-white dark:bg-[#13141A]">
            {FILTER_TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                  filter === t.value
                    ? 'bg-[#6366F1] text-white'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={openNew}
          className="btn-primary text-[13px] flex items-center gap-1.5 h-8 px-3"
        >
          <Plus size={13} /> New task
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-[#98A2B3]" />
          </div>
        ) : !tasks?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">No tasks for this project yet</p>
            <button
              onClick={openNew}
              className="mt-2 flex items-center gap-1 text-[12px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors"
            >
              <Plus size={12} /> New task
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Task</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Due date</th>
                  <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {tasks.map(task => (
                  <ProjectTaskRow
                    key={task.id}
                    task={task}
                    onOpen={openTask}
                    onToggle={t => updateTask.mutateAsync({ id: t.id, status: t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED' })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in */}
      <TaskSlideIn
        open={slideInOpen}
        taskId={slideInId}
        defaultProjectId={projectId}
        listUrl={listUrl}
      />
    </div>
  )
}

function ProjectTaskRow({ task, onOpen, onToggle }: {
  task:     Task
  onOpen:   (id: string) => void
  onToggle: (task: Task) => void
}) {
  const [toggling, setToggling] = useState(false)
  const done = task.status === 'COMPLETED'

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setToggling(true)
    try { await onToggle(task) } finally { setToggling(false) }
  }

  return (
    <tr
      className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer"
      onClick={() => onOpen(task.id)}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <button onClick={handleToggle} disabled={toggling} className="flex items-center gap-2.5 group/row min-w-0">
          {toggling
            ? <Loader2 size={15} className="animate-spin text-[#98A2B3] shrink-0" />
            : done
              ? <CheckCircle2 size={15} className="text-[#6366F1] shrink-0" />
              : <Circle size={15} className="text-[#D0D5DD] group-hover/row:text-[#6366F1] shrink-0 transition-colors" />
          }
          <span className={cn(
            'text-[13px] font-medium text-left',
            done ? 'line-through text-[#98A2B3] dark:text-[#545C74]' : 'text-[#101828] dark:text-[#ECEEF3]',
          )}>
            {task.title}
          </span>
        </button>
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {task.dueDate ? formatDate(task.dueDate) : <span className="text-[#D0D5DD]">—</span>}
      </td>
      <td className="px-4 py-3 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
        {formatDate(task.createdAt)}
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | grep "ProjectTasksTab" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/tasks/components/ProjectTasksTab.tsx
git commit -m "feat: add ProjectTasksTab component for project-scoped tasks"
```

---

## Task 7: Frontend — Routes, ProjectPage tabs, Sidebar

**Files:**
- Modify: `pakka-app/src/router/index.tsx`
- Modify: `pakka-app/src/pages/app/ProjectPage.tsx`
- Modify: `pakka-app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add tasks routes to router/index.tsx**

In `src/router/index.tsx`, inside the AppShell children array, add the following routes. **Important:** the `/tasks/task-boards` route must appear BEFORE `/tasks/:taskId` to avoid `task-boards` being matched as a taskId. Add them after the `/projects/:id` route block:

```typescript
          {
            path: '/tasks',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TasksPage')
              return { Component }
            },
          },
          {
            path: '/tasks/task-boards',
            element: <Navigate to="/tasks" replace />,  // placeholder until Spec 2
          },
          {
            path: '/tasks/:taskId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/TasksPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
          {
            path: '/projects/:id/tasks/task-boards',
            element: <Navigate to="/tasks" replace />,  // placeholder until Spec 2
          },
          {
            path: '/projects/:id/tasks/:taskId',
            lazy: async () => {
              const { default: Component } = await import('@/pages/app/ProjectPage')
              return { Component }
            },
          },
```

Make sure `Navigate` is already imported at the top — it is (it's used for the `/meetings` redirect). No new import needed.

- [ ] **Step 2: Update ProjectPage.tsx — add Tasks tab**

In `src/pages/app/ProjectPage.tsx`:

**2a. Add imports** at the top:
```typescript
import { useLocation } from 'react-router-dom'
import { CheckSquare } from 'lucide-react'
import ProjectTasksTab from '@/features/tasks/components/ProjectTasksTab'
```

**2b. Update the `Tab` type** (line ~213):
```typescript
type Tab = 'overview' | 'proposals' | 'contracts' | 'invoices' | 'time' | 'files' | 'notes' | 'tasks'
```

**2c. Update the `TABS` array** — add a tasks entry at the end:
```typescript
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview',   label: 'Overview' },
  { value: 'proposals',  label: 'Proposals' },
  { value: 'contracts',  label: 'Contracts' },
  { value: 'invoices',   label: 'Invoices' },
  { value: 'time',       label: 'Time & Expenses' },
  { value: 'files',      label: 'Files' },
  { value: 'notes',      label: 'Notes & Brief' },
  { value: 'tasks',      label: 'Tasks' },
]
```

**2d. Inside `ProjectPage` function body**, after the existing `useNavigate` call, add:
```typescript
  const location    = useLocation()
  const isTasksRoute = location.pathname.includes('/tasks')
  const activeTab: Tab = isTasksRoute ? 'tasks' : tab
```

**2e. Update the tabs render** — replace `tab === t.value` with `activeTab === t.value`, and make the Tasks tab navigate instead of using `setTab`:
```typescript
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => {
              if (t.value === 'tasks') {
                navigate(`/projects/${id}/tasks`)
              } else {
                setTab(t.value as Exclude<Tab, 'tasks'>)
              }
            }}
            className={cn(
              'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === t.value ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
```

**2f. Add tasks tab content** inside `<div>` (tab content area), after `{tab === 'notes' && ...}`:
```typescript
        {isTasksRoute && (
          <ProjectTasksTab projectId={id!} />
        )}
```

- [ ] **Step 3: Update Sidebar.tsx — add Tasks nav entry**

In `src/components/layout/Sidebar.tsx`:

**3a. Add `CheckSquare` to lucide-react import:**
```typescript
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, CalendarDays, ClipboardList, Zap, BarChart3, FolderKanban, Mail,
  LogOut, CheckSquare,
} from 'lucide-react'
```

**3b. Add Tasks to `ALL_NAV_ITEMS`** after the `projects` entry:
```typescript
  { id: 'tasks',       icon: CheckSquare,     label: 'Tasks',        href: '/tasks',       tourId: undefined },
```

**3c. Add `'tasks'` to the first `SECTIONS` group** (the one with `label: null`):
```typescript
  { label: null,           ids: ['dashboard', 'leads', 'clients', 'projects', 'tasks'] },
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/router/index.tsx src/pages/app/ProjectPage.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: wire tasks routes, ProjectPage Tasks tab, and sidebar nav"
```

---

## Verification

After all tasks are complete, test manually:

1. **Sidebar** — "Tasks" link visible in sidebar, navigates to `/tasks`
2. **Global list** — `/tasks` shows empty state with "New task" button
3. **Create task** — Click "New task", slide-in opens, fill title, click "Create task" — task appears in list
4. **Open task** — Click a task row, URL becomes `/tasks/:taskId`, slide-in shows task details
5. **Complete task** — Click circle checkbox, task gets strikethrough, filter "To Do" hides it
6. **Filter** — "To Do" and "Completed" tabs filter correctly
7. **Project link** — Edit task in slide-in, set a project, save — task now shows project chip in row
8. **Project tab** — Open any project, click "Tasks" tab, URL becomes `/projects/:id/tasks`
9. **Project task list** — Shows only tasks for that project, no "Project" column
10. **Create from project** — "New task" in project context pre-fills project in slide-in
11. **Slide-in URL persistence** — Open a task, copy URL, paste in new tab — slide-in reopens
12. **Escape key** — Pressing Escape closes the slide-in
13. **Delete** — Delete icon in slide-in header → confirm dialog → task removed, slide-in closes
14. **Private toggle** — Toggle saves and persists
15. **Zero TS errors** — `npx tsc --noEmit` clean in both repos
