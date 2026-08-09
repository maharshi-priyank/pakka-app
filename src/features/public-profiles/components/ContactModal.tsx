import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubmitEnquiry } from '../hooks/usePublicProfile'
import type { PublicProfileData } from '../hooks/usePublicProfile'

const schema = z.object({
  senderName: z.string().min(1, 'Name is required').max(100),
  senderPhone: z.string().optional(),
  senderEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  budget: z.string().optional(),
  serviceNeeded: z.string().optional(),
  brief: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

const BUDGETS = ['< ₹10k', '₹10k–25k', '₹25k–50k', '₹50k–1L', '₹1L+']

interface Props {
  profile: PublicProfileData
  open: boolean
  onClose: () => void
}

export default function ContactModal({ profile, open, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const { mutateAsync, isPending } = useSubmitEnquiry(profile.username)
  const displayName = (profile.businessName ?? profile.name).split(' ')[0]
  const avgResponse =
    profile.statsAvgResponseHrs < 2
      ? '< 2 hrs'
      : profile.statsAvgResponseHrs < 24
        ? `~${profile.statsAvgResponseHrs} hrs`
        : '~1 day'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    await mutateAsync({
      senderName: values.senderName,
      senderPhone: values.senderPhone || undefined,
      senderEmail: values.senderEmail || undefined,
      budget: values.budget || undefined,
      serviceNeeded: values.serviceNeeded || undefined,
      brief: values.brief || undefined,
    })
    setSubmitted(true)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-[480px] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#09090B] px-6 pt-6 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[18px] font-black text-white tracking-tight">
                Message {displayName}
              </div>
              <div className="text-[13px] text-[#71717A] mt-0.5">
                Describe your project and we'll get back to you
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
              <CheckCircle2 size={30} className="text-[#16A34A]" />
            </div>
            <div>
              <div className="text-[20px] font-black text-[#09090B] mb-1.5">Message sent!</div>
              <div className="text-[14px] text-[#71717A] leading-relaxed max-w-xs mx-auto">
                {displayName} usually responds in {avgResponse}. You'll hear back soon.
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-[#09090B] text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:bg-[#27272A] transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-bold text-[#09090B] mb-2">
                Your name <span className="text-[#EF4444]">*</span>
              </label>
              <input
                {...register('senderName')}
                placeholder="Ravi Patel"
                className={cn(
                  'w-full border rounded-xl px-4 py-3 text-[15px] text-[#09090B] outline-none transition-all placeholder:text-[#A1A1AA]',
                  errors.senderName
                    ? 'border-[#EF4444] bg-[#FEF2F2]'
                    : 'border-[#E4E4E7] focus:border-[#09090B] focus:ring-4 focus:ring-[#09090B]/5',
                )}
              />
              {errors.senderName && (
                <p className="text-[12px] text-[#EF4444] mt-1.5">{errors.senderName.message}</p>
              )}
            </div>

            {/* Budget + Service */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-bold text-[#09090B] mb-2">Budget</label>
                <select
                  {...register('budget')}
                  className="w-full border border-[#E4E4E7] rounded-xl px-4 py-3 text-[15px] text-[#09090B] outline-none focus:border-[#09090B] focus:ring-4 focus:ring-[#09090B]/5 bg-white transition-all"
                >
                  <option value="">Select…</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#09090B] mb-2">Service</label>
                <select
                  {...register('serviceNeeded')}
                  className="w-full border border-[#E4E4E7] rounded-xl px-4 py-3 text-[15px] text-[#09090B] outline-none focus:border-[#09090B] focus:ring-4 focus:ring-[#09090B]/5 bg-white transition-all"
                >
                  <option value="">Select…</option>
                  {profile.publicServices.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Brief */}
            <div>
              <label className="block text-[13px] font-bold text-[#09090B] mb-2">
                Project brief
              </label>
              <textarea
                {...register('brief')}
                rows={3}
                placeholder="Tell me about your project, timeline, and goals…"
                className="w-full border border-[#E4E4E7] rounded-xl px-4 py-3 text-[15px] text-[#09090B] outline-none focus:border-[#09090B] focus:ring-4 focus:ring-[#09090B]/5 resize-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#09090B] text-white py-3.5 rounded-xl text-[15px] font-black hover:bg-[#27272A] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {isPending ? 'Sending…' : 'Send message'}
            </button>

            {/* WhatsApp fallback */}
            {profile.publicWhatsapp && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-[#F4F4F5]" />
                  <span className="text-[12px] text-[#A1A1AA] font-semibold">or</span>
                  <div className="flex-1 h-px bg-[#F4F4F5]" />
                </div>
                <a
                  href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 text-[#15803D] text-[14px] font-bold py-3 rounded-xl border-2 border-[#BBF7D0] hover:bg-[#F0FDF4] transition-all cursor-pointer"
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </a>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  , document.body)
}
