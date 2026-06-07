import { useRef, useEffect } from 'react'
import {
  startOfWeek, addDays, format, parseISO, isSameDay, isToday,
  getHours, getMinutes, getDay,
} from 'date-fns'
import EventChip from './EventChip'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'

const HOUR_START  = 0
const HOUR_END    = 24
const SLOT_HEIGHT = 56
const SCROLL_TO_HOUR = 7

interface PositionedEvent {
  event:   CalendarEvent
  top:     number
  height:  number
  left:    string
  width:   string
}

function positionEvents(dayEvents: CalendarEvent[]): PositionedEvent[] {
  if (!dayEvents.length) return []

  const positioned: PositionedEvent[] = []
  const groups: CalendarEvent[][] = []

  for (const ev of dayEvents) {
    const start = parseISO(ev.start)
    const end   = parseISO(ev.end)
    let placed  = false

    for (const group of groups) {
      const overlaps = group.some(g => {
        const gStart = parseISO(g.start)
        const gEnd   = parseISO(g.end)
        return start < gEnd && end > gStart
      })
      if (overlaps) {
        group.push(ev)
        placed = true
        break
      }
    }
    if (!placed) groups.push([ev])
  }

  for (const group of groups) {
    const count = group.length
    group.forEach((ev, col) => {
      const start     = parseISO(ev.start)
      const end       = parseISO(ev.end)
      const startMins = getHours(start) * 60 + getMinutes(start)
      const endMins   = getHours(end)   * 60 + getMinutes(end)
      const top    = (startMins / 60) * SLOT_HEIGHT
      const height = Math.max(((endMins - startMins) / 60) * SLOT_HEIGHT, 22)
      positioned.push({
        event:  ev,
        top,
        height,
        left:  `${(col / count) * 100}%`,
        width: `${(1 / count) * 100}%`,
      })
    })
  }

  return positioned
}

function currentTimeTop(): number {
  const now = new Date()
  return (getHours(now) * 60 + getMinutes(now)) / 60 * SLOT_HEIGHT
}

interface Props {
  cursor:       Date
  events:       CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export default function WeekGrid({ cursor, events, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * SLOT_HEIGHT - 20
    }
  }, [])

  const weekStart    = startOfWeek(cursor, { weekStartsOn: 1 })
  const days         = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours        = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents  = events.filter(e => !e.allDay)
  const now          = new Date()
  const todayCol     = getDay(now) === 0 ? 6 : getDay(now) - 1
  const timeTop      = currentTimeTop()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Day headers */}
      <div className="flex border-b border-[#EAECF0] shrink-0">
        <div className="w-14 shrink-0" />
        {days.map((day, i) => {
          const today = isToday(day)
          return (
            <div key={i} className="flex-1 text-center py-2.5 border-l border-[#EAECF0]">
              <div className={['text-[10.5px] uppercase tracking-wider font-medium', today ? 'text-indigo-500' : 'text-[#94A3B8]'].join(' ')}>
                {format(day, 'EEE')}
              </div>
              <div className={[
                'text-[18px] font-black leading-tight mx-auto mt-0.5',
                today
                  ? 'w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto text-[16px]'
                  : 'text-[#0F172A]',
              ].join(' ')}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-[#EAECF0] shrink-0">
          <div className="w-14 shrink-0 text-[9.5px] font-medium text-[#94A3B8] text-right pr-2 pt-1.5 leading-none">
            all‑day
          </div>
          {days.map((day, i) => {
            const dayAllDay = allDayEvents.filter(e => isSameDay(parseISO(e.start), day))
            return (
              <div key={i} className="flex-1 border-l border-[#EAECF0] p-0.5 min-h-[28px] flex flex-col gap-0.5">
                {dayAllDay.map(ev => (
                  <EventChip key={ev.id} event={ev} onClick={onEventClick} compact />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex relative" style={{ height: `${HOUR_END * SLOT_HEIGHT}px` }}>

          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {hours.map(h => h > 0 && (
              <div
                key={h}
                className="absolute w-full text-right pr-2 select-none"
                style={{ top: h * SLOT_HEIGHT - 8 }}
              >
                <span className="text-[10px] font-medium text-[#B0B8C8]">
                  {format(new Date(2000, 0, 1, h), 'h a').toLowerCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          {days.map((day, colIdx) => {
            const dayTimed      = timedEvents.filter(e => isSameDay(parseISO(e.start), day))
            const dayPositioned = positionEvents(dayTimed)
            const isCurrentDay  = colIdx === todayCol && isSameDay(day, now)

            return (
              <div
                key={colIdx}
                className="flex-1 relative border-l border-[#EAECF0]"
                style={{ height: `${HOUR_END * SLOT_HEIGHT}px` }}
              >
                {/* Horizontal hour lines */}
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-[#F1F3F6]"
                    style={{ top: h * SLOT_HEIGHT }}
                  />
                ))}

                {/* Today current time line */}
                {isCurrentDay && (
                  <div
                    className="absolute inset-x-0 z-20 pointer-events-none"
                    style={{ top: timeTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 -ml-1 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-indigo-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayPositioned.map(({ event, top, height, left, width }) => {
                  const colors = EVENT_COLORS[event.type]
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="absolute rounded-lg text-left overflow-hidden hover:brightness-95 transition-all"
                      style={{
                        top:             top + 1,
                        height:          height - 2,
                        left:            `calc(${left} + 2px)`,
                        width:           `calc(${width} - 4px)`,
                        backgroundColor: colors.bg,
                        borderLeft:      `3px solid ${colors.border}`,
                        color:           colors.text,
                        zIndex:          10,
                        padding:         '3px 6px',
                      }}
                    >
                      <div className="text-[11px] font-semibold truncate leading-snug">{event.title}</div>
                      {height > 34 && (
                        <div className="text-[10px] opacity-60 truncate">
                          {format(parseISO(event.start), 'h:mm a')}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
