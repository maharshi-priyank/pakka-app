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
      <div className="hidden lg:flex lg:w-[46%] flex-col px-10 py-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #c3daea 0%, #ccdce8 45%, #d8dde2 70%, #dedad4 100%)' }}>

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo/clearwork_full_dark.png" alt="ClearWork" style={{ height: 28, width: 'auto', display: 'block' }} />
        </div>

        {/* Headline + badges */}
        <div className="relative z-10 mt-12">
          <h2 className="text-[44px] font-black text-gray-950 leading-[1.08] tracking-tight">
            Everything you need<br />to close more clients.
          </h2>
          <p className="mt-4 text-gray-600 text-[15px] leading-relaxed max-w-[300px]">
            Join freelancers across India managing their pipeline, proposals, contracts, and invoices in one place.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['GST invoicing', 'Razorpay payments', 'E-sign contracts'].map(b => (
              <span key={b} className="px-3 py-1 rounded-full text-xs font-semibold border text-gray-700"
                style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.8)' }}>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard screenshot peeking from bottom */}
        <div className="absolute bottom-0 left-6 right-6 z-10">
          <div style={{
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            background: '#fff',
            border: '1px solid rgba(255,255,255,0.7)',
            borderBottom: 'none',
            boxShadow: '0 -8px 48px rgba(15,23,42,0.14), 0 -2px 16px rgba(15,23,42,0.07)',
          }}>
            <img src="/screenshots/screenshot-dashboard.png" alt="ClearWork dashboard" className="w-full block" />
          </div>
        </div>
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
