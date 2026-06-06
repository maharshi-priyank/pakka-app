import { useEffect, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Check, Loader2, Building2, User, Receipt, Upload, Zap, MapPin, ShieldCheck, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile, useUpdateProfile, useUploadLogo, useRedeemPromo } from '../hooks/useProfile'
import { useOnboardingTour } from '@/hooks/useOnboardingTour'

const profileSchema = z.object({
  name:              z.string().min(1, 'Name is required'),
  businessName:      z.string().optional(),
  businessType:      z.string().optional(),
  gstNumber:         z.string().optional(),
  panNumber:         z.string().optional(),
  // Compliance
  defaultHsnSac:     z.string().optional(),
  defaultLutNumber:  z.string().optional(),
  // Payment
  bankName:          z.string().optional(),
  bankAccountName:   z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc:          z.string().optional(),
  upiId:             z.string().optional(),
  // Razorpay
  razorpayKeyId:     z.string().optional(),
  razorpayKeySecret: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

const BUSINESS_TYPES = [
  { value: 'design',        label: 'Design Studio' },
  { value: 'development',   label: 'Web / App Development' },
  { value: 'photography',   label: 'Photography / Videography' },
  { value: 'architecture',  label: 'Architecture / Interior Design' },
  { value: 'marketing',     label: 'Marketing / Branding' },
  { value: 'consulting',    label: 'Consulting / Strategy' },
  { value: 'writing',       label: 'Content / Copywriting' },
  { value: 'other',         label: 'Other' },
]

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function ProfileTab() {
  const { data: profile, isLoading } = useProfile()
  const { mutateAsync: updateProfile, isPending: saving } = useUpdateProfile()
  const { mutateAsync: uploadLogo, isPending: uploading }  = useUploadLogo()
  const redeemPromo = useRedeemPromo()
  const { resetTour } = useOnboardingTour()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [promoInput, setPromoInput] = useState('')

  const handleRedeemPromo = useCallback(async () => {
    if (!promoInput.trim()) return
    await redeemPromo.mutateAsync(promoInput.trim().toUpperCase())
    setPromoInput('')
  }, [promoInput, redeemPromo])

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (profile) {
      reset({
        name:              profile.name              ?? '',
        businessName:      profile.businessName      ?? '',
        businessType:      profile.businessType      ?? '',
        gstNumber:         profile.gstNumber         ?? '',
        panNumber:         profile.panNumber         ?? '',
        defaultHsnSac:     profile.defaultHsnSac     ?? '',
        defaultLutNumber:  profile.defaultLutNumber  ?? '',
        bankName:          profile.bankName          ?? '',
        bankAccountName:   profile.bankAccountName   ?? '',
        bankAccountNumber: profile.bankAccountNumber ?? '',
        bankIfsc:          profile.bankIfsc          ?? '',
        upiId:             profile.upiId             ?? '',
        razorpayKeyId:     profile.razorpayKeyId     ?? '',
        razorpayKeySecret: '',  // never populated from API (stripped server-side)
      })
      setLogoPreview(profile.logoUrl ?? null)
    }
  }, [profile, reset])

  const onSubmit = async (values: ProfileForm) => {
    await updateProfile({
      name:              values.name,
      businessName:      values.businessName      || null,
      businessType:      values.businessType      || null,
      gstNumber:         values.gstNumber         || null,
      panNumber:         values.panNumber         || null,
      defaultHsnSac:     values.defaultHsnSac     || null,
      defaultLutNumber:  values.defaultLutNumber  || null,
      bankName:          values.bankName          || null,
      bankAccountName:   values.bankAccountName   || null,
      bankAccountNumber: values.bankAccountNumber || null,
      bankIfsc:          values.bankIfsc          || null,
      upiId:             values.upiId             || null,
      razorpayKeyId:     values.razorpayKeyId     || null,
      // Only send razorpayKeySecret if user typed something (non-empty string)
      ...(values.razorpayKeySecret ? { razorpayKeySecret: values.razorpayKeySecret } : {}),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    reset(values)
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)

    try {
      const publicUrl = await uploadLogo(file)
      await updateProfile({ logoUrl: publicUrl })
      setLogoPreview(publicUrl)
    } catch {
      setLogoPreview(profile?.logoUrl ?? null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="card p-6 flex items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
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

  const initials = (profile?.businessName ?? profile?.name ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Logo card */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#EFF6FF] dark:bg-[#1E2040] flex items-center justify-center border border-[#EAECF0] dark:border-[#26283A]">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[22px] font-extrabold text-[#2563EB]">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#2563EB] rounded-full flex items-center justify-center border-2 border-white dark:border-[#13141A] shadow-sm hover:bg-[#1D4ED8] transition-colors"
            >
              {uploading
                ? <Loader2 size={12} className="text-white animate-spin" />
                : <Camera size={12} className="text-white" />}
            </button>
          </div>

          {/* Info */}
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">
              {profile?.businessName ?? profile?.name ?? 'Your Business'}
            </p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">{profile?.email}</p>
            {profile?.plan && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold
                bg-[#F4F5F8] dark:bg-[#21222D] border-[#EAECF0] dark:border-[#3D4258] text-[#667085] dark:text-[#8B92A8]
                data-[plan=SOLO]:bg-[#EEF2FF] data-[plan=SOLO]:dark:bg-[#1E2040] data-[plan=SOLO]:border-[#C7D2FE] data-[plan=SOLO]:dark:border-[#6366F1]/40 data-[plan=SOLO]:text-[#4338CA] data-[plan=SOLO]:dark:text-[#A5B4FC]
                data-[plan=STUDIO]:bg-[#F5F3FF] data-[plan=STUDIO]:dark:bg-[#1E1040] data-[plan=STUDIO]:border-[#DDD6FE] data-[plan=STUDIO]:dark:border-[#7C3AED]/40 data-[plan=STUDIO]:text-[#7C3AED] data-[plan=STUDIO]:dark:text-[#C4B5FD]"
                data-plan={profile.plan}
              >
                <Zap size={10} strokeWidth={2.5} />
                {profile.plan === 'FREE' ? 'Free Plan' : profile.plan === 'SOLO' ? 'Solo · ₹299/mo' : 'Studio · ₹699/mo'}
              </div>
            )}
            {profile?.planExpiresAt && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                Expires {new Date(profile.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
            >
              <Upload size={12} strokeWidth={2.5} />
              {uploading ? 'Uploading…' : 'Upload logo'}
            </button>
            <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">PNG, JPG up to 2 MB. Appears on proposals and invoices.</p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
      </div>

      {/* Onboarding tour */}
      <div className="card p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A] mb-4">
          <MapPin size={14} className="text-[#2563EB]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Product Tour</h3>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
            Replay the guided walkthrough to explore all features.
          </p>
          <button
            onClick={resetTour}
            className="btn-secondary shrink-0 text-[12.5px]"
          >
            Replay tour
          </button>
        </div>
      </div>

      {/* Promo code */}
      <div className="card p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A] mb-4">
          <Zap size={14} className="text-[#6366F1] dark:text-[#818CF8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Promo Code</h3>
        </div>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mb-3">
          Have a promo code? Redeem it to unlock Solo or Studio features for 30 days.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleRedeemPromo()}
            placeholder="e.g. BETA2026"
            className="form-input flex-1 uppercase tracking-widest font-mono"
          />
          <button
            type="button"
            onClick={handleRedeemPromo}
            disabled={redeemPromo.isPending || !promoInput.trim()}
            className="btn-primary shrink-0"
          >
            {redeemPromo.isPending ? 'Redeeming…' : 'Redeem'}
          </button>
        </div>
      </div>

      {/* Personal info */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <User size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Personal Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Your Name" error={errors.name?.message} required>
            <input {...register('name')} placeholder="Maharshi Vaghela" className={cn('form-input w-full', errors.name && 'border-red-400')} />
          </Field>
          <Field label="Email">
            <input value={profile?.email ?? ''} disabled className="form-input w-full opacity-60 cursor-not-allowed bg-[#F9FAFB] dark:bg-[#1A1B23]" />
          </Field>
        </div>
      </div>

      {/* Business info */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <Building2 size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Business Details</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name">
            <input {...register('businessName')} placeholder="Vaghela Studio" className="form-input w-full" />
          </Field>
          <Field label="Business Type">
            <select {...register('businessType')} className="form-input w-full">
              <option value="">— Select type —</option>
              {BUSINESS_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Tax info */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <Receipt size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Tax & Compliance</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Appears on invoices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GST Number" hint="e.g. 27AAAAA0000A1Z5">
            <input
              {...register('gstNumber')}
              placeholder="22AAAAA0000A1Z5"
              className="form-input w-full font-mono text-[13px] tracking-wide uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
                register('gstNumber').onChange(e)
              }}
            />
          </Field>
          <Field label="PAN Number" hint="e.g. ABCDE1234F">
            <input
              {...register('panNumber')}
              placeholder="ABCDE1234F"
              className="form-input w-full font-mono text-[13px] tracking-wide uppercase"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase()
                register('panNumber').onChange(e)
              }}
            />
          </Field>
        </div>
      </div>

      {/* Compliance defaults */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <ShieldCheck size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Invoice Defaults</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Auto-fills on new invoices</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Default SAC / HSN Code"
            hint="Required on GST invoices. Auto-fills on every new line item."
          >
            <input
              {...register('defaultHsnSac')}
              placeholder="e.g. 998313"
              maxLength={8}
              className="form-input w-full font-mono text-[13px] tracking-wide"
            />
          </Field>
          <Field
            label="LUT Reference Number"
            hint="For export invoices (zero-rated). Filed with GSTN."
          >
            <input
              {...register('defaultLutNumber')}
              placeholder="e.g. AD220522001234H"
              className="form-input w-full font-mono text-[13px]"
            />
          </Field>
        </div>
      </div>

      {/* Payment details */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <CreditCard size={14} className="text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
          <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Payment Details</h3>
          <span className="ml-auto text-[11px] text-[#98A2B3] dark:text-[#545C74]">Shown on invoices</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank Name">
            <input {...register('bankName')} placeholder="HDFC Bank" className="form-input w-full" />
          </Field>
          <Field label="Account Holder Name">
            <input {...register('bankAccountName')} placeholder="Your legal name" className="form-input w-full" />
          </Field>
          <Field label="Account Number">
            <input {...register('bankAccountNumber')} placeholder="000123456789" className="form-input w-full font-mono" />
          </Field>
          <Field label="IFSC Code">
            <input {...register('bankIfsc')} placeholder="HDFC0001234" className="form-input w-full font-mono uppercase" />
          </Field>
          <Field label="UPI ID" hint="e.g. yourname@okicici — clients pay you directly here">
            <input {...register('upiId')} placeholder="yourname@okicici" className="form-input w-full" />
          </Field>
        </div>
        <div className="pt-3 border-t border-[#F2F4F7] dark:border-[#26283A] space-y-4">
          <p className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] flex items-center gap-1.5">
            Razorpay Keys <span className="text-[11px] text-[#98A2B3] font-normal">(for online payment links)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Key ID" hint="Starts with rzp_live_ or rzp_test_">
              <input {...register('razorpayKeyId')} placeholder="rzp_live_…" className="form-input w-full font-mono text-[12px]" />
            </Field>
            <Field label="Key Secret">
              <input {...register('razorpayKeySecret')} type="password" placeholder="••••••••••••••••" className="form-input w-full font-mono text-[12px]" />
            </Field>
          </div>
          <p className="text-[11px] text-[#98A2B3]">Find your keys in Razorpay Dashboard → Settings → API Keys.</p>
        </div>
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

function Field({
  label, error, hint, required, children,
}: {
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
