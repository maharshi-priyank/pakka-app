import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Video, AlertTriangle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCreateMeeting, type CreateMeetingDto } from '../hooks/useMeetings'
import { useProfile } from '@/features/settings/hooks/useProfile'

interface Props {
  open:         boolean
  onClose:      () => void
  defaultTitle?: string
  leadId?:      string
  clientId?:    string
  onSuccess?:   (meetLink: string | null) => void
}

const DURATION_OPTIONS = [
  { value: 15,  label: '15 minutes' },
  { value: 30,  label: '30 minutes' },
  { value: 45,  label: '45 minutes' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
]

function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

function nextHalfHourStr() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 30)
  d.setMinutes(d.getMinutes() >= 30 ? 30 : 0, 0, 0)
  return d.toTimeString().slice(0, 5)
}

export default function ScheduleCallModal({ open, onClose, defaultTitle = '', leadId, clientId, onSuccess }: Props) {
  const { data: profile } = useProfile()
  const createMeeting     = useCreateMeeting()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title:       string
    date:        string
    time:        string
    durationMins: number
    agenda:      string
  }>({
    defaultValues: {
      title:        defaultTitle,
      date:         todayDateStr(),
      time:         nextHalfHourStr(),
      durationMins: 30,
      agenda:       '',
    },
  })

  useEffect(() => {
    if (open) reset({
      title:        defaultTitle,
      date:         todayDateStr(),
      time:         nextHalfHourStr(),
      durationMins: 30,
      agenda:       '',
    })
  }, [open, defaultTitle, reset])

  function onSubmit(values: { title: string; date: string; time: string; durationMins: number; agenda: string }) {
    const scheduledAt = new Date(`${values.date}T${values.time}:00`).toISOString()
    const dto: CreateMeetingDto = {
      title:        values.title,
      scheduledAt,
      durationMins: Number(values.durationMins),
      agenda:       values.agenda || undefined,
      leadId:       leadId   || undefined,
      clientId:     clientId || undefined,
    }
    createMeeting.mutate(dto, {
      onSuccess: (meeting) => {
        onSuccess?.(meeting.meetLink)
        onClose()
      },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 card overflow-hidden anim-modal-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F8]">
          <div>
            <h2 className="text-[15px] font-bold text-[#0D1117]">Schedule a Call</h2>
            <p className="text-[12px] text-[#8A94A6] mt-0.5">
              {profile?.googleCalendarConnected
                ? 'A Google Calendar invite with Meet link will be sent.'
                : 'Connect Google Calendar to auto-generate a Meet link.'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#344054] transition-colors ml-4">
            <X size={18} />
          </button>
        </div>

        {/* Google Calendar not connected banner */}
        {profile && !profile.googleCalendarConnected && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 bg-[#FFFAEB] border border-[#FEF0C7] rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="text-[#B54708] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#B54708]">
              <Link to="/app/settings?tab=integrations" className="font-semibold underline" onClick={onClose}>
                Connect Google Calendar
              </Link>{' '}
              in Settings to auto-generate a Meet link when scheduling calls.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
              placeholder="Discovery call with..."
            />
            {errors.title && <p className="text-[11px] text-[#D92D20] mt-1">{errors.title.message}</p>}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Date *</label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                min={todayDateStr()}
                className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Time *</label>
              <input
                type="time"
                step="900"
                {...register('time', { required: 'Time is required' })}
                className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Duration</label>
            <select
              {...register('durationMins')}
              className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Agenda <span className="text-[#98A2B3] font-normal">(optional)</span></label>
            <textarea
              {...register('agenda')}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all resize-none"
              placeholder="Topics to cover..."
            />
          </div>

          {createMeeting.isError && (
            <p className="text-[12px] text-[#D92D20]">Failed to schedule call. Please try again.</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[#D0D5DD] text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMeeting.isPending}
              className="h-9 px-4 rounded-lg bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {createMeeting.isPending ? (
                <><Loader2 size={13} className="animate-spin" /> Scheduling…</>
              ) : (
                <><Video size={13} /> Schedule Call</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
