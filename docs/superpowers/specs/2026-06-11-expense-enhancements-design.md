# Expense Enhancements — Model Enrichment + UX + Export

## Goal

Enrich the expense model with GST, TDS, vendor, and custom categories so Indian freelancers and agencies can hand clean data to their CA. Add date-range filtering with Indian FY presets and a one-click CSV export scoped to whatever is currently visible.

---

## Scope (Sub-projects A + B)

| Item | Description |
|------|-------------|
| 1 | GST rate + computed GST amount on expenses (opt-in checkbox) |
| 2 | TDS section + rate fields for contractor payments (record-only, no computation) |
| 3 | Custom expense categories per user (better defaults + free additions, auto-saved) |
| 4 | Date-range filter with Indian FY presets (Apr–Mar) |
| 5 | CSV export scoped to current filter state |
| 7 | Vendor / payee free-text field with autocomplete |

Not in scope: recurring expenses (sub-project D), P&L views (sub-project C), expense approval/reimbursement, multi-currency.

---

## Architecture

### Files modified / created

| Repo | Action | File |
|------|--------|------|
| pakka-api | Modify | `prisma/schema.prisma` |
| pakka-api | Create | `prisma/migrations/<timestamp>_expense_enhancements/migration.sql` |
| pakka-api | Create | `prisma/schema.prisma` — new `UserExpenseCategory` model |
| pakka-api | Modify | `src/modules/expenses/dto/create-expense.dto.ts` |
| pakka-api | Modify | `src/modules/expenses/dto/query-expenses.dto.ts` |
| pakka-api | Modify | `src/modules/expenses/expenses.service.ts` |
| pakka-api | Modify | `src/modules/expenses/expenses.controller.ts` |
| pakka-app | Modify | `src/features/expenses/hooks/useExpenses.ts` |
| pakka-app | Modify | `src/pages/app/ExpensesPage.tsx` |

`UpdateExpenseDto` inherits all new fields via `PartialType(CreateExpenseDto)` — no change needed.

---

## Data Model

### New fields on `Expense`

```prisma
model Expense {
  // ... existing fields unchanged ...

  vendor      String?          // free-text payee name
  gstRate     Decimal?  @db.Decimal(5, 2)   // 5 | 12 | 18 | 28 — null = no GST
  gstAmount   Decimal?  @db.Decimal(12, 2)  // stored computed: amount × gstRate / 100
  tdsSection  String?          // "194C" | "194J" | "194M" | etc.
  tdsRate     Decimal?  @db.Decimal(5, 2)   // e.g. 10.00
}
```

All new fields are optional with no default — existing rows stay valid without migration data.

### New table: `UserExpenseCategory`

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

---

## Default Categories

The following 15 categories ship as constants in `expenses.service.ts`. They are never stored in the DB — they are merged with the user's custom list at query time.

```ts
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
]
```

---

## Backend API

### Existing endpoints — updated

**`POST /expenses`** and **`PATCH /expenses/:id`**

`CreateExpenseDto` gains:

```ts
@IsOptional() @IsString()  vendor?:     string
@IsOptional() @IsNumber()  gstRate?:    number   // 5 | 12 | 18 | 28
@IsOptional() @IsNumber()  gstAmount?:  number   // computed by frontend, stored as-is
@IsOptional() @IsString()  tdsSection?: string
@IsOptional() @IsNumber()  tdsRate?:    number
```

**Auto-save category logic** — in `expenses.service.ts` `create()`: after creating the expense, if `dto.category` is not in `DEFAULT_EXPENSE_CATEGORIES`, upsert it into `user_expense_categories` for that user:

```ts
if (!DEFAULT_EXPENSE_CATEGORIES.includes(dto.category)) {
  await this.prisma.userExpenseCategory.upsert({
    where:  { userId_name: { userId, name: dto.category } },
    update: {},
    create: { userId, name: dto.category },
  })
}
```

### New endpoints

**`GET /expenses/categories`**

Returns merged category list for the authenticated user:

```ts
async getCategories(userId: string): Promise<string[]> {
  const custom = await this.prisma.userExpenseCategory.findMany({
    where:   { userId },
    orderBy: { name: 'asc' },
  })
  return [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...custom.map(c => c.name).filter(n => !DEFAULT_EXPENSE_CATEGORIES.includes(n)),
  ]
}
```

Response: `{ data: string[] }`

**`GET /expenses/export`**

Accepts the same query params as `GET /expenses` (`clientId`, `projectId`, `isBillable`, `isBilled`, `from`, `to`). Returns a CSV file.

Response headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="expenses-<label>.csv"
```

Filename label logic:
- If `from` + `to` provided: `YYYY-MM-DD_to_YYYY-MM-DD`
- Otherwise: `all`

CSV columns (in order):
```
Date, Category, Vendor, Description, Amount, GST Rate%, GST Amount, Net (excl. GST), TDS Section, TDS Rate%, Client, Project, Billable, Billed, Receipt URL
```

- `Net (excl. GST)` = `amount - (gstAmount ?? 0)`
- Empty cells for null/undefined fields
- Dates formatted as `DD/MM/YYYY` (Indian standard)
- Amounts as plain numbers with 2 decimal places (no ₹ symbol — Excel-friendly)
- First row is the header

The controller uses `@Res() res: Response` and pipes the CSV string directly:

```ts
@Get('export')
async exportCsv(@CurrentUser() user, @Query() query: QueryExpensesDto, @Res() res: Response) {
  const csv = await this.expenses.exportCsv(user.id, query)
  const label = query.from && query.to
    ? `${query.from}_to_${query.to}`
    : 'all'
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="expenses-${label}.csv"`)
  res.send(csv)
}
```

**Important:** `GET /expenses/export` must be registered BEFORE `GET /expenses/:id` in the controller so Express doesn't interpret `export` as an `:id` param.

---

## Frontend

### `useExpenses.ts` — hook updates

Add to `ExpenseFilters` type:
```ts
from?: string   // ISO date string YYYY-MM-DD
to?:   string
```

Add new hooks:
```ts
export function useExpenseCategories(): UseQueryResult<string[]>
// GET /expenses/categories

export function useExportExpenses(filters: ExpenseFilters): () => void
// Returns a trigger function. On call: fetches GET /expenses/export with current
// filters, receives blob, triggers browser download via a temporary <a> element.
```

Add to `Expense` type:
```ts
vendor?:     string | null
gstRate?:    number | null
gstAmount?:  number | null
tdsSection?: string | null
tdsRate?:    number | null
```

### `ExpensesPage.tsx` — form changes

The expense form gains the following fields (in addition to existing ones):

**Field order in the form:**

1. Category (combobox — see below) | Client
2. **Vendor** (text input, autocomplete) | Project
3. Description (full width)
4. Amount | Date
5. **GST checkbox row**: `<checkbox> This expense includes GST`
6. *(conditional on GST checked)*: GST Rate `<select>` (5% / 12% / 18% / 28%) | GST Amount (read-only, computed)
7. **TDS fields**: TDS Section (text input, placeholder "194J") | TDS Rate % (number input)
8. Receipt upload
9. Bill to client checkbox

**Category combobox behaviour:**
- Populated from `useExpenseCategories()`
- User can type to filter the list
- Typing a value not in the list shows an "Add '[value]'" option at the bottom
- Selecting it sets the category; the backend auto-saves it on expense creation
- Implementation: a simple `<datalist>` or controlled combobox using the existing `DropdownSelect` component extended to accept free text

**Vendor autocomplete behaviour:**
- Derives suggestions from `expenses.map(e => e.vendor).filter(Boolean)` — unique values from already-loaded expense list
- Plain `<input>` with a `<datalist>` of unique vendor strings
- No extra API call needed

**GST row behaviour:**
- Checkbox unchecked by default
- On check: reveals GST Rate select and read-only GST Amount field
- GST Amount = `parseFloat((amount * gstRate / 100).toFixed(2))`, recomputed on amount or rate change
- On uncheck: clears `gstRate` and `gstAmount` in form state

**TDS fields:**
- Always visible, both optional
- Helper text below: *"Only for contractor payments where you deduct TDS"*
- No checkbox gate

### `ExpensesPage.tsx` — filter bar + export

**Updated filter bar layout (single row, wraps on mobile):**
```
[All] [Unbilled] [Billed]   [All clients ▾]   [All time ▾]   [Export CSV]
```

**Date range dropdown options:**
```
All time          → clears from/to
This month        → 1st of current month → today
Last month        → 1st → last day of previous month
This quarter      → Indian quarters: Apr–Jun / Jul–Sep / Oct–Dec / Jan–Mar
This FY           → Apr 1 of current FY → Mar 31 of current FY
Last FY           → Apr 1 → Mar 31 of previous FY
Custom…           → reveals From | To date inputs inline below the filter row
```

Indian FY logic:
```ts
function currentFYStart(): Date {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(year, 3, 1) // April 1
}
```

The button label updates to reflect the active preset (e.g. "This FY ▾", "Last month ▾").

**Export CSV button:**
- Outlined style, sits at the right end of the filter row
- Disabled when `expenses.length === 0`
- On click: calls the `useExportExpenses` trigger with current filters
- Shows a brief loading spinner while the download request is in flight
- Filename reflects the active date preset (e.g. `expenses-this-fy.csv`)

**Totals row** (below filter bar, above the expense list):
```
₹X,XX,XXX total  ·  ₹Y,YY,YYY unbilled  ·  ₹Z,ZZ,ZZZ GST paid
```

- `GST paid` = `expenses.reduce((s, e) => s + (e.gstAmount ?? 0), 0)` across current filtered list
- Hidden when all three values are 0

---

## Edge Cases

| Scenario | Handling |
|----------|---------|
| User submits expense with GST rate but no GST amount | Frontend always computes and sends both together; backend accepts whatever is sent |
| `gstRate` is set but `amount` is 0 | `gstAmount` = 0 — valid, no special handling |
| Export with no date range | `from`/`to` omitted; filename is `expenses-all.csv` |
| Export with 0 results | Button is disabled — can't trigger |
| Category free-text is empty string | Frontend validation requires non-empty category — same as today |
| User enters a category matching a default (case-insensitive) | The combobox filters the existing list case-insensitively, so "software" would match "Software & Subscriptions" and not create a duplicate — deduplication is frontend-driven |
| Vendor autocomplete when expense list is empty or filtered to 0 | No suggestions shown — `<datalist>` is empty; user types freely, no error |
| `GET /expenses/export` route conflicts with `GET /expenses/:id` | Export route registered first in controller — Express resolves by declaration order |

---

## What Is NOT Changing

- `isBillable` / `isBilled` / `billExpenses` flow — untouched
- Receipt upload — untouched
- `CancelSubscriptionModal`, billing module — untouched
- Dark mode support — all new fields follow existing dark: variant patterns
- Invoice model — untouched (P&L views are sub-project C)
