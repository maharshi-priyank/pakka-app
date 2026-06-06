import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
const schema = z.object({
  name:     z.string().min(2, 'Name is required'),
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

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
            <Mail size={24} className="text-[#2563EB]" strokeWidth={1.5} />
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
    <div className="h-screen flex overflow-hidden">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#0D1117] flex-col px-10 py-8">
        {/* Logo — top left */}
        <img src="/logo/clearwork_full_white.png" alt="ClearWork" style={{ height: 32, width: 'auto', display: 'block' }} />

        {/* Spacer — pushes heading to vertical middle */}
        <div className="flex-1" />

        {/* Heading — left aligned, mid-panel */}
        <h2 className="heading-display text-[52px] text-[#FFFFF0]">
          Everything you need<br />
          to close more clients.
        </h2>

        {/* Spacer — pushes tagline to very bottom */}
        <div className="flex-1" />

        {/* Tagline pinned at bottom */}
        <p className="text-white/40 text-[13px] leading-relaxed max-w-[340px] pb-2">
          Join freelancers across India managing their pipeline, proposals, contracts, and invoices in one place.
        </p>
      </div>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-white overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center items-center px-6 py-10">
        <div className="w-full max-w-[400px]">

          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo/clearwork_full_dark.png" alt="ClearWork" style={{ height: 30, width: 'auto', display: 'block' }} />
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
    </div>
  )
}
