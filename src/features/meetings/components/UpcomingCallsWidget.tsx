import { useState } from 'react'
import { CalendarDays, Video, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpcomingMeetings, type Meeting } from '../hooks/useMeetings'
import ScheduleCallModal from './ScheduleCallModal'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function timeChip(iso: string): { label: string; chipClass: string } {
  const minsAway = Math.floor((new Date(iso).getTime() - Date.now()) / 60_000)
  const label = new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (minsAway <= 30)  return { label, chipClass: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20]' }
  if (minsAway <= 120) return { label, chipClass: 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400' }
  return                      { label, chipClass: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]' }
}

function dateLabel(iso: string): string {
  const d   = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const { label, chipClass } = timeChip(meeting.scheduledAt)
  const contact = meeting.client?.name ?? meeting.lead?.name ?? null

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors">
      <div className="shrink-0 text-center min-w-[56px]">
        <p className="text-[10px] text-[#98A2B3] dark:text-[#545C74] font-medium">{dateLabel(meeting.scheduledAt)}</p>
        <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5', chipClass)}>{label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">{meeting.title}</p>
        {contact && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate">{contact}</p>}
      </div>
      {meeting.meetLink ? (
        <a
          href={meeting.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399] text-[11px] font-semibold hover:bg-[#D1FAE5] dark:hover:bg-emerald-900/40 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <Video size={10} />
          Join
          <ExternalLink size={9} />
        </a>
      ) : (
        <span className="shrink-0 text-[11px] text-[#D0D5DD] dark:text-[#3D4258] px-2">No link</span>
      )}
    </div>
  )
}

export default function UpcomingCallsWidget() {
  const { data: meetings = [], isLoading } = useUpcomingMeetings()
  const [scheduleOpen, setScheduleOpen]    = useState(false)

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Upcoming Calls</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Scheduled this week</p>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && meetings.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]">
              {meetings.length} upcoming
            </span>
          )}
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center">
            <CalendarDays size={14} className="text-[#027A48] dark:text-[#34D399]" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="w-14 h-8 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-7 w-14 rounded-lg" />
            </div>
          ))
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CalendarDays size={26} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" strokeWidth={1.5} />
            <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No calls scheduled this week</p>
            <button
              onClick={() => setScheduleOpen(true)}
              className="mt-3 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
            >
              + Schedule a call
            </button>
          </div>
        ) : (
          meetings.map(m => <MeetingRow key={m.id} meeting={m} />)
        )}
      </div>

      <ScheduleCallModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  )
}
