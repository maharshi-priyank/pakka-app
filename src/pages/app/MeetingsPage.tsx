import { useState } from 'react'
import { CalendarDays, Video, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMeetings, useCompleteMeeting, useCancelMeeting, type Meeting, type MeetingStatus } from '@/features/meetings/hooks/useMeetings'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'

const STATUS_COLORS: Record<MeetingStatus, string> = {
  SCHEDULED:  'bg-[#EFF6FF] text-[#2563EB]',
  COMPLETED:  'bg-[#ECFDF3] text-[#027A48]',
  CANCELLED:  'bg-[#F2F4F7] text-[#667085]',
}

const TABS: { key: MeetingStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'SCHEDULED', label: 'Upcoming' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const complete = useCompleteMeeting()
  const cancel   = useCancelMeeting()
  const contact  = meeting.client?.name ?? meeting.lead?.name ?? null

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFBFF] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
        <CalendarDays size={16} className="text-[#2563EB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#101828] truncate">{meeting.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[12px] text-[#667085]">{formatDateTime(meeting.scheduledAt)}</p>
          {contact && (
            <><span className="text-[#D0D5DD]">·</span><p className="text-[12px] text-[#98A2B3] truncate">{contact}</p></>
          )}
          <><span className="text-[#D0D5DD]">·</span><p className="text-[12px] text-[#98A2B3]">{meeting.durationMins} min</p></>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full', STATUS_COLORS[meeting.status])}>
          {meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase()}
        </span>
        {meeting.meetLink && meeting.status === 'SCHEDULED' && (
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ECFDF3] text-[#027A48] text-[11px] font-semibold hover:bg-[#D1FAE5] transition-colors"
          >
            <Video size={10} /> Join <ExternalLink size={9} />
          </a>
        )}
        {meeting.status === 'SCHEDULED' && (
          <>
            <button
              onClick={() => complete.mutate(meeting.id)}
              disabled={complete.isPending}
              title="Mark completed"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#ECFDF3] hover:text-[#027A48] transition-colors disabled:opacity-50"
            >
              {complete.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            </button>
            <button
              onClick={() => cancel.mutate(meeting.id)}
              disabled={cancel.isPending}
              title="Cancel meeting"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#FEF3F2] hover:text-[#D92D20] transition-colors disabled:opacity-50"
            >
              {cancel.isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  const [activeTab, setActiveTab]      = useState<MeetingStatus | 'all'>('SCHEDULED')
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const { data, isLoading } = useMeetings({ status: activeTab === 'all' ? undefined : activeTab })
  const meetings = data?.items ?? []

  return (
    <div className="max-w-[860px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#101828] tracking-tight">Meetings</h1>
          <p className="text-[13px] text-[#667085] mt-0.5">Schedule and manage your calls with leads and clients.</p>
        </div>
        <button
          onClick={() => setScheduleOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors"
        >
          <Video size={14} /> Schedule Call
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#EAECF0] -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#667085] hover:text-[#344054]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F2F4F7] last:border-0">
              <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-48 bg-[#F2F4F7] rounded animate-pulse" />
                <div className="h-3 w-32 bg-[#F2F4F7] rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CalendarDays size={36} className="text-[#D0D5DD] mb-3" strokeWidth={1.5} />
            <p className="text-[14px] font-semibold text-[#667085]">
              {activeTab === 'SCHEDULED' ? 'No upcoming calls' : 'No meetings found'}
            </p>
            <p className="text-[12px] text-[#98A2B3] mt-1">
              {activeTab === 'SCHEDULED'
                ? 'Schedule a call from a lead or client drawer, or use the button above.'
                : 'Try a different filter.'}
            </p>
            {activeTab === 'SCHEDULED' && (
              <button
                onClick={() => setScheduleOpen(true)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors"
              >
                <Video size={13} /> Schedule Call
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {meetings.map(m => <MeetingRow key={m.id} meeting={m} />)}
          </div>
        )}
      </div>

      <ScheduleCallModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  )
}
