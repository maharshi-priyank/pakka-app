import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { updateContactSchema, CONTACT_SOURCES, SOURCE_LABELS, type UpdateContactInput, type Contact } from '../schemas/contact.schema'
import { useUpdateContact } from '../hooks/useContacts'

interface Props {
  contact: Contact
  onClose: () => void
}

export default function EditContactModal({ contact, onClose }: Props) {
  const { mutate, isPending, error } = useUpdateContact()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: {
      name:       contact.name,
      email:      contact.email      ?? '',
      phone:      contact.phone      ?? '',
      company:    contact.company    ?? '',
      service:    contact.service    ?? '',
      dealValue:  contact.dealValue  ?? '',
      source:     (contact.source as UpdateContactInput['source']) ?? undefined,
      notes:      contact.notes      ?? '',
      followUpAt: contact.followUpAt ? contact.followUpAt.slice(0, 10) : '',
    },
  })

  useEffect(() => { reset({
    name:       contact.name,
    email:      contact.email      ?? '',
    phone:      contact.phone      ?? '',
    company:    contact.company    ?? '',
    service:    contact.service    ?? '',
    dealValue:  contact.dealValue  ?? '',
    source:     (contact.source as UpdateContactInput['source']) ?? undefined,
    notes:      contact.notes      ?? '',
    followUpAt: contact.followUpAt ? contact.followUpAt.slice(0, 10) : '',
  }) }, [contact.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(data: UpdateContactInput) {
    mutate({ id: contact.id, ...data }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 card overflow-hidden anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F8] dark:border-[#26283A]">
          <div>
            <h2 className="text-[15px] font-bold text-[#0D1117] dark:text-[#ECEEF3]">Edit Contact</h2>
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">{contact.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] dark:text-[#545C74] hover:bg-[#F4F6FB] dark:hover:bg-[#21222D] hover:text-[#374151] dark:hover:text-[#C2C8D8] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Name *</label>
              <input {...register('name')} className="form-input" placeholder="Rahul Sharma" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">Company</label>
              <input {...register('company')} className="form-input" placeholder="TechStart Inc" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Email</label>
              <input {...register('email')} className="form-input" type="email" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
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
              <label className="form-label">Deal Value (₹)</label>
              <input {...register('dealValue')} className="form-input" type="number" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Source</label>
              <select {...register('source')} className="form-input">
                <option value="">Select source</option>
                {CONTACT_SOURCES.map(s => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Follow-up date</label>
              <input {...register('followUpAt')} className="form-input" type="date" />
            </div>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input resize-none" rows={3} />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {(error as Error).message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
