import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft, Mail, Phone, Building2, IndianRupee, Calendar, Tag,
  Clock, Video, UserPlus, CheckCircle2, ArrowRight, PenLine,
  Loader2, Archive, StickyNote, PhoneCall, AtSign, CalendarDays,
  Send, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  updateLeadSchema, LEAD_STAGES, LEAD_SOURCES, STAGE_LABELS, STAGE_COLORS,
  type UpdateLeadInput,
} from '@/features/leads/schemas/lead.schema'
import {
  useLead, useUpdateLead, useUpdateLeadStage, useArchiveLead, useUnarchiveLead,
  useLeadActivities, useCreateLeadActivity,
  type ActivityType, type LeadActivity,
} from '@/features/leads/hooks/useLeads'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'
import ConvertLeadModal from '@/features/leads/components/ConvertLeadModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  const PALETTES = [
    { bg: 'bg-[#EEF4FF]', text: 'text-[#3538CD]' },
    { bg: 'bg-[#ECFDF3]', text: 'text-[#027A48]' },
    { bg: 'bg-[#FFFAEB]', text: 'text-[#B54708]' },
    { bg: 'bg-[#FDF4FF]', text: 'text-[#6941C6]' },
    { bg: 'bg-[#FFF1F3]', text: 'text-[#C01048]' },
  ]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTES[Math.abs(h) % PALETTES.length]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const SOURCE_LABELS: Record<string, string> = {
  instagram:    'Instagram',
  referral:     'Referral',
  website:      'Website',
  linkedin:     'LinkedIn',
  cold_outreach:'Cold Outreach',
  other:        'Other',
}

// ─── Activity type config ─────────────────────────────────────────────────────

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: typeof StickyNote; color: string; placeholder: string }[] = [
  { type: 'NOTE',    label: 'Note',    icon: StickyNote,   color: 'text-amber-600',   placeholder: 'Add a note about this lead…' },
  { type: 'CALL',    label: 'Call',    icon: PhoneCall,    color: 'text-blue-600',    placeholder: 'How did the call go? Outcome, next steps…' },
  { type: 'EMAIL',   label: 'Email',   icon: AtSign,       color: 'text-indigo-600',  placeholder: 'Summarise the email exchange…' },
  { type: 'MEETING', label: 'Meeting', icon: CalendarDays, color: 'text-emerald-600', placeholder: 'What was discussed? Any decisions made?' },
]

const ACTIVITY_ICON: Record<ActivityType, typeof StickyNote> = {
  NOTE:    StickyNote,
  CALL:    PhoneCall,
  EMAIL:   AtSign,
  MEETING: CalendarDays,
}

const ACTIVITY_COLOR: Record<ActivityType, string> = {
  NOTE:    'bg-amber-50 text-amber-600 border-amber-100',
  CALL:    'bg-blue-50 text-blue-600 border-blue-100',
  EMAIL:   'bg-indigo-50 text-indigo-600 border-indigo-100',
  MEETING: 'bg-emerald-50 text-emerald-600 border-emerald-100',
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

function ActivityFeed({ leadId }: { leadId: string }) {
  const [activeType, setActiveType] = useState<ActivityType>('NOTE')
  const [content, setContent]       = useState('')

  const { data: activities, isLoading } = useLeadActivities(leadId)
  const createActivity = useCreateLeadActivity(leadId)

  function handleSubmit() {
    if (!content.trim()) return
    createActivity.mutate(
      { type: activeType, content: content.trim() },
      { onSuccess: () => { setContent(''); toast.success('Activity logged') } },
    )
  }

  const current = ACTIVITY_TYPES.find(a => a.type === activeType)!

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl overflow-hidden">
        {/* Type tabs */}
        <div className="flex border-b border-[#EAECF0] dark:border-[#26283A]">
          {ACTIVITY_TYPES.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold transition-colors border-b-2 -mb-px',
                activeType === type
                  ? cn('border-indigo-500 text-indigo-600 dark:text-indigo-400', color)
                  : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Text area */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={current.placeholder}
            rows={3}
            className="w-full text-[13.5px] text-[#344054] dark:text-[#C2C8D8] bg-transparent resize-none outline-none placeholder:text-[#D0D5DD] dark:placeholder:text-[#545C74] leading-relaxed"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">⌘+Enter to save</p>
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || createActivity.isPending}
              className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {createActivity.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <><Send size={12} /> Log {current.label}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded-xl h-16" />
          ))}
        </div>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-2">
          {activities.map((activity: LeadActivity) => {
            const Icon = ACTIVITY_ICON[activity.type]
            return (
              <div
                key={activity.id}
                className="flex gap-3 p-4 bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-xl"
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border text-[11px]',
                  ACTIVITY_COLOR[activity.type],
                )}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#8B92A8]">
                      {activity.type.charAt(0) + activity.type.slice(1).toLowerCase()}
                    </span>
                    <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
                      {timeAgo(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] whitespace-pre-wrap leading-relaxed">{activity.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center mx-auto mb-3">
            <StickyNote size={18} className="text-[#D0D5DD] dark:text-[#545C74]" />
          </div>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">No activity yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Log a note, call, or meeting above</p>
        </div>
      )}
    </div>
  )
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-40 bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg" />
      <div className="h-[120px] bg-[#F2F4F7] dark:bg-[#21222D] rounded-2xl" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="h-48 bg-[#F2F4F7] dark:bg-[#21222D] rounded-2xl" />
        </div>
        <div className="h-64 bg-[#F2F4F7] dark:bg-[#21222D] rounded-2xl" />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isEditing,    setIsEditing]    = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [showConvert,  setShowConvert]  = useState(false)

  const { data: lead, isLoading, error } = useLead(id ?? null)
  const updateLead   = useUpdateLead()
  const updateStage  = useUpdateLeadStage()
  const archiveMut   = useArchiveLead()
  const unarchiveMut = useUnarchiveLead()

  const {
    register, handleSubmit, reset,
    formState: { errors, isDirty },
  } = useForm<UpdateLeadInput>({ resolver: zodResolver(updateLeadSchema) })

  function startEdit() {
    if (!lead) return
    reset({
      name:       lead.name,
      email:      lead.email      ?? '',
      phone:      lead.phone      ?? '',
      company:    lead.company    ?? '',
      service:    lead.service    ?? '',
      budget:     lead.budget     ?? '',
      source:     (lead.source as UpdateLeadInput['source']) ?? undefined,
      notes:      lead.notes      ?? '',
      followUpAt: lead.followUpAt ? lead.followUpAt.split('T')[0] : '',
    })
    setIsEditing(true)
  }

  function onSave(data: UpdateLeadInput) {
    if (!lead) return
    updateLead.mutate({ id: lead.id, ...data }, { onSuccess: () => setIsEditing(false) })
  }

  function handleStageChange(stage: typeof LEAD_STAGES[number]) {
    if (!lead || stage === lead.stage) return
    updateStage.mutate({ id: lead.id, stage })
  }

  if (isLoading || !id) return (
    <div className="page-container">
      <PageSkeleton />
    </div>
  )

  if (error || !lead) return (
    <div className="page-container flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-[14px] text-[#667085]">Lead not found</p>
      <button onClick={() => navigate('/leads')} className="btn-secondary text-[13px]">
        Back to Leads
      </button>
    </div>
  )

  const palette = avatarColor(lead.name)

  return (
    <div className="page-container space-y-6">

      {/* ── Back breadcrumb ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>
      </div>

      {/* ── Hero header ── */}
      <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold shrink-0', palette.bg, palette.text)}>
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-tight">{lead.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              {lead.company && (
                <span className="flex items-center gap-1 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                  <Building2 size={12} /> {lead.company}
                </span>
              )}
              {lead.budget && (
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                  <IndianRupee size={11} strokeWidth={2.5} />
                  {Number(lead.budget).toLocaleString('en-IN')}
                </span>
              )}
              {lead.source && (
                <span className="flex items-center gap-1 text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                  <Tag size={11} /> {SOURCE_LABELS[lead.source] ?? lead.source}
                </span>
              )}
              {lead.followUpAt && (
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                  <Calendar size={11} />
                  Follow-up {new Date(lead.followUpAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0">
            {lead.archivedAt ? (
              <button
                onClick={() => unarchiveMut.mutate(lead.id, { onSuccess: () => toast.success('Lead unarchived') })}
                disabled={unarchiveMut.isPending}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[#EAECF0] dark:border-[#26283A] text-[12.5px] font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Archive size={13} /> Unarchive
              </button>
            ) : (
              <button
                onClick={() => archiveMut.mutate(lead.id, { onSuccess: () => navigate('/leads') })}
                disabled={archiveMut.isPending}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#EAECF0] dark:border-[#26283A] text-[12.5px] font-medium text-[#667085] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <Archive size={13} />
              </button>
            )}
            <button
              onClick={() => setScheduleOpen(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[#EAECF0] dark:border-[#26283A] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              <Video size={13} /> Schedule Call
            </button>
            {lead.contactId && lead.contact ? (
              <Link
                to={`/contacts/${lead.contactId}`}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-emerald-200 text-[12.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 size={13} /> Won · View Contact <ArrowRight size={12} />
              </Link>
            ) : (
              <button
                onClick={() => setShowConvert(true)}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 text-white text-[12.5px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                <UserPlus size={13} /> Convert to Client
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stage strip ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {LEAD_STAGES.map(s => {
          const colors = STAGE_COLORS[s]
          const active = s === lead.stage
          return (
            <button
              key={s}
              onClick={() => handleStageChange(s)}
              disabled={updateStage.isPending}
              className={cn(
                'flex items-center gap-1.5 h-9 px-4 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all border',
                active
                  ? 'bg-[#101828] dark:bg-[#ECEEF3] text-white dark:text-[#101828] border-[#101828] dark:border-[#ECEEF3]'
                  : cn(colors.bg, colors.text, colors.border, 'hover:opacity-80'),
              )}
            >
              {STAGE_LABELS[s]}
              {active && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 ml-0.5" />}
            </button>
          )
        })}
      </div>

      {/* ── Main 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: details + activity ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Details card */}
          <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
              <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Lead Details</h2>
              {!isEditing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] border border-[#EAECF0] dark:border-[#26283A] transition-colors"
                >
                  <PenLine size={12} /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Name *</label>
                    <input {...register('name')} className="form-input" />
                    {errors.name && <p className="form-error">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Company</label>
                    <input {...register('company')} className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Email</label>
                    <input {...register('email')} type="email" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input {...register('phone')} className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Service</label>
                    <input {...register('service')} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Budget (₹)</label>
                    <input {...register('budget')} type="number" className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Source</label>
                    <select {...register('source')} className="form-input">
                      <option value="">Select source</option>
                      {LEAD_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Follow-up date</label>
                    <input {...register('followUpAt')} type="date" className="form-input" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Notes</label>
                  <textarea {...register('notes')} className="form-input resize-none" rows={4} />
                </div>
                {updateLead.error && <p className="text-[12px] text-red-500">{updateLead.error.message}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={updateLead.isPending || !isDirty} className="btn-primary">
                    {updateLead.isPending ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-5">
                  {/* Contact info */}
                  <div className="space-y-3">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#EAECF0] dark:border-[#26283A] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                          <Mail size={14} className="text-blue-500" />
                        </div>
                        <span className="text-[13px] text-[#344054] dark:text-[#C2C8D8] truncate">{lead.email}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#F2F4F7] dark:border-[#26283A]">
                        <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] dark:bg-[#21222D] flex items-center justify-center shrink-0">
                          <Mail size={14} className="text-[#D0D5DD] dark:text-[#545C74]" />
                        </div>
                        <span className="text-[13px] text-[#D0D5DD] dark:text-[#545C74] italic">No email</span>
                      </div>
                    )}
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-[#EAECF0] dark:border-[#26283A] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                          <Phone size={14} className="text-emerald-500" />
                        </div>
                        <span className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">{lead.phone}</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#F2F4F7] dark:border-[#26283A]">
                        <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] dark:bg-[#21222D] flex items-center justify-center shrink-0">
                          <Phone size={14} className="text-[#D0D5DD] dark:text-[#545C74]" />
                        </div>
                        <span className="text-[13px] text-[#D0D5DD] dark:text-[#545C74] italic">No phone</span>
                      </div>
                    )}
                  </div>

                  {/* Meta fields */}
                  <div className="space-y-2.5">
                    {lead.service && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-1">Service</p>
                        <p className="text-[13.5px] text-[#344054] dark:text-[#C2C8D8]">{lead.service}</p>
                      </div>
                    )}
                    {lead.source && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-1">Source</p>
                        <p className="text-[13.5px] text-[#344054] dark:text-[#C2C8D8]">{SOURCE_LABELS[lead.source] ?? lead.source}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-1">Added</p>
                      <p className="text-[13.5px] text-[#344054] dark:text-[#C2C8D8]">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {lead.notes && (
                  <div className="mt-5 pt-5 border-t border-[#F2F4F7] dark:border-[#26283A]">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-2">Notes</p>
                    <p className="text-[13.5px] text-[#344054] dark:text-[#C2C8D8] whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity log */}
          <div className="bg-[#F9FAFB] dark:bg-[#161722] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-6">
            <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Activity</h2>
            <ActivityFeed leadId={id!} />
          </div>
        </div>

        {/* ── Right: pipeline sidebar ── */}
        <div className="space-y-4">
          {/* Stage card */}
          <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-3">Pipeline Stage</p>
            <div className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border',
              STAGE_COLORS[lead.stage].bg,
              STAGE_COLORS[lead.stage].text,
              STAGE_COLORS[lead.stage].border,
            )}>
              {STAGE_LABELS[lead.stage]}
            </div>

            {lead.budget && (
              <div className="mt-4 pt-4 border-t border-[#F2F4F7] dark:border-[#26283A]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-1">Deal Value</p>
                <p className="text-[18px] font-bold text-[#101828] dark:text-[#ECEEF3] flex items-center gap-1">
                  <IndianRupee size={15} strokeWidth={2.5} />
                  {Number(lead.budget).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {/* Follow-up */}
          <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-3">Follow-up</p>
            {lead.followUpAt ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                    {new Date(lead.followUpAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{timeAgo(lead.followUpAt)}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-indigo-600 transition-colors"
              >
                <Plus size={13} /> Set follow-up date
              </button>
            )}
          </div>

          {/* Activity summary */}
          <div className="bg-white dark:bg-[#1A1B26] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#545C74] mb-3">Last Activity</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center shrink-0">
                <Clock size={14} className="text-[#667085] dark:text-[#8B92A8]" />
              </div>
              <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">{timeAgo(lead.lastActivityAt)}</p>
            </div>
          </div>

          {/* Won banner */}
          {lead.contactId && lead.contact && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-400">Converted to client</p>
                  <p className="text-[12px] text-emerald-600 dark:text-emerald-500 mt-0.5">{lead.contact.name}</p>
                  <Link
                    to={`/contacts/${lead.contactId}`}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
                  >
                    View contact <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ScheduleCallModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        defaultTitle={`Discovery call with ${lead.name}`}
      />

      {showConvert && (
        <ConvertLeadModal
          lead={lead}
          open={showConvert}
          onClose={() => setShowConvert(false)}
        />
      )}
    </div>
  )
}
