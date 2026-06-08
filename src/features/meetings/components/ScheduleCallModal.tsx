import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Video, AlertTriangle, Loader2, UserRound, Building2, Plus, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCreateMeeting, useCheckConflicts, type CreateMeetingDto } from '../hooks/useMeetings'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { useClients } from '@/features/clients/hooks/useClients'
import { cn } from '@/lib/utils'

interface Props {
  open:          boolean
  onClose:       () => void
  defaultTitle?: string
  leadId?:       string
  leadName?:     string
  clientId?:     string
  clientName?:   string
  onSuccess?:    (meetLink: string | null) => void
}

type ContactType = 'lead' | 'client'
interface SelectedContact {
  id:      string
  name:    string
  sub?:    string
  type:    ContactType
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

const inputCls = 'w-full h-9 px-3 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]'
const labelCls = 'block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5'

export default function ScheduleCallModal({
  open, onClose, defaultTitle = '',
  leadId: propLeadId, leadName: propLeadName,
  clientId: propClientId, clientName: propClientName,
  onSuccess,
}: Props) {
  const { data: profile } = useProfile()
  const createMeeting     = useCreateMeeting()

  const bothConnected = !!(profile?.googleCalendarConnected && profile?.outlookConnected)
  const [provider, setProvider] = useState<'google' | 'outlook'>('google')
  const [conflictDate, setConflictDate] = useState(todayDateStr)
  const [conflictTime, setConflictTime] = useState(nextHalfHourStr)
  const [conflictDuration, setConflictDuration] = useState(30)

  const [contact,       setContact]       = useState<SelectedContact | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [guestInput,  setGuestInput]  = useState('')
  const [guestEmails, setGuestEmails] = useState<string[]>([])
  const [guestError,  setGuestError]  = useState('')

  const hasCalendar = profile?.googleCalendarConnected || profile?.outlookConnected
  const conflictScheduledAt = conflictDate && conflictTime
    ? new Date(`${conflictDate}T${conflictTime}:00`).toISOString()
    : undefined
  const activeProvider = bothConnected
    ? provider
    : profile?.googleCalendarConnected ? 'google' : profile?.outlookConnected ? 'outlook' : undefined
  const { data: conflictData } = useCheckConflicts(
    hasCalendar && conflictScheduledAt
      ? { scheduledAt: conflictScheduledAt, durationMins: conflictDuration, provider: activeProvider }
      : null
  )

  const { data: leadsData }   = useLeads({ search: contactSearch, limit: 5 })
  const { data: clientsData } = useClients(contactSearch)

  const leads   = leadsData?.items ?? []
  const clients = (clientsData as any)?.clients ?? clientsData ?? []
  const filteredClients = Array.isArray(clients) ? clients.slice(0, 5) : []

  const hasResults = leads.length > 0 || filteredClients.length > 0

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    title:        string
    date:         string
    time:         string
    durationMins: number
    agenda:       string
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
    if (!open) return
    const date = todayDateStr()
    const time = nextHalfHourStr()
    reset({ title: defaultTitle, date, time, durationMins: 30, agenda: '' })
    setConflictDate(date)
    setConflictTime(time)
    setConflictDuration(30)
    setContactSearch('')
    setDropdownOpen(false)
    setGuestEmails([])
    setGuestInput('')
    setGuestError('')

    if (propLeadId && propLeadName) {
      setContact({ id: propLeadId, name: propLeadName, type: 'lead' })
    } else if (propClientId && propClientName) {
      setContact({ id: propClientId, name: propClientName, type: 'client' })
    } else {
      setContact(null)
    }
  }, [open, defaultTitle, propLeadId, propLeadName, propClientId, propClientName, reset])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectContact(item: SelectedContact) {
    setContact(item)
    setContactSearch('')
    setDropdownOpen(false)
  }

  function clearContact() {
    setContact(null)
    setContactSearch('')
  }

  function addGuestEmail(raw: string) {
    const email = raw.trim().replace(/,$/, '')
    if (!email) return
    if (!isValidEmail(email)) { setGuestError('Enter a valid email address'); return }
    if (guestEmails.includes(email)) { setGuestError('Already added'); return }
    setGuestEmails(prev => [...prev, email])
    setGuestInput('')
    setGuestError('')
  }

  function onGuestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addGuestEmail(guestInput) }
    if (e.key === 'Backspace' && guestInput === '' && guestEmails.length > 0) {
      setGuestEmails(prev => prev.slice(0, -1))
    }
  }

  function onSubmit(values: { title: string; date: string; time: string; durationMins: number; agenda: string }) {
    const scheduledAt = new Date(`${values.date}T${values.time}:00`).toISOString()
    const dto: CreateMeetingDto = {
      title:        values.title,
      scheduledAt,
      durationMins: Number(values.durationMins),
      agenda:       values.agenda || undefined,
      leadId:       contact?.type === 'lead'   ? contact.id : undefined,
      clientId:     contact?.type === 'client' ? contact.id : undefined,
      guestEmails:  guestEmails.length > 0 ? guestEmails : undefined,
      provider:     activeProvider,
    }
    createMeeting.mutate(dto, {
      onSuccess: (meeting) => { onSuccess?.(meeting.meetLink); onClose() },
    })
  }

  if (!open) return null

  const isLocked = !!(propLeadId || propClientId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 card overflow-hidden anim-modal-in max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F8] dark:border-[#26283A] sticky top-0 bg-white dark:bg-[#13141A] z-10">
          <div>
            <h2 className="text-[15px] font-bold text-[#0D1117] dark:text-[#ECEEF3]">Schedule a Call</h2>
            <p className="text-[12px] text-[#8A94A6] dark:text-[#545C74] mt-0.5">
              {profile?.googleCalendarConnected
                ? 'A Google Calendar invite with Meet link will be sent.'
                : profile?.outlookConnected
                  ? 'An Outlook Calendar invite with Teams link will be sent.'
                  : 'Connect Google Calendar or Outlook to auto-generate a meeting link.'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors ml-4">
            <X size={18} />
          </button>
        </div>

        {/* Provider selector — only shown when both integrations are active */}
        {bothConnected && (
          <div className="mx-6 mt-4 flex items-center gap-2">
            <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium shrink-0">Meeting via:</span>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D] border border-[#EAECF0] dark:border-[#3D4258]">
              <button
                type="button"
                onClick={() => setProvider('google')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-all',
                  provider === 'google'
                    ? 'bg-white dark:bg-[#13141A] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                <Video size={12} />
                Google Meet
              </button>
              <button
                type="button"
                onClick={() => setProvider('outlook')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold transition-all',
                  provider === 'outlook'
                    ? 'bg-white dark:bg-[#13141A] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                <Mail size={12} />
                Teams
              </button>
            </div>
          </div>
        )}

        {/* No calendar connected banner */}
        {profile && !profile.googleCalendarConnected && !profile.outlookConnected && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 bg-[#FFFAEB] dark:bg-amber-950/30 border border-[#FEF0C7] dark:border-amber-800/40 rounded-xl px-4 py-3">
            <AlertTriangle size={14} className="text-[#B54708] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#B54708] dark:text-amber-400">
              <Link to="/settings?tab=integrations" className="font-semibold underline" onClick={onClose}>
                Connect Google Calendar or Outlook
              </Link>{' '}
              in Settings to auto-generate a meeting link when scheduling calls.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className={inputCls}
              placeholder="Discovery call with..."
            />
            {errors.title && <p className="text-[11px] text-[#D92D20] mt-1">{errors.title.message}</p>}
          </div>

          {/* Unified contact selector */}
          <div>
            <label className={labelCls}>
              Contact <span className="text-[#98A2B3] dark:text-[#545C74] font-normal">(optional)</span>
            </label>

            {contact ? (
              <div className="flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border border-[#6366F1]/40 bg-[#EEF2FF] dark:bg-[#1E2040] dark:border-[#6366F1]/30">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  contact.type === 'lead' ? 'bg-[#6366F1]' : 'bg-[#059669]',
                )}>
                  {contact.type === 'lead'
                    ? <UserRound size={10} className="text-white" />
                    : <Building2 size={10} className="text-white" />}
                </div>
                <span className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] flex-1 truncate">{contact.name}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  contact.type === 'lead'
                    ? 'bg-[#6366F1]/15 text-[#4338CA] dark:text-[#A5B4FC]'
                    : 'bg-[#059669]/15 text-[#065F46] dark:text-[#34D399]',
                )}>
                  {contact.type === 'lead' ? 'Lead' : 'Client'}
                </span>
                {!isLocked && (
                  <button type="button" onClick={clearContact} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] ml-1 flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <input
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search leads or clients..."
                  className={inputCls}
                />

                {dropdownOpen && (contactSearch.length > 0 ? hasResults : true) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-lg z-20 overflow-hidden max-h-52 overflow-y-auto">

                    {leads.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#21222D] border-b border-[#F2F4F7] dark:border-[#26283A]">
                          <span className="text-[10px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Leads</span>
                        </div>
                        {leads.map((lead: any) => (
                          <button
                            key={lead.id}
                            type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] text-left transition-colors"
                            onMouseDown={() => selectContact({ id: lead.id, name: lead.name, sub: lead.company, type: 'lead' })}
                          >
                            <div className="w-6 h-6 rounded-full bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-[#6366F1]">{lead.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">{lead.name}</p>
                              {lead.company && <p className="text-[11px] text-[#667085] dark:text-[#8B92A8] truncate">{lead.company}</p>}
                            </div>
                            <span className="text-[10px] font-semibold text-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040] px-1.5 py-0.5 rounded-full flex-shrink-0">Lead</span>
                          </button>
                        ))}
                      </>
                    )}

                    {filteredClients.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#21222D] border-b border-[#F2F4F7] dark:border-[#26283A]">
                          <span className="text-[10px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Clients</span>
                        </div>
                        {filteredClients.map((client: any) => (
                          <button
                            key={client.id}
                            type="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] text-left transition-colors"
                            onMouseDown={() => selectContact({ id: client.id, name: client.name, sub: client.company, type: 'client' })}
                          >
                            <div className="w-6 h-6 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-[#027A48] dark:text-[#34D399]">{client.name.charAt(0)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">{client.name}</p>
                              {client.company && <p className="text-[11px] text-[#667085] dark:text-[#8B92A8] truncate">{client.company}</p>}
                            </div>
                            <span className="text-[10px] font-semibold text-[#059669] dark:text-[#34D399] bg-[#ECFDF3] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full flex-shrink-0">Client</span>
                          </button>
                        ))}
                      </>
                    )}

                    {contactSearch.length > 0 && !hasResults && (
                      <div className="px-4 py-3 text-[12px] text-[#98A2B3] dark:text-[#545C74]">No leads or clients found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date *</label>
              <input
                type="date"
                {...register('date', { required: 'Date is required', onChange: e => setConflictDate(e.target.value) })}
                min={todayDateStr()}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Time *</label>
              <input
                type="time"
                step="900"
                {...register('time', { required: 'Time is required', onChange: e => setConflictTime(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Conflict warning */}
          {conflictData?.hasConflict && (
            <div className="flex items-start gap-2.5 bg-[#FFFAEB] dark:bg-amber-950/30 border border-[#FEF0C7] dark:border-amber-800/40 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-[#B54708] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-[#B54708] dark:text-amber-400">
                  Calendar conflict detected
                </p>
                <p className="text-[11px] text-[#B54708]/80 dark:text-amber-500 mt-0.5">
                  {conflictData.conflicts.map(c => c.title).join(', ')} already scheduled at this time.
                </p>
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className={labelCls}>Duration</label>
            <select
              {...register('durationMins', { onChange: e => setConflictDuration(Number(e.target.value)) })}
              className={inputCls}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Guest emails */}
          <div>
            <label className={labelCls}>
              Guests <span className="text-[#98A2B3] dark:text-[#545C74] font-normal">(optional)</span>
            </label>
            <div className={cn(
              'min-h-9 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white dark:bg-[#21222D] transition-all',
              guestError
                ? 'border-[#D92D20]'
                : 'border-[#D0D5DD] dark:border-[#3D4258] focus-within:ring-2 focus-within:ring-[#6366F1]/30 focus-within:border-[#6366F1]',
            )}>
              {guestEmails.map(email => (
                <span key={email} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F3FF] dark:bg-[#1E1A3A] text-[11px] font-medium text-[#5925DC] dark:text-[#A78BFA]">
                  {email}
                  <button type="button" onClick={() => setGuestEmails(prev => prev.filter(e => e !== email))} className="text-[#7C3AED]/60 hover:text-[#5925DC] dark:hover:text-[#A78BFA]">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                value={guestInput}
                onChange={e => { setGuestInput(e.target.value); setGuestError('') }}
                onKeyDown={onGuestKeyDown}
                onBlur={() => { if (guestInput.trim()) addGuestEmail(guestInput) }}
                placeholder={guestEmails.length === 0 ? 'Add email, press Enter…' : ''}
                className="flex-1 min-w-[140px] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-transparent outline-none placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]"
              />
              {guestInput.trim() && (
                <button type="button" onClick={() => addGuestEmail(guestInput)} className="flex-shrink-0 text-[#6366F1] hover:text-[#4338CA]">
                  <Plus size={14} />
                </button>
              )}
            </div>
            {guestError && <p className="text-[11px] text-[#D92D20] mt-1">{guestError}</p>}
            <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1">Press Enter or comma after each email</p>
          </div>

          {/* Agenda */}
          <div>
            <label className={labelCls}>Agenda <span className="text-[#98A2B3] dark:text-[#545C74] font-normal">(optional)</span></label>
            <textarea
              {...register('agenda')}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all resize-none placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]"
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
              className="h-9 px-4 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMeeting.isPending}
              className="h-9 px-4 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-2"
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
