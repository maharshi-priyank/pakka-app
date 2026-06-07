import { useRef, useEffect } from 'react'
import { format, parseISO, isSameDay, getHours, getMinutes, isToday } from 'date-fns'
import { EVENT_COLORS } from '../types'
import type { CalendarEvent } from '../types'

const HOUR_START     = 0
const HOUR_END       = 24
const SLOT_HEIGHT    = 56
const SCROLL_TO_HOUR = 7

interface PositionedEvent {
  event:  CalendarEvent
  top:    number
  height: number
}

function positionEvents(timedEvents: CalendarEvent[]): PositionedEvent[] {
  return timedEvents.map(ev => {
    const start     = parseISO(ev.start)
    const end       = parseISO(ev.end)
    const startMins = getHours(start) * 60 + getMinutes(start)
    const endMins   = getHours(end)   * 60 + getMinutes(end)
    return {
      event:  ev,
      top:    (startMins / 60) * SLOT_HEIGHT,
      height: Math.max(((endMins - startMins) / 60) * SLOT_HEIGHT, 22),
    }
  })
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

export default function DayGrid({ cursor, events, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * SLOT_HEIGHT - 20
    }
  }, [])

  const hours        = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const dayEvents    = events.filter(e => isSameDay(parseISO(e.start), cursor))
  const allDayEvents = dayEvents.filter(e => e.allDay)
  const timedEvents  = dayEvents.filter(e => !e.allDay)
  const positioned   = positionEvents(timedEvents)
  const isCurrentDay = isToday(cursor)
  const timeTop      = currentTimeTop()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* All-day row */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-[#EAECF0] px-4 py-1.5 flex flex-col gap-1 shrink-0">
          {allDayEvents.map(ev => {
            const colors = EVENT_COLORS[ev.type]
            return (
              <button
                key={ev.id}
                onClick={() => onEventClick(ev)}
                className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] font-semibold hover:brightness-95 transition-all"
                style={{ backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}`, color: colors.text }}
              >
                {ev.title}
              </button>
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

          {/* Single column */}
          <div className="flex-1 relative border-l border-[#EAECF0]"
            style={{ height: `${HOUR_END * SLOT_HEIGHT}px` }}>

            {hours.map(h => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-[#F1F3F6]"
                style={{ top: h * SLOT_HEIGHT }}
              />
            ))}

            {/* Current time */}
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

            {positioned.map(({ event, top, height }) => {
              const colors = EVENT_COLORS[event.type]
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute rounded-lg text-left overflow-hidden hover:brightness-95 transition-all"
                  style={{
                    top:             top + 1,
                    height:          height - 2,
                    left:            2,
                    right:           2,
                    backgroundColor: colors.bg,
                    borderLeft:      `3px solid ${colors.border}`,
                    color:           colors.text,
                    zIndex:          10,
                    padding:         '3px 8px',
                  }}
                >
                  <div className="text-[12px] font-semibold truncate leading-snug">{event.title}</div>
                  {height > 34 && (
                    <div className="text-[11px] opacity-60 truncate">
                      {format(parseISO(event.start), 'h:mm a')} – {format(parseISO(event.end), 'h:mm a')}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
