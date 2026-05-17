import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, CreditCard, Smartphone, Check, Loader2, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'

const businessSchema = z.object({
  bankName:          z.string().optional(),
  bankAccountName:   z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc:          z.string().optional(),
  upiId:             z.string().optional(),
})

type BusinessForm = z.infer<typeof businessSchema>

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

export default function BusinessTab() {
  const { data: profile, isLoading } = useProfile()
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
  })

  useEffect(() => {
    if (profile) {
      reset({
        bankName:          profile.bankName          ?? '',
        bankAccountName:   profile.bankAccountName   ?? '',
        bankAccountNumber: profile.bankAccountNumber ?? '',
        bankIfsc:          profile.bankIfsc          ?? '',
        upiId:             profile.upiId             ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (values: BusinessForm) => {
    await updateProfile({
      bankName:          values.bankName          || null,
      bankAccountName:   values.bankAccountName   || null,
      bankAccountNumber: values.bankAccountNumber || null,
      bankIfsc:          values.bankIfsc          || null,
      upiId:             values.upiId             || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    reset(values)
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="card p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Bank details */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7]">
          <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3]">Appears on invoices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank Name" error={errors.bankName?.message}>
            <input {...register('bankName')} placeholder="HDFC Bank" className="form-input w-full" />
          </Field>
          <Field label="Account Holder Name" error={errors.bankAccountName?.message}>
            <input {...register('bankAccountName')} placeholder="Maharshi Vaghela" className="form-input w-full" />
          </Field>
          <Field label="Account Number" error={errors.bankAccountNumber?.message}>
            <input
              {...register('bankAccountNumber')}
              placeholder="012345678901"
              className="form-input w-full font-mono text-[13px] tracking-widest"
            />
          </Field>
          <Field label="IFSC Code" error={errors.bankIfsc?.message} hint="e.g. HDFC0001234">
            <input
              {...register('bankIfsc')}
              placeholder="HDFC0001234"
              className="form-input w-full font-mono text-[13px] tracking-wide uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
                register('bankIfsc').onChange(e)
              }}
            />
          </Field>
        </div>
      </div>

      {/* UPI */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7]">
          <Smartphone size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">UPI</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3]">Shown as payment option on invoices</span>
        </div>

        <Field label="UPI ID" hint="e.g. yourname@okaxis" error={errors.upiId?.message}>
          <input {...register('upiId')} placeholder="yourname@okaxis" className="form-input max-w-sm" />
        </Field>
      </div>

      {/* Razorpay (placeholder) */}
      <div className="card p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] mb-4">
          <CreditCard size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Razorpay</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Online payment collection</p>
            <p className="text-[12px] text-[#98A2B3] mt-0.5">
              Accept card, UPI, and net banking payments directly on invoices.
            </p>
          </div>
          {(profile as unknown as Record<string, unknown>)?.['razorpayAccountId'] ? (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#027A48] bg-[#ECFDF3] px-3 py-1.5 rounded-full">
              <Check size={12} strokeWidth={2.5} /> Connected
            </span>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-[12px] font-semibold text-[#98A2B3] bg-[#F2F4F7] rounded-lg cursor-not-allowed"
            >
              Coming soon
            </button>
          )}
        </div>
      </div>

      {/* Brand info card */}
      <div className="card p-4 flex items-start gap-3 bg-[#F8F9FC]">
        <Building2 size={15} className="text-[#667085] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
          Bank account and UPI details are printed on every invoice you send. Keep them accurate so clients can pay you directly.
        </p>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3 py-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#027A48]">
            <Check size={14} strokeWidth={2.5} /> Saved
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !isDirty}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            saving || !isDirty
              ? 'bg-[#F2F4F7] text-[#98A2B3] cursor-not-allowed'
              : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]',
          )}
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

    </form>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, hint, required, children }: {
  label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[11px] text-[#98A2B3]">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
