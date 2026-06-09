import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useMyPublicProfile,
  useUpdateMyPublicProfile,
  useRecalculateMyStats,
} from '@/features/public-profiles/hooks/useMyPublicProfile'
import type { MyPublicProfile } from '@/features/public-profiles/hooks/useMyPublicProfile'

const serviceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().default('Briefcase'),
  priceFrom: z.number().min(0).default(0),
  deliveryDays: z.number().min(1).default(7),
  tags: z.array(z.string()).default([]),
})

const portfolioSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string().optional(),
  outcome: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

const formSchema = z.object({
  publicProfileEnabled: z.boolean(),
  publicUsername: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and dashes')
    .max(40)
    .optional()
    .or(z.literal('')),
  publicBio: z.string().max(500).optional(),
  publicCity: z.string().optional(),
  publicWhatsapp: z.string().optional(),
  publicLanguages: z.string().optional(),
  publicSkills: z.string().optional(),
  publicServices: z.array(serviceSchema),
  publicPortfolio: z.array(portfolioSchema),
})

type FormValues = z.infer<typeof formSchema>

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function statsDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

export default function PublicProfileTab() {
  const { data: profile, isLoading } = useMyPublicProfile()
  const { mutateAsync: update, isPending: saving } = useUpdateMyPublicProfile()
  const { mutateAsync: recalculate, isPending: recalculating } = useRecalculateMyStats()
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      publicProfileEnabled: false,
      publicUsername: '',
      publicBio: '',
      publicCity: '',
      publicWhatsapp: '',
      publicLanguages: '',
      publicSkills: '',
      publicServices: [],
      publicPortfolio: [],
    },
  })

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({ control, name: 'publicServices' })

  const {
    fields: portfolioFields,
    append: appendPortfolio,
    remove: removePortfolio,
  } = useFieldArray({ control, name: 'publicPortfolio' })

  const enabled = watch('publicProfileEnabled')
  const username = watch('publicUsername')

  useEffect(() => {
    if (!profile) return
    reset({
      publicProfileEnabled: profile.publicProfileEnabled,
      publicUsername: profile.publicUsername ?? '',
      publicBio: profile.publicBio ?? '',
      publicCity: profile.publicCity ?? '',
      publicWhatsapp: profile.publicWhatsapp ?? '',
      publicLanguages: profile.publicLanguages.join(', '),
      publicSkills: profile.publicSkills.join(', '),
      publicServices: profile.publicServices,
      publicPortfolio: profile.publicPortfolio,
    })
  }, [profile, reset])

  const onSubmit = async (values: FormValues) => {
    await update({
      publicProfileEnabled: values.publicProfileEnabled,
      publicUsername: values.publicUsername || undefined,
      publicBio: values.publicBio || undefined,
      publicCity: values.publicCity || undefined,
      publicWhatsapp: values.publicWhatsapp || undefined,
      publicLanguages: values.publicLanguages
        ? values.publicLanguages.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      publicSkills: values.publicSkills
        ? values.publicSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      publicServices: values.publicServices as MyPublicProfile['publicServices'],
      publicPortfolio: values.publicPortfolio as MyPublicProfile['publicPortfolio'],
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const profileUrl = `clearwork.in/u/${username || profile?.publicUsername || ''}`

  const copyUrl = () => {
    navigator.clipboard.writeText(`https://${profileUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Enable toggle */}
      <div className="bg-white rounded-xl border border-[#EAECF0] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-[#101828]">Public Profile</div>
            <div className="text-[11px] text-[#667085] mt-0.5">
              Share a professional profile page at{' '}
              <span className="font-semibold text-[#344054]">clearwork.in/u/[username]</span>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="sr-only peer" {...register('publicProfileEnabled')} />
            <div className="h-5 w-9 rounded-full bg-[#D0D5DD] peer-checked:bg-[#6366F1] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        </div>

        {/* Profile URL when enabled */}
        {enabled && profile?.publicUsername && (
          <div className="mt-3 flex items-center gap-2 bg-[#F4F6FB] rounded-lg px-3 py-2">
            <Globe size={12} className="text-[#6366F1] shrink-0" />
            <span className="text-[11px] text-[#344054] flex-1 truncate font-mono">{profileUrl}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copyUrl}
                className="text-[#667085] hover:text-[#344054] transition-colors"
              >
                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              </button>
              <a
                href={`https://${profileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#667085] hover:text-[#6366F1] transition-colors"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      {enabled && (
        <>
          {/* Username */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
            <div className="text-[11px] font-bold text-[#344054] tracking-wide uppercase">
              Username
            </div>
            <div>
              <div className="flex items-center border border-[#D0D5DD] rounded-lg overflow-hidden focus-within:border-[#6366F1]">
                <span className="px-3 text-[11px] text-[#98A2B3] bg-[#F9FAFB] border-r border-[#D0D5DD] py-2.5 shrink-0">
                  clearwork.in/u/
                </span>
                <input
                  {...register('publicUsername')}
                  placeholder="your-username"
                  className="flex-1 px-3 py-2.5 text-[12px] text-[#101828] outline-none bg-white"
                />
              </div>
              {errors.publicUsername && (
                <p className="text-[10px] text-red-500 mt-1">{errors.publicUsername.message}</p>
              )}
              {profile?.publicUsernameChanged && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Username can only be changed once — you have already changed it.
                </p>
              )}
              <p className="text-[10px] text-[#98A2B3] mt-1">
                Lowercase letters, numbers and dashes only. Max 40 chars.
              </p>
            </div>
          </div>

          {/* Bio & basics */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
            <div className="text-[11px] font-bold text-[#344054] tracking-wide uppercase">
              About You
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#344054] mb-1">Bio</label>
              <textarea
                {...register('publicBio')}
                rows={3}
                placeholder="Describe what you do in a few sentences…"
                className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1] resize-none"
              />
              <p className="text-[10px] text-[#98A2B3] mt-0.5">Max 500 characters</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#344054] mb-1">City</label>
                <input
                  {...register('publicCity')}
                  placeholder="Mumbai"
                  className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#344054] mb-1">
                  WhatsApp number
                </label>
                <input
                  {...register('publicWhatsapp')}
                  placeholder="+91 98765 43210"
                  className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#344054] mb-1">
                Languages
              </label>
              <input
                {...register('publicLanguages')}
                placeholder="English, Hindi, Gujarati"
                className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1]"
              />
              <p className="text-[10px] text-[#98A2B3] mt-0.5">Comma-separated</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#344054] mb-1">Skills</label>
              <input
                {...register('publicSkills')}
                placeholder="Logo Design, Branding, Figma"
                className="w-full border border-[#D0D5DD] rounded-lg px-3 py-2 text-[12px] text-[#101828] outline-none focus:border-[#6366F1]"
              />
              <p className="text-[10px] text-[#98A2B3] mt-0.5">Comma-separated</p>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-[#344054] tracking-wide uppercase">
                Services
              </div>
              <button
                type="button"
                onClick={() =>
                  appendService({
                    id: cuid(),
                    name: '',
                    description: '',
                    icon: 'Briefcase',
                    priceFrom: 0,
                    deliveryDays: 7,
                    tags: [],
                  })
                }
                className="flex items-center gap-1 text-[11px] text-[#6366F1] font-semibold hover:text-[#4F46E5]"
              >
                <Plus size={12} />
                Add service
              </button>
            </div>

            {serviceFields.length === 0 && (
              <p className="text-[11px] text-[#98A2B3] text-center py-4">
                No services yet. Add one to show on your profile.
              </p>
            )}

            {serviceFields.map((field, idx) => (
              <div key={field.id} className="border border-[#EAECF0] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#344054]">Service {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="text-[#F04438] hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Name *
                    </label>
                    <input
                      {...register(`publicServices.${idx}.name`)}
                      placeholder="Brand Identity"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Icon (lucide name)
                    </label>
                    <input
                      {...register(`publicServices.${idx}.icon`)}
                      placeholder="e.g. Palette, Code, Camera"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                    Description
                  </label>
                  <textarea
                    {...register(`publicServices.${idx}.description`)}
                    rows={2}
                    placeholder="Short description of this service…"
                    className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1] resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Price from (₹)
                    </label>
                    <input
                      type="number"
                      {...register(`publicServices.${idx}.priceFrom`, { valueAsNumber: true })}
                      placeholder="5000"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Delivery (days)
                    </label>
                    <input
                      type="number"
                      {...register(`publicServices.${idx}.deliveryDays`, { valueAsNumber: true })}
                      placeholder="7"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Portfolio */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-[#344054] tracking-wide uppercase">
                Portfolio
              </div>
              <button
                type="button"
                onClick={() =>
                  appendPortfolio({
                    id: cuid(),
                    title: '',
                    category: '',
                    outcome: '',
                    thumbnailUrl: '',
                    liveUrl: '',
                    tags: [],
                  })
                }
                className="flex items-center gap-1 text-[11px] text-[#6366F1] font-semibold hover:text-[#4F46E5]"
              >
                <Plus size={12} />
                Add project
              </button>
            </div>

            {portfolioFields.length === 0 && (
              <p className="text-[11px] text-[#98A2B3] text-center py-4">
                No portfolio items yet. Add a project to showcase your work.
              </p>
            )}

            {portfolioFields.map((field, idx) => (
              <div key={field.id} className="border border-[#EAECF0] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#344054]">Project {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePortfolio(idx)}
                    className="text-[#F04438] hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Title *
                    </label>
                    <input
                      {...register(`publicPortfolio.${idx}.title`)}
                      placeholder="Brand Redesign for Acme"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Category
                    </label>
                    <input
                      {...register(`publicPortfolio.${idx}.category`)}
                      placeholder="Branding"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                    Outcome / Result
                  </label>
                  <input
                    {...register(`publicPortfolio.${idx}.outcome`)}
                    placeholder="Helped client increase brand recognition by 40%"
                    className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Thumbnail URL
                    </label>
                    <input
                      {...register(`publicPortfolio.${idx}.thumbnailUrl`)}
                      placeholder="https://…"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#667085] mb-0.5">
                      Live URL
                    </label>
                    <input
                      {...register(`publicPortfolio.${idx}.liveUrl`)}
                      placeholder="https://…"
                      className="w-full border border-[#D0D5DD] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-[#6366F1]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Verified Stats */}
          <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#344054] tracking-wide uppercase">
                  Verified Stats
                </div>
                <div className="text-[10px] text-[#98A2B3] mt-0.5">
                  Auto-calculated from your ClearWork data. Last updated:{' '}
                  {statsDate(profile?.statsLastCalculatedAt ?? null)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => recalculate()}
                disabled={recalculating}
                className="flex items-center gap-1.5 text-[11px] text-[#6366F1] font-semibold hover:text-[#4F46E5] disabled:opacity-50"
              >
                {recalculating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                Recalculate now
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Projects done', value: profile?.statsProjectsCompleted ?? 0 },
                {
                  label: 'Total earned',
                  value: profile?.statsTotalEarned
                    ? `₹${Math.floor(profile.statsTotalEarned / 1000)}k+`
                    : '—',
                },
                {
                  label: 'Repeat clients',
                  value: profile?.statsRepeatClientPct ? `${profile.statsRepeatClientPct}%` : '—',
                },
                {
                  label: 'Acceptance rate',
                  value: profile?.statsAcceptanceRate ? `${profile.statsAcceptanceRate}%` : '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F9FAFB] rounded-lg p-2.5">
                  <div className="text-[13px] font-extrabold text-[#101828]">{value}</div>
                  <div className="text-[9px] text-[#667085] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#6366F1]">
              <CheckCircle2 size={11} />
              <span>Stats are verified by ClearWork and recalculated nightly</span>
            </div>
          </div>
        </>
      )}

      {/* Save button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-[13px] font-bold hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? (
            <>
              <CheckCircle2 size={14} />
              Saved
            </>
          ) : (
            'Save profile'
          )}
        </button>
      </div>
    </form>
  )
}
