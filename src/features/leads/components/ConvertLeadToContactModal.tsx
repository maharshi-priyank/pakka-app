import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useConvertLeadToContact } from '../hooks/useLeads'
import type { Lead } from '../schemas/lead.schema'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { CONTACT_CURRENCIES } from '@/features/contacts/schemas/contact.schema'
import { ALL_COUNTRIES, getCountryDefaults } from '@/lib/countryDefaults'

const schema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  phone:    z.string().optional().or(z.literal('')),
  company:  z.string().optional().or(z.literal('')),
  country:  z.string().min(1, 'Country is required'),
  currency: z.enum(CONTACT_CURRENCIES, { message: 'Currency is required' }),
})

type FormValues = z.infer<typeof schema>

interface Props {
  lead:    Lead
  open:    boolean
  onClose: () => void
}

export default function ConvertLeadToContactModal({ lead, open, onClose }: Props) {
  const convertMutation = useConvertLeadToContact()
  const workspace = useWorkspace()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:     lead.name,
      email:    lead.email   ?? '',
      phone:    lead.phone   ?? '',
      company:  lead.company ?? '',
      country:  workspace.country,
      currency: workspace.currency as FormValues['currency'],
    },
  })

  function handleCountryChange(code: string) {
    setValue('country', code, { shouldValidate: true })
    const suggested = getCountryDefaults(code).currency
    if ((CONTACT_CURRENCIES as readonly string[]).includes(suggested)) {
      setValue('currency', suggested as FormValues['currency'], { shouldValidate: true })
    }
  }

  function onSubmit(values: FormValues) {
    convertMutation.mutate({
      leadId:   lead.id,
      name:     values.name,
      email:    values.email   || undefined,
      phone:    values.phone   || undefined,
      company:  values.company || undefined,
      country:  values.country,
      currency: values.currency,
    }, { onSuccess: onClose })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#EAECF0] dark:border-[#26283A] sticky top-0 bg-white dark:bg-[#1A1B26] rounded-t-2xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 flex items-center justify-center">
              <UserPlus size={14} className="text-[#3538CD] dark:text-indigo-400" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Convert to contact</p>
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Create a real contact from {lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:text-[#667085] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          <div className="space-y-3">
            <div>
              <label className="form-label">Name *</label>
              <input {...register('name')} className="form-input w-full" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Email</label>
                <input {...register('email')} type="email" className="form-input w-full" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input {...register('phone')} className="form-input w-full" />
              </div>
            </div>
            <div>
              <label className="form-label">Company</label>
              <input {...register('company')} className="form-input w-full" />
            </div>
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
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-[13px]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-[13px]"
            >
              {convertMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Converting…</>
                : 'Convert to contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
