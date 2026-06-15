import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { SubscriptionState } from '@/features/billing/hooks/useSubscription'

const MAX_POLLS = 15
const POLL_INTERVAL_MS = 2000

export default function BillingSuccessPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const [status, setStatus] = useState<'polling' | 'active' | 'timeout'>('polling')
  const attempts = useRef(0)

  function retryPolling() {
    attempts.current = 0
    setStatus('polling')
  }

  useEffect(() => {
    if (status !== 'polling') return

    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      attempts.current += 1
      try {
        const { data } = await api.get<{ data: SubscriptionState }>('/payments/subscription')
        const sub = data.data

        if (sub.subscriptionStatus === 'ACTIVE') {
          if (cancelled) return
          setStatus('active')
          // Flush stale plan data so the whole app reflects the new plan immediately
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['profile'] }),
            queryClient.invalidateQueries({ queryKey: ['billing'] }),
          ])
          const planName = sub.plan === 'SOLO' ? 'Solo' : 'Studio'
          setTimeout(() => {
            toast.success(`You're on the ${planName} plan. Welcome!`)
            navigate('/dashboard', { replace: true })
          }, 1500)
          return
        }
      } catch {
        // ignore transient errors, keep polling
      }

      if (cancelled) return
      if (attempts.current >= MAX_POLLS) {
        setStatus('timeout')
        return
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, navigate, queryClient])

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-10 max-w-md w-full text-center">

        {status === 'polling' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#EEF2FF] flex items-center justify-center mx-auto mb-5">
              <Loader2 size={24} className="text-[#6366F1] animate-spin" />
            </div>
            <h1 className="text-[18px] font-bold text-[#101828] mb-2">Confirming your payment…</h1>
            <p className="text-[13px] text-[#667085]">
              Hang tight — we're activating your plan. This usually takes a few seconds.
            </p>
          </>
        )}

        {status === 'active' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#ECFDF3] flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={26} className="text-[#17B26A]" />
            </div>
            <h1 className="text-[18px] font-bold text-[#101828] mb-2">Payment confirmed!</h1>
            <p className="text-[13px] text-[#667085]">Redirecting you to your dashboard…</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="w-14 h-14 rounded-full bg-[#FFF8ED] flex items-center justify-center mx-auto mb-5">
              <Loader2 size={24} className="text-[#F59E0B]" />
            </div>
            <h1 className="text-[18px] font-bold text-[#101828] mb-2">Taking longer than usual</h1>
            <p className="text-[13px] text-[#667085] mb-6">
              Your payment was received. Plan activation may take a moment to reflect.
            </p>
            <button
              onClick={retryPolling}
              className="w-full h-11 bg-[#6366F1] text-white text-[13px] font-semibold rounded-xl hover:bg-[#4F46E5] transition-colors cursor-pointer mb-3"
            >
              Check again
            </button>
            <button
              onClick={() => navigate('/settings?tab=billing', { replace: true })}
              className="w-full h-11 border border-[#EAECF0] text-[#344054] text-[13px] font-semibold rounded-xl hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              Go to billing settings
            </button>
          </>
        )}

      </div>
    </div>
  )
}
