import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { updateContactSchema, CONTACT_SOURCES, CONTACT_CURRENCIES, SOURCE_LABELS, type UpdateContactInput, type Contact } from '../schemas/contact.schema'
import { useUpdateContact } from '../hooks/useContacts'
import { ALL_COUNTRIES, getCountryDefaults } from '@/lib/countryDefaults'
import { currencySymbol } from '@/lib/currency-symbols'

interface Props {
  contact: Contact
  onClose: () => void
}

function editDefaults(contact: Contact): UpdateContactInput {
  return {
    name:       contact.name,
    country:    contact.country    ?? '',
    currency:   (contact.currency as UpdateContactInput['currency']) ?? undefined,
    email:      contact.email      ?? '',
    phone:      contact.phone      ?? '',
    company:    contact.company    ?? '',
    service:    contact.service    ?? '',
    dealValue:  contact.dealValue  ?? '',
    source:     (contact.source as UpdateContactInput['source']) ?? undefined,
    notes:      contact.notes      ?? '',
    followUpAt: contact.followUpAt ? contact.followUpAt.slice(0, 10) : '',
  }
}

export default function EditContactModal({ contact, onClose }: Props) {
  const { mutate, isPending, error } = useUpdateContact()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: editDefaults(contact),
  })

  const watchedCurrency = watch('currency')

  useEffect(() => { reset(editDefaults(contact)) }, [contact.id, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Same auto-suggest-then-editable behavior as AddContactModal (KTD8) — an
  // existing Contact's country/currency can be left empty indefinitely (KTD5),
  // so this mirrors the create form's picker rather than forcing a value.
  function handleCountryChange(code: string) {
    setValue('country', code, { shouldDirty: true })
    const suggested = getCountryDefaults(code).currency
    if ((CONTACT_CURRENCIES as readonly string[]).includes(suggested)) {
      setValue('currency', suggested as UpdateContactInput['currency'], { shouldDirty: true })
    } else {
      setValue('currency', undefined, { shouldDirty: true })
    }
  }

  function onSubmit(data: UpdateContactInput) {
    // review-fix: '' means "left unset" for a legacy Contact (KTD5) -- the
    // backend's @IsIn/@IsString validators reject '' outright, so it must
    // become undefined (omitted) rather than sent as-is.
    mutate({
      id: contact.id,
      ...data,
      country:  data.country  || undefined,
      currency: data.currency || undefined,
    }, { onSuccess: onClose })
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
              <input {...register('phone')} className="form-input" type="tel" placeholder="+91 98765 43210" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Country</label>
              <select
                {...register('country')}
                onChange={e => handleCountryChange(e.target.value)}
                className="form-input"
              >
                <option value="">Select country</option>
                {ALL_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select {...register('currency')} className="form-input">
                <option value="">Select currency</option>
                {CONTACT_CURRENCIES.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Service</label>
              <input {...register('service')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Deal Value ({currencySymbol(watchedCurrency)})</label>
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
