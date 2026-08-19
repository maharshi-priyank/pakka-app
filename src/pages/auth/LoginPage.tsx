import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const [serverError, setServerError] = useState('')
  const [isLoading,   setIsLoading]   = useState(false)
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const inviteToken = params.get('invite') ?? ''

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setServerError('')
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setServerError(error.message)
      setIsLoading(false)
      return
    }
    // If came from an invite link, redirect back to accept it
    if (inviteToken) {
      navigate(`/accept-invite?token=${encodeURIComponent(inviteToken)}`, { replace: true })
    }
    setIsLoading(false)
  }

  async function signInWithGoogle() {
    // Preserve invite token through Google OAuth redirect
    const redirectTo = inviteToken
      ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(inviteToken)}`
      : `${window.location.origin}/dashboard`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
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
            Run your service<br />business like a pro.
          </h2>
          <p className="mt-4 text-gray-600 text-[15px] leading-relaxed max-w-[300px]">
            The all-in-one platform for Indian service businesses — proposal to payment, in one place.
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

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/logo/clearwork_full_dark.png" alt="ClearWork" style={{ height: 30, width: 'auto', display: 'block' }} />
          </div>

          <h1 className="text-[26px] font-black text-[#0F172A] tracking-tight mb-1">Welcome back</h1>
          <p className="text-[14px] text-[#64748B] mb-8">Sign in to your ClearWork account</p>

          {serverError && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#1E293B] mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@agency.com"
                className="w-full h-11 px-4 text-[14px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-[#F9FAFB] focus:bg-white"
              />
              {errors.email && <p className="mt-1 text-[11.5px] text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12.5px] font-semibold text-[#1E293B]">Password</label>
              </div>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full h-11 px-4 text-[14px] border border-[#E4E7EC] rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all bg-[#F9FAFB] focus:bg-white"
              />
              {errors.password && <p className="mt-1 text-[11.5px] text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[14px] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E4E7EC]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[12px] text-[#94A3B8]">or continue with</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 h-11 border border-[#E4E7EC] rounded-xl text-[13.5px] font-medium text-[#1E293B] hover:bg-[#F9FAFB] hover:border-[#CDD1DA] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <p className="mt-7 text-center text-[13px] text-[#64748B]">
            Don't have an account?{' '}
            <Link
              to={inviteToken ? `/signup?invite=${encodeURIComponent(inviteToken)}` : '/signup'}
              className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]"
            >
              Sign up free
            </Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}
