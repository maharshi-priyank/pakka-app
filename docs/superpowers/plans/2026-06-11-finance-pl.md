# Finance P&L Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add agency-wide P&L tab to the Reports page and a per-project P&L card to the project detail page, both with accrual/cash revenue toggle.

**Architecture:** Two independent backend endpoints (`GET /reports/pl` and `GET /projects/:id/pl`) compute revenue and expense aggregations in the service layer using in-memory grouping consistent with the existing reports service pattern. Two new frontend components consume them, extracted to their own files to keep ReportsPage and ProjectPage lean.

**Tech Stack:** NestJS + Prisma (API), React + TanStack Query v5 + Recharts + Tailwind v4 (App)

---

## File map

**Create:**
- `pakka-api/src/modules/reports/` — add method in `reports.service.ts`, route in `reports.controller.ts`
- `pakka-api/src/modules/projects/` — add method in `projects.service.ts`, route in `projects.controller.ts`
- `pakka-app/src/features/reports/components/PlTab.tsx`
- `pakka-app/src/features/projects/hooks/useProjectPl.ts`
- `pakka-app/src/features/projects/components/ProjectPlCard.tsx`

**Modify:**
- `pakka-app/src/features/reports/hooks/useReports.ts` — add `usePlReport` hook
- `pakka-app/src/pages/app/ReportsPage.tsx` — add `'pl'` tab
- `pakka-app/src/pages/app/ProjectPage.tsx` — add `<ProjectPlCard>`

---

## Task 1: Backend — `GET /reports/pl`

**Files:**
- Modify: `pakka-api/src/modules/reports/reports.service.ts`
- Modify: `pakka-api/src/modules/reports/reports.controller.ts`

### Context

The existing `reports.service.ts` already has a `private n()` helper and `private dateRange()` helper (reuse them). It imports `InvoiceStatus` from `@prisma/client`. All methods follow the same fetch-loop-aggregate pattern. Invoice date filtering uses `createdAt` (not `issueDate` — that field doesn't exist in the schema). Expense date filtering uses `date`.

- [ ] **Step 1: Add `toIsoMonthKey` helper and PL types to `reports.service.ts`**

Add these after the existing interfaces (around line 56, before `@Injectable()`):

```ts
export interface PlMonthlyPoint {
  period:      string; // YYYY-MM
  revenue:     number;
  expenses:    number;
  grossProfit: number;
}

export interface PlProjectRow {
  projectId:   string;
  projectName: string;
  clientName:  string | null;
  revenue:     number;
  expenses:    number;
  grossProfit: number;
  margin:      number | null;
}

export interface PlTotals {
  revenue:     number;
  expenses:    number;
  grossProfit: number;
  margin:      number | null;
}
```

Add this private helper inside the `ReportsService` class (after the existing `dateRange` method):

```ts
private toIsoMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
```

- [ ] **Step 2: Add `getPlReport()` method to `ReportsService`**

Add this method at the end of the `ReportsService` class, before the closing `}`:

```ts
async getPlReport(
  userId: string,
  from?: string,
  to?: string,
  basis: 'accrual' | 'cash' = 'accrual',
) {
  const dateFilter = this.dateRange(from, to);

  const invoices = await this.prisma.invoice.findMany({
    where: {
      userId,
      ...(basis === 'accrual'
        ? { status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] } }
        : {}),
      ...(dateFilter && { createdAt: dateFilter }),
    },
    select: {
      subtotal:   true,
      amountPaid: true,
      createdAt:  true,
      projectId:  true,
      project: {
        select: {
          name:   true,
          client: { select: { name: true } },
        },
      },
    },
  });

  const expenses = await this.prisma.expense.findMany({
    where: {
      userId,
      ...(dateFilter && { date: dateFilter }),
    },
    select: {
      amount:    true,
      date:      true,
      projectId: true,
      project: {
        select: {
          name:   true,
          client: { select: { name: true } },
        },
      },
    },
  });

  const revenueByMonth  = new Map<string, number>();
  const expenseByMonth  = new Map<string, number>();
  const projectRevenue  = new Map<string, { name: string; clientName: string | null; revenue: number }>();
  const projectExpenses = new Map<string, number>();

  let totalRevenue = 0;

  for (const inv of invoices) {
    const amount = basis === 'accrual' ? this.n(inv.subtotal) : this.n(inv.amountPaid);
    totalRevenue += amount;

    const key = this.toIsoMonthKey(inv.createdAt);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);

    if (inv.projectId) {
      if (!projectRevenue.has(inv.projectId)) {
        projectRevenue.set(inv.projectId, {
          name:       inv.project?.name ?? 'Unknown',
          clientName: inv.project?.client?.name ?? null,
          revenue:    0,
        });
      }
      projectRevenue.get(inv.projectId)!.revenue += amount;
    }
  }

  let totalExpenses = 0;

  for (const exp of expenses) {
    const amount = this.n(exp.amount);
    totalExpenses += amount;

    const key = this.toIsoMonthKey(exp.date);
    expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + amount);

    if (exp.projectId) {
      projectExpenses.set(exp.projectId, (projectExpenses.get(exp.projectId) ?? 0) + amount);
    }
  }

  // Monthly — union of all months, sorted ascending
  const allMonths = new Set([...revenueByMonth.keys(), ...expenseByMonth.keys()]);
  const monthly: PlMonthlyPoint[] = [...allMonths].sort().map(period => {
    const rev = revenueByMonth.get(period) ?? 0;
    const exp = expenseByMonth.get(period) ?? 0;
    return { period, revenue: rev, expenses: exp, grossProfit: rev - exp };
  });

  // By project — union of all project IDs
  const allProjectIds = new Set([
    ...projectRevenue.keys(),
    ...projectExpenses.keys(),
  ]);
  const byProject: PlProjectRow[] = [...allProjectIds]
    .map(projectId => {
      const rev     = projectRevenue.get(projectId);
      const expAmt  = projectExpenses.get(projectId) ?? 0;
      const revenue = rev?.revenue ?? 0;
      const grossProfit = revenue - expAmt;
      const margin  = revenue > 0
        ? parseFloat(((grossProfit / revenue) * 100).toFixed(1))
        : null;
      return {
        projectId,
        projectName: rev?.name ?? 'Unknown',
        clientName:  rev?.clientName ?? null,
        revenue,
        expenses:    expAmt,
        grossProfit,
        margin,
      };
    })
    .filter(r => r.revenue > 0 || r.expenses > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const grossProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0
    ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1))
    : null;

  const totals: PlTotals = { revenue: totalRevenue, expenses: totalExpenses, grossProfit, margin };

  return { totals, monthly, byProject };
}
```

- [ ] **Step 3: Add `GET /reports/pl` route to `reports.controller.ts`**

Add this method to `ReportsController` (before the closing `}`):

```ts
@Get('pl')
@ApiOperation({ summary: 'P&L report — revenue, expenses, gross profit by month and project' })
@ApiQuery({ name: 'from',  required: false })
@ApiQuery({ name: 'to',    required: false })
@ApiQuery({ name: 'basis', required: false, enum: ['accrual', 'cash'] })
pl(
  @CurrentUser() user: { id: string },
  @Query('from')  from?:  string,
  @Query('to')    to?:    string,
  @Query('basis') basis?: string,
) {
  const b = basis === 'cash' ? 'cash' : 'accrual';
  return this.svc.getPlReport(user.id, from, to, b);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/reports/reports.service.ts src/modules/reports/reports.controller.ts
git commit -m "feat(reports): add P&L report endpoint with accrual/cash toggle"
```

---

## Task 2: Backend — `GET /projects/:id/pl`

**Files:**
- Modify: `pakka-api/src/modules/projects/projects.service.ts`
- Modify: `pakka-api/src/modules/projects/projects.controller.ts`

### Context

`projects.service.ts` defines its own `private n()` helper (same as reports service). It currently imports only `ProjectStatus` from `@prisma/client` — you must add `InvoiceStatus` to that import. The controller uses `effectiveUserId(user)` (not `user.id` directly).

- [ ] **Step 1: Add `InvoiceStatus` to the Prisma import in `projects.service.ts`**

Change line 3:
```ts
import { ProjectStatus } from '@prisma/client';
```
to:
```ts
import { InvoiceStatus, ProjectStatus } from '@prisma/client';
```

- [ ] **Step 2: Add `getProjectPl()` method to `ProjectsService`**

Add at the end of the `ProjectsService` class (before the closing `}`):

```ts
async getProjectPl(
  userId: string,
  projectId: string,
  basis: 'accrual' | 'cash' = 'accrual',
) {
  const project = await this.prisma.project.findFirst({
    where:  { id: projectId, userId },
    select: { budget: true },
  });
  if (!project) throw new NotFoundException('Project not found');

  const invoices = await this.prisma.invoice.findMany({
    where: {
      userId,
      projectId,
      ...(basis === 'accrual'
        ? { status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] } }
        : {}),
    },
    select: { subtotal: true, amountPaid: true },
  });

  const expenses = await this.prisma.expense.findMany({
    where:  { userId, projectId },
    select: { amount: true },
  });

  const revenue = invoices.reduce(
    (sum, inv) => sum + (basis === 'accrual' ? this.n(inv.subtotal) : this.n(inv.amountPaid)),
    0,
  );
  const budgetSpent = expenses.reduce((sum, exp) => sum + this.n(exp.amount), 0);
  const grossProfit = revenue - budgetSpent;
  const margin      = revenue > 0
    ? parseFloat(((grossProfit / revenue) * 100).toFixed(1))
    : null;
  const budget          = project.budget ? this.n(project.budget) : null;
  const budgetRemaining = budget !== null ? budget - budgetSpent : null;

  return {
    revenue,
    expenses:        budgetSpent,
    grossProfit,
    margin,
    budget,
    budgetSpent,
    budgetRemaining,
  };
}
```

- [ ] **Step 3: Add `GET /projects/:id/pl` route to `projects.controller.ts`**

Add before the closing `}` of `ProjectsController`:

```ts
@Get(':id/pl')
getProjectPl(
  @CurrentUser() user: User,
  @Param('id')    id: string,
  @Query('basis') basis?: string,
) {
  const b = basis === 'cash' ? 'cash' : 'accrual';
  return this.projectsService.getProjectPl(effectiveUserId(user), id, b);
}
```

Note: This route is `@Get(':id/pl')` which NestJS resolves correctly because it has a static suffix `/pl` — it will not conflict with `@Get(':id')`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-api
git add src/modules/projects/projects.service.ts src/modules/projects/projects.controller.ts
git commit -m "feat(projects): add per-project P&L endpoint with accrual/cash toggle"
```

---

## Task 3: Frontend hooks

**Files:**
- Modify: `pakka-app/src/features/reports/hooks/useReports.ts`
- Create: `pakka-app/src/features/projects/hooks/useProjectPl.ts`

### Context

Existing hooks in `useReports.ts` all follow `useQuery({ queryKey: ['reports', '<name>', range], queryFn: async () => { const { data } = await api.get(...); return data.data } })`. Prisma Decimal fields arrive as strings — but the backend already converts them with `this.n()` before returning, so frontend values are already numbers. No `parseFloat()` needed in the hooks.

- [ ] **Step 1: Add P&L types and `usePlReport` hook to `useReports.ts`**

Append to the end of `/Users/mvaghela/Documents/MyProjects/pakka-app/src/features/reports/hooks/useReports.ts`:

```ts
// ─── P&L ──────────────────────────────────────────────────────────────────────

export type PlBasis = 'accrual' | 'cash'

export interface PlMonthlyPoint {
  period:      string
  revenue:     number
  expenses:    number
  grossProfit: number
}

export interface PlProjectRow {
  projectId:   string
  projectName: string
  clientName:  string | null
  revenue:     number
  expenses:    number
  grossProfit: number
  margin:      number | null
}

export interface PlTotals {
  revenue:     number
  expenses:    number
  grossProfit: number
  margin:      number | null
}

export interface PlReport {
  totals:    PlTotals
  monthly:   PlMonthlyPoint[]
  byProject: PlProjectRow[]
}

export function usePlReport(range: DateRange, basis: PlBasis) {
  return useQuery({
    queryKey: ['reports', 'pl', range, basis],
    queryFn: async () => {
      const { data } = await api.get<{ data: PlReport }>('/reports/pl', {
        params: { from: range.from, to: range.to, basis },
      })
      return data.data
    },
    staleTime: 60_000,
  })
}
```

- [ ] **Step 2: Create `useProjectPl.ts`**

Create `/Users/mvaghela/Documents/MyProjects/pakka-app/src/features/projects/hooks/useProjectPl.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type PlBasis = 'accrual' | 'cash'

export interface ProjectPl {
  revenue:         number
  expenses:        number
  grossProfit:     number
  margin:          number | null
  budget:          number | null
  budgetSpent:     number
  budgetRemaining: number | null
}

export function useProjectPl(projectId: string, basis: PlBasis) {
  return useQuery({
    queryKey: ['projects', projectId, 'pl', basis],
    queryFn: async () => {
      const { data } = await api.get<{ data: ProjectPl }>(`/projects/${projectId}/pl`, {
        params: { basis },
      })
      return data.data
    },
    staleTime: 30_000,
  })
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/reports/hooks/useReports.ts src/features/projects/hooks/useProjectPl.ts
git commit -m "feat(reports): add usePlReport and useProjectPl TanStack Query hooks"
```

---

## Task 4: Frontend — `PlTab.tsx`

**Files:**
- Create: `pakka-app/src/features/reports/components/PlTab.tsx`

### Context

Study `ReportsPage.tsx` for the exact patterns to replicate:
- `StatCard` takes `{ label, value, sub?, iconBg, iconColor, icon, loading? }` — import it from `ReportsPage` is not possible since it's not exported; re-declare it locally or inline the cards. The simplest approach is to **inline the card JSX** directly rather than importing.
- `useThemeStore` from `@/store/themeStore` provides `isDark` for chart stroke colors.
- `glass-table` and `card-glass` are Tailwind utility classes defined globally.
- `formatCurrency` from `@/lib/utils` formats INR amounts.
- `cn` from `@/lib/utils` for className merging.
- Recharts `ComposedChart` needs `ComposedChart, Area, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend` imports.

The `PlTab` receives `{ range: DateRange }` as its only prop and manages its own `basis` state.

- [ ] **Step 1: Create `PlTab.tsx`**

Create `/Users/mvaghela/Documents/MyProjects/pakka-app/src/features/reports/components/PlTab.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Wallet, IndianRupee, BarChart3,
} from 'lucide-react'
import {
  ComposedChart, Area, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import {
  usePlReport,
  type DateRange,
  type PlBasis,
} from '@/features/reports/hooks/useReports'

// ─── Shared primitives ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function PlCard({
  label, value, sub, iconBg, iconColor, icon: Icon, loading,
}: {
  label: string; value: string; sub?: string
  iconBg: string; iconColor: string; icon: React.ElementType
  loading?: boolean
}) {
  return (
    <div className="card-glass p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={16} className={iconColor} strokeWidth={2} />
        </div>
      </div>
      {loading
        ? <Skeleton className="h-7 w-24 mb-1" />
        : <p className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] leading-none tracking-tight">{value}</p>
      }
      <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium mt-2">{label}</p>
      {sub && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{sub}</p>}
    </div>
  )
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[1,2,3,4,5].map(i => (
        <tr key={i} className="border-b border-[#F2F4F7] dark:border-[#26283A]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[#98A2B3]">—</span>
  const cls = margin >= 50
    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
    : margin >= 20
    ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400'
    : 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
  return (
    <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {margin.toFixed(1)}%
    </span>
  )
}

// ─── Basis toggle ──────────────────────────────────────────────────────────────

function BasisToggle({ basis, onChange }: { basis: PlBasis; onChange: (b: PlBasis) => void }) {
  return (
    <div className="flex items-center bg-[#F3F4F6] dark:bg-[#21222D] rounded-full p-0.5">
      {(['accrual', 'cash'] as PlBasis[]).map(b => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            'px-3 py-1 rounded-full text-[11px] font-semibold transition-all capitalize',
            basis === b
              ? 'bg-white dark:bg-[#2D2E3D] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
              : 'text-[#6B7280] dark:text-[#8B92A8] hover:text-[#344054]',
          )}
        >
          {b}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlTab({ range }: { range: DateRange }) {
  const [basis, setBasis] = useState<PlBasis>('accrual')
  const { data, isLoading } = usePlReport(range, basis)
  const { isDark } = useThemeStore()

  const totals    = data?.totals
  const monthly   = data?.monthly   ?? []
  const byProject = data?.byProject ?? []

  const profitValue    = totals?.grossProfit ?? 0
  const profitPositive = profitValue >= 0

  return (
    <>
      {/* Basis toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
          {basis === 'accrual'
            ? 'Revenue = invoiced ex-GST (excluding Draft & Cancelled)'
            : 'Revenue = payments collected'}
        </p>
        <BasisToggle basis={basis} onChange={setBasis} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PlCard
          label="Revenue"
          value={formatCurrency(totals?.revenue ?? 0)}
          iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"
          iconColor="text-[#6366F1]"
          icon={IndianRupee}
          loading={isLoading}
        />
        <PlCard
          label="Expenses"
          value={formatCurrency(totals?.expenses ?? 0)}
          iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"
          iconColor="text-[#B54708] dark:text-amber-400"
          icon={Wallet}
          loading={isLoading}
        />
        <PlCard
          label="Gross Profit"
          value={formatCurrency(totals?.grossProfit ?? 0)}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={TrendingUp}
          loading={isLoading}
        />
        <PlCard
          label="Margin"
          value={totals?.margin !== null && totals?.margin !== undefined ? `${totals.margin.toFixed(1)}%` : '—'}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={BarChart3}
          loading={isLoading}
        />
      </div>

      {/* Monthly chart */}
      {!isLoading && monthly.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Monthly P&amp;L</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="plRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="plExpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={isDark ? '#26283A' : '#F2F4F7'} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v, name) => [
                  formatCurrency(v as number),
                  name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Profit',
                ]}
                contentStyle={{
                  border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`,
                  borderRadius: 10, fontSize: 12,
                  background: isDark ? '#1A1B23' : '#fff',
                  color: isDark ? '#ECEEF3' : '#101828',
                }}
              />
              <Legend
                iconType="line"
                iconSize={12}
                wrapperStyle={{ fontSize: 11, color: isDark ? '#8B92A8' : '#667085', paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="revenue"  name="revenue"  stroke="#6366F1" strokeWidth={2} fill="url(#plRevGrad)" dot={false} />
              <Area type="monotone" dataKey="expenses" name="expenses" stroke="#F59E0B" strokeWidth={2} fill="url(#plExpGrad)" dot={false} />
              <Bar dataKey="grossProfit" name="profit" maxBarSize={28} radius={[4,4,0,0]}>
                {monthly.map((entry, i) => (
                  <Cell key={i} fill={entry.grossProfit >= 0 ? '#12B76A' : '#D92D20'} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project breakdown table */}
      <div className="glass-table">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">By Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
                {['Project', 'Client', 'Revenue', 'Expenses', 'Profit', 'Margin'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton cols={6} />}
              {!isLoading && byProject.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#F4F5F8] dark:bg-[#21222D] flex items-center justify-center mb-3">
                        <BarChart3 size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No projects in this period</p>
                      <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Log expenses or raise invoices linked to a project to see P&amp;L here</p>
                    </div>
                  </td>
                </tr>
              )}
              {byProject.map(r => (
                <tr key={r.projectId} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/app/projects/${r.projectId}`} className="font-semibold text-[#344054] dark:text-[#C2C8D8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors">
                      {r.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.clientName ?? <span className="text-[#D0D5DD]">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.expenses > 0 ? formatCurrency(r.expenses) : <span className="text-[#D0D5DD]">—</span>}</td>
                  <td className={cn('px-4 py-3 font-medium', r.grossProfit >= 0 ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400')}>
                    {formatCurrency(r.grossProfit)}
                  </td>
                  <td className="px-4 py-3"><MarginBadge margin={r.margin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/reports/components/PlTab.tsx
git commit -m "feat(reports): add PlTab component with accrual/cash toggle and monthly chart"
```

---

## Task 5: Frontend — `ProjectPlCard.tsx`

**Files:**
- Create: `pakka-app/src/features/projects/components/ProjectPlCard.tsx`

### Context

`ProjectPage.tsx` uses `formatCurrency` from `@/lib/utils` and `cn` from `@/lib/utils`. Follow the same dark-mode token pattern. The card sits between the project header and the tab strip. The budget progress bar uses a `div` with inline `style={{ width: '...%' }}` — the same pattern used in `ClientsTab` in `ReportsPage.tsx`.

- [ ] **Step 1: Create `ProjectPlCard.tsx`**

Create `/Users/mvaghela/Documents/MyProjects/pakka-app/src/features/projects/components/ProjectPlCard.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useProjectPl, type PlBasis } from '@/features/projects/hooks/useProjectPl'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function BasisToggle({ basis, onChange }: { basis: PlBasis; onChange: (b: PlBasis) => void }) {
  return (
    <div className="flex items-center bg-[#F3F4F6] dark:bg-[#21222D] rounded-full p-0.5">
      {(['accrual', 'cash'] as PlBasis[]).map(b => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            'px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all capitalize',
            basis === b
              ? 'bg-white dark:bg-[#2D2E3D] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
              : 'text-[#6B7280] dark:text-[#8B92A8] hover:text-[#344054]',
          )}
        >
          {b}
        </button>
      ))}
    </div>
  )
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[#98A2B3] text-[12px]">—</span>
  const cls = margin >= 50
    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
    : margin >= 20
    ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400'
    : 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
  return (
    <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {margin < 0 ? '' : ''}{margin.toFixed(1)}%
    </span>
  )
}

function PlRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">{label}</span>
      <span className={cn('text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]', valueClass)}>{value}</span>
    </div>
  )
}

interface Props {
  projectId: string
}

export default function ProjectPlCard({ projectId }: Props) {
  const [basis, setBasis] = useState<PlBasis>('accrual')
  const { data, isLoading } = useProjectPl(projectId, basis)

  const budgetPct = data?.budget && data.budget > 0
    ? Math.min((data.budgetSpent / data.budget) * 100, 100)
    : 0

  const barColor = budgetPct < 70
    ? 'bg-[#12B76A]'
    : budgetPct < 90
    ? 'bg-[#F59E0B]'
    : 'bg-[#D92D20]'

  const overBudget = data?.budget !== null && data?.budget !== undefined
    && data.budgetSpent > (data.budget ?? 0)

  return (
    <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8] uppercase tracking-wider">P&amp;L</h3>
        <BasisToggle basis={basis} onChange={setBasis} />
      </div>

      <div className={cn('grid gap-4', data?.budget !== null && data?.budget !== undefined ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
        {/* Left — P&L summary */}
        <div className="space-y-0.5">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <PlRow label="Revenue"     value={formatCurrency(data?.revenue ?? 0)} />
              <PlRow label="Expenses"    value={formatCurrency(data?.expenses ?? 0)} />
              <div className="border-t border-[#F2F4F7] dark:border-[#26283A] my-1" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Gross Profit</span>
                <span className={cn(
                  'text-[13px] font-bold',
                  (data?.grossProfit ?? 0) >= 0
                    ? 'text-[#027A48] dark:text-[#34D399]'
                    : 'text-[#D92D20] dark:text-red-400',
                )}>
                  {formatCurrency(data?.grossProfit ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Margin</span>
                <MarginBadge margin={data?.margin ?? null} />
              </div>
            </>
          )}
        </div>

        {/* Right — Budget tracking (only if budget is set) */}
        {!isLoading && data?.budget !== null && data?.budget !== undefined && (
          <div className="space-y-0.5">
            <PlRow label="Budget"  value={formatCurrency(data.budget)} />
            <PlRow label="Spent"   value={formatCurrency(data.budgetSpent)} />
            <div className="border-t border-[#F2F4F7] dark:border-[#26283A] my-1" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Remaining</span>
              <div className="flex items-center gap-1.5">
                {overBudget && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#B54708] dark:text-amber-400 bg-[#FFFAEB] dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle size={9} /> Over budget
                  </span>
                )}
                <span className={cn(
                  'text-[13px] font-semibold',
                  (data.budgetRemaining ?? 0) < 0
                    ? 'text-[#D92D20] dark:text-red-400'
                    : 'text-[#101828] dark:text-[#ECEEF3]',
                )}>
                  {formatCurrency(data.budgetRemaining ?? 0)}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">Budget used</span>
                <span className="text-[10px] font-semibold text-[#667085] dark:text-[#8B92A8]">{Math.round(budgetPct)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#F2F4F7] dark:bg-[#26283A] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Budget not set prompt */}
        {!isLoading && (data?.budget === null || data?.budget === undefined) && (
          <div className="flex items-center justify-center border border-dashed border-[#EAECF0] dark:border-[#26283A] rounded-lg p-4">
            <Link
              to={`/app/projects/${projectId}`}
              className="text-[12px] text-[#6366F1] dark:text-[#818CF8] hover:underline font-medium"
            >
              Set a budget →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/features/projects/components/ProjectPlCard.tsx
git commit -m "feat(projects): add ProjectPlCard component with P&L summary and budget tracking"
```

---

## Task 6: Wire into ReportsPage and ProjectPage

**Files:**
- Modify: `pakka-app/src/pages/app/ReportsPage.tsx`
- Modify: `pakka-app/src/pages/app/ProjectPage.tsx`

### Context for ReportsPage changes

- `Tab` is a string union type on line 21: `type Tab = 'revenue' | 'gst' | 'clients' | 'expenses' | 'time'`
- `TABS` array on line 632 drives the tab bar rendering
- Tab content rendering on lines 717–722 uses `{tab === 'revenue' && <RevenueTab ...>}` pattern
- `LineChart` from recharts is NOT currently imported — import `ComposedChart, Cell` are only needed in `PlTab.tsx`, not here

### Context for ProjectPage changes

- `ProjectPage.tsx` is a large file. The project header section ends somewhere before the tab strip. You need to find the right insertion point. Look for the section where `useProjectStats` data is displayed — the P&L card goes after the stats section and before any tab content.
- `ProjectPage.tsx` imports from `@/features/projects/hooks/useProjects` — add the `ProjectPlCard` import from `@/features/projects/components/ProjectPlCard`

- [ ] **Step 1: Update `Tab` type in `ReportsPage.tsx`**

Change line 21 in `ReportsPage.tsx`:
```ts
type Tab    = 'revenue' | 'gst' | 'clients' | 'expenses' | 'time'
```
to:
```ts
type Tab    = 'revenue' | 'gst' | 'clients' | 'expenses' | 'time' | 'pl'
```

- [ ] **Step 2: Add PlTab import to `ReportsPage.tsx`**

Add this import after the existing feature imports (after the `useRevenueReport...` import block):

```ts
import PlTab from '@/features/reports/components/PlTab'
```

Also add `PieChart` icon import to the lucide-react imports line — replace the existing import at line 5:
```ts
import {
  BarChart3, Download, TrendingUp, IndianRupee, Users,
  Wallet, Clock, FileText, Info, PieChart,
} from 'lucide-react'
```

- [ ] **Step 3: Add `pl` entry to `TABS` array in `ReportsPage.tsx`**

Find the `TABS` array (around line 632):
```ts
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'revenue',  label: 'Revenue',  icon: TrendingUp  },
  { key: 'gst',      label: 'GST',      icon: IndianRupee },
  { key: 'clients',  label: 'Clients',  icon: Users       },
  { key: 'expenses', label: 'Expenses', icon: Wallet      },
  { key: 'time',     label: 'Time',     icon: Clock       },
]
```

Change it to:
```ts
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'revenue',  label: 'Revenue',  icon: TrendingUp  },
  { key: 'gst',      label: 'GST',      icon: IndianRupee },
  { key: 'clients',  label: 'Clients',  icon: Users       },
  { key: 'expenses', label: 'Expenses', icon: Wallet      },
  { key: 'time',     label: 'Time',     icon: Clock       },
  { key: 'pl',       label: 'P&L',      icon: PieChart    },
]
```

- [ ] **Step 4: Add PlTab rendering to tab content section in `ReportsPage.tsx`**

Find the tab content section (around line 715–722):
```tsx
      <div className="space-y-5">
        {tab === 'revenue'  && <RevenueTab  range={range} />}
        {tab === 'gst'      && <GstTab      range={range} />}
        {tab === 'clients'  && <ClientsTab  range={range} />}
        {tab === 'expenses' && <ExpensesTab range={range} />}
        {tab === 'time'     && <TimeTab     range={range} />}
      </div>
```

Change it to:
```tsx
      <div className="space-y-5">
        {tab === 'revenue'  && <RevenueTab  range={range} />}
        {tab === 'gst'      && <GstTab      range={range} />}
        {tab === 'clients'  && <ClientsTab  range={range} />}
        {tab === 'expenses' && <ExpensesTab range={range} />}
        {tab === 'time'     && <TimeTab     range={range} />}
        {tab === 'pl'       && <PlTab       range={range} />}
      </div>
```

- [ ] **Step 5: Add `ProjectPlCard` to `ProjectPage.tsx`**

Add this import near the top of `ProjectPage.tsx` (after the existing feature imports):

```ts
import ProjectPlCard from '@/features/projects/components/ProjectPlCard'
```

The page currently has a "Budget bar" section (around line 356) between the stat cards and the Tabs strip:

```tsx
      {/* Budget bar */}
      {budget !== null && (
        <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4">
          ...budget utilisation bar JSX...
        </div>
      )}
```

**Replace the entire Budget bar section** (the `{budget !== null && ( ... )}` block) with:

```tsx
      {/* P&L & Budget */}
      <ProjectPlCard projectId={id!} />
```

The `ProjectPlCard` renders its own budget tracking (with progress bar and over-budget chip) when `project.budget` is set, so the old budget bar is now redundant. The `id` variable comes from `const { id } = useParams<{ id: string }>()` (already defined on line 227).

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/mvaghela/Documents/MyProjects/pakka-app
git add src/pages/app/ReportsPage.tsx src/pages/app/ProjectPage.tsx
git commit -m "feat: wire P&L tab into Reports page and ProjectPlCard into project detail"
```

---

## Verification checklist

After all tasks complete:

1. **Reports → P&L tab** appears in the tab bar after "Time"
2. Toggle **Accrual / Cash** — stat cards and table update (new network request fires)
3. Stat cards show Revenue (indigo), Expenses (amber), Gross Profit (green/red), Margin (green/red)
4. Monthly chart shows Area for Revenue + Area for Expenses + Bar for Profit (green bars positive, red negative)
5. Project breakdown table rows link to `/app/projects/:id`
6. Empty state shows when no data in selected range
7. **Project detail page** shows `ProjectPlCard` between project header and tabs
8. Toggle Accrual/Cash on the project card — values update
9. If project has a budget: progress bar + "Over budget" chip when spent > budget
10. If project has no budget: "Set a budget →" prompt renders in the right column
11. `npx tsc --noEmit` passes in both repos
