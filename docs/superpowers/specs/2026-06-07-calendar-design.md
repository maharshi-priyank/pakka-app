# Calendar Page — Design Spec

**Date:** 2026-06-07
**Status:** Approved

---

## Goal

Replace the existing MeetingsPage with a full calendar view that shows pakka meetings, project deadlines, and events from connected Google Calendar / Outlook accounts — all in one place.

---

## Scope

**In scope:**
- New `CalendarPage` at `/app/calendar` (replaces `/app/meetings`, nav updated)
- Day / Week / Month view toggle
- Left panel: upcoming meetings list
- Right panel: calendar grid with color-coded events from 4 sources
- Backend unified `GET /calendar/events?from=&to=` endpoint
- Google Calendar event fetch (read) if `googleCalendarConnected`
- Outlook Calendar event fetch (read) if `outlookConnected`
- Deduplication of external events that match a pakka meeting
- Click event → detail sheet (read-only)

**Out of scope (later sprints):**
- Creating/editing meetings from calendar
- Deliverable deadlines (added once Deliverable model exists in Notes & Brief sprint)
- Two-way sync / webhooks from Google/Outlook
- Recurring event expansion

---

## Data Model

No new DB models. Uses existing:
- `Meeting` — `scheduledAt`, `durationMins`, `clientId`, `title`, `agenda`, `meetLink`, `googleEventId`, `outlookEventId`
- `Project` — `endDate`, `name`, `clientId`
- `User` — `googleCalendarConnected`, `outlookConnected`

---

## Backend

### New module: `CalendarModule`

**File:** `src/modules/calendar/calendar.controller.ts`
**File:** `src/modules/calendar/calendar.service.ts`
**File:** `src/modules/calendar/calendar.module.ts`

### Endpoint

```
GET /calendar/events?from=ISO8601&to=ISO8601
Authorization: Bearer <token>
```

**Response:**
```ts
interface CalendarEvent {
  id:           string       // unique, stable — prefixed: "meeting_<id>", "project_<id>", "google_<eventId>", "outlook_<eventId>"
  type:         'meeting' | 'project_deadline' | 'google_external' | 'outlook_external'
  title:        string
  start:        string       // ISO8601
  end:          string       // ISO8601
  allDay:       boolean      // true for project_deadline
  clientName?:  string
  projectName?: string
  meetLink?:    string
  agenda?:      string
  source:       'pakka' | 'google' | 'outlook'
}
```

**Merge logic (in order):**
1. Fetch pakka `Meeting` records where `scheduledAt` between `from`–`to` for `userId` — map to `type: 'meeting'`
2. Fetch `Project` records where `endDate` between `from`–`to` for `userId` — map to `type: 'project_deadline'`, `allDay: true`
3. If `user.googleCalendarConnected`: call `GoogleCalendarService.listEvents(userId, from, to)` — new method returning raw Google events. Filter out any whose `googleEventId` already exists in the pakka meetings set. Map remainder to `type: 'google_external'`
4. If `user.outlookConnected`: call `OutlookCalendarService.listEvents(userId, from, to)` — new method. Filter out any whose `outlookEventId` already exists in pakka meetings. Map to `type: 'outlook_external'`
5. Return merged, sorted by `start` ASC

**Error handling:** If Google/Outlook fetch fails (expired token, API error), log warning and return pakka-only events — never fail the whole request.

### New methods to add

**`GoogleCalendarService.listEvents(userId, from, to)`** — calls `calendar.events.list` with `timeMin`/`timeMax`, returns `{ id, title, start, end, meetLink }[]`

**`OutlookCalendarService.listEvents(userId, from, to)`** — calls MS Graph `/me/calendarView` with `startDateTime`/`endDateTime`, returns same shape.

---

## Frontend

### Route

`/app/calendar` — replaces `/app/meetings` in router and sidebar nav.

**Files:**
- `src/pages/app/CalendarPage.tsx` — new page (replaces `MeetingsPage.tsx`)
- `src/features/calendar/` — new feature directory
  - `components/UpcomingList.tsx`
  - `components/MonthGrid.tsx`
  - `components/WeekGrid.tsx`
  - `components/DayGrid.tsx`
  - `components/EventChip.tsx`
  - `components/EventDetailSheet.tsx`
  - `hooks/useCalendarEvents.ts`
  - `types.ts`

### Dependencies

Install `date-fns` — all date arithmetic (week starts, month grids, formatting). No heavy calendar library.

### Page layout

```
h-screen flex overflow-hidden
├── UpcomingList (w-[280px] shrink-0, border-r, overflow-y-auto)
└── main (flex-1 flex-col overflow-hidden)
    ├── Header bar (view toggle: Day|Week|Month, prev/next arrows, today button, date label)
    └── Calendar grid (flex-1 overflow-auto) — renders MonthGrid | WeekGrid | DayGrid
```

### View state

```ts
type CalendarView = 'day' | 'week' | 'month'
// Cursor = the "anchor" date for the current view
const [view, setView] = useState<CalendarView>('week')
const [cursor, setCursor] = useState<Date>(new Date())
```

Date range sent to API derived from `view` + `cursor`:
- `day`: `cursor` day start → end
- `week`: Monday of cursor's week → Sunday
- `month`: First day of month → last day (expanded to include partial first/last weeks for grid completeness)

### Data fetching

```ts
// hooks/useCalendarEvents.ts
useQuery({
  queryKey: ['calendar-events', view, cursor],
  queryFn: () => api.get('/calendar/events', { params: { from, to } }).then(r => r.data.data),
  staleTime: 2 * 60 * 1000,   // 2 min — external calendars don't need real-time
})
```

### Event colors

| Type | Background | Border | Text |
|---|---|---|---|
| `meeting` | `#EEF2FF` | `#6366F1` | `#4338CA` |
| `project_deadline` | `#FEF3C7` | `#F59E0B` | `#92400E` |
| `google_external` | `#DCFCE7` | `#16A34A` | `#14532D` |
| `outlook_external` | `#E0F2FE` | `#0284C7` | `#0C4A6E` |

### MonthGrid

- 6-row × 7-column grid
- Each cell: date number top-left, up to 3 `EventChip` components, "+N more" button if overflow
- Today's cell: highlighted background
- Days outside current month: dimmed text

### WeekGrid

- 7 columns (Mon–Sun header), time rows from 07:00–22:00 (1 hour = 64px)
- All-day row at top (project deadlines render here)
- Meetings rendered as absolutely-positioned blocks, height proportional to `durationMins`
- Overlap handling: side-by-side columns (calculate overlapping events, assign `left`/`width` percentages)

### DayGrid

- Single column, same time-slot structure as WeekGrid
- Full width for events

### UpcomingList

- Shows meetings only (not project deadlines or external events) for next 30 days
- Groups by relative time: "Today", "Tomorrow", "In N days", or formatted date
- Each item: meeting title, client name, time, source badge (Google/Outlook icon if external), join button if `meetLink`
- "Delayed" chip (red) if `scheduledAt` is in the past and meeting hasn't been marked done — compare `scheduledAt < now`

### EventDetailSheet

- Slide-in from right (`framer-motion` `x: '100%' → 0`)
- Shows: title, date/time, duration, client (link), project (link), agenda, attendees, meet link button
- For `google_external` / `outlook_external`: shows source badge, no client/project links
- For `project_deadline`: shows project name, link to project page, no time (all-day)

---

## Navigation Update

- Sidebar: rename "Meetings" → "Calendar", update icon to `Calendar` from lucide-react, route to `/app/calendar`
- Router: add `/app/calendar` route pointing to `CalendarPage`, keep `/app/meetings` redirect → `/app/calendar` to avoid broken bookmarks

---

## Self-review checklist (completed inline)

- [x] No TBDs or placeholders
- [x] All types defined (CalendarEvent interface)
- [x] Error handling specified (Google/Outlook fail gracefully)
- [x] Deduplication logic specified (by googleEventId/outlookEventId)
- [x] Date range derivation per view specified
- [x] No deliverables in scope (correct — belongs to next sprint)
- [x] UpcomingList and CalendarGrid are separate components with clear props
- [x] Route migration strategy included (redirect from old route)
