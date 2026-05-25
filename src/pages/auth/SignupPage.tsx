import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Star, ShieldCheck, IndianRupee } from 'lucide-react'

const schema = z.object({
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

const PERKS = [
  { icon: Star,          text: 'Free forever — no credit card required' },
  { icon: ShieldCheck,   text: 'Secure Supabase auth, your data stays yours' },
  { icon: IndianRupee,   text: 'GST-ready invoices & Razorpay payments built in' },
]

export default function SignupPage() {
  const [serverError, setServerError] = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [success,     setSuccess]     = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setServerError('')
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { name: values.name } },
    })
    if (error) setServerError(error.message)
    else setSuccess(true)
    setIsLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-[22px] font-black text-[#0F172A] mb-2">Check your email</h2>
          <p className="text-[14px] text-[#64748B] leading-relaxed">
            We've sent a confirmation link to your email. Click it to activate your account.
          </p>
          <Link
            to="/login"
            className="inline-block mt-7 text-[13.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#0D1117] flex-col justify-between px-12 py-12">
        <div className="space-y-10">
          <img src="/logo/full_logo_dark_theme.svg" alt="Clinekt" className="h-10 w-auto" />

          <div className="space-y-8">
            <div>
              <h2 className="text-[38px] font-black text-white leading-tight tracking-tight">
                Everything you need<br />
                to close more clients.
              </h2>
              <p className="text-white/50 text-[15px] mt-4 leading-relaxed">
                Join Indian freelancers who use Clinekt to manage their pipeline, proposals, contracts, and invoices in one place.
              </p>
            </div>

            <div className="space-y-4">
              {PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[#2563EB]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={15} className="text-[#60A5FA]" />
                  </span>
                  <p className="text-white/70 text-[14px] leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-white/25 text-[12px]">
          Built for Indian freelancers &amp; agencies · Clinekt 2026
        </p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-[400px]">

          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo/full_logo.svg" alt="Clinekt" className="h-8 w-auto" />
          </div>

          <h1 className="text-[26px] font-black text-[#0F172A] tracking-tight mb-1">Create your account</h1>
          <p className="text-[14px] text-[#64748B] mb-8">Free forever · no credit card needed</p>

          {serverError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1.5">Full name</label>
              <input
                {...register('name')}
                type="text"
                placeholder="Maharshi Vaghela"
                className="w-full h-11 px-4 text-[14px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-[#F9FAFB] focus:bg-white"
              />
              {errors.name && <p className="mt-1 text-[11.5px] text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1.5">Work email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@agency.com"
                className="w-full h-11 px-4 text-[14px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-[#F9FAFB] focus:bg-white"
              />
              {errors.email && <p className="mt-1 text-[11.5px] text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1.5">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Min. 8 characters"
                className="w-full h-11 px-4 text-[14px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-[#F9FAFB] focus:bg-white"
              />
              {errors.password && <p className="mt-1 text-[11.5px] text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[14px] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-7 text-center text-[13px] text-[#64748B]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
