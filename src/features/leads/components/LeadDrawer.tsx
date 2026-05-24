import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  X, Trash2, Loader2, Building2, Mail, Phone,
  Tag, Calendar, IndianRupee, Clock, Video,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  updateLeadSchema, LEAD_STAGES, LEAD_SOURCES, STAGE_LABELS,
  type Lead, type UpdateLeadInput,
} from '../schemas/lead.schema'
import { useUpdateLead, useDeleteLead, useUpdateLeadStage } from '../hooks/useLeads'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'

interface Props {
  lead:    Lead | null
  onClose: () => void
}

const SOURCE_LABELS: Record<string, string> = {
  instagram:    'Instagram',
  referral:     'Referral',
  website:      'Website',
  linkedin:     'LinkedIn',
  cold_outreach:'Cold Outreach',
  other:        'Other',
}

const AVATAR_COLORS = [
  'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
  'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function LeadDrawer({ lead, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing]         = useState(false)
  const [scheduleOpen, setScheduleOpen]   = useState(false)

  const updateLead  = useUpdateLead()
  const deleteLead  = useDeleteLead()
  const updateStage = useUpdateLeadStage()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateLeadInput>({ resolver: zodResolver(updateLeadSchema) })

  useEffect(() => {
    if (lead) {
      reset({
        name:       lead.name,
        email:      lead.email ?? '',
        phone:      lead.phone ?? '',
        company:    lead.company ?? '',
        service:    lead.service ?? '',
        budget:     lead.budget ?? '',
        source:     (lead.source as UpdateLeadInput['source']) ?? undefined,
        notes:      lead.notes ?? '',
        followUpAt: lead.followUpAt ? lead.followUpAt.split('T')[0] : '',
      })
      setIsEditing(false)
      setConfirmDelete(false)
    }
  }, [lead, reset])

  function onSave(data: UpdateLeadInput) {
    if (!lead) return
    updateLead.mutate(
      { id: lead.id, ...data },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  function handleDelete() {
    if (!lead) return
    deleteLead.mutate(lead.id, { onSuccess: onClose })
  }

  function handleStageChange(stage: typeof LEAD_STAGES[number]) {
    if (!lead || stage === lead.stage) return
    updateStage.mutate({ id: lead.id, stage })
  }

  if (!lead) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 anim-fade"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[460px] bg-white dark:bg-[#13141A] shadow-xl flex flex-col anim-slide-right">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#F1F3F8] dark:border-[#26283A]">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0', avatarColor(lead.name))}>
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#0D1117] dark:text-[#ECEEF3] leading-snug">{lead.name}</p>
              {lead.company && (
                <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] flex items-center gap-1 mt-0.5">
                  <Building2 size={10} /> {lead.company}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] dark:text-[#545C74] hover:bg-[#F4F6FB] dark:hover:bg-[#21222D] transition-colors mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Stage selector */}
        <div className="px-6 py-3 border-b border-[#F1F3F8] dark:border-[#26283A] flex items-center gap-2 overflow-x-auto">
          {LEAD_STAGES.map(s => (
            <button
              key={s}
              onClick={() => handleStageChange(s)}
              disabled={updateStage.isPending}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border',
                s === lead.stage
                  ? 'bg-[#0D1117] dark:bg-[#6366F1] text-white border-[#0D1117] dark:border-[#6366F1]'
                  : 'bg-[#F3F4F6] dark:bg-[#21222D] text-[#6B7280] dark:text-[#8B92A8] border-transparent hover:bg-[#E5E7EB] dark:hover:bg-[#26283A]',
              )}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-2">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-[12px] text-[#374151] dark:text-[#C2C8D8] bg-[#F8FAFC] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg px-3 py-1.5 hover:bg-[#F1F3F8] dark:hover:bg-[#26283A] transition-colors">
                <Mail size={11} className="text-[#9CA3AF] dark:text-[#545C74]" /> {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-[12px] text-[#374151] dark:text-[#C2C8D8] bg-[#F8FAFC] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg px-3 py-1.5 hover:bg-[#F1F3F8] dark:hover:bg-[#26283A] transition-colors">
                <Phone size={11} className="text-[#9CA3AF] dark:text-[#545C74]" /> {lead.phone}
              </a>
            )}
            {lead.budget && (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 rounded-lg px-3 py-1.5">
                <IndianRupee size={10} /> {Number(lead.budget).toLocaleString('en-IN')}
              </span>
            )}
            {lead.source && (
              <span className="flex items-center gap-1 text-[12px] text-[#6B7280] dark:text-[#8B92A8] bg-[#F3F4F6] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg px-3 py-1.5">
                <Tag size={10} /> {SOURCE_LABELS[lead.source] ?? lead.source}
              </span>
            )}
            {lead.followUpAt && (
              <span className="flex items-center gap-1 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 rounded-lg px-3 py-1.5">
                <Calendar size={10} />
                Follow-up {new Date(lead.followUpAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Service */}
          {lead.service && !isEditing && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] dark:text-[#545C74] mb-1">Service</p>
              <p className="text-[13.5px] text-[#374151] dark:text-[#C2C8D8]">{lead.service}</p>
            </div>
          )}

          {/* Notes section */}
          {!isEditing && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] dark:text-[#545C74] mb-2">Notes</p>
              {lead.notes ? (
                <p className="text-[13.5px] text-[#374151] dark:text-[#C2C8D8] whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
              ) : (
                <p className="text-[13px] text-[#C9CDD4] dark:text-[#3D4258] italic">No notes yet. Click Edit to add some.</p>
              )}
            </div>
          )}

          {/* Edit form */}
          {isEditing && (
            <form onSubmit={handleSubmit(onSave)} className="space-y-3">
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
                    {LEAD_SOURCES.map(s => (
                      <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                    ))}
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
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={updateLead.isPending || !isDirty} className="btn-primary">
                  {updateLead.isPending ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save changes'}
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
              {updateLead.error && (
                <p className="text-[12px] text-red-500">{updateLead.error.message}</p>
              )}
            </form>
          )}

          {/* Activity footer */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#C9CDD4] dark:text-[#3D4258] pt-2">
            <Clock size={10} />
            Last activity {formatRelativeTime(lead.lastActivityAt)} · Added {formatRelativeTime(lead.createdAt)}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#F1F3F8] dark:border-[#26283A] flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <p className="text-[12px] text-red-500 font-medium">Delete this lead?</p>
              <button
                onClick={handleDelete}
                disabled={deleteLead.isPending}
                className="btn-primary bg-red-500 hover:bg-red-600 text-[12px] h-8 px-3"
                style={{ background: '#EF4444' }}
              >
                {deleteLead.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-[12px] h-8 px-3">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF] dark:text-[#545C74] hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
              {!isEditing && (
                <>
                  <button
                    onClick={() => setScheduleOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
                  >
                    <Video size={12} /> Schedule Call
                  </button>
                  <button onClick={() => setIsEditing(true)} className="btn-primary">
                    Edit lead
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ScheduleCallModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        leadId={lead.id}
        leadName={lead.name}
        defaultTitle={`Discovery call with ${lead.name}`}
      />
    </>
  )
}
