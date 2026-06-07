import { useState, useRef } from 'react'
import {
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  format, startOfWeek, endOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, List } from 'lucide-react'
import { useCalendarEvents } from '@/features/calendar/hooks/useCalendarEvents'
import { useQueryClient } from '@tanstack/react-query'
import MonthGrid         from '@/features/calendar/components/MonthGrid'
import WeekGrid          from '@/features/calendar/components/WeekGrid'
import DayGrid           from '@/features/calendar/components/DayGrid'
import UpcomingList      from '@/features/calendar/components/UpcomingList'
import EventDetailSheet  from '@/features/calendar/components/EventDetailSheet'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'
import type { CalendarView, CalendarEvent } from '@/features/calendar/types'

// Views shown in the toggle — 'upcoming' is mobile-only (hidden on lg+)
const GRID_VIEWS: { key: CalendarView; label: string; short: string }[] = [
  { key: 'day',   label: 'Day',   short: 'D' },
  { key: 'week',  label: 'Week',  short: 'W' },
  { key: 'month', label: 'Month', short: 'M' },
]

function getPeriodLabel(view: CalendarView, cursor: Date): { title: string; subtitle: string } {
  switch (view) {
    case 'upcoming':
      return { title: 'Upcoming', subtitle: '' }
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

function navigateCursor(view: CalendarView, cursor: Date, dir: 1 | -1): Date {
  switch (view) {
    case 'upcoming': return cursor
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

  const qc          = useQueryClient()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const { data: events = [], isLoading } = useCalendarEvents(view, cursor)
  const { title, subtitle } = getPeriodLabel(view, cursor)

  function goNext() { setCursor(c => navigateCursor(view, c, 1)) }
  function goPrev() { setCursor(c => navigateCursor(view, c, -1)) }

  function handleMeetingCreated() {
    setAddOpen(false)
    qc.invalidateQueries({ queryKey: ['calendar-events'] })
    qc.invalidateQueries({ queryKey: ['meetings'] })
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (view !== 'upcoming' && Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 52) {
      dx < 0 ? goNext() : goPrev()
    }
  }

  const isUpcoming = view === 'upcoming'

  return (
    <div className="h-full flex overflow-hidden bg-white">

      {/* ── Left panel — desktop only ─────────────────────────────────── */}
      <div className="hidden lg:flex w-[260px] shrink-0 border-r border-[#EAECF0] flex-col overflow-hidden bg-[#FAFAFA]">
        {/* Today badge */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-14 bg-white border border-[#EAECF0] rounded-xl shadow-sm shrink-0">
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

        <UpcomingList
          events={events}
          onEventClick={setSelectedEvent}
        />
      </div>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <div className="shrink-0 border-b border-[#EAECF0] flex items-center gap-2 px-3 sm:px-5 py-2.5">

          {/* Period title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] sm:text-[15px] font-black text-[#0F172A] leading-tight truncate">{title}</h2>
            {subtitle && <p className="hidden sm:block text-[11px] text-[#94A3B8] leading-none mt-0.5">{subtitle}</p>}
          </div>

          {/* Nav arrows + Today — hidden when upcoming view active */}
          {!isUpcoming && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={goPrev}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] active:bg-[#E8EDF5] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCursor(new Date())}
                className="px-2 sm:px-3 h-7 text-[11.5px] sm:text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E8EDF5] rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] active:bg-[#E8EDF5] transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-[#F4F6FB] rounded-lg p-0.5 shrink-0">
            {/* Grid views (D/W/M) — always visible */}
            {GRID_VIEWS.map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={[
                  'h-6 text-[11.5px] sm:text-[12px] font-semibold rounded-md transition-all px-1.5 sm:px-3',
                  view === v.key
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#64748B] hover:text-[#374151]',
                ].join(' ')}
              >
                <span className="sm:hidden">{v.short}</span>
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}

            {/* List/Upcoming — mobile only */}
            <button
              onClick={() => setView('upcoming')}
              className={[
                'lg:hidden h-6 px-1.5 rounded-md transition-all flex items-center',
                view === 'upcoming'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#374151]',
              ].join(' ')}
              title="Upcoming"
            >
              <List size={13} />
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="w-3.5 h-3.5 border-2 border-[#E4E7EC] border-t-indigo-500 rounded-full animate-spin shrink-0" />
          )}

          {/* Add Meeting button */}
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 h-7 sm:h-8 bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.97] text-white text-[12px] sm:text-[12.5px] font-semibold rounded-xl transition-all shrink-0"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Meeting</span>
          </button>
        </div>

        {/* Calendar body */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {view === 'upcoming' && (
            <div className="flex-1 overflow-y-auto">
              <UpcomingList events={events} onEventClick={setSelectedEvent} />
            </div>
          )}
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

      {/* FAB — mobile only, hidden when upcoming view is active (list already visible) */}
      {!isUpcoming && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-4 z-30 lg:hidden w-12 h-12 bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all"
          aria-label="Add Meeting"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* Detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {/* Schedule modal */}
      <ScheduleCallModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={handleMeetingCreated}
      />
    </div>
  )
}
