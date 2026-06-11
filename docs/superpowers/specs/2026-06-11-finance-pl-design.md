# Finance P&L Views — Design Spec

## Overview

Two surfaces for P&L intelligence:
1. **Reports P&L tab** — agency-wide P&L for a selected date range
2. **Per-project P&L card** — revenue vs expenses + budget tracking on the project detail page

---

## Revenue Basis Toggle

Both surfaces support an **Accrual / Cash** toggle:

| Basis | Revenue definition |
|---|---|
| **Accrual** | Sum of `invoice.subtotal` (ex-GST = `total - gstAmount`) for invoices with status NOT IN `[DRAFT, CANCELLED]` |
| **Cash** | Sum of `invoice.amountPaid` for all invoices |

Expenses are always the same regardless of basis: sum of `expense.amount` for all matching expenses.

---

## Surface 1: Agency-wide P&L Tab (Reports Page)

### Placement
New "P&L" tab added to `ReportsPage.tsx` after the existing "expenses" tab. Uses the same date range picker and StatCard infrastructure already in place.

### Controls (top of tab)
- **Date range picker** — same presets used by other tabs (This Month / Last Month / This Quarter / Last Quarter / This FY / Custom)
- **Accrual / Cash segmented toggle** — small pill control, defaults to Accrual; persists in component state (no localStorage needed)

### Stat Cards (4 cards)
| Card | Value | Color |
|---|---|---|
| Revenue | Accrual or cash per toggle | Indigo |
| Expenses | Sum of expense.amount | Amber |
| Gross Profit | Revenue − Expenses (red if negative) | Green / Red |
| Margin % | (Profit / Revenue) × 100, "–" if Revenue = 0 | Green / Red |

### Monthly Chart
- **Type:** Recharts ComposedChart — AreaChart (Revenue + Expenses stacked fill areas) + Bar (Profit, green if positive / red if negative)
- **X-axis:** Month labels (Jan, Feb, …) within the selected range
- **Legend:** Revenue, Expenses, Profit
- **Tooltip:** Shows all three values for the hovered month

### Project Breakdown Table
Rows sorted by Revenue descending. Columns:
- Project name (linked to project detail)
- Client name
- Revenue (accrual/cash per toggle)
- Expenses
- Gross Profit
- Margin % (colored badge: green ≥50%, amber 20–49%, red <20%)

Projects with zero revenue AND zero expenses in the period are excluded.

---

## Surface 2: Per-project P&L Card (Project Detail Page)

### Placement
A new card on the project detail page, positioned between the project header and the invoices/expenses tab strip.

### Layout
Two columns side by side (`grid grid-cols-2`), responsive to single column on mobile.

**Left — P&L Summary**
- Small **Accrual / Cash** toggle (pill, top-right of the card)
- Revenue row: label + amount
- Expenses row: label + amount
- Gross Profit row: label + amount (red if negative, green if positive)
- Margin %: colored pill badge (green ≥50%, amber 20–49%, red <20%); shows "–" if revenue = 0

**Right — Budget Tracking** (only rendered when `project.budget` is not null)
- "Budget" label + value from `project.budget`
- "Spent" label + sum of all expenses on this project
- "Remaining" label + (budget − spent), red text if negative (over budget)
- Progress bar: `spent / budget * 100` width, color: green <70%, amber 70–90%, red >90%
- If `project.budget` is null: soft "Set a budget →" prompt linking to project settings

### Over-budget indicator
If spent > budget, show a small amber warning chip "Over budget" next to the remaining value.

---

## API Endpoints

### `GET /reports/pl`

**Query params:** `from` (ISO date), `to` (ISO date), `basis` (`accrual` | `cash`)

**Response:**
```json
{
  "data": {
    "totals": {
      "revenue": "number",
      "expenses": "number",
      "grossProfit": "number",
      "margin": "number | null"
    },
    "monthly": [
      { "period": "2026-01", "revenue": "number", "expenses": "number", "grossProfit": "number" }
    ],
    "byProject": [
      {
        "projectId": "string",
        "projectName": "string",
        "clientName": "string | null",
        "revenue": "number",
        "expenses": "number",
        "grossProfit": "number",
        "margin": "number | null"
      }
    ]
  }
}
```

**Revenue calculation (accrual):**
```
SUM(invoice.subtotal)   -- subtotal is the pre-GST taxable value; dedicated field in schema
WHERE invoice.status NOT IN ['DRAFT', 'CANCELLED']
AND invoice.issueDate BETWEEN from AND to
```

**Revenue calculation (cash):**
```
SUM(invoice.amountPaid)
WHERE invoice.issueDate BETWEEN from AND to
```

**Expense calculation (both bases):**
```
SUM(expense.amount)
WHERE expense.date BETWEEN from AND to
```

**Monthly grouping:** Group by `DATE_TRUNC('month', issueDate)` for revenue, `DATE_TRUNC('month', date)` for expenses. Merge by period key — a month may have expenses but no invoices (and vice versa).

**byProject breakdown:** Same revenue/expense queries but grouped by `projectId`. Projects with null `projectId` (overhead expenses with no project) are excluded from byProject but included in totals.

---

### `GET /projects/:id/pl`

**Query params:** `basis` (`accrual` | `cash`)

**Response:**
```json
{
  "data": {
    "revenue": "number",
    "expenses": "number",
    "grossProfit": "number",
    "margin": "number | null",
    "budget": "number | null",
    "budgetSpent": "number",
    "budgetRemaining": "number | null"
  }
}
```

**Revenue:** All invoices linked to `projectId`, same accrual/cash logic as above, no date filter (lifetime of the project).

**Expenses:** All expenses linked to `projectId`, sum of `amount`, no date filter.

**Budget:** `project.budget` — may be null.
**budgetSpent:** same as `expenses`.
**budgetRemaining:** `budget - budgetSpent` if budget is set, else null.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Revenue = 0 | Margin % shows "–" (avoid division by zero) |
| Profit < 0 | Gross Profit shown in red; Margin % shows negative in red |
| `project.budget` is null | Budget column hidden in project P&L card; "Set a budget →" prompt shown |
| Spent > budget | Remaining shown in red; "Over budget" amber chip |
| CANCELLED invoices | Excluded from revenue in both bases |
| DRAFT invoices | Excluded from accrual revenue; amountPaid still counted for cash |
| Expense with no projectId | Included in agency totals; excluded from byProject rows |
| No data in selected range | Stat cards show ₹0; chart shows empty state; table shows "No projects in this period" |

---

## Frontend Data Flow

- New hook `usePlReport({ from, to, basis })` — calls `GET /reports/pl`
- New hook `useProjectPl(projectId, basis)` — calls `GET /projects/:id/pl`
- Both use TanStack Query v5 (`useQuery`) with `queryKey` including `basis` so toggling rerenders without refetch
- Amounts arrive as strings (Prisma Decimal serialization) — parse with `parseFloat()` before arithmetic

---

## Files to Create / Modify

**pakka-api:**
- `src/modules/reports/dto/pl-report-query.dto.ts` — new
- `src/modules/reports/reports.service.ts` — add `getPlReport()` method
- `src/modules/reports/reports.controller.ts` — add `GET /reports/pl` route
- `src/modules/projects/projects.service.ts` — add `getProjectPl()` method
- `src/modules/projects/projects.controller.ts` — add `GET /projects/:id/pl` route

**pakka-app:**
- `src/features/reports/hooks/useReports.ts` — add `usePlReport` hook
- `src/features/projects/hooks/useProjectPl.ts` — new hook file
- `src/features/reports/components/PlTab.tsx` — new tab component
- `src/features/projects/components/ProjectPlCard.tsx` — new card component
- `src/pages/app/ReportsPage.tsx` — add P&L tab
- `src/pages/app/ProjectPage.tsx` — add `<ProjectPlCard>`
