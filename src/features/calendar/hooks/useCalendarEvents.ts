import {
  startOfDay,   endOfDay,
  startOfWeek,  endOfWeek,
  startOfMonth, endOfMonth,
} from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CalendarEvent, CalendarView } from '../types'

function getRange(view: CalendarView, cursor: Date): { from: Date; to: Date } {
  switch (view) {
    case 'day':
      return { from: startOfDay(cursor), to: endOfDay(cursor) }
    case 'week':
      return {
        from: startOfWeek(cursor, { weekStartsOn: 1 }),
        to:   endOfWeek(cursor,   { weekStartsOn: 1 }),
      }
    case 'month': {
      const monthStart = startOfMonth(cursor)
      const monthEnd   = endOfMonth(cursor)
      return {
        from: startOfWeek(monthStart, { weekStartsOn: 1 }),
        to:   endOfWeek(monthEnd,     { weekStartsOn: 1 }),
      }
    }
  }
}

export function useCalendarEvents(view: CalendarView, cursor: Date) {
  const { from, to } = getRange(view, cursor)

  return useQuery<CalendarEvent[]>({
    queryKey:  ['calendar-events', view, from.toISOString(), to.toISOString()],
    queryFn:   () =>
      api.get('/calendar/events', {
        params: { from: from.toISOString(), to: to.toISOString() },
      }).then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
  })
}

export { getRange }
