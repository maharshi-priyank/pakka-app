# ClearWork — System Optimisation Notes

> Staff-engineer-level audit of frontend, backend, and infrastructure for scale.  
> Written against the actual codebase — every issue points to a specific file and line.

---

## The Core Problem

Four of our busiest pages fetch **up to 500 records** and do all filtering in the browser. The client detail page loads a client's entire history in one query. The tasks list has no pagination at all. The database has no indexes on the most-filtered columns. These are not theoretical concerns — they will become visible to users at ~50 active clients, ~100 leads, or ~200 invoices.

---

## 1. Critical — Will break at moderate scale

### 1.1 `limit: 500` anti-pattern (Frontend)

**Files:** `LeadsPage.tsx:58`, `InvoicesPage.tsx:56`, `ContractsPage.tsx:65`, `ProposalsPage.tsx:79`

All four pages fetch up to 500 records upfront and then filter client-side with `useMemo`. Every search keystroke, every stage filter, every archive toggle re-renders over the entire 500-item array in the browser.

**What breaks:** At 200+ leads, Kanban render takes 300–500ms. At 500 invoices, the page load transfers 100KB+ of JSON on every navigation.

**Fix:** Move all filtering server-side. Pass `search`, `status`, `stage` as query params to the API. The API already supports these (`QueryLeadsDto`, `QueryClientsDto`). Set `limit: 25` or `limit: 50`. Use cursor- or page-based pagination with a "Load more" button or infinite scroll.

```ts
// Before (bad)
const { data } = useLeads({ limit: 500 })
const displayed = useMemo(() => allLeads.filter(...client-side...), [allLeads, filters])

// After (good)
const { data } = useLeads({ limit: 50, search, stage, source, page })
// displayed = data.items — no client-side filter needed
```

---

### 1.2 Tasks list has no pagination (Backend)

**File:** `tasks.service.ts → list()`

`TasksService.list()` calls `findMany` with only a `where` clause and no `take`/`skip`. A user with 300 completed tasks gets all 300 on every page load — including when they navigate to a project's tasks tab.

**Fix:** Add `take: 100` as an immediate guard. Proper fix: add `page`/`limit` to `ListTasksQuery`, or filter by `status !== COMPLETED` by default with an opt-in to show completed tasks.

---

### 1.3 `ClientsService.findOne` loads unbounded history (Backend)

**File:** `clients.service.ts → findOne()`

When a client detail page loads, a single Prisma query includes:
- All proposals (full objects)
- All contracts
- All invoices
- All leads
- All meetings
- All projects — and for **each project**: all time entries + all billable expenses

A client with 5 projects × 200 time entries = 1,000 time entry rows in one API response. This query will time out in production on active clients.

**Fix:** Remove `timeEntries` and `expenses` from the `findOne` include. Fetch them lazily when the user opens the Time or Expenses tab. The tabs already exist — just move to separate API calls.

---

### 1.4 Missing database indexes on hot columns (Database)

**File:** `prisma/schema.prisma`

Current indexes cover `Task` (userId, projectId, columnId, assigneeId), `TimeEntry` (userId, projectId), `TaskBoard` (userId, projectId), and `BoardColumn` (boardId) — but the most-queried business models have **zero indexes**:

| Model | Missing indexes | Impact |
|---|---|---|
| `Client` | `userId`, `archivedAt` | Full seq scan on every client list |
| `Lead` | `userId`, `stage`, `archivedAt` | Slow Kanban load as leads grow |
| `Invoice` | `userId`, `status`, `dueDate` | Slow invoice list + overdue payment cron |
| `Proposal` | `userId`, `status` | Slow proposals page |
| `Contract` | `userId`, `status` | Slow contracts page |
| `Project` | `userId`, `status` | Slow project list |
| `Meeting` | `userId`, `clientId` | Slow client detail + upcoming meetings |
| `Expense` | (missing `clientId`, `projectId` is there) | Slow client expense rollup |
| `ClientNote` | `userId`, `clientId` | Slow client notes tab |

**Fix — composite indexes (equality columns first, range/sort columns last):**

```prisma
model Client {
  @@index([userId, archivedAt])  // list + archive toggle
}

model Lead {
  @@index([userId, archivedAt, stage])  // Kanban board
  @@index([userId, followUpAt])         // follow-up reminders
  @@index([clientId])                   // FK — Postgres does NOT auto-index
}

model Invoice {
  @@index([userId, status])    // invoice list filter
  @@index([userId, dueDate])   // overdue cron query
  @@index([clientId])          // FK
  @@index([projectId])         // FK
}

model Proposal {
  @@index([userId, status])
  @@index([clientId])  // FK
  @@index([projectId]) // FK
}

model Contract {
  @@index([userId, status])
  @@index([clientId])  // FK
  @@index([projectId]) // FK
}

model Project {
  @@index([userId, status])
  @@index([clientId])  // FK
}

model Meeting {
  @@index([userId, clientId])
}

model ClientNote {
  @@index([userId, clientId])
}
```

**Partial indexes for sparse columns** — smaller and faster than full composite when most rows are non-archived:

```sql
-- Run in Supabase SQL editor (partial indexes not supported in Prisma schema DSL)
CREATE INDEX CONCURRENTLY idx_clients_active ON clients(user_id) WHERE archived_at IS NULL;
CREATE INDEX CONCURRENTLY idx_leads_active   ON leads(user_id, stage) WHERE archived_at IS NULL;
CREATE INDEX CONCURRENTLY idx_invoices_open  ON invoices(user_id, due_date) WHERE status IN ('SENT','OVERDUE');
```

---

### 1.5 Foreign key columns have no indexes (Database)

**File:** `prisma/schema.prisma`

**Critical:** Postgres does NOT automatically create indexes on foreign key columns. Every `@relation(fields: [clientId])` column needs an explicit `@@index([clientId])` — otherwise a join or filter on `clientId` causes a full sequential scan on the child table.

Unindexed FK columns in the current schema that will be hit on joins:

| Child table | FK column | Triggered by |
|---|---|---|
| `Proposal` | `clientId`, `projectId`, `leadId` | Client detail page, project proposals tab |
| `Contract` | `clientId`, `projectId` | Client detail page |
| `Invoice` | `clientId`, `projectId`, `parentInvoiceId` | Client invoices tab, recurring invoice lookup |
| `Lead` | `clientId`, `projectId` | Client leads, project leads |
| `Meeting` | `clientId`, `projectId` | Client meetings tab |
| `Expense` | `clientId` | Client expense rollup |
| `ClientNote` | `clientId` | Client notes tab |
| `Attachment` | (multiple FKs) | Any entity with attachments |
| `AutomationExecution` | `ruleId` | Automation history |

**Detection query** (run in Supabase SQL editor to find ALL unindexed FK columns at once):

```sql
SELECT
  conrelid::regclass AS table_name,
  a.attname          AS column_name
FROM pg_constraint c
JOIN pg_attribute   a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute ia ON ia.attrelid = i.indrelid
                        AND ia.attnum = ANY(i.indkey)
    WHERE i.indrelid = c.conrelid
      AND ia.attnum = a.attnum
  )
ORDER BY table_name, column_name;
```

**Fix:** Add the `@@index([clientId])`, `@@index([projectId])` etc. lines from section 1.4 to the Prisma schema, then run `prisma migrate` (or the Supabase-safe `prisma db execute` equivalent). The FK indexes are already included in the 1.4 block above.

---

### 1.6 OFFSET pagination degrades at depth (Backend)

**Files:** `clients.service.ts`, `leads.service.ts`, `invoices.service.ts`, `proposals.service.ts`, `contracts.service.ts`

All services use `skip = (page - 1) * limit` OFFSET pagination. Postgres executes OFFSET by reading and discarding the first N rows on every query. Page 10 with `limit: 50` reads 500 rows just to discard them.

At moderate scale: page 20 of an invoice list reads 1,000 rows before returning 50. At page 50 it reads 2,500 rows. Performance degrades linearly with depth — O(N) where N = page × limit.

**Cursor-based pagination (O(1) at any depth):**

```ts
// Service — cursor-based
async findAll(userId: string, dto: { limit: number; cursor?: string }) {
  const items = await this.prisma.invoice.findMany({
    where:   { userId, ...(dto.cursor && { id: { gt: dto.cursor } }) },
    orderBy: { id: 'asc' },
    take:    dto.limit + 1,  // fetch one extra to detect hasNextPage
  })
  const hasNextPage = items.length > dto.limit
  return {
    items:       hasNextPage ? items.slice(0, -1) : items,
    nextCursor:  hasNextPage ? items[items.length - 2].id : null,
  }
}

// Frontend — TanStack Query infinite scroll
const query = useInfiniteQuery({
  queryKey:          [INVOICES_KEY, filters],
  queryFn:           ({ pageParam }) => api.get('/invoices', { params: { cursor: pageParam, limit: 50 } }).then(r => r.data.data),
  getNextPageParam:  (last) => last.nextCursor ?? undefined,
})
```

**When to migrate:** After the `limit: 500` anti-pattern is fixed (1.1), the short-term OFFSET pagination with `limit: 50` is fine until the data grows past ~10k rows per user. Cursor migration is a medium-term improvement, not an emergency.

---

### 1.7 `Invoice.lineItems` is unindexed JSON (Database)

**File:** `prisma/schema.prisma` — `lineItems Json` on the `Invoice` model

If any query ever filters or searches inside `lineItems` (e.g., "find invoices containing a specific service description"), it runs a full table scan across the JSON blob in every row.

The Prisma schema cannot declare GIN indexes. Must be applied manually in Supabase:

```sql
-- Supabase SQL editor
CREATE INDEX CONCURRENTLY idx_invoices_line_items_gin ON invoices USING gin(line_items);
```

**When needed:** Only if a search-by-line-item feature is built. Not urgent today, but worth noting before the data grows large.

---

## 2. High Priority — Noticeable at 50+ active users

### 2.1 No virtual scrolling on any list

**Files:** `ClientsPage.tsx`, `LeadsPage.tsx` (table mode), `InvoicesPage.tsx`, `ContractsPage.tsx`, `ProposalsPage.tsx`

Every list renders all rows directly in the DOM. At 100+ visible rows, scrolling becomes janky on mid-range hardware (common among Indian freelancer segment).

**Fix (short-term):** Enforce server-side pagination (see 1.1) — this solves the symptom by limiting rows to 25–50 per page.  
**Fix (long-term):** Use `@tanstack/react-virtual` for the leads Kanban columns where cardscount per column can be high. Add `overflow-y: scroll; max-height: Xpx` to column containers with a virtual row renderer.

---

### 2.2 Leads Kanban renders all cards at once

**File:** `LeadsKanban` component

The Kanban renders every lead card in every column simultaneously. Even with `limit: 500` removed, a column with 30+ cards creates 30 full card components in the DOM at mount.

**Fix:** Cap each column at 10 visible cards with a "Show more (N)" button per column. This is a common Kanban UX pattern (Linear, Trello both do this) and reduces initial DOM size by 70–90%.

---

### 2.3 Every mutation refetches the full list

**Pattern across all hooks**

After archive/unarchive/delete, hooks call `invalidateQueries({ queryKey: [KEY] })` which triggers a full re-fetch. With `limit: 500` this re-fetches 500 rows on every single action.

**Fix (short-term):** Once pagination is in place (see 1.1), the re-fetch cost drops to 25–50 rows — acceptable.  
**Fix (long-term):** Use optimistic updates via `setQueryData` for archive/unarchive operations since these are reversible and low-risk. This gives instant UI feedback with no network round-trip.

```ts
// Optimistic archive example
onMutate: async (clientId) => {
  await qc.cancelQueries({ queryKey: [CLIENTS_KEY] })
  const prev = qc.getQueryData([CLIENTS_KEY])
  qc.setQueryData([CLIENTS_KEY], (old: any) => ({
    ...old,
    clients: old.clients.map((c: Client) =>
      c.id === clientId ? { ...c, archivedAt: new Date().toISOString() } : c
    ),
  }))
  return { prev }
},
onError: (_err, _id, ctx) => qc.setQueryData([CLIENTS_KEY], ctx?.prev),
```

---

### 2.4 Plan limit check on every create adds a DB round-trip (Backend)

**Files:** `clients.service.ts → create()`, `leads.service.ts → create()`

Every client/lead create first fetches the user record to check the plan, then counts existing records, then creates. That's 3 serial DB queries on a hot write path.

**Fix:** Cache the user's plan in the JWT payload (it's already in `effectivePlan`) and re-check only when the token is refreshed. Or cache plan data in-memory with a 5-minute TTL per `userId` using a NestJS `@Injectable()` cache map. This removes 2 DB queries from every create.

---

### 2.5 EventEmitter is synchronous — automation delays API responses (Backend)

**Files:** `clients.service.ts`, `leads.service.ts`, `proposals.service.ts` — any `.emit()` call

`this.eventEmitter.emit('lead.created', ...)` runs synchronously. If an automation listener (e.g., send welcome email) does async work inside a sync handler, it either blocks or silently swallows errors.

**Fix:** Make all automation processing fire-and-forget. In the automation listener, wrap logic in `setImmediate(() => { ... })` or ensure the event handler is `async` with proper error boundary. Response to the user should not wait on automation side-effects.

---

### 2.6 Reports queries have no caching and no date-range index

**File:** `reports.service.ts`

The P&L and revenue reports run full-table aggregations on invoices, expenses, and time entries every time the Reports page loads. No memoisation, no cache. A user with 2 years of data runs the same expensive query every navigation.

**Fix (short-term):** Add `staleTime: 5 * 60_000` (5 minutes) to report queries on the frontend. Reports don't need to be real-time.  
**Fix (long-term):** Add a composite index on `(userId, createdAt)` for Invoice, Expense, and TimeEntry so date-range queries use an index scan instead of a sequential scan. Consider materialising monthly aggregates into a summary table that gets invalidated on each new invoice/payment.

---

## 3. Medium Priority — Quality and maintainability

### 3.1 `staleTime` is inconsistent and often missing

**Files:** Various `use*.ts` hooks

| Hook | staleTime | Problem |
|---|---|---|
| `useLeads` | 30s | Refetches on every tab switch |
| `useClients` | 60s | Reasonable |
| `useProposals` | 30s | Refetches on every tab switch |
| `useInvoices` | (none) | Always stale — refetches on every render |
| `useTasks` | 30s | OK |
| Most others | (none set) | Default 0 = always stale |

**Fix:** Set a global `defaultOptions.queries.staleTime` in the QueryClient config. 60 seconds is the right default for this app — user data doesn't change from another tab in under a minute. Override down to 0 only for real-time concerns (messages, notifications).

```ts
// In query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,   // 1 minute default
      gcTime:    5 * 60_000,
      retry:     1,
    },
  },
})
```

---

### 3.2 `ClientsService.remove()` runs 5 separate COUNT queries

**File:** `clients.service.ts → remove()`

```ts
const [proposals, contracts, invoices, projects, meetings] = await Promise.all([
  this.prisma.proposal.count(...),
  this.prisma.contract.count(...),
  this.prisma.invoice.count(...),
  this.prisma.project.count(...),
  this.prisma.meeting.count(...),
])
```

Five separate queries run in parallel (good use of `Promise.all`), but this could be replaced with a single query using the existing `_count` include already used in `findAll`. Minor issue, but worth noting.

---

### 3.3 No global error boundary on the frontend

**File:** `App.tsx` or router root

Unhandled errors in any page component crash the whole app silently. There's no `<ErrorBoundary>` wrapping the app shell.

**Fix:** Wrap the router outlet in a React ErrorBoundary that shows a "Something went wrong — reload" UI instead of a blank white screen.

---

### 3.4 No search debounce on the client side

**Files:** `ClientsPage.tsx`, `LeadsPage.tsx`, possibly others

Search input changes trigger a new API request on every keystroke (or in the leads case, a re-render over 500 items). The client-side filter is cheap but the API call is not.

**Fix:** Once server-side search is in place (see 1.1), debounce the search input with a 300ms delay before updating the query param.

```ts
const [searchInput, setSearchInput] = useState('')
const debouncedSearch = useDebounce(searchInput, 300)
const { data } = useClients(debouncedSearch || undefined)
```

---

## 4. Infrastructure

### 4.0 No connection pooling — direct Postgres connections (Critical at 20+ concurrent users)

**File:** `pakka-api/.env.example`

The `DATABASE_URL` connects directly to Supabase Postgres (`postgresql://USER:PASSWORD@HOST:5432/postgres`). There is no PgBouncer or Supabase pooler URL in the config.

**Why this matters:** Every NestJS request that awaits a Prisma query holds an open Postgres connection. Each connection costs ~1–3MB of RAM on the Postgres server. Supabase's free/pro tiers cap at ~60–200 connections. At 20 concurrent API requests — which is very reachable on a busy day — the connection pool exhausts and new requests start failing with `too many connections`.

**Fix — use Supabase's built-in PgBouncer (transaction mode):**

```ini
# .env — replace the direct connection with the pooler URL from Supabase dashboard
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

```prisma
# prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // used by prisma migrate, not by the app
}
```

`connection_limit=1` is correct for PgBouncer transaction mode — Prisma opens only one connection per instance, and the pooler multiplexes it across Postgres connections efficiently.

**Impact:** Supabase's pooler handles hundreds of client connections on top of 10–20 Postgres connections. Effective from the day you ship. The `DIRECT_URL` is only used for schema migrations, not live traffic.

---

### 4.1 Single Fly.io instance — no horizontal scaling config

The API deploys to Fly.io but likely runs a single instance. At 50+ concurrent users the API will queue requests.

**Recommended:** Add `min_machines_running = 1` and `auto_stop_machines = false` in `fly.toml` to keep one machine always warm. Add `[http_service.concurrency] soft_limit = 25 hard_limit = 50` to enable auto-scaling when load exceeds 25 concurrent connections.

---

### 4.2 No HTTP caching headers on list endpoints

API list responses return no `Cache-Control`, `ETag`, or `Last-Modified` headers. Every request bypasses any CDN or browser cache.

**Recommended:** For read-heavy list endpoints (clients, leads, proposals), add `Cache-Control: private, max-age=30` — this allows the browser to serve from cache on back-navigation without a network round-trip. NestJS interceptor is the right place to add this.

---

### 4.3 No Redis / memory cache for aggregations

Expensive aggregations (pipeline value, P&L totals, GST summaries) re-run against Postgres on every request. At 10+ concurrent users all viewing reports, this creates lock contention on Postgres.

**Short-term:** Frontend `staleTime` of 5 minutes (see 3.1) is the cheapest fix.  
**Long-term:** Add a NestJS `CacheModule` backed by in-process Map (no Redis needed at this scale) with a 5-minute TTL per userId on report endpoints.

---

## Priority Order

| # | Issue | Effort | Impact |
|---|---|---|---|
| 1 | Switch to Supabase pooler URL (PgBouncer) | XS | **Critical** — exhausts connections at 20 concurrent users |
| 2 | Add missing DB indexes (composite + FK columns) | XS | **Critical** — 100–1000× query speedup |
| 3 | Remove `limit: 500` — server-side filtering | M | Critical |
| 4 | Paginate tasks list | S | High |
| 5 | Remove unbounded includes from `ClientsService.findOne` | S | High |
| 6 | Add partial indexes for `archivedAt`, `status` | XS | High — faster active-record queries |
| 7 | Global `staleTime: 60_000` default | XS | Medium |
| 8 | Search debounce | XS | Medium |
| 9 | Optimistic updates for archive/unarchive | M | Medium |
| 10 | Kanban column cap (10 cards + Show more) | S | Medium |
| 11 | Report query `staleTime` (5 min) | XS | Medium |
| 12 | Error boundary | XS | Low-medium |
| 13 | Fly.io scaling config | XS | Medium |
| 14 | EventEmitter fire-and-forget | S | Medium |
| 15 | Migrate OFFSET → cursor-based pagination | M | Medium (future scale) |
| 16 | GIN index on `Invoice.lineItems` | XS | Low (only if line-item search is built) |

**XS = <1hr, S = half day, M = 1–2 days**

---

## Quick Wins (do today, < 1hr each)

These four changes require no code review, no tests, no migration risk:

1. **Supabase pooler URL** — change `DATABASE_URL` in production env to use port `6543` + `?pgbouncer=true&connection_limit=1`, add `DIRECT_URL` for migrations
2. **DB composite indexes** — add `@@index` lines to Prisma schema, run `prisma db execute` with the generated SQL
3. **Partial indexes** — 3 SQL statements in Supabase SQL editor, run with `CONCURRENTLY` (zero downtime)
4. **Global staleTime** — one line change in `query-client.ts`

Together these four changes deliver the most backend performance improvement per hour of work.

---

*Generated from codebase audit — June 2026. Incorporates Supabase Postgres best practices: FK indexing, cursor pagination, connection pooling, partial indexes, GIN indexing. Revisit when MAU exceeds 200.*
