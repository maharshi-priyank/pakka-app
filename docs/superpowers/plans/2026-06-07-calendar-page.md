# Calendar Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MeetingsPage with a full Calendar page showing pakka meetings, project deadlines, and events from connected Google Calendar / Outlook accounts across Day / Week / Month views.

**Architecture:** A new `CalendarModule` in the API merges 4 event sources (pakka meetings, project endDates, Google Calendar API, Outlook Graph API) into a single `GET /calendar/events?from=&to=` endpoint, gracefully falling back to pakka-only data if external fetches fail. The frontend replaces `MeetingsPage` with a `CalendarPage` built from scratch using `date-fns` for date math — no heavy calendar library.

**Tech Stack:** NestJS (backend), Prisma, Google Calendar API (`googleapis`), MS Graph API (`fetch`), React 19, TanStack Query v5, `date-fns`, Framer Motion, Tailwind CSS, lucide-react.

---

## File Map

### API (pakka-api)

| Action | File |
|--------|------|
| Modify | `src/modules/meetings/google-calendar.service.ts` — add `listEvents` |
| Modify | `src/modules/meetings/outlook-calendar.service.ts` — add `listEvents` |
| Modify | `src/modules/meetings/meetings.module.ts` — export `GoogleCalendarService` |
| Create | `src/modules/calendar/calendar.module.ts` |
| Create | `src/modules/calendar/calendar.controller.ts` |
| Create | `src/modules/calendar/calendar.service.ts` |
| Create | `src/modules/calendar/dto/calendar-events-query.dto.ts` |
| Create | `src/modules/calendar/calendar.service.spec.ts` |
| Modify | `src/app.module.ts` — register `CalendarModule` |

### App (pakka-app)

| Action | File |
|--------|------|
| Create | `src/features/calendar/types.ts` |
| Create | `src/features/calendar/hooks/useCalendarEvents.ts` |
| Create | `src/features/calendar/components/EventChip.tsx` |
| Create | `src/features/calendar/components/MonthGrid.tsx` |
| Create | `src/features/calendar/components/WeekGrid.tsx` |
| Create | `src/features/calendar/components/DayGrid.tsx` |
| Create | `src/features/calendar/components/UpcomingList.tsx` |
| Create | `src/features/calendar/components/EventDetailSheet.tsx` |
| Create | `src/pages/app/CalendarPage.tsx` |
| Modify | `src/router/index.tsx` — add `/app/calendar`, redirect `/app/meetings` |
| Modify | `src/components/layout/Sidebar.tsx` — rename Meetings → Calendar |
| Modify | `src/components/layout/BottomNav.tsx` — rename Meetings → Calendar |

---

## Task 1: Add `listEvents` to GoogleCalendarService

**Files:**
- Modify: `pakka-api/src/modules/meetings/google-calendar.service.ts`

- [ ] **Step 1: Add `listEvents` method**

Open `src/modules/meetings/google-calendar.service.ts` and append this method before the closing `}` of the class:

```ts
async listEvents(userId: string, from: Date, to: Date): Promise<{ id: string; title: string; start: string; end: string; meetLink: string | null }[]> {
  try {
    const auth     = await this.googleAuth.getAuthorizedClient(userId);
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId:   'primary',
      timeMin:      from.toISOString(),
      timeMax:      to.toISOString(),
      singleEvents: true,
      maxResults:   100,
      fields:       'items(id,summary,start,end,hangoutLink,conferenceData)',
    });

    return (res.data.items ?? [])
      .filter(e => e.id && (e.start?.dateTime || e.start?.date))
      .map(e => ({
        id:       e.id!,
        title:    e.summary ?? 'Untitled',
        start:    e.start?.dateTime ?? e.start?.date ?? from.toISOString(),
        end:      e.end?.dateTime   ?? e.end?.date   ?? from.toISOString(),
        meetLink: e.hangoutLink
          ?? e.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri
          ?? null,
      }));
  } catch (err) {
    this.logger.warn(`Failed to list Google Calendar events: ${(err as Error).message}`);
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-api && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-api && git add src/modules/meetings/google-calendar.service.ts
git commit -m "feat(calendar): add listEvents to GoogleCalendarService"
```

---

## Task 2: Add `listEvents` to OutlookCalendarService

**Files:**
- Modify: `pakka-api/src/modules/meetings/outlook-calendar.service.ts`

- [ ] **Step 1: Add `listEvents` method**

Open `src/modules/meetings/outlook-calendar.service.ts` and append this method before the closing `}` of the class:

```ts
async listEvents(userId: string, from: Date, to: Date): Promise<{ id: string; title: string; start: string; end: string; meetLink: string | null }[]> {
  try {
    const token = await this.msAuth.getValidAccessToken(userId);
    const url   = `${GRAPH_BASE}/me/calendarView`
      + `?startDateTime=${encodeURIComponent(from.toISOString())}`
      + `&endDateTime=${encodeURIComponent(to.toISOString())}`
      + `&$select=id,subject,start,end,onlineMeeting`
      + `&$top=100`;

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      this.logger.warn(`Outlook calendarView ${res.status}: ${await res.text()}`);
      return [];
    }

    const data = await res.json() as {
      value: {
        id: string;
        subject: string;
        start: { dateTime: string };
        end:   { dateTime: string };
        onlineMeeting: { joinUrl: string } | null;
      }[]
    };

    return (data.value ?? []).map(e => ({
      id:       e.id,
      title:    e.subject ?? 'Untitled',
      start:    e.start.dateTime,
      end:      e.end.dateTime,
      meetLink: e.onlineMeeting?.joinUrl ?? null,
    }));
  } catch (err) {
    this.logger.warn(`Failed to list Outlook Calendar events: ${(err as Error).message}`);
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-api && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-api && git add src/modules/meetings/outlook-calendar.service.ts
git commit -m "feat(calendar): add listEvents to OutlookCalendarService"
```

---

## Task 3: Export GoogleCalendarService + create CalendarModule skeleton

**Files:**
- Modify: `pakka-api/src/modules/meetings/meetings.module.ts`
- Create: `pakka-api/src/modules/calendar/calendar.module.ts`
- Create: `pakka-api/src/modules/calendar/calendar.controller.ts`
- Create: `pakka-api/src/modules/calendar/calendar.service.ts`
- Create: `pakka-api/src/modules/calendar/dto/calendar-events-query.dto.ts`

- [ ] **Step 1: Export GoogleCalendarService from MeetingsModule**

In `src/modules/meetings/meetings.module.ts`, change the `exports` array:

```ts
exports: [MeetingsService, GoogleCalendarService, OutlookCalendarService],
```

- [ ] **Step 2: Create the query DTO**

Create `src/modules/calendar/dto/calendar-events-query.dto.ts`:

```ts
import { IsISO8601 } from 'class-validator';

export class CalendarEventsQueryDto {
  @IsISO8601()
  from: string;

  @IsISO8601()
  to: string;
}
```

- [ ] **Step 3: Create CalendarService stub**

Create `src/modules/calendar/calendar.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService }          from '../../prisma/prisma.service.js';
import { GoogleCalendarService }  from '../meetings/google-calendar.service.js';
import { OutlookCalendarService } from '../meetings/outlook-calendar.service.js';

export interface CalendarEvent {
  id:           string;
  type:         'meeting' | 'project_deadline' | 'google_external' | 'outlook_external';
  title:        string;
  start:        string;
  end:          string;
  allDay:       boolean;
  clientName?:  string;
  projectName?: string;
  meetLink?:    string;
  agenda?:      string;
  source:       'pakka' | 'google' | 'outlook';
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma:          PrismaService,
    private readonly googleCalendar:  GoogleCalendarService,
    private readonly outlookCalendar: OutlookCalendarService,
  ) {}

  async getEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    return [];  // implemented in Task 4
  }
}
```

- [ ] **Step 4: Create CalendarController**

Create `src/modules/calendar/calendar.controller.ts`:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard }          from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser }           from '../../common/decorators/current-user.decorator.js';
import { CalendarService }       from './calendar.service.js';
import { CalendarEventsQueryDto } from './dto/calendar-events-query.dto.js';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('events')
  async getEvents(
    @CurrentUser('id') userId: string,
    @Query() query: CalendarEventsQueryDto,
  ) {
    const from = new Date(query.from);
    const to   = new Date(query.to);
    return this.calendar.getEvents(userId, from, to);
  }
}
```

- [ ] **Step 5: Create CalendarModule**

Create `src/modules/calendar/calendar.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller.js';
import { CalendarService }    from './calendar.service.js';
import { MeetingsModule }     from '../meetings/meetings.module.js';
import { PrismaModule }       from '../../prisma/prisma.module.js';

@Module({
  imports:     [PrismaModule, MeetingsModule],
  controllers: [CalendarController],
  providers:   [CalendarService],
})
export class CalendarModule {}
```

- [ ] **Step 6: Register in app.module.ts**

In `src/app.module.ts`, add the import at the top:
```ts
import { CalendarModule } from './modules/calendar/calendar.module';
```

Then add `CalendarModule` to the `imports` array (after `MeetingsModule`):
```ts
MeetingsModule,
CalendarModule,
```

- [ ] **Step 7: Type-check**

```bash
cd pakka-api && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Smoke-test the empty endpoint**

```bash
cd pakka-api && npm run start:dev
# In another terminal (replace TOKEN with a valid JWT):
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/calendar/events?from=2026-06-01T00:00:00Z&to=2026-06-30T23:59:59Z"
```
Expected: `{"data":[],"statusCode":200}` (empty array — CalendarService returns `[]` stub).

- [ ] **Step 9: Commit**

```bash
cd pakka-api && git add src/modules/meetings/meetings.module.ts \
  src/modules/calendar/ \
  src/app.module.ts
git commit -m "feat(calendar): scaffold CalendarModule with empty getEvents stub"
```

---

## Task 4: Implement CalendarService.getEvents (merge + deduplicate)

**Files:**
- Modify: `pakka-api/src/modules/calendar/calendar.service.ts`
- Create: `pakka-api/src/modules/calendar/calendar.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/modules/calendar/calendar.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService, CalendarEvent } from './calendar.service';
import { PrismaService }          from '../../prisma/prisma.service';
import { GoogleCalendarService }  from '../meetings/google-calendar.service';
import { OutlookCalendarService } from '../meetings/outlook-calendar.service';

const mockPrisma = {
  meeting: { findMany: jest.fn() },
  project: { findMany: jest.fn() },
  user:    { findUnique: jest.fn() },
};
const mockGoogle  = { listEvents: jest.fn() };
const mockOutlook = { listEvents: jest.fn() };

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService,          useValue: mockPrisma  },
        { provide: GoogleCalendarService,  useValue: mockGoogle  },
        { provide: OutlookCalendarService, useValue: mockOutlook },
      ],
    }).compile();
    service = module.get(CalendarService);
  });

  const FROM = new Date('2026-06-01T00:00:00Z');
  const TO   = new Date('2026-06-30T23:59:59Z');

  it('returns pakka meetings as type=meeting', async () => {
    mockPrisma.meeting.findMany.mockResolvedValue([{
      id: 'm1', title: 'Kickoff', scheduledAt: new Date('2026-06-10T10:00:00Z'),
      durationMins: 60, agenda: null, meetLink: null,
      client: { name: 'Nike' }, lead: null,
    }]);
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ googleCalendarConnected: false, outlookConnected: false });

    const events = await service.getEvents('user1', FROM, TO);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('meeting');
    expect(events[0].id).toBe('meeting_m1');
    expect(events[0].clientName).toBe('Nike');
    expect(events[0].source).toBe('pakka');
  });

  it('returns project endDates as type=project_deadline with allDay=true', async () => {
    mockPrisma.meeting.findMany.mockResolvedValue([]);
    mockPrisma.project.findMany.mockResolvedValue([{
      id: 'p1', name: 'Brand Refresh', endDate: new Date('2026-06-20T00:00:00Z'),
      client: { name: 'Adidas' },
    }]);
    mockPrisma.user.findUnique.mockResolvedValue({ googleCalendarConnected: false, outlookConnected: false });

    const events = await service.getEvents('user1', FROM, TO);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('project_deadline');
    expect(events[0].id).toBe('project_p1');
    expect(events[0].allDay).toBe(true);
    expect(events[0].projectName).toBe('Brand Refresh');
  });

  it('deduplicates Google events that match a pakka meeting by googleEventId', async () => {
    mockPrisma.meeting.findMany.mockResolvedValue([{
      id: 'm1', title: 'Sync', scheduledAt: new Date('2026-06-10T10:00:00Z'),
      durationMins: 30, agenda: null, meetLink: 'https://meet.google.com/abc',
      googleEventId: 'google_abc', client: null, lead: null,
    }]);
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ googleCalendarConnected: true, outlookConnected: false });
    mockGoogle.listEvents.mockResolvedValue([
      { id: 'google_abc', title: 'Sync', start: '2026-06-10T10:00:00Z', end: '2026-06-10T10:30:00Z', meetLink: null },
      { id: 'google_xyz', title: 'External', start: '2026-06-11T14:00:00Z', end: '2026-06-11T15:00:00Z', meetLink: null },
    ]);

    const events = await service.getEvents('user1', FROM, TO);

    expect(events).toHaveLength(2);  // m1 + google_xyz (google_abc deduplicated)
    expect(events.find(e => e.id === 'google_google_abc')).toBeUndefined();
    expect(events.find(e => e.type === 'google_external')?.id).toBe('google_google_xyz');
  });

  it('returns pakka-only if Google fetch throws', async () => {
    mockPrisma.meeting.findMany.mockResolvedValue([{
      id: 'm1', title: 'Sync', scheduledAt: new Date('2026-06-10T10:00:00Z'),
      durationMins: 30, agenda: null, meetLink: null, googleEventId: null,
      client: null, lead: null,
    }]);
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({ googleCalendarConnected: true, outlookConnected: false });
    mockGoogle.listEvents.mockRejectedValue(new Error('token expired'));

    const events = await service.getEvents('user1', FROM, TO);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('meeting');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd pakka-api && npx jest src/modules/calendar/calendar.service.spec.ts --no-coverage
```
Expected: FAIL — `getEvents` returns `[]`.

- [ ] **Step 3: Implement getEvents**

Replace the `getEvents` stub in `src/modules/calendar/calendar.service.ts` with:

```ts
async getEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const [meetings, projects, user] = await Promise.all([
    this.prisma.meeting.findMany({
      where: {
        userId,
        scheduledAt: { gte: from, lte: to },
      },
      include: {
        client: { select: { name: true } },
        lead:   { select: { name: true } },
      },
    }),
    this.prisma.project.findMany({
      where: {
        userId,
        endDate: { gte: from, lte: to },
      },
      include: { client: { select: { name: true } } },
    }),
    this.prisma.user.findUnique({
      where:  { id: userId },
      select: { googleCalendarConnected: true, outlookConnected: true },
    }),
  ]);

  const events: CalendarEvent[] = [];

  // 1. Pakka meetings
  const googleEventIds  = new Set(meetings.map(m => m.googleEventId).filter(Boolean));
  const outlookEventIds = new Set(meetings.map(m => m.outlookEventId).filter(Boolean));

  for (const m of meetings) {
    const start = m.scheduledAt.toISOString();
    const end   = new Date(m.scheduledAt.getTime() + m.durationMins * 60_000).toISOString();
    events.push({
      id:          `meeting_${m.id}`,
      type:        'meeting',
      title:       m.title,
      start,
      end,
      allDay:      false,
      clientName:  m.client?.name,
      meetLink:    m.meetLink ?? undefined,
      agenda:      m.agenda  ?? undefined,
      source:      'pakka',
    });
  }

  // 2. Project deadlines
  for (const p of projects) {
    const day = p.endDate!.toISOString().slice(0, 10);
    events.push({
      id:          `project_${p.id}`,
      type:        'project_deadline',
      title:       `${p.name} — Deadline`,
      start:       `${day}T00:00:00.000Z`,
      end:         `${day}T23:59:59.000Z`,
      allDay:      true,
      projectName: p.name,
      clientName:  p.client?.name,
      source:      'pakka',
    });
  }

  // 3. Google Calendar (graceful fallback)
  if (user?.googleCalendarConnected) {
    try {
      const googleEvents = await this.googleCalendar.listEvents(userId, from, to);
      for (const e of googleEvents) {
        if (googleEventIds.has(e.id)) continue;  // deduplicate
        events.push({
          id:      `google_${e.id}`,
          type:    'google_external',
          title:   e.title,
          start:   e.start,
          end:     e.end,
          allDay:  false,
          meetLink: e.meetLink ?? undefined,
          source:  'google',
        });
      }
    } catch {
      // silent fallback — pakka-only
    }
  }

  // 4. Outlook Calendar (graceful fallback)
  if (user?.outlookConnected) {
    try {
      const outlookEvents = await this.outlookCalendar.listEvents(userId, from, to);
      for (const e of outlookEvents) {
        if (outlookEventIds.has(e.id)) continue;  // deduplicate
        events.push({
          id:      `outlook_${e.id}`,
          type:    'outlook_external',
          title:   e.title,
          start:   e.start,
          end:     e.end,
          allDay:  false,
          meetLink: e.meetLink ?? undefined,
          source:  'outlook',
        });
      }
    } catch {
      // silent fallback
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd pakka-api && npx jest src/modules/calendar/calendar.service.spec.ts --no-coverage
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Type-check**

```bash
cd pakka-api && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd pakka-api && git add src/modules/calendar/calendar.service.ts \
  src/modules/calendar/calendar.service.spec.ts
git commit -m "feat(calendar): implement CalendarService.getEvents with deduplication"
```

---

## Task 5: Install date-fns + create frontend types and hook

**Files:**
- Create: `pakka-app/src/features/calendar/types.ts`
- Create: `pakka-app/src/features/calendar/hooks/useCalendarEvents.ts`

- [ ] **Step 1: Install date-fns**

```bash
cd pakka-app && npm install date-fns
```
Expected: `date-fns` added to `package.json` dependencies.

- [ ] **Step 2: Create types.ts**

Create `src/features/calendar/types.ts`:

```ts
export type CalendarEventType =
  | 'meeting'
  | 'project_deadline'
  | 'google_external'
  | 'outlook_external'

export type CalendarEventSource = 'pakka' | 'google' | 'outlook'

export interface CalendarEvent {
  id:           string
  type:         CalendarEventType
  title:        string
  start:        string   // ISO8601
  end:          string   // ISO8601
  allDay:       boolean
  clientName?:  string
  projectName?: string
  meetLink?:    string
  agenda?:      string
  source:       CalendarEventSource
}

export type CalendarView = 'day' | 'week' | 'month'

// Colors per event type
export const EVENT_COLORS: Record<CalendarEventType, { bg: string; border: string; text: string }> = {
  meeting:          { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' },
  project_deadline: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  google_external:  { bg: '#DCFCE7', border: '#16A34A', text: '#14532D' },
  outlook_external: { bg: '#E0F2FE', border: '#0284C7', text: '#0C4A6E' },
}
```

- [ ] **Step 3: Create useCalendarEvents hook**

Create `src/features/calendar/hooks/useCalendarEvents.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subDays, addDays,
} from 'date-fns'
import api from '@/lib/api'
import type { CalendarEvent, CalendarView } from '../types'

function getRange(view: CalendarView, cursor: Date): { from: Date; to: Date } {
  if (view === 'day') {
    return { from: startOfDay(cursor), to: endOfDay(cursor) }
  }
  if (view === 'week') {
    return {
      from: startOfWeek(cursor, { weekStartsOn: 1 }),
      to:   endOfWeek(cursor,   { weekStartsOn: 1 }),
    }
  }
  // month — expand to include partial first/last weeks for grid completeness
  const monthStart = startOfMonth(cursor)
  const monthEnd   = endOfMonth(cursor)
  return {
    from: startOfWeek(monthStart, { weekStartsOn: 1 }),
    to:   endOfWeek(monthEnd,     { weekStartsOn: 1 }),
  }
}

export function useCalendarEvents(view: CalendarView, cursor: Date) {
  const { from, to } = getRange(view, cursor)

  return useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', view, from.toISOString(), to.toISOString()],
    queryFn:  () =>
      api
        .get('/calendar/events', { params: { from: from.toISOString(), to: to.toISOString() } })
        .then(r => r.data.data as CalendarEvent[]),
    staleTime: 2 * 60 * 1000,
    placeholderData: [],
  })
}

// Also export getRange for use in CalendarPage
export { getRange }
```

- [ ] **Step 4: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd pakka-app && git add src/features/calendar/ package.json package-lock.json
git commit -m "feat(calendar): add date-fns, CalendarEvent types and useCalendarEvents hook"
```

---

## Task 6: EventChip component

**Files:**
- Create: `pakka-app/src/features/calendar/components/EventChip.tsx`

- [ ] **Step 1: Create EventChip**

Create `src/features/calendar/components/EventChip.tsx`:

```tsx
import { Video, AlertCircle } from 'lucide-react'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'

interface Props {
  event:   CalendarEvent
  onClick: (event: CalendarEvent) => void
  compact?: boolean  // true in month grid — truncates title
}

export default function EventChip({ event, onClick, compact = false }: Props) {
  const colors = EVENT_COLORS[event.type]

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(event) }}
      className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight flex items-center gap-1 hover:brightness-95 transition-all"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
      title={event.title}
    >
      {event.type === 'project_deadline' && (
        <AlertCircle size={10} className="shrink-0" />
      )}
      {event.meetLink && event.type !== 'project_deadline' && (
        <Video size={10} className="shrink-0" />
      )}
      <span className={compact ? 'truncate' : ''}>{event.title}</span>
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-app && git add src/features/calendar/components/EventChip.tsx
git commit -m "feat(calendar): add EventChip component"
```

---

## Task 7: MonthGrid component

**Files:**
- Create: `pakka-app/src/features/calendar/components/MonthGrid.tsx`

- [ ] **Step 1: Create MonthGrid**

Create `src/features/calendar/components/MonthGrid.tsx`:

```tsx
import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  parseISO, format,
} from 'date-fns'
import type { CalendarEvent } from '../types'
import EventChip from './EventChip'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE = 3

interface Props {
  cursor:   Date
  events:   CalendarEvent[]
  onEvent:  (event: CalendarEvent) => void
}

export default function MonthGrid({ cursor, events, onEvent }: Props) {
  const [overflowDay, setOverflowDay] = useState<string | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(cursor),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const key = format(parseISO(e.start), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#EAECF0] dark:border-[#26283A]">
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}>
        {days.map(day => {
          const key        = format(day, 'yyyy-MM-dd')
          const dayEvents  = eventsByDay.get(key) ?? []
          const visible    = dayEvents.slice(0, MAX_VISIBLE)
          const overflow   = dayEvents.length - MAX_VISIBLE
          const inMonth    = isSameMonth(day, cursor)
          const todayCell  = isToday(day)

          return (
            <div
              key={key}
              className={[
                'border-b border-r border-[#EAECF0] dark:border-[#26283A] p-1.5 min-h-[90px] flex flex-col gap-0.5',
                !inMonth && 'opacity-40',
              ].filter(Boolean).join(' ')}
            >
              <span className={[
                'text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full self-end mb-0.5',
                todayCell
                  ? 'bg-[#4F46E5] text-white'
                  : 'text-[#344054] dark:text-[#C2C8D8]',
              ].join(' ')}>
                {format(day, 'd')}
              </span>

              {visible.map(e => (
                <EventChip key={e.id} event={e} onClick={onEvent} compact />
              ))}

              {overflow > 0 && (
                <button
                  onClick={() => setOverflowDay(overflowDay === key ? null : key)}
                  className="text-[10px] font-semibold text-[#6366F1] hover:text-[#4F46E5] text-left px-1"
                >
                  +{overflow} more
                </button>
              )}

              {/* Overflow popup */}
              {overflowDay === key && (
                <div className="absolute z-30 mt-1 w-52 bg-white dark:bg-[#1A1B23] rounded-xl shadow-xl border border-[#EAECF0] dark:border-[#26283A] p-2 flex flex-col gap-1">
                  {dayEvents.map(e => (
                    <EventChip key={e.id} event={e} onClick={ev => { setOverflowDay(null); onEvent(ev) }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-app && git add src/features/calendar/components/MonthGrid.tsx
git commit -m "feat(calendar): add MonthGrid component"
```

---

## Task 8: WeekGrid component

**Files:**
- Create: `pakka-app/src/features/calendar/components/WeekGrid.tsx`

- [ ] **Step 1: Create WeekGrid**

Create `src/features/calendar/components/WeekGrid.tsx`:

```tsx
import { useMemo } from 'react'
import {
  startOfWeek, addDays, isSameDay, isToday,
  parseISO, format, getHours, getMinutes,
} from 'date-fns'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'

const HOUR_START  = 7    // 7am
const HOUR_END    = 22   // 10pm
const HOURS       = HOUR_END - HOUR_START   // 15
const SLOT_HEIGHT = 64  // px per hour

interface PositionedEvent {
  event:       CalendarEvent
  top:         number
  height:      number
  left:        string
  width:       string
}

function positionEvents(events: CalendarEvent[]): PositionedEvent[] {
  // Sort by start time
  const timed = events
    .filter(e => !e.allDay)
    .map(e => ({ event: e, start: parseISO(e.start), end: parseISO(e.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  // Assign columns for overlapping events
  const columns: { event: CalendarEvent; start: Date; end: Date; col: number }[] = []
  let maxCol = 0

  for (const item of timed) {
    const overlapping = columns.filter(c => c.start < item.end && c.end > item.start)
    const usedCols    = new Set(overlapping.map(c => c.col))
    let col = 0
    while (usedCols.has(col)) col++
    columns.push({ ...item, col })
    if (col > maxCol) maxCol = col
  }

  const totalCols = maxCol + 1

  return columns.map(({ event, start, end, col }) => {
    const startDecimal = getHours(start) + getMinutes(start) / 60
    const endDecimal   = getHours(end)   + getMinutes(end)   / 60
    const top    = Math.max(0, (startDecimal - HOUR_START) * SLOT_HEIGHT)
    const height = Math.max(SLOT_HEIGHT / 4, (endDecimal - startDecimal) * SLOT_HEIGHT)

    // find how many cols overlap at this event's position
    const sameGroup = columns.filter(c => c.start < end && c.end > start)
    const groupCols = Math.max(...sameGroup.map(c => c.col)) + 1

    return {
      event,
      top,
      height,
      left:  `${(col / groupCols) * 100}%`,
      width: `${(1  / groupCols) * 100}%`,
    }
  })
}

interface Props {
  cursor:  Date
  events:  CalendarEvent[]
  onEvent: (event: CalendarEvent) => void
}

export default function WeekGrid({ cursor, events, onEvent }: Props) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 })
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours     = Array.from({ length: HOURS }, (_, i) => HOUR_START + i)

  const allDayEvents = useMemo(
    () => events.filter(e => e.allDay),
    [events],
  )

  const positionedByDay = useMemo(
    () => days.map(day =>
      positionEvents(events.filter(e => !e.allDay && isSameDay(parseISO(e.start), day)))
    ),
    [events, days],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header row */}
      <div className="flex border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
        <div className="w-14 shrink-0" />
        {days.map((day, i) => (
          <div key={i} className="flex-1 py-2 text-center border-l border-[#EAECF0] dark:border-[#26283A]">
            <div className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase">{format(day, 'EEE')}</div>
            <div className={[
              'text-[18px] font-bold mx-auto w-9 h-9 flex items-center justify-center rounded-full',
              isToday(day) ? 'bg-[#4F46E5] text-white' : 'text-[#101828] dark:text-[#ECEEF3]',
            ].join(' ')}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-[#EAECF0] dark:border-[#26283A] shrink-0 min-h-[28px]">
          <div className="w-14 shrink-0 text-[10px] text-[#98A2B3] text-right pr-2 pt-1">all-day</div>
          {days.map((day, i) => {
            const dayAllDay = allDayEvents.filter(e => isSameDay(parseISO(e.start), day))
            const colors    = dayAllDay[0] ? EVENT_COLORS[dayAllDay[0].type] : null
            return (
              <div key={i} className="flex-1 border-l border-[#EAECF0] dark:border-[#26283A] px-1 py-0.5 flex flex-col gap-0.5">
                {dayAllDay.map(e => (
                  <button
                    key={e.id}
                    onClick={() => onEvent(e)}
                    className="w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded truncate"
                    style={{ background: EVENT_COLORS[e.type].bg, color: EVENT_COLORS[e.type].text, border: `1px solid ${EVENT_COLORS[e.type].border}` }}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div className="flex flex-1 overflow-y-auto">
        <div className="w-14 shrink-0 relative">
          {hours.map(h => (
            <div key={h} style={{ height: SLOT_HEIGHT }} className="relative">
              <span className="absolute -top-2 right-2 text-[10px] text-[#98A2B3] dark:text-[#545C74] font-medium">
                {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
              </span>
            </div>
          ))}
        </div>

        {days.map((day, i) => (
          <div
            key={i}
            className="flex-1 border-l border-[#EAECF0] dark:border-[#26283A] relative"
            style={{ height: HOURS * SLOT_HEIGHT }}
          >
            {/* Hour lines */}
            {hours.map(h => (
              <div
                key={h}
                style={{ top: (h - HOUR_START) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                className="absolute inset-x-0 border-b border-[#F2F4F7] dark:border-[#26283A]"
              />
            ))}

            {/* Events */}
            {positionedByDay[i].map(({ event, top, height, left, width }) => {
              const colors = EVENT_COLORS[event.type]
              return (
                <button
                  key={event.id}
                  onClick={() => onEvent(event)}
                  className="absolute text-left px-1.5 py-1 rounded overflow-hidden hover:brightness-95 transition-all"
                  style={{
                    top,
                    height:  Math.max(height, 20),
                    left,
                    width,
                    background:  colors.bg,
                    border:      `1px solid ${colors.border}`,
                    color:       colors.text,
                    zIndex:      5,
                  }}
                >
                  <p className="text-[11px] font-semibold truncate leading-tight">{event.title}</p>
                  {height >= 40 && event.clientName && (
                    <p className="text-[10px] opacity-70 truncate">{event.clientName}</p>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-app && git add src/features/calendar/components/WeekGrid.tsx
git commit -m "feat(calendar): add WeekGrid with overlap handling"
```

---

## Task 9: DayGrid component

**Files:**
- Create: `pakka-app/src/features/calendar/components/DayGrid.tsx`

- [ ] **Step 1: Create DayGrid**

Create `src/features/calendar/components/DayGrid.tsx`:

```tsx
import { useMemo } from 'react'
import { parseISO, isSameDay, getHours, getMinutes } from 'date-fns'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'

const HOUR_START  = 7
const HOUR_END    = 22
const HOURS       = HOUR_END - HOUR_START
const SLOT_HEIGHT = 64

interface Props {
  cursor:  Date
  events:  CalendarEvent[]
  onEvent: (event: CalendarEvent) => void
}

export default function DayGrid({ cursor, events, onEvent }: Props) {
  const hours    = Array.from({ length: HOURS }, (_, i) => HOUR_START + i)

  const dayEvents = useMemo(
    () => events.filter(e => isSameDay(parseISO(e.start), cursor)),
    [events, cursor],
  )

  const allDay = dayEvents.filter(e => e.allDay)
  const timed  = dayEvents.filter(e => !e.allDay)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* All-day strip */}
      {allDay.length > 0 && (
        <div className="border-b border-[#EAECF0] dark:border-[#26283A] px-4 py-2 flex flex-col gap-1 shrink-0">
          {allDay.map(e => (
            <button
              key={e.id}
              onClick={() => onEvent(e)}
              className="text-left text-[12px] font-semibold px-2 py-1 rounded"
              style={{ background: EVENT_COLORS[e.type].bg, color: EVENT_COLORS[e.type].text, border: `1px solid ${EVENT_COLORS[e.type].border}` }}
            >
              {e.title}
            </button>
          ))}
        </div>
      )}

      {/* Time grid */}
      <div className="flex flex-1 overflow-y-auto">
        {/* Hour labels */}
        <div className="w-16 shrink-0 relative">
          {hours.map(h => (
            <div key={h} style={{ height: SLOT_HEIGHT }} className="relative">
              <span className="absolute -top-2 right-3 text-[11px] text-[#98A2B3] font-medium">
                {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
              </span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="flex-1 relative border-l border-[#EAECF0] dark:border-[#26283A]" style={{ height: HOURS * SLOT_HEIGHT }}>
          {hours.map(h => (
            <div key={h} style={{ top: (h - HOUR_START) * SLOT_HEIGHT, height: SLOT_HEIGHT }} className="absolute inset-x-0 border-b border-[#F2F4F7] dark:border-[#26283A]" />
          ))}

          {timed.map(e => {
            const start        = parseISO(e.start)
            const end          = parseISO(e.end)
            const startDecimal = getHours(start) + getMinutes(start) / 60
            const endDecimal   = getHours(end)   + getMinutes(end)   / 60
            const top          = Math.max(0, (startDecimal - HOUR_START) * SLOT_HEIGHT)
            const height       = Math.max(SLOT_HEIGHT / 4, (endDecimal - startDecimal) * SLOT_HEIGHT)
            const colors       = EVENT_COLORS[e.type]

            return (
              <button
                key={e.id}
                onClick={() => onEvent(e)}
                className="absolute left-2 right-2 text-left px-3 py-2 rounded-lg hover:brightness-95 transition-all overflow-hidden"
                style={{ top, height, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, zIndex: 5 }}
              >
                <p className="text-[13px] font-semibold truncate">{e.title}</p>
                {height >= 48 && e.clientName && (
                  <p className="text-[11px] opacity-70">{e.clientName}</p>
                )}
                {height >= 64 && e.agenda && (
                  <p className="text-[11px] opacity-60 truncate mt-1">{e.agenda}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd pakka-app && npx tsc --noEmit
git add src/features/calendar/components/DayGrid.tsx
git commit -m "feat(calendar): add DayGrid component"
```

---

## Task 10: UpcomingList component

**Files:**
- Create: `pakka-app/src/features/calendar/components/UpcomingList.tsx`

- [ ] **Step 1: Create UpcomingList**

Create `src/features/calendar/components/UpcomingList.tsx`:

```tsx
import { useMemo } from 'react'
import { parseISO, isToday, isTomorrow, differenceInCalendarDays, isPast, format } from 'date-fns'
import { Video, ExternalLink } from 'lucide-react'
import type { CalendarEvent } from '../types'

function relativeLabel(date: Date): { text: string; past: boolean } {
  if (isPast(date) && !isToday(date)) return { text: 'Delayed', past: true }
  if (isToday(date))    return { text: 'Today',    past: false }
  if (isTomorrow(date)) return { text: 'Tomorrow', past: false }
  const days = differenceInCalendarDays(date, new Date())
  return { text: `In ${days} days`, past: false }
}

interface Props {
  events:  CalendarEvent[]   // all events from current query window — filter to meetings only here
  onEvent: (event: CalendarEvent) => void
}

export default function UpcomingList({ events, onEvent }: Props) {
  const meetings = useMemo(
    () => events
      .filter(e => e.type === 'meeting' || e.type === 'google_external' || e.type === 'outlook_external')
      .filter(e => !e.allDay)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 30),
    [events],
  )

  if (meetings.length === 0) {
    return (
      <div className="p-5 text-center">
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No upcoming meetings</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-3">
      {meetings.map(e => {
        const date  = parseISO(e.start)
        const label = relativeLabel(date)

        return (
          <button
            key={e.id}
            onClick={() => onEvent(e)}
            className="w-full text-left rounded-xl p-3 hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors border border-transparent hover:border-[#EAECF0] dark:hover:border-[#26283A]"
          >
            <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">{e.title}</p>

            {e.clientName && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{e.clientName}</p>
            )}

            <p className="text-[11px] text-[#667085] dark:text-[#8B92A8] mt-1">
              {format(date, 'h:mm aaa')}
            </p>

            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={[
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                label.past
                  ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                  : isToday(date)
                    ? 'bg-[#ECFDF3] text-[#027A48] border border-[#A7F3D0]'
                    : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8] border border-[#EAECF0] dark:border-[#26283A]',
              ].join(' ')}>
                {label.text}
              </span>

              {e.meetLink && (
                <a
                  href={e.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={ev => ev.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE]"
                >
                  <Video size={9} />
                  Join
                </a>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd pakka-app && npx tsc --noEmit
git add src/features/calendar/components/UpcomingList.tsx
git commit -m "feat(calendar): add UpcomingList component"
```

---

## Task 11: EventDetailSheet component

**Files:**
- Create: `pakka-app/src/features/calendar/components/EventDetailSheet.tsx`

- [ ] **Step 1: Create EventDetailSheet**

Create `src/features/calendar/components/EventDetailSheet.tsx`:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { X, Video, Calendar, Clock, Building2, FolderKanban, AlignLeft } from 'lucide-react'
import { parseISO, format, differenceInMinutes } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'

const SOURCE_LABEL: Record<CalendarEvent['source'], string> = {
  pakka:   'ClearWork',
  google:  'Google Calendar',
  outlook: 'Outlook Calendar',
}

interface Props {
  event:   CalendarEvent | null
  onClose: () => void
}

export default function EventDetailSheet({ event, onClose }: Props) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/10"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[360px] bg-white dark:bg-[#16171E] border-l border-[#EAECF0] dark:border-[#26283A] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-[#EAECF0] dark:border-[#26283A]">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: EVENT_COLORS[event.type].bg,
                      color:      EVENT_COLORS[event.type].text,
                      border:     `1px solid ${EVENT_COLORS[event.type].border}`,
                    }}
                  >
                    {SOURCE_LABEL[event.source]}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-snug">
                  {event.title}
                </h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#21222D] transition-colors shrink-0">
                <X size={16} className="text-[#667085]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

              {/* Date/time */}
              {!event.allDay && (
                <div className="flex items-start gap-3">
                  <Calendar size={15} className="text-[#98A2B3] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">
                      {format(parseISO(event.start), 'EEEE, d MMMM yyyy')}
                    </p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
                      {format(parseISO(event.start), 'h:mm aaa')}
                      {' – '}
                      {format(parseISO(event.end), 'h:mm aaa')}
                      {' · '}
                      {differenceInMinutes(parseISO(event.end), parseISO(event.start))} min
                    </p>
                  </div>
                </div>
              )}

              {event.allDay && (
                <div className="flex items-center gap-3">
                  <Calendar size={15} className="text-[#98A2B3] shrink-0" />
                  <p className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">
                    {format(parseISO(event.start), 'd MMMM yyyy')} · All day
                  </p>
                </div>
              )}

              {/* Client */}
              {event.clientName && (
                <div className="flex items-center gap-3">
                  <Building2 size={15} className="text-[#98A2B3] shrink-0" />
                  <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">{event.clientName}</p>
                </div>
              )}

              {/* Project */}
              {event.projectName && (
                <div className="flex items-center gap-3">
                  <FolderKanban size={15} className="text-[#98A2B3] shrink-0" />
                  <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">{event.projectName}</p>
                </div>
              )}

              {/* Agenda */}
              {event.agenda && (
                <div className="flex items-start gap-3">
                  <AlignLeft size={15} className="text-[#98A2B3] shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] whitespace-pre-wrap leading-relaxed">{event.agenda}</p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {event.meetLink && (
              <div className="px-5 pb-5 pt-3 border-t border-[#EAECF0] dark:border-[#26283A]">
                <a
                  href={event.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-semibold rounded-xl transition-colors"
                >
                  <Video size={14} />
                  Join meeting
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd pakka-app && npx tsc --noEmit
git add src/features/calendar/components/EventDetailSheet.tsx
git commit -m "feat(calendar): add EventDetailSheet slide-in panel"
```

---

## Task 12: CalendarPage shell

**Files:**
- Create: `pakka-app/src/pages/app/CalendarPage.tsx`

- [ ] **Step 1: Create CalendarPage**

Create `src/pages/app/CalendarPage.tsx`:

```tsx
import { useState } from 'react'
import {
  addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths,
  format, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCalendarEvents } from '@/features/calendar/hooks/useCalendarEvents'
import type { CalendarView, CalendarEvent } from '@/features/calendar/types'
import UpcomingList     from '@/features/calendar/components/UpcomingList'
import MonthGrid        from '@/features/calendar/components/MonthGrid'
import WeekGrid         from '@/features/calendar/components/WeekGrid'
import DayGrid          from '@/features/calendar/components/DayGrid'
import EventDetailSheet from '@/features/calendar/components/EventDetailSheet'

const VIEW_LABELS: CalendarView[] = ['day', 'week', 'month']

function formatCursorLabel(view: CalendarView, cursor: Date): string {
  if (view === 'day')   return format(cursor, 'EEEE, d MMMM yyyy')
  if (view === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    const end   = endOfWeek(cursor,   { weekStartsOn: 1 })
    return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  }
  return format(cursor, 'MMMM yyyy')
}

function navigate(view: CalendarView, cursor: Date, dir: 1 | -1): Date {
  if (view === 'day')   return dir === 1 ? addDays(cursor, 1)    : subDays(cursor, 1)
  if (view === 'week')  return dir === 1 ? addWeeks(cursor, 1)   : subWeeks(cursor, 1)
  return dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1)
}

export default function CalendarPage() {
  const [view,          setView]          = useState<CalendarView>('week')
  const [cursor,        setCursor]        = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const { data: events = [], isLoading } = useCalendarEvents(view, cursor)

  return (
    <div className="h-screen flex overflow-hidden bg-white dark:bg-[#16171E]">

      {/* ── Left: upcoming list ── */}
      <div className="w-[280px] shrink-0 border-r border-[#EAECF0] dark:border-[#26283A] flex flex-col overflow-hidden">
        <div className="px-4 pt-5 pb-3 border-b border-[#EAECF0] dark:border-[#26283A]">
          <h2 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] uppercase tracking-wide">Upcoming</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <UpcomingList events={events} onEvent={setSelectedEvent} />
        </div>
      </div>

      {/* ── Right: calendar grid ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">

          {/* View toggle */}
          <div className="flex items-center bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg p-0.5">
            {VIEW_LABELS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={[
                  'px-3 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all',
                  view === v
                    ? 'bg-white dark:bg-[#2A2B36] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054]',
                ].join(' ')}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor(c => navigate(view, c, -1))}
              className="p-1.5 rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#21222D] transition-colors"
            >
              <ChevronLeft size={16} className="text-[#667085]" />
            </button>
            <button
              onClick={() => setCursor(c => navigate(view, c, 1))}
              className="p-1.5 rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#21222D] transition-colors"
            >
              <ChevronRight size={16} className="text-[#667085]" />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={() => setCursor(new Date())}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] border border-[#D0D5DD] dark:border-[#3D4258] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
          >
            Today
          </button>

          {/* Date label */}
          <span className="text-[14px] font-semibold text-[#101828] dark:text-[#ECEEF3] ml-1">
            {formatCursorLabel(view, cursor)}
          </span>

          {/* Loading indicator */}
          {isLoading && (
            <span className="ml-auto text-[11px] text-[#98A2B3]">Loading…</span>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-hidden">
          {view === 'month' && <MonthGrid cursor={cursor} events={events} onEvent={setSelectedEvent} />}
          {view === 'week'  && <WeekGrid  cursor={cursor} events={events} onEvent={setSelectedEvent} />}
          {view === 'day'   && <DayGrid   cursor={cursor} events={events} onEvent={setSelectedEvent} />}
        </div>
      </div>

      {/* Detail sheet */}
      <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd pakka-app && git add src/pages/app/CalendarPage.tsx
git commit -m "feat(calendar): add CalendarPage shell"
```

---

## Task 13: Router + sidebar nav update

**Files:**
- Modify: `pakka-app/src/router/index.tsx`
- Modify: `pakka-app/src/components/layout/Sidebar.tsx`
- Modify: `pakka-app/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Update router**

In `src/router/index.tsx`, find the `/app/meetings` route (line ~201):

```ts
// BEFORE:
{
  path: '/app/meetings',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/MeetingsPage')
    return { Component }
  },
},
```

Replace with a `/app/calendar` route and a redirect from the old path:

```ts
{
  path: '/app/calendar',
  lazy: async () => {
    const { default: Component } = await import('@/pages/app/CalendarPage')
    return { Component }
  },
},
{
  path: '/app/meetings',
  element: <Navigate to="/app/calendar" replace />,
},
```

Make sure `Navigate` is already imported from `react-router-dom` at the top of the file (it is — it's imported on line 1).

- [ ] **Step 2: Update Sidebar.tsx**

In `src/components/layout/Sidebar.tsx`, find the meetings nav item (line ~31):

```ts
// BEFORE:
{ id: 'meetings', icon: CalendarDays, label: 'Meetings', href: '/app/meetings', tourId: undefined },
```

Replace with:

```ts
{ id: 'calendar', icon: CalendarDays, label: 'Calendar', href: '/app/calendar', tourId: undefined },
```

Also update the group definition (line ~40):

```ts
// BEFORE:
{ label: 'PRODUCTIVITY', ids: ['meetings', 'forms', 'automations'] },

// AFTER:
{ label: 'PRODUCTIVITY', ids: ['calendar', 'forms', 'automations'] },
```

- [ ] **Step 3: Update BottomNav.tsx**

In `src/components/layout/BottomNav.tsx`, find the meetings entry (line ~23):

```ts
// BEFORE:
{ icon: CalendarDays, label: 'Meetings', href: '/app/meetings' },

// AFTER:
{ icon: CalendarDays, label: 'Calendar', href: '/app/calendar' },
```

- [ ] **Step 4: Type-check**

```bash
cd pakka-app && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Smoke-test navigation**

Start the dev server:
```bash
cd pakka-app && npm run dev
```
- Navigate to `http://localhost:5173/app/calendar` — CalendarPage should render
- Navigate to `http://localhost:5173/app/meetings` — should redirect to `/app/calendar`
- Sidebar "Calendar" item should be highlighted when on `/app/calendar`

- [ ] **Step 6: Commit**

```bash
cd pakka-app && git add src/router/index.tsx \
  src/components/layout/Sidebar.tsx \
  src/components/layout/BottomNav.tsx
git commit -m "feat(calendar): replace Meetings nav with Calendar, add /app/meetings redirect"
```

---

## Task 14: End-to-end verification + push

- [ ] **Step 1: Run API tests**

```bash
cd pakka-api && npx jest --no-coverage
```
Expected: all tests pass including the new `calendar.service.spec.ts`.

- [ ] **Step 2: Type-check both repos**

```bash
cd pakka-api && npx tsc --noEmit && echo "API OK"
cd pakka-app && npx tsc --noEmit && echo "APP OK"
```
Expected: `API OK` and `APP OK` with no errors.

- [ ] **Step 3: Manual end-to-end check**

With both servers running (`npm run start:dev` in pakka-api, `npm run dev` in pakka-app):

1. Open `/app/calendar` — page renders with two panels
2. Week view shows current week with time grid
3. Switch to Month view — 6-week grid renders, today is highlighted
4. Switch to Day view — single column time grid renders
5. Prev/Next navigation moves the cursor correctly in all three views
6. "Today" button resets cursor to now
7. If a meeting exists in the DB: it shows as an indigo chip; clicking it opens the detail sheet; sheet shows client name, time, join button if meetLink set
8. If a project with endDate in range exists: amber chip in all-day row (week/day) or all-day strip
9. If Google Calendar is connected in Settings: green chips appear for external events not already in pakka
10. Navigate to `/app/meetings` — redirects to `/app/calendar`

- [ ] **Step 4: Push both repos**

```bash
cd pakka-api && git push
cd pakka-app && git push
```

---

## Self-Review

**Spec coverage:**
- [x] Replace MeetingsPage at `/app/calendar` — Task 12, 13
- [x] Day / Week / Month views — Tasks 7, 8, 9; CalendarPage view toggle
- [x] Left panel upcoming list — Task 10
- [x] 4 event sources merged — Task 4
- [x] Deduplication by googleEventId/outlookEventId — Task 4 + tests
- [x] Graceful fallback if Google/Outlook fails — Task 4 (try/catch) + test
- [x] `date-fns` installed — Task 5
- [x] EventChip color-coded by source — Task 6
- [x] WeekGrid overlap handling — Task 8 (positionEvents column algorithm)
- [x] All-day row in WeekGrid for project deadlines — Task 8
- [x] EventDetailSheet with join button — Task 11
- [x] Redirect from `/app/meetings` — Task 13
- [x] Sidebar + BottomNav updated — Task 13

**Type consistency:** `CalendarEvent` defined in `types.ts` (Task 5), used consistently in all components. `EVENT_COLORS` co-located in `types.ts`. `getRange` exported from hook for potential reuse.

**No placeholders:** All code blocks are complete and self-contained.
