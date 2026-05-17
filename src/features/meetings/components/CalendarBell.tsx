import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Video, ExternalLink } from 'lucide-react'
import { useUpcomingMeetings, useUpcomingCount, type Meeting } from '../hooks/useMeetings'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diff = d.getDate() - now.getDate()
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const minsAway = Math.floor((new Date(meeting.scheduledAt).getTime() - Date.now()) / 60_000)
  const chipColor = minsAway <= 30 ? 'bg-[#FEF3F2] text-[#D92D20]' : minsAway <= 120 ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#ECFDF3] text-[#027A48]'
  const contact   = meeting.client?.name ?? meeting.lead?.name ?? null

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${chipColor}`}>
          {formatDate(meeting.scheduledAt)} {formatTime(meeting.scheduledAt)}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#101828] truncate">{meeting.title}</p>
          {contact && <p className="text-[11px] text-[#98A2B3]">{contact}</p>}
        </div>
      </div>
      {meeting.meetLink ? (
        <a
          href={meeting.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 ml-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ECFDF3] text-[#027A48] text-[11px] font-semibold hover:bg-[#D1FAE5] transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <Video size={10} />
          Join
          <ExternalLink size={9} />
        </a>
      ) : (
        <span className="shrink-0 ml-3 text-[11px] text-[#D0D5DD]">No link</span>
      )}
    </div>
  )
}

export default function CalendarBell() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const navigate        = useNavigate()

  const { data: meetings      = [] } = useUpcomingMeetings()
  const { data: todayCount = 0 }     = useUpcomingCount()

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
        aria-label="Upcoming calls"
      >
        <CalendarDays size={16} strokeWidth={1.8} />
        {todayCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#059669] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">
              {todayCount > 9 ? '9+' : todayCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-white border border-[#EAECF0] rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7]">
            <span className="text-[13px] font-bold text-[#101828]">Upcoming Calls</span>
            <button
              onClick={() => { setOpen(false); navigate('/app/meetings') }}
              className="text-[11.5px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors"
            >
              View all
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <CalendarDays size={28} className="text-[#D0D5DD] mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-[#667085]">No calls scheduled</p>
                <p className="text-[12px] text-[#98A2B3] mt-0.5 text-center">
                  Schedule discovery calls from a lead or client.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {meetings.map(m => <MeetingRow key={m.id} meeting={m} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
