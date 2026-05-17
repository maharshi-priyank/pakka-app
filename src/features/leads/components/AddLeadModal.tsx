import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { createLeadSchema, LEAD_SOURCES, type CreateLeadInput } from '../schemas/lead.schema'
import { useCreateLead } from '../hooks/useLeads'

interface Props {
  open: boolean
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

export default function AddLeadModal({ open, onClose }: Props) {
  const { mutate, isPending, error } = useCreateLead()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({ resolver: zodResolver(createLeadSchema) })

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  function onSubmit(data: CreateLeadInput) {
    mutate(data, {
      onSuccess: () => {
        reset()
        onClose()
      },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 card overflow-hidden anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F8]">
          <div>
            <h2 className="text-[15px] font-bold text-[#0D1117]">Add Lead</h2>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">New enquiry or potential client</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:bg-[#F4F6FB] hover:text-[#374151] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Name + Company row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input
                {...register('name')}
                className="form-input"
                placeholder="Rahul Sharma"
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">Company</label>
              <input
                {...register('company')}
                className="form-input"
                placeholder="TechStart Inc"
              />
            </div>
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Email</label>
              <input
                {...register('email')}
                className="form-input"
                type="email"
                placeholder="rahul@example.com"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                {...register('phone')}
                className="form-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Service + Budget row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Service</label>
              <input
                {...register('service')}
                className="form-input"
                placeholder="Brand identity"
              />
            </div>
            <div>
              <label className="form-label">Budget (₹)</label>
              <input
                {...register('budget')}
                className="form-input"
                type="number"
                placeholder="50000"
              />
            </div>
          </div>

          {/* Source + Follow-up row */}
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
              <input
                {...register('followUpAt')}
                className="form-input"
                type="date"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              {...register('notes')}
              className="form-input resize-none"
              rows={3}
              placeholder="Initial conversation notes..."
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? (
                <><Loader2 size={13} className="animate-spin" /> Adding…</>
              ) : (
                'Add Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
