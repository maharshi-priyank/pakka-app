import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2 } from 'lucide-react'
import { createContactSchema, CONTACT_SOURCES, CONTACT_CURRENCIES, SOURCE_LABELS, type CreateContactInput } from '../schemas/contact.schema'
import { useCreateContact } from '../hooks/useContacts'
import { ALL_COUNTRIES, getCountryDefaults } from '@/lib/countryDefaults'
import { currencySymbol } from '@/lib/currency-symbols'

interface Props {
  open:    boolean
  onClose: () => void
}

export default function AddContactModal({ open, onClose }: Props) {
  const { mutate, isPending, error } = useCreateContact()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { country: '', currency: undefined },
  })

  const watchedCurrency = watch('currency')

  useEffect(() => { if (open) reset({ country: '', currency: undefined }) }, [open, reset])

  // R2/R6/KTD8: Country auto-suggests Currency, but only within the 5-value
  // set every document type validates against -- unlike BusinessTab, there is
  // no IN/INR fallback when nothing matches (R2 forbids a silent default).
  function handleCountryChange(code: string) {
    setValue('country', code, { shouldValidate: true })
    const suggested = getCountryDefaults(code).currency
    if ((CONTACT_CURRENCIES as readonly string[]).includes(suggested)) {
      setValue('currency', suggested as CreateContactInput['currency'], { shouldValidate: true })
    } else {
      // '' mirrors the <select>'s own unselected placeholder value -- currency
      // is a required enum on create (R2), so there's no `undefined` member
      // to clear back to.
      setValue('currency', '' as CreateContactInput['currency'], { shouldValidate: true })
    }
  }

  function onSubmit(data: CreateContactInput) {
    mutate(data, { onSuccess: () => { reset(); onClose() } })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 card overflow-hidden anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F3F8] dark:border-[#26283A]">
          <div>
            <h2 className="text-[15px] font-bold text-[#0D1117] dark:text-[#ECEEF3]">Add Contact</h2>
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">New lead, prospect, or client</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] dark:text-[#545C74] hover:bg-[#F4F6FB] dark:hover:bg-[#21222D] hover:text-[#374151] dark:hover:text-[#C2C8D8] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Name + Company */}
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

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Email</label>
              <input {...register('email')} className="form-input" type="email" placeholder="rahul@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input {...register('phone')} className="form-input" type="tel" placeholder="+91 98765 43210" />
              {errors.phone
                ? <p className="form-error">{errors.phone.message}</p>
                : <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Used for WhatsApp notifications</p>
              }
            </div>
          </div>

          {/* Country + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Country *</label>
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
              {errors.country && <p className="form-error">{errors.country.message}</p>}
            </div>
            <div>
              <label className="form-label">Currency *</label>
              <select {...register('currency')} className="form-input">
                <option value="">Select currency</option>
                {CONTACT_CURRENCIES.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              {errors.currency && <p className="form-error">{errors.currency.message}</p>}
            </div>
          </div>

          {/* Service + Deal Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Service</label>
              <input {...register('service')} className="form-input" placeholder="Brand identity" />
            </div>
            <div>
              <label className="form-label">Deal Value ({currencySymbol(watchedCurrency)})</label>
              <input {...register('dealValue')} className="form-input" type="number" placeholder="50000" />
            </div>
          </div>

          {/* Source + Follow-up */}
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

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input resize-none" rows={3} placeholder="Initial notes..." />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {(error as Error).message}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
