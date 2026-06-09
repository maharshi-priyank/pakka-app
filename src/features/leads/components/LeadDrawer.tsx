import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  X, Trash2, Loader2, Building2, Mail, Phone,
  Tag, Calendar, IndianRupee, Clock, Video, UserPlus,
  CheckCircle2, ArrowRight, PenLine, FileText,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  updateLeadSchema, LEAD_STAGES, LEAD_SOURCES, STAGE_LABELS,
  type Lead, type UpdateLeadInput,
} from '../schemas/lead.schema'
import { useUpdateLead, useDeleteLead, useUpdateLeadStage } from '../hooks/useLeads'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'
import ConvertLeadModal from './ConvertLeadModal'

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

const STAGE_COLORS: Record<string, string> = {
  enquiry:       'bg-gray-100 text-gray-600 border-gray-200',
  proposal_sent: 'bg-blue-50 text-blue-700 border-blue-200',
  negotiating:   'bg-amber-50 text-amber-700 border-amber-200',
  won:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:          'bg-red-50 text-red-600 border-red-200',
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-600',
  'bg-violet-100 text-violet-700',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function LeadDrawer({ lead, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing,     setIsEditing]     = useState(false)
  const [scheduleOpen,  setScheduleOpen]  = useState(false)
  const [showConvert,   setShowConvert]   = useState(false)

  const updateLead  = useUpdateLead()
  const deleteLead  = useDeleteLead()
  const updateStage = useUpdateLeadStage()

  const {
    register, handleSubmit, reset,
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
    updateLead.mutate({ id: lead.id, ...data }, { onSuccess: () => setIsEditing(false) })
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

  const ac = avatarColor(lead.name)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] anim-fade"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="glass-modal rounded-2xl w-full max-w-[680px] max-h-[90vh] flex flex-col pointer-events-auto anim-modal-in shadow-2xl">

          {/* ── Header ── */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-black/[0.06]">
            {/* Avatar */}
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-[17px] font-bold shrink-0', ac)}>
              {lead.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-[#ECEEF3] leading-tight">{lead.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {lead.company && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Building2 size={11} /> {lead.company}
                  </span>
                )}
                {lead.budget && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                    <IndianRupee size={10} strokeWidth={2.5} />
                    {Number(lead.budget).toLocaleString('en-IN')}
                  </span>
                )}
                {lead.source && (
                  <span className="flex items-center gap-1 text-[12px] text-gray-500">
                    <Tag size={10} /> {SOURCE_LABELS[lead.source] ?? lead.source}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-black/[0.06] transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Stage pills ── */}
          <div className="flex items-center gap-1.5 px-6 py-3 border-b border-black/[0.06] overflow-x-auto scrollbar-none">
            {LEAD_STAGES.map(s => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                disabled={updateStage.isPending}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border',
                  s === lead.stage
                    ? 'bg-gray-900 text-white border-gray-900'
                    : cn('hover:opacity-80', STAGE_COLORS[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'),
                )}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
            {lead.followUpAt && (
              <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 whitespace-nowrap shrink-0">
                <Calendar size={10} />
                Follow-up {new Date(lead.followUpAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">
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
              <div className="p-6 grid grid-cols-2 gap-6">

                {/* ── Left column: contact ── */}
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contact</p>
                    <div className="space-y-2">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-white/60 border border-white hover:bg-white/90 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <Mail size={13} className="text-blue-500" />
                          </div>
                          <span className="text-[13px] text-gray-700 truncate">{lead.email}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/40 border border-white/60">
                          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <Mail size={13} className="text-gray-300" />
                          </div>
                          <span className="text-[13px] text-gray-300 italic">No email</span>
                        </div>
                      )}
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-white/60 border border-white hover:bg-white/90 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Phone size={13} className="text-emerald-500" />
                          </div>
                          <span className="text-[13px] text-gray-700">{lead.phone}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/40 border border-white/60">
                          <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                            <Phone size={13} className="text-gray-300" />
                          </div>
                          <span className="text-[13px] text-gray-300 italic">No phone</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service */}
                  {lead.service && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Service</p>
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/60 border border-white">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FileText size={13} className="text-indigo-500" />
                        </div>
                        <span className="text-[13px] text-gray-700">{lead.service}</span>
                      </div>
                    </div>
                  )}

                  {/* Activity */}
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1">
                    <Clock size={10} />
                    Added {formatRelativeTime(lead.createdAt)}
                    {lead.lastActivityAt !== lead.createdAt && (
                      <> · Active {formatRelativeTime(lead.lastActivityAt)}</>
                    )}
                  </div>
                </div>

                {/* ── Right column: notes ── */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Notes</p>
                  <div className="p-4 rounded-xl bg-white/60 border border-white min-h-[120px]">
                    {lead.notes ? (
                      <p className="text-[13.5px] text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                    ) : (
                      <p className="text-[13px] text-gray-300 italic">No notes yet. Click Edit to add some.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ── Footer actions ── */}
          {!isEditing && (
            <div className="px-6 py-4 border-t border-black/[0.06]">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <p className="text-[13px] text-red-500 font-medium flex-1">Delete this lead permanently?</p>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLead.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    {deleteLead.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn-secondary text-[12px] h-9 px-4">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Schedule call */}
                  <button
                    onClick={() => setScheduleOpen(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:bg-white/80 transition-colors"
                  >
                    <Video size={13} /> Schedule Call
                  </button>

                  {/* Convert / Won */}
                  {lead.clientId && lead.client ? (
                    <Link
                      to={`/clients/${lead.clientId}`}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-emerald-200 text-[12.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 size={13} /> Won · View Client <ArrowRight size={12} />
                    </Link>
                  ) : (
                    <button
                      onClick={() => setShowConvert(true)}
                      className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-blue-200 text-[12.5px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <UserPlus size={13} /> Convert to Client
                    </button>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gray-900 text-white text-[12.5px] font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <PenLine size={13} /> Edit Lead
                  </button>
                </div>
              )}
            </div>
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

      {showConvert && (
        <ConvertLeadModal
          lead={lead}
          open={showConvert}
          onClose={() => setShowConvert(false)}
        />
      )}
    </>
  )
}
