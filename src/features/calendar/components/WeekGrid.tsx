import { useRef, useEffect } from 'react'
import {
  startOfWeek, addDays, format, parseISO, isSameDay, isToday,
  getHours, getMinutes, getDay,
} from 'date-fns'
import type { CalendarEvent } from '../types'
import { EVENT_COLORS } from '../types'
import EventChip from './EventChip'

const HOUR_END       = 24
const SLOT_HEIGHT    = 56
const SCROLL_TO_HOUR = 7
const COL_MIN_WIDTH  = 96   // px — prevents columns getting too narrow on small screens
const GUTTER_WIDTH   = 48   // time label column

interface PositionedEvent {
  event:  CalendarEvent
  top:    number
  height: number
  left:   string
  width:  string
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
        const gS = parseISO(g.start), gE = parseISO(g.end)
        return start < gE && end > gS
      })
      if (overlaps) { group.push(ev); placed = true; break }
    }
    if (!placed) groups.push([ev])
  }

  for (const group of groups) {
    const count = group.length
    group.forEach((ev, col) => {
      const s     = parseISO(ev.start), e = parseISO(ev.end)
      const sMin  = getHours(s) * 60 + getMinutes(s)
      const eMin  = getHours(e) * 60 + getMinutes(e)
      positioned.push({
        event:  ev,
        top:    (sMin / 60) * SLOT_HEIGHT,
        height: Math.max(((eMin - sMin) / 60) * SLOT_HEIGHT, 22),
        left:   `${(col / count) * 100}%`,
        width:  `${(1 / count) * 100}%`,
      })
    })
  }
  return positioned
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
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * SLOT_HEIGHT - 24
    }
  }, [])

  const weekStart    = startOfWeek(cursor, { weekStartsOn: 1 })
  const days         = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours        = Array.from({ length: HOUR_END }, (_, i) => i)
  const allDayEvents = events.filter(e => e.allDay)
  const timedEvents  = events.filter(e => !e.allDay)
  const now          = new Date()
  const nowTop       = (getHours(now) * 60 + getMinutes(now)) / 60 * SLOT_HEIGHT
  const minW         = `${GUTTER_WIDTH + 7 * COL_MIN_WIDTH}px`

  return (
    // Outer: clips overflow-x on desktop, shows scrollbar on mobile
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Single scroll container — both x (mobile) and y (time grid) */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: minW }} className="flex flex-col">

          {/* Day headers — sticky at top */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-[#EAECF0]">
            <div style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }} className="shrink-0" />
            {days.map((day, i) => {
              const today = isToday(day)
              return (
                <div key={i} className="flex-1 text-center py-2.5 border-l border-[#EAECF0]" style={{ minWidth: COL_MIN_WIDTH }}>
                  <div className={['text-[10px] uppercase tracking-wider font-semibold', today ? 'text-indigo-500' : 'text-[#94A3B8]'].join(' ')}>
                    {format(day, 'EEE')}
                  </div>
                  <div className={['text-[15px] sm:text-[17px] font-black leading-tight mt-0.5 mx-auto', today ? 'w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[13px]' : 'text-[#0F172A]'].join(' ')}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All-day row — sticky below headers */}
          {allDayEvents.length > 0 && (
            <div className="flex sticky z-10 bg-white border-b border-[#EAECF0]" style={{ top: 60 }}>
              <div style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
                className="shrink-0 text-[9px] font-medium text-[#94A3B8] text-right pr-1.5 pt-1.5 leading-none">
                all‑day
              </div>
              {days.map((day, i) => {
                const dayAD = allDayEvents.filter(e => isSameDay(parseISO(e.start), day))
                return (
                  <div key={i} className="flex-1 border-l border-[#EAECF0] p-0.5 min-h-[26px] flex flex-col gap-0.5" style={{ minWidth: COL_MIN_WIDTH }}>
                    {dayAD.map(ev => <EventChip key={ev.id} event={ev} onClick={onEventClick} compact />)}
                  </div>
                )
              })}
            </div>
          )}

          {/* Time grid body */}
          <div className="flex relative" style={{ height: `${HOUR_END * SLOT_HEIGHT}px` }}>

            {/* Hour labels */}
            <div style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }} className="shrink-0 relative select-none">
              {hours.map(h => h > 0 && (
                <div
                  key={h}
                  className="absolute w-full text-right pr-2"
                  style={{ top: h * SLOT_HEIGHT - 8 }}
                >
                  <span className="text-[9.5px] sm:text-[10px] font-medium text-[#B8C0CC]">
                    {format(new Date(2000, 0, 1, h), 'h a').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, colIdx) => {
              const dayTimed = timedEvents.filter(e => isSameDay(parseISO(e.start), day))
              const placed   = positionEvents(dayTimed)
              const isCurDay = isSameDay(day, now)

              return (
                <div
                  key={colIdx}
                  className="flex-1 relative border-l border-[#EAECF0]"
                  style={{ height: `${HOUR_END * SLOT_HEIGHT}px`, minWidth: COL_MIN_WIDTH }}
                >
                  {/* Hour lines */}
                  {hours.map(h => (
                    <div key={h} className="absolute inset-x-0 border-t border-[#F1F3F6]" style={{ top: h * SLOT_HEIGHT }} />
                  ))}

                  {/* Current time line */}
                  {isCurDay && (
                    <div className="absolute inset-x-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 -ml-1 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-indigo-500" />
                    </div>
                  )}

                  {/* Events */}
                  {placed.map(({ event, top, height, left, width }) => {
                    const c = EVENT_COLORS[event.type]
                    return (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="absolute rounded-lg text-left overflow-hidden hover:brightness-95 active:scale-[0.98] transition-all"
                        style={{
                          top:             top + 1,
                          height:          height - 2,
                          left:            `calc(${left} + 2px)`,
                          width:           `calc(${width} - 4px)`,
                          backgroundColor: c.bg,
                          borderLeft:      `3px solid ${c.border}`,
                          color:           c.text,
                          zIndex:          10,
                          padding:         '3px 5px',
                        }}
                      >
                        <div className="text-[10.5px] sm:text-[11px] font-semibold truncate leading-snug">{event.title}</div>
                        {height > 34 && (
                          <div className="text-[9.5px] sm:text-[10px] opacity-60 truncate mt-0.5">
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
    </div>
  )
}
