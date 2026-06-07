import { useState } from 'react'
import {
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  format, startOfWeek, endOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCalendarEvents } from '@/features/calendar/hooks/useCalendarEvents'
import { useQueryClient } from '@tanstack/react-query'
import MonthGrid        from '@/features/calendar/components/MonthGrid'
import WeekGrid         from '@/features/calendar/components/WeekGrid'
import DayGrid          from '@/features/calendar/components/DayGrid'
import UpcomingList     from '@/features/calendar/components/UpcomingList'
import EventDetailSheet from '@/features/calendar/components/EventDetailSheet'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'
import type { CalendarView, CalendarEvent } from '@/features/calendar/types'

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'day',   label: 'Day'   },
  { key: 'week',  label: 'Week'  },
  { key: 'month', label: 'Month' },
]

function getPeriodLabel(view: CalendarView, cursor: Date): { title: string; subtitle: string } {
  switch (view) {
    case 'day':
      return {
        title:    format(cursor, 'EEEE, d'),
        subtitle: format(cursor, 'MMMM yyyy'),
      }
    case 'week': {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 })
      const we = endOfWeek(cursor,   { weekStartsOn: 1 })
      return {
        title:    format(cursor, 'MMMM yyyy'),
        subtitle: `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`,
      }
    }
    case 'month':
      return {
        title:    format(cursor, 'MMMM yyyy'),
        subtitle: `${format(new Date(cursor.getFullYear(), cursor.getMonth(), 1), 'MMM d')} – ${format(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), 'MMM d, yyyy')}`,
      }
  }
}

function navigate(view: CalendarView, cursor: Date, dir: 1 | -1): Date {
  switch (view) {
    case 'day':   return dir === 1 ? addDays(cursor, 1)   : subDays(cursor, 1)
    case 'week':  return dir === 1 ? addWeeks(cursor, 1)  : subWeeks(cursor, 1)
    case 'month': return dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1)
  }
}

export default function CalendarPage() {
  const [view,          setView]          = useState<CalendarView>('week')
  const [cursor,        setCursor]        = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [addOpen,       setAddOpen]       = useState(false)

  const qc = useQueryClient()
  const { data: events = [], isLoading } = useCalendarEvents(view, cursor)

  const { title, subtitle } = getPeriodLabel(view, cursor)

  function handleMeetingCreated() {
    setAddOpen(false)
    qc.invalidateQueries({ queryKey: ['calendar-events'] })
    qc.invalidateQueries({ queryKey: ['meetings'] })
  }

  return (
    <div className="h-full flex overflow-hidden bg-white">

      {/* ── Left panel: Upcoming ─────────────────────────────────────── */}
      <div className="w-[268px] shrink-0 border-r border-[#EAECF0] flex flex-col overflow-hidden bg-[#FAFAFA]">

        {/* Add Meeting button */}
        <div className="px-4 pt-5 pb-4">
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center justify-center gap-2 h-9 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-semibold rounded-xl transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Meeting
          </button>
        </div>

        {/* Date badge */}
        <div className="px-4 pb-4 flex items-end gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-14 bg-white border border-[#EAECF0] rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider leading-none">
              {format(new Date(), 'MMM')}
            </span>
            <span className="text-[22px] font-black text-[#0F172A] leading-tight">
              {format(new Date(), 'd')}
            </span>
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#0F172A]">{format(new Date(), 'EEEE')}</div>
            <div className="text-[11px] text-[#94A3B8]">{format(new Date(), 'MMMM d, yyyy')}</div>
          </div>
        </div>

        <div className="h-px bg-[#EAECF0] mx-4 mb-1" />

        <UpcomingList events={events} onEventClick={setSelectedEvent} />
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header bar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[#EAECF0] shrink-0">

          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-black text-[#0F172A] leading-tight">{title}</h2>
            <p className="text-[11px] text-[#94A3B8] leading-none mt-0.5">{subtitle}</p>
          </div>

          {/* Nav + Today */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCursor(c => navigate(view, c, -1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCursor(new Date())}
              className="px-2.5 h-7 text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCursor(c => navigate(view, c, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[#F4F6FB] rounded-lg p-0.5">
            {VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={[
                  'px-3 h-6 text-[12px] font-semibold rounded-md transition-all',
                  view === v.key
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#374151]',
                ].join(' ')}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Loading spinner */}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-[#E4E7EC] border-t-indigo-500 rounded-full animate-spin" />
          )}

          {/* Add Meeting (desktop shortcut in header too) */}
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 h-8 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[12.5px] font-semibold rounded-xl transition-colors"
          >
            <Plus size={13} strokeWidth={2.5} />
            Add Meeting
          </button>
        </div>

        {/* Calendar grid fills the rest */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'month' && (
            <MonthGrid
              cursor={cursor}
              events={events}
              onEventClick={setSelectedEvent}
              onDayClick={d => { setCursor(d); setView('day') }}
            />
          )}
          {view === 'week' && (
            <WeekGrid
              cursor={cursor}
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}
          {view === 'day' && (
            <DayGrid
              cursor={cursor}
              events={events}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      </div>

      {/* Detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Schedule meeting modal */}
      <ScheduleCallModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleMeetingCreated}
      />
    </div>
  )
}
