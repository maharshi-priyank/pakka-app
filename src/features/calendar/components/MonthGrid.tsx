import { useState } from 'react'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, format, parseISO, isSameDay,
} from 'date-fns'
import EventChip from './EventChip'
import type { CalendarEvent } from '../types'

const MAX_VISIBLE = 3

interface Props {
  cursor:       Date
  events:       CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?:  (date: Date) => void
}

interface OverflowState {
  date:   Date
  events: CalendarEvent[]
}

export default function MonthGrid({ cursor, events, onEventClick, onDayClick }: Props) {
  const [overflow, setOverflow] = useState<OverflowState | null>(null)

  const monthStart = startOfMonth(cursor)
  const monthEnd   = endOfMonth(cursor)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,     { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const rowCount   = days.length / 7

  const HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function eventsForDay(day: Date): CalendarEvent[] {
    return events.filter(e => isSameDay(parseISO(e.start), day))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-[#EAECF0] shrink-0">
        {HEADERS.map(h => (
          <div key={h} className="py-2 text-center text-[10.5px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            {h}
          </div>
        ))}
      </div>

      {/* Grid rows — fills remaining height */}
      <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}>
        {days.map((day, i) => {
          const dayEvents   = eventsForDay(day)
          const visible     = dayEvents.slice(0, MAX_VISIBLE)
          const hiddenCount = dayEvents.length - MAX_VISIBLE
          const inMonth     = isSameMonth(day, cursor)
          const today       = isToday(day)

          return (
            <div
              key={i}
              className={[
                'border-r border-b border-[#EAECF0] p-1.5 cursor-pointer overflow-hidden flex flex-col',
                today ? 'bg-indigo-50/40' : inMonth ? 'hover:bg-[#F8F9FB]' : '',
                !inMonth ? 'bg-[#FAFAFA]' : 'bg-white',
                'transition-colors',
              ].join(' ')}
              onClick={() => onDayClick?.(day)}
            >
              {/* Date number */}
              <div className="flex items-center justify-start mb-1">
                <span
                  className={[
                    'text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full',
                    today    ? 'bg-indigo-600 text-white'       : '',
                    !inMonth ? 'text-[#C8D0DC]'                 : 'text-[#374151]',
                  ].join(' ')}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-[2px] flex-1">
                {visible.map(ev => (
                  <EventChip key={ev.id} event={ev} onClick={onEventClick} compact />
                ))}
                {hiddenCount > 0 && (
                  <button
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 text-left px-1"
                    onClick={e => { e.stopPropagation(); setOverflow({ date: day, events: dayEvents }) }}
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Overflow popup */}
      {overflow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setOverflow(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 w-[260px] max-h-[400px] overflow-y-auto border border-[#EAECF0]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-[#0F172A]">
                {format(overflow.date, 'MMMM d')}
              </span>
              <button
                className="text-[#94A3B8] hover:text-[#64748B] w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#F1F5F9] transition-colors text-lg leading-none"
                onClick={() => setOverflow(null)}
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {overflow.events.map(ev => (
                <EventChip
                  key={ev.id}
                  event={ev}
                  onClick={ev => { onEventClick(ev); setOverflow(null) }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
