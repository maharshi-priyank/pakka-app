import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, CreditCard, Smartphone, Check, Loader2, Landmark, Upload, X, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile, useUploadUpiQr } from '../hooks/useProfile'

const businessSchema = z.object({
  bankName:          z.string().optional(),
  bankAccountName:   z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc:          z.string().optional(),
  upiId:             z.string().optional(),
})

type BusinessForm = z.infer<typeof businessSchema>

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function BusinessTab() {
  const { data: profile, isLoading } = useProfile()
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile()
  const { mutateAsync: uploadQr, isPending: uploadingQr } = useUploadUpiQr()
  const [saved, setSaved] = useState(false)
  const [qrPreview, setQrPreview] = useState<string | null>(null)

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
      if (profile.upiQrUrl && !qrPreview) setQrPreview(profile.upiQrUrl)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function handleQrUpload(file: File) {
    const url = await uploadQr(file)
    setQrPreview(url)
    await updateProfile({ upiQrUrl: url })
  }

  async function handleQrRemove() {
    setQrPreview(null)
    await updateProfile({ upiQrUrl: null })
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="card-glass p-6 space-y-4">
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
      <div className="card-glass p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <Landmark size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Bank Account</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
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
      <div className="card-glass p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <Smartphone size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">UPI</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3]">Shown as payment option on invoices</span>
        </div>

        <Field label="UPI ID" hint="e.g. yourname@okaxis" error={errors.upiId?.message}>
          <input {...register('upiId')} placeholder="yourname@okaxis" className="form-input max-w-sm" />
        </Field>

        {/* UPI QR Code */}
        <div className="space-y-1.5">
          <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            UPI QR Code <span className="text-[11px] font-normal text-[#98A2B3]">(optional — shown on invoice for quick scan)</span>
          </label>
          {qrPreview ? (
            <div className="flex items-center gap-4">
              <img src={qrPreview} alt="UPI QR" className="w-[88px] h-[88px] rounded-xl border border-[#EAECF0] dark:border-[#26283A] object-contain bg-white" />
              <button
                type="button"
                onClick={handleQrRemove}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#D92D20] border border-[#FECDCA] hover:bg-[#FEF3F2] transition-colors"
              >
                <X size={12} strokeWidth={2.5} /> Remove
              </button>
            </div>
          ) : (
            <label className={cn(
              'flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl border-2 border-dashed border-[#D0D5DD] dark:border-[#3A3C4A] cursor-pointer',
              'hover:border-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1A1B23] transition-all',
              uploadingQr && 'opacity-60 cursor-not-allowed pointer-events-none',
            )}>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQrUpload(f) }}
              />
              {uploadingQr ? (
                <Loader2 size={14} className="animate-spin text-[#2563EB]" />
              ) : (
                <QrCode size={14} className="text-[#667085]" />
              )}
              <span className="text-[12.5px] font-medium text-[#667085]">
                {uploadingQr ? 'Uploading…' : 'Upload QR image'}
              </span>
              <Upload size={12} className="text-[#98A2B3]" />
            </label>
          )}
        </div>
      </div>

      {/* Razorpay (placeholder) */}
      <div className="card-glass p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] mb-4">
          <CreditCard size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Razorpay</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Online payment collection</p>
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
              Accept card, UPI, and net banking payments directly on invoices.
            </p>
          </div>
          {(profile as unknown as Record<string, unknown>)?.['razorpayAccountId'] ? (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#027A48] dark:text-[#34D399] bg-[#ECFDF3] dark:bg-emerald-950/40 px-3 py-1.5 rounded-full">
              <Check size={12} strokeWidth={2.5} /> Connected
            </span>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-[12px] font-semibold text-[#98A2B3] dark:text-[#545C74] bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg cursor-not-allowed"
            >
              Coming soon
            </button>
          )}
        </div>
      </div>

      {/* Brand info card */}
      <div className="card-glass p-4 flex items-start gap-3 bg-[#F8F9FC] dark:bg-[#1A1B23]">
        <Building2 size={15} className="text-[#667085] dark:text-[#8B92A8] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
          Bank account and UPI details are printed on every invoice you send. Keep them accurate so clients can pay you directly.
        </p>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3 py-2">
        {saved && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#027A48] dark:text-[#34D399]">
            <Check size={14} strokeWidth={2.5} /> Saved
          </span>
        )}
        <button
          type="submit"
          disabled={saving || !isDirty}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors',
            saving || !isDirty
              ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed'
              : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5]',
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
