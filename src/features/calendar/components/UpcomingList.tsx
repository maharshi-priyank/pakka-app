import { parseISO, isToday, isTomorrow, isPast, differenceInCalendarDays, format, isBefore } from 'date-fns'
import { Video, ExternalLink } from 'lucide-react'
import type { CalendarEvent } from '../types'

interface Props {
  events:       CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

function relativeLabel(start: Date): { label: string; color: string; bg: string } {
  if (isPast(start) && isBefore(start, new Date())) return { label: 'Delayed', color: '#EF4444', bg: '#FEF2F2' }
  if (isToday(start))    return { label: 'Today',    color: '#6366F1', bg: '#EEF2FF' }
  if (isTomorrow(start)) return { label: 'Tomorrow', color: '#0EA5E9', bg: '#F0F9FF' }
  const days = differenceInCalendarDays(start, new Date())
  return { label: `In ${days}d`, color: '#64748B', bg: '#F1F5F9' }
}

export default function UpcomingList({ events, onEventClick }: Props) {
  const meetings = events
    .filter(e => e.type === 'meeting')
    .sort((a, b) => a.start.localeCompare(b.start))

  if (!meetings.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-5 py-10">
        <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-3">
          <Video size={16} className="text-[#CBD5E1]" />
        </div>
        <p className="text-[12px] font-semibold text-[#94A3B8]">No meetings this period</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 pt-3 pb-1">
        <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Upcoming</p>
      </div>

      <div className="flex flex-col px-2 pb-4 gap-1">
        {meetings.map(ev => {
          const start = parseISO(ev.start)
          const end   = parseISO(ev.end)
          const { label, color, bg } = relativeLabel(start)

          return (
            <button
              key={ev.id}
              onClick={() => onEventClick(ev)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-[#EAECF0] transition-all"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Video size={10} className="shrink-0 text-indigo-400" />
                    <span className="text-[12px] font-semibold text-[#0F172A] truncate leading-snug">
                      {ev.title}
                    </span>
                  </div>
                  {ev.clientName && (
                    <div className="text-[10.5px] text-[#64748B] truncate">{ev.clientName}</div>
                  )}
                  <div className="text-[10.5px] text-[#94A3B8] mt-0.5">
                    {format(start, 'h:mm')}–{format(end, 'h:mm a')}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color, backgroundColor: bg }}
                  >
                    {label}
                  </span>
                  {ev.meetLink && (
                    <a
                      href={ev.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-0.5 text-[9.5px] font-semibold text-indigo-500 hover:text-indigo-700"
                    >
                      <ExternalLink size={9} />
                      Join
                    </a>
                  )}
                  {ev.source === 'google' && (
                    <span className="text-[8.5px] font-bold text-[#16A34A] bg-[#DCFCE7] px-1.5 py-0.5 rounded-full">G</span>
                  )}
                  {ev.source === 'outlook' && (
                    <span className="text-[8.5px] font-bold text-[#0284C7] bg-[#E0F2FE] px-1.5 py-0.5 rounded-full">OL</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
