# Expense Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the expense model with GST, TDS, vendor, and custom categories; add Indian FY date-range filtering and one-click CSV export scoped to the current filter state.

**Architecture:** Two-repo change — pakka-api gets a Prisma migration, two new service methods, and two new controller endpoints; pakka-app gets updated hooks, an enhanced expense form, and an upgraded filter bar. Each task is independently committable and leaves the app in a working state.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, React 18, TanStack Query v5, Zod, React Hook Form, Tailwind v4

---

## File map

| Repo | File | Change |
|------|------|--------|
| pakka-api | `prisma/schema.prisma` | Add 5 fields to `Expense`, add `UserExpenseCategory` model, add relation to `User` |
| pakka-api | `src/modules/expenses/dto/create-expense.dto.ts` | Add `vendor`, `gstRate`, `gstAmount`, `tdsSection`, `tdsRate` |
| pakka-api | `src/modules/expenses/expenses.service.ts` | Add `DEFAULT_EXPENSE_CATEGORIES`, `getCategories()`, `exportCsv()`, auto-save category in `create()` |
| pakka-api | `src/modules/expenses/expenses.controller.ts` | Add `GET /categories` and `GET /export` (must be before `:id` routes) |
| pakka-app | `src/features/expenses/hooks/useExpenses.ts` | Update `Expense`, `CreateExpensePayload`, `UpdateExpensePayload` types; add `useExpenseCategories`, `useExportExpenses` |
| pakka-app | `src/pages/app/ExpensesPage.tsx` | New form fields, category combobox, date-range filter, Export CSV button, GST totals row |

---

## Task 1: Prisma migration — new expense fields + UserExpenseCategory

**Files:**
- Modify: `pakka-api/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to the `Expense` model**

Open `pakka-api/prisma/schema.prisma`. Find the `Expense` model and add the five new optional fields after `receiptUrl`:

```prisma
model Expense {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id])
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  category    String
  description String
  amount      Decimal  @db.Decimal(12, 2)
  date        DateTime
  receiptUrl  String?
  isBillable  Boolean  @default(true)
  isBilled    Boolean  @default(false)
  invoiceId   String?
  vendor      String?
  gstRate     Decimal? @db.Decimal(5, 2)
  gstAmount   Decimal? @db.Decimal(12, 2)
  tdsSection  String?
  tdsRate     Decimal? @db.Decimal(5, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("expenses")
}
```

- [ ] **Step 2: Add the `UserExpenseCategory` model**

Add this new model anywhere after the `Expense` model:

```prisma
model UserExpenseCategory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String

  @@unique([userId, name])
  @@map("user_expense_categories")
}
```

- [ ] **Step 3: Add the back-relation on the `User` model**

Find the `User` model in `schema.prisma`. It already has lines like `expenses Expense[]`. Add this line alongside the other relation fields:

```prisma
expenseCategories UserExpenseCategory[]
```

- [ ] **Step 4: Run the migration**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx prisma migrate dev --name expense_enhancements
```

Expected output:
```
The following migration(s) have been applied:
  migrations/YYYYMMDDHHMMSS_expense_enhancements/migration.sql
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 6: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add prisma/
git commit -m "feat: add vendor, GST, TDS fields to Expense + UserExpenseCategory model"
```

---

## Task 2: DTO — add new fields to CreateExpenseDto

**Files:**
- Modify: `pakka-api/src/modules/expenses/dto/create-expense.dto.ts`

`UpdateExpenseDto` uses `PartialType(CreateExpenseDto)` so it automatically inherits all new fields — no change needed there.

- [ ] **Step 1: Update `create-expense.dto.ts`**

Replace the entire file content:

```ts
import { IsString, IsOptional, IsNumber, IsDateString, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiPropertyOptional() @IsString()    @IsOptional() clientId?:    string;
  @ApiPropertyOptional() @IsString()    @IsOptional() projectId?:   string;
  @ApiProperty()         @IsString()               category:      string;
  @ApiProperty()         @IsString()               description:   string;
  @ApiProperty()         @IsNumber() @Min(0)        amount:        number;
  @ApiProperty()         @IsDateString()            date:          string;
  @ApiPropertyOptional() @IsString()    @IsOptional() receiptUrl?:  string;
  @ApiPropertyOptional() @IsBoolean()  @IsOptional() isBillable?:  boolean;
  @ApiPropertyOptional() @IsString()    @IsOptional() vendor?:      string;
  @ApiPropertyOptional() @IsNumber()    @IsOptional() gstRate?:     number;
  @ApiPropertyOptional() @IsNumber()    @IsOptional() gstAmount?:   number;
  @ApiPropertyOptional() @IsString()    @IsOptional() tdsSection?:  string;
  @ApiPropertyOptional() @IsNumber()    @IsOptional() tdsRate?:     number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/dto/create-expense.dto.ts
git commit -m "feat: add vendor, GST, TDS fields to CreateExpenseDto"
```

---

## Task 3: Service — DEFAULT_EXPENSE_CATEGORIES, getCategories, exportCsv, auto-save

**Files:**
- Modify: `pakka-api/src/modules/expenses/expenses.service.ts`

- [ ] **Step 1: Add the DEFAULT_EXPENSE_CATEGORIES constant and update imports**

At the top of `expenses.service.ts`, add the constant and update the import line (add `Response` from express is NOT needed here — that's the controller's concern):

```ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
import { GstType } from '@prisma/client';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { BillExpensesDto } from './dto/bill-expenses.dto';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Food & Entertainment',
  'Materials & Supplies',
  'Equipment',
  'Software & Subscriptions',
  'Contractor / Freelancer Fee',
  'Studio / Venue Hire',
  'Marketing & Ads',
  'Printing & Production',
  'Courier & Shipping',
  'Professional Services',
  'Training & Learning',
  'Office & Admin',
  'Other',
] as const;
```

- [ ] **Step 2: Update the `create()` method to persist new fields and auto-save custom categories**

Replace the existing `create()` method body:

```ts
async create(userId: string, dto: CreateExpenseDto) {
  const expense = await this.prisma.expense.create({
    data: {
      userId,
      clientId:    dto.clientId,
      projectId:   dto.projectId,
      category:    dto.category,
      description: dto.description,
      amount:      dto.amount,
      date:        new Date(dto.date),
      receiptUrl:  dto.receiptUrl,
      isBillable:  dto.isBillable ?? true,
      vendor:      dto.vendor,
      gstRate:     dto.gstRate,
      gstAmount:   dto.gstAmount,
      tdsSection:  dto.tdsSection,
      tdsRate:     dto.tdsRate,
    },
    include: this.projectInclude,
  });

  if (!DEFAULT_EXPENSE_CATEGORIES.includes(dto.category as any)) {
    await this.prisma.userExpenseCategory.upsert({
      where:  { userId_name: { userId, name: dto.category } },
      update: {},
      create: { userId, name: dto.category },
    });
  }

  return expense;
}
```

- [ ] **Step 3: Update the `update()` method to persist new fields**

Replace the existing `update()` method body:

```ts
async update(userId: string, id: string, dto: UpdateExpenseDto) {
  await this.findOwned(userId, id);
  return this.prisma.expense.update({
    where: { id },
    data: {
      ...(dto.clientId    != null && { clientId:    dto.clientId }),
      ...(dto.projectId   != null && { projectId:   dto.projectId }),
      ...(dto.category    != null && { category:    dto.category }),
      ...(dto.description != null && { description: dto.description }),
      ...(dto.amount      != null && { amount:      dto.amount }),
      ...(dto.date        != null && { date:        new Date(dto.date) }),
      ...(dto.receiptUrl  != null && { receiptUrl:  dto.receiptUrl }),
      ...(dto.isBillable  != null && { isBillable:  dto.isBillable }),
      ...(dto.isBilled    != null && { isBilled:    dto.isBilled }),
      ...(dto.invoiceId   != null && { invoiceId:   dto.invoiceId }),
      ...(dto.vendor      != null && { vendor:      dto.vendor }),
      ...(dto.gstRate     != null && { gstRate:     dto.gstRate }),
      ...(dto.gstAmount   != null && { gstAmount:   dto.gstAmount }),
      ...(dto.tdsSection  != null && { tdsSection:  dto.tdsSection }),
      ...(dto.tdsRate     != null && { tdsRate:     dto.tdsRate }),
    },
    include: this.projectInclude,
  });
}
```

- [ ] **Step 4: Add the `getCategories()` method**

Add after the existing `findAll()` method:

```ts
async getCategories(userId: string): Promise<string[]> {
  const custom = await this.prisma.userExpenseCategory.findMany({
    where:   { userId },
    orderBy: { name: 'asc' },
  });
  const customNames = custom.map(c => c.name);
  return [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...customNames.filter(n => !(DEFAULT_EXPENSE_CATEGORIES as readonly string[]).includes(n)),
  ];
}
```

- [ ] **Step 5: Add the `exportCsv()` method**

Add after `getCategories()`:

```ts
async exportCsv(userId: string, query: QueryExpensesDto): Promise<string> {
  const expenses = await this.findAll(userId, query);

  const header = [
    'Date', 'Category', 'Vendor', 'Description', 'Amount',
    'GST Rate%', 'GST Amount', 'Net (excl. GST)',
    'TDS Section', 'TDS Rate%', 'Client', 'Project', 'Billable', 'Billed', 'Receipt URL',
  ].join(',');

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = expenses.map(e => {
    const d = new Date(e.date);
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const amount    = Number(e.amount).toFixed(2);
    const gstRate   = e.gstRate   != null ? Number(e.gstRate).toFixed(2)   : '';
    const gstAmount = e.gstAmount != null ? Number(e.gstAmount).toFixed(2) : '';
    const net       = e.gstAmount != null
      ? (Number(e.amount) - Number(e.gstAmount)).toFixed(2)
      : Number(e.amount).toFixed(2);
    const tdsSection = e.tdsSection ?? '';
    const tdsRate    = e.tdsRate != null ? Number(e.tdsRate).toFixed(2) : '';
    const client     = (e as any).client?.name ?? '';
    const project    = (e as any).project?.name ?? '';

    return [
      date, e.category, e.vendor ?? '', e.description, amount,
      gstRate, gstAmount, net,
      tdsSection, tdsRate, client, project,
      e.isBillable ? 'Yes' : 'No',
      e.isBilled   ? 'Yes' : 'No',
      e.receiptUrl ?? '',
    ].map(v => escape(String(v))).join(',');
  });

  return [header, ...rows].join('\n');
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/modules/expenses/expenses.service.ts
git commit -m "feat: add getCategories, exportCsv, auto-save custom categories in expense service"
```

---

## Task 4: Controller — GET /expenses/categories and GET /expenses/export

**Files:**
- Modify: `pakka-api/src/modules/expenses/expenses.controller.ts`

Both new routes must be declared **before** any `:id` param routes. Currently `:id` is only used in `@Patch(':id')` and `@Delete(':id')`, so there's no conflict — but keep `@Get('categories')` and `@Get('export')` at the top of the GET methods as a safeguard.

- [ ] **Step 1: Replace the entire controller file**

```ts
import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { User } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { BillExpensesDto } from './dto/bill-expenses.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly svc: ExpensesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get available expense categories' })
  async getCategories(@CurrentUser() user: User) {
    const categories = await this.svc.getCategories(user.id);
    return { data: categories };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export expenses as CSV' })
  async exportCsv(
    @CurrentUser() user: User,
    @Query() query: QueryExpensesDto,
    @Res() res: Response,
  ) {
    const csv = await this.svc.exportCsv(user.id, query);
    const label = query.from && query.to
      ? `${query.from}_to_${query.to}`
      : 'all';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${label}.csv"`);
    res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: 'List expenses' })
  findAll(@CurrentUser() user: User, @Query() query: QueryExpensesDto) {
    return this.svc.findAll(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Log an expense' })
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.svc.create(user.id, dto);
  }

  @Post('bill')
  @ApiOperation({ summary: 'Convert unbilled expenses to an invoice' })
  billExpenses(@CurrentUser() user: User, @Body() dto: BillExpensesDto) {
    return this.svc.billExpenses(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an expense' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.svc.remove(user.id, id);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Smoke-test manually (optional but recommended)**

Start the API locally and verify:

```bash
# Categories endpoint
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:3000/api/v1/expenses/categories

# Expected: { "data": ["Travel", "Accommodation", ...15 items] }

# Export endpoint
curl -H "Authorization: Bearer <your-token>" \
  "http://localhost:3000/api/v1/expenses/export" \
  --output expenses-test.csv
# Expected: CSV file downloaded
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/expenses/expenses.controller.ts
git commit -m "feat: add GET /expenses/categories and GET /expenses/export endpoints"
```

---

## Task 5: Frontend hooks — update types + add useExpenseCategories + useExportExpenses

**Files:**
- Modify: `pakka-app/src/features/expenses/hooks/useExpenses.ts`

- [ ] **Step 1: Replace the entire `useExpenses.ts` file**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface ExpenseClient  { id: string; name: string }
export interface ExpenseProject { id: string; name: string }

export interface Expense {
  id:          string
  userId:      string
  clientId:    string | null
  client:      ExpenseClient | null
  projectId:   string | null
  project:     ExpenseProject | null
  category:    string
  description: string
  amount:      string
  date:        string
  receiptUrl:  string | null
  isBillable:  boolean
  isBilled:    boolean
  invoiceId:   string | null
  vendor:      string | null
  gstRate:     string | null
  gstAmount:   string | null
  tdsSection:  string | null
  tdsRate:     string | null
  createdAt:   string
  updatedAt:   string
}

export interface CreateExpensePayload {
  clientId?:    string
  projectId?:   string
  category:     string
  description:  string
  amount:       number
  date:         string
  receiptUrl?:  string
  isBillable?:  boolean
  vendor?:      string
  gstRate?:     number
  gstAmount?:   number
  tdsSection?:  string
  tdsRate?:     number
}

export interface UpdateExpensePayload {
  clientId?:    string
  projectId?:   string
  category?:    string
  description?: string
  amount?:      number
  date?:        string
  receiptUrl?:  string
  isBillable?:  boolean
  isBilled?:    boolean
  invoiceId?:   string
  vendor?:      string
  gstRate?:     number
  gstAmount?:   number
  tdsSection?:  string
  tdsRate?:     number
}

export interface ExpensesQuery {
  clientId?:   string
  projectId?:  string
  from?:       string
  to?:         string
  isBillable?: boolean
  isBilled?:   boolean
}

const KEY = 'expenses'

async function fetchExpenses(params: ExpensesQuery): Promise<Expense[]> {
  const { data } = await api.get<{ data: Expense[] }>('/expenses', { params })
  return data.data
}

export function useExpenses(params: ExpensesQuery = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn:  () => fetchExpenses(params),
    staleTime: 30_000,
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: [KEY, 'categories'],
    queryFn:  async (): Promise<string[]> => {
      const { data } = await api.get<{ data: string[] }>('/expenses/categories')
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useExportExpenses() {
  const [isPending, setIsPending] = useState(false)

  const trigger = async (filters: ExpensesQuery) => {
    setIsPending(true)
    try {
      const response = await api.get('/expenses/export', {
        params:       filters,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const label = filters.from && filters.to
        ? `${filters.from}_to_${filters.to}`
        : 'all'
      a.href     = url
      a.download = `expenses-${label}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export expenses')
    } finally {
      setIsPending(false)
    }
  }

  return { trigger, isPending }
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload): Promise<Expense> => {
      const { data } = await api.post<{ data: Expense }>('/expenses', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Expense logged')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to log expense'),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateExpensePayload & { id: string }): Promise<Expense> => {
      const { data } = await api.patch<{ data: Expense }>(`/expenses/${id}`, payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Expense updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update expense'),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Expense deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete expense'),
  })
}

export function useBillExpenses() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (expenseIds: string[]) => {
      const { data } = await api.post<{ data: { id: string } }>('/expenses/bill', { expenseIds })
      return data.data
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created from expenses')
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}

export function useUploadReceipt() {
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('Not authenticated')
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `receipts/${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (or only pre-existing errors unrelated to this file).

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/expenses/hooks/useExpenses.ts
git commit -m "feat: add vendor/GST/TDS types, useExpenseCategories, useExportExpenses hooks"
```

---

## Task 6: ExpensesPage — updated form with vendor, GST, TDS, category combobox

**Files:**
- Modify: `pakka-app/src/pages/app/ExpensesPage.tsx`

This task updates the expense form. The filter bar and export are in Task 7.

- [ ] **Step 1: Update the Zod schema and form types**

Find the schema and type definition near the top of `ExpensesPage.tsx` and replace:

```ts
const expenseSchema = z.object({
  clientId:    z.string().optional(),
  projectId:   z.string().optional(),
  category:    z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount:      z.number({ message: 'Required' }).min(0),
  date:        z.string().min(1, 'Date required'),
  isBillable:  z.boolean(),
  receiptUrl:  z.string().optional(),
  vendor:      z.string().optional(),
  hasGst:      z.boolean(),
  gstRate:     z.number().optional(),
  gstAmount:   z.number().optional(),
  tdsSection:  z.string().optional(),
  tdsRate:     z.number().optional(),
})
type ExpenseForm = z.infer<typeof expenseSchema>
```

- [ ] **Step 2: Import `useExpenseCategories` and `useExportExpenses`**

Find the import line for hooks and add the two new hooks:

```ts
import {
  useExpenses, useCreateExpense, useUpdateExpense,
  useDeleteExpense, useBillExpenses, useUploadReceipt,
  useExpenseCategories, useExportExpenses,
  type Expense, type CreateExpensePayload,
} from '@/features/expenses/hooks/useExpenses'
```

- [ ] **Step 3: Add `useExpenseCategories` call inside the component**

After the existing `useClients` / `useProjects` calls, add:

```ts
const { data: categoryList = [] } = useExpenseCategories()
```

- [ ] **Step 4: Update `openNewForm` to reset new fields**

Replace the `openNewForm` function:

```ts
function openNewForm() {
  setEditExpense(null)
  setLocalReceiptUrl(undefined)
  reset({
    category:   'Travel',
    date:       new Date().toISOString().slice(0, 10),
    isBillable: true,
    hasGst:     false,
    amount:     undefined as any,
    projectId:  preselectedProjectId || undefined,
  })
  setShowForm(true)
}
```

- [ ] **Step 5: Update `openEditForm` to populate new fields**

Replace the `openEditForm` function:

```ts
function openEditForm(expense: Expense) {
  setEditExpense(expense)
  setLocalReceiptUrl(expense.receiptUrl ?? undefined)
  const hasGst = expense.gstRate != null
  reset({
    clientId:    expense.clientId ?? undefined,
    projectId:   expense.projectId ?? undefined,
    category:    expense.category,
    description: expense.description,
    amount:      Number(expense.amount),
    date:        expense.date.slice(0, 10),
    isBillable:  expense.isBillable,
    receiptUrl:  expense.receiptUrl ?? undefined,
    vendor:      expense.vendor ?? undefined,
    hasGst,
    gstRate:     hasGst ? Number(expense.gstRate) : undefined,
    gstAmount:   hasGst ? Number(expense.gstAmount) : undefined,
    tdsSection:  expense.tdsSection ?? undefined,
    tdsRate:     expense.tdsRate != null ? Number(expense.tdsRate) : undefined,
  })
  setShowForm(true)
}
```

- [ ] **Step 6: Add GST auto-compute effect**

Add this `useEffect` after the existing receipt-related `useEffect`:

```ts
const watchedAmount  = watch('amount')
const watchedHasGst  = watch('hasGst')
const watchedGstRate = watch('gstRate')

useEffect(() => {
  if (watchedHasGst && watchedGstRate && watchedAmount) {
    const computed = parseFloat((watchedAmount * watchedGstRate / 100).toFixed(2))
    setValue('gstAmount', computed)
  } else {
    setValue('gstAmount', undefined)
  }
}, [watchedAmount, watchedHasGst, watchedGstRate, setValue])
```

- [ ] **Step 7: Update `onSubmit` to include new fields**

Replace the `onSubmit` function:

```ts
async function onSubmit(data: ExpenseForm) {
  const payload: CreateExpensePayload = {
    clientId:    data.clientId || undefined,
    projectId:   data.projectId || undefined,
    category:    data.category,
    description: data.description,
    amount:      data.amount,
    date:        data.date,
    receiptUrl:  data.receiptUrl || undefined,
    isBillable:  data.isBillable,
    vendor:      data.vendor || undefined,
    gstRate:     data.hasGst ? data.gstRate : undefined,
    gstAmount:   data.hasGst ? data.gstAmount : undefined,
    tdsSection:  data.tdsSection || undefined,
    tdsRate:     data.tdsRate || undefined,
  }
  if (editExpense) {
    await updateExpense.mutateAsync({ id: editExpense.id, ...payload })
  } else {
    await createExpense.mutateAsync(payload)
  }
  setShowForm(false)
  setEditExpense(null)
  setLocalReceiptUrl(undefined)
  reset()
}
```

- [ ] **Step 8: Replace the form JSX with the updated layout**

Find the `<form>` block inside `{showForm && (...)}`. Replace the inner `<form>` content with:

```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
  {/* Row 1: Category + Client */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="form-label">Category *</label>
      <input
        {...register('category')}
        list="expense-category-list"
        className="form-input w-full"
        placeholder="e.g. Travel"
      />
      <datalist id="expense-category-list">
        {categoryList.map(c => <option key={c} value={c} />)}
      </datalist>
      {errors.category && <p className="form-error">{errors.category.message}</p>}
    </div>
    <div>
      <label className="form-label">Client</label>
      <select {...register('clientId')} className="form-input w-full">
        <option value="">No client</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  </div>

  {/* Row 2: Vendor + Project */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="form-label">Vendor <span className="font-normal text-[#98A2B3]">(optional)</span></label>
      <input
        {...register('vendor')}
        list="expense-vendor-list"
        className="form-input w-full"
        placeholder="e.g. AWS, Figma, Ravi Kumar"
      />
      <datalist id="expense-vendor-list">
        {[...new Set(expenses.map(e => e.vendor).filter(Boolean))].map(v => (
          <option key={v!} value={v!} />
        ))}
      </datalist>
    </div>
    <div>
      <label className="form-label">Project <span className="font-normal text-[#98A2B3]">(optional)</span></label>
      <select {...register('projectId')} className="form-input w-full">
        <option value="">No project</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` · ${p.client.name}` : ''}</option>)}
      </select>
    </div>
  </div>

  {/* Row 3: Description */}
  <div>
    <label className="form-label">Description *</label>
    <input {...register('description')} className="form-input w-full" placeholder="e.g. Cab to client site" />
    {errors.description && <p className="form-error">{errors.description.message}</p>}
  </div>

  {/* Row 4: Amount + Date */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="form-label">Amount (₹) *</label>
      <input {...register('amount', { valueAsNumber: true })} type="number" min="0" step="0.01" className="form-input w-full" />
      {errors.amount && <p className="form-error">{errors.amount.message}</p>}
    </div>
    <div>
      <label className="form-label">Date *</label>
      <input {...register('date')} type="date" className="form-input w-full" />
      {errors.date && <p className="form-error">{errors.date.message}</p>}
    </div>
  </div>

  {/* Row 5: GST checkbox */}
  <div className="flex items-center gap-2">
    <input
      {...register('hasGst')}
      id="hasGst"
      type="checkbox"
      className="w-4 h-4 accent-[#6366F1]"
    />
    <label htmlFor="hasGst" className="form-label mb-0 cursor-pointer">This expense includes GST</label>
  </div>

  {/* Row 6: GST Rate + GST Amount (conditional) */}
  {watchedHasGst && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="form-label">GST Rate *</label>
        <select {...register('gstRate', { valueAsNumber: true })} className="form-input w-full">
          <option value="">Select rate</option>
          <option value={5}>5%</option>
          <option value={12}>12%</option>
          <option value={18}>18%</option>
          <option value={28}>28%</option>
        </select>
      </div>
      <div>
        <label className="form-label">GST Amount (auto-computed)</label>
        <input
          type="number"
          value={watch('gstAmount') ?? ''}
          readOnly
          className="form-input w-full bg-[#F4F5F8] dark:bg-[#21222D] cursor-not-allowed text-[#667085]"
          placeholder="0.00"
        />
      </div>
    </div>
  )}

  {/* Row 7: TDS Section + TDS Rate */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div>
      <label className="form-label">TDS Section <span className="font-normal text-[#98A2B3]">(optional)</span></label>
      <input
        {...register('tdsSection')}
        className="form-input w-full"
        placeholder="194J"
      />
    </div>
    <div>
      <label className="form-label">TDS Rate % <span className="font-normal text-[#98A2B3]">(optional)</span></label>
      <input
        {...register('tdsRate', { valueAsNumber: true })}
        type="number"
        min="0"
        step="0.01"
        className="form-input w-full"
        placeholder="10"
      />
    </div>
  </div>
  <p className="text-[11px] text-[#98A2B3] -mt-1">Only for contractor payments where you deduct TDS</p>

  {/* Receipt upload — unchanged from original */}
  <div>
    <label className="form-label">Receipt <span className="font-normal text-[#98A2B3]">(optional)</span></label>
    {watchedReceiptUrl ? (
      <div className="flex items-center gap-2 p-2 border border-[#EAECF0] dark:border-[#3D4258] rounded-lg">
        {watchedReceiptUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
          <img src={watchedReceiptUrl} alt="receipt" className="w-10 h-10 rounded object-cover" />
        ) : (
          <div className="w-10 h-10 rounded bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center">
            <Receipt size={14} className="text-[#667085]" />
          </div>
        )}
        <span className="text-[12px] text-[#667085] flex-1 truncate">Receipt attached</span>
        <a href={watchedReceiptUrl} target="_blank" rel="noreferrer" className="text-[#2563EB]">
          <ExternalLink size={12} />
        </a>
        <button
          type="button"
          onClick={() => { setValue('receiptUrl', undefined); setLocalReceiptUrl(undefined) }}
          className="text-[#98A2B3] hover:text-[#F04438] transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    ) : (
      <label className={cn(
        'flex items-center gap-2 p-3 border-2 border-dashed border-[#D0D5DD] dark:border-[#3D4258] rounded-lg cursor-pointer',
        'hover:border-[#2563EB] hover:bg-[#F8FBFF] dark:hover:bg-[#1E2D4F] transition-colors',
      )}>
        {uploadingReceipt ? (
          <Loader2 size={14} className="animate-spin text-[#667085]" />
        ) : (
          <Image size={14} className="text-[#98A2B3]" />
        )}
        <span className="text-[12px] text-[#667085]">
          {uploadingReceipt ? 'Uploading…' : 'Upload receipt (image or PDF)'}
        </span>
        <input
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleReceiptUpload(file)
          }}
        />
      </label>
    )}
  </div>

  {/* Bill to client */}
  <div className="flex items-center gap-2">
    <input {...register('isBillable')} id="isBillable" type="checkbox" className="w-4 h-4 accent-[#2563EB]" />
    <label htmlFor="isBillable" className="form-label mb-0 cursor-pointer">Bill to client</label>
  </div>

  <div className="flex items-center gap-2 pt-1">
    <button
      type="submit"
      disabled={createExpense.isPending || updateExpense.isPending || uploadingReceipt}
      className="btn-primary text-[13px]"
    >
      {(createExpense.isPending || updateExpense.isPending) ? (
        <><Loader2 size={12} className="animate-spin" /> Saving…</>
      ) : editExpense ? 'Save changes' : 'Log expense'}
    </button>
    <button
      type="button"
      onClick={() => { setShowForm(false); setEditExpense(null); setLocalReceiptUrl(undefined); reset() }}
      className="btn-secondary text-[13px]"
    >
      Cancel
    </button>
  </div>
</form>
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 10: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/pages/app/ExpensesPage.tsx
git commit -m "feat: add vendor, GST, TDS fields and category combobox to expense form"
```

---

## Task 7: ExpensesPage — date-range filter, Export CSV, GST totals

**Files:**
- Modify: `pakka-app/src/pages/app/ExpensesPage.tsx`

- [ ] **Step 1: Add date-range state and FY helper functions**

At the top of the `ExpensesPage` component, after existing state declarations, add:

```ts
type DatePreset = 'all' | 'this-month' | 'last-month' | 'this-quarter' | 'this-fy' | 'last-fy' | 'custom'
const [datePreset, setDatePreset] = useState<DatePreset>('all')
const [customFrom, setCustomFrom] = useState('')
const [customTo,   setCustomTo]   = useState('')
```

Add these helper functions **outside** the component (above the `export default` line):

```ts
function currentFYStart(): Date {
  const now  = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 3, 1) // April 1
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getIndianQuarterBounds(): { from: Date; to: Date } {
  const now   = new Date()
  const month = now.getMonth() // 0-indexed
  // Indian quarters: Apr-Jun (3-5), Jul-Sep (6-8), Oct-Dec (9-11), Jan-Mar (0-2)
  let qStart: number
  if      (month >= 3 && month <= 5)  qStart = 3
  else if (month >= 6 && month <= 8)  qStart = 6
  else if (month >= 9 && month <= 11) qStart = 9
  else                                 qStart = 0 // Jan-Mar

  const year = qStart === 0 ? now.getFullYear() : now.getFullYear()
  const from = new Date(year, qStart, 1)
  const to   = new Date(year, qStart + 3, 0) // last day of quarter
  return { from, to }
}

function presetToDates(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date()
  switch (preset) {
    case 'all': return {}
    case 'this-month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toISO(from), to: toISO(now) }
    }
    case 'last-month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to   = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toISO(from), to: toISO(to) }
    }
    case 'this-quarter': {
      const { from, to } = getIndianQuarterBounds()
      return { from: toISO(from), to: toISO(to) }
    }
    case 'this-fy': {
      const fyStart = currentFYStart()
      const fyEnd   = new Date(fyStart.getFullYear() + 1, 2, 31) // March 31
      return { from: toISO(fyStart), to: toISO(fyEnd) }
    }
    case 'last-fy': {
      const fyStart = currentFYStart()
      const lastFyStart = new Date(fyStart.getFullYear() - 1, 3, 1)
      const lastFyEnd   = new Date(fyStart.getFullYear(), 2, 31)
      return { from: toISO(lastFyStart), to: toISO(lastFyEnd) }
    }
    default: return {}
  }
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  'all':          'All time',
  'this-month':   'This month',
  'last-month':   'Last month',
  'this-quarter': 'This quarter',
  'this-fy':      'This FY',
  'last-fy':      'Last FY',
  'custom':       'Custom',
}
```

- [ ] **Step 2: Derive `dateFilters` from state**

Inside the component, after the datePreset state declarations, add:

```ts
const dateFilters: { from?: string; to?: string } = datePreset === 'custom'
  ? { from: customFrom || undefined, to: customTo || undefined }
  : presetToDates(datePreset)
```

- [ ] **Step 3: Update `useExpenses` call to include date filters**

Find the `useExpenses` call and replace:

```ts
const { data: expenses = [], isLoading } = useExpenses({
  clientId:   clientFilter || undefined,
  isBillable: filter === 'unbilled' ? true : undefined,
  isBilled:   filter === 'unbilled' ? false : filter === 'billed' ? true : undefined,
  from:       dateFilters.from,
  to:         dateFilters.to,
})
```

- [ ] **Step 4: Add `useExportExpenses` hook call inside the component**

After the existing hook calls:

```ts
const { trigger: exportCsv, isPending: exporting } = useExportExpenses()
```

- [ ] **Step 5: Add GST totals computation**

After the existing totals (`totalAmount`, `unbilledAmount`):

```ts
const gstPaid = expenses.reduce((s, e) => s + (e.gstAmount != null ? Number(e.gstAmount) : 0), 0)
```

- [ ] **Step 6: Replace the filter bar JSX**

Find the `{/* ── Filters ── */}` section and replace it entirely:

```tsx
{/* ── Filters ── */}
<div className="space-y-2">
  <div className="flex flex-wrap items-center gap-2">
    {/* Billed status tabs */}
    <div className="flex items-center gap-2">
      {(['all', 'unbilled', 'billed'] as FilterTab[]).map(tab => (
        <button
          key={tab}
          onClick={() => setFilter(tab)}
          className={cn(
            'px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all',
            filter === tab
              ? 'bg-[#0D1117] dark:bg-[#6366F1] text-white'
              : 'bg-[#F3F4F6] dark:bg-[#21222D] text-[#6B7280] dark:text-[#8B92A8] hover:bg-[#E5E7EB] dark:hover:bg-[#26283A]',
          )}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>

    {/* Client filter */}
    <DropdownSelect
      value={clientFilter}
      onChange={setClientFilter}
      placeholder="All clients"
      options={[{ value: '', label: 'All clients' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
      className="w-full sm:w-auto"
    />

    {/* Date range */}
    <select
      value={datePreset}
      onChange={e => setDatePreset(e.target.value as DatePreset)}
      className="form-input text-[12px] py-1.5 w-full sm:w-auto"
    >
      {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map(p => (
        <option key={p} value={p}>{DATE_PRESET_LABELS[p]}</option>
      ))}
    </select>

    {/* Export CSV */}
    <button
      onClick={() => exportCsv({
        clientId:   clientFilter || undefined,
        isBillable: filter === 'unbilled' ? true : undefined,
        isBilled:   filter === 'unbilled' ? false : filter === 'billed' ? true : undefined,
        ...dateFilters,
      })}
      disabled={expenses.length === 0 || exporting}
      className={cn(
        'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors',
        'border-[#D0D5DD] dark:border-[#3D4258] text-[#344054] dark:text-[#C2C8D8]',
        'hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] disabled:opacity-40 disabled:cursor-not-allowed',
      )}
    >
      {exporting
        ? <Loader2 size={12} className="animate-spin" />
        : <Download size={12} />}
      Export CSV
    </button>
  </div>

  {/* Custom date inputs */}
  {datePreset === 'custom' && (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={customFrom}
        onChange={e => setCustomFrom(e.target.value)}
        className="form-input text-[12px] py-1.5"
      />
      <span className="text-[12px] text-[#98A2B3]">to</span>
      <input
        type="date"
        value={customTo}
        onChange={e => setCustomTo(e.target.value)}
        className="form-input text-[12px] py-1.5"
      />
    </div>
  )}
</div>
```

- [ ] **Step 7: Add `Download` to the lucide-react import**

Find the existing lucide import line and add `Download`:

```ts
import {
  Wallet, Plus, Trash2, Edit2, CheckSquare, Square as SquareIcon,
  IndianRupee, ChevronRight, Loader2, Receipt, Image, ExternalLink,
  FolderKanban, Download,
} from 'lucide-react'
```

- [ ] **Step 8: Update the totals row**

Find the current totals display in the header section (the `<p>` with `totalAmount > 0`) and replace it with:

```tsx
<p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
  {preselectedProjectId && projects.find(p => p.id === preselectedProjectId) ? (
    <>Logging for <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{projects.find(p => p.id === preselectedProjectId)?.name}</span></>
  ) : (totalAmount > 0 || unbilledAmount > 0 || gstPaid > 0) ? (
    <span className="flex flex-wrap gap-x-3">
      {totalAmount > 0 && <span>₹{fmtAmount(totalAmount)} total</span>}
      {unbilledAmount > 0 && <span className="text-[#667085]">₹{fmtAmount(unbilledAmount)} unbilled</span>}
      {gstPaid > 0 && <span className="text-[#667085]">₹{fmtAmount(gstPaid)} GST paid</span>}
    </span>
  ) : (
    'Log out-of-pocket costs and bill them back to clients'
  )}
</p>
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 10: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/pages/app/ExpensesPage.tsx
git commit -m "feat: date-range filter with Indian FY presets, Export CSV, GST totals row"
```

---

## Final verification

- [ ] **Deploy API and verify new endpoints**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
flyctl deploy
```

After deploy:
1. Open the app and navigate to `/expenses`
2. Click "Log Expense" — verify the form shows Category (combobox), Vendor, GST checkbox, TDS fields
3. Log an expense with GST 18% — verify GST Amount auto-computes
4. Log an expense with a custom category (e.g. "Studio Hire") — verify it appears in the category list next time
5. Select "This FY" in the date filter — verify only expenses from April 1 onwards appear
6. Click "Export CSV" — verify a `.csv` file downloads with all 15 columns

- [ ] **Push app to production**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git push
```
