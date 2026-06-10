import { Check, Star, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useCurrentPricing } from '../hooks/useCurrentPricing'
import { useCreateSubscription } from '../hooks/useSubscription'

const FEATURES = {
  SOLO:   ['Up to 25 clients', 'Unlimited proposals & leads', 'E-sign contracts', 'GST invoice + TDS flagging', 'Client portal'],
  STUDIO: ['Everything in Solo', 'Unlimited clients', '1 team member seat', 'White-label docs & portal', 'No ClearWork branding', 'Priority support'],
}

export default function UpgradePlanCards() {
  const navigate = useNavigate()
  const { data: pricing, isLoading } = useCurrentPricing()
  const { mutate: subscribe, isPending } = useCreateSubscription()

  const isFounding = pricing?.window === 'founding'

  return (
    <div className="space-y-3">
      {isFounding && (
        <div className="flex items-center gap-2 bg-[#FFF8ED] dark:bg-[#2A2215] border border-[#FEE3A3] rounded-xl px-3.5 py-2.5">
          <Star size={13} className="text-[#F59E0B] shrink-0" fill="currentColor" />
          <p className="text-[12px] font-semibold text-[#92400E] dark:text-[#FCD34D]">
            Founding pricing active
            {pricing?.windowEnds && (
              <span className="font-normal ml-1">
                — until {new Date(pricing.windowEnds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Solo */}
        <div className="bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5 ring-1 ring-[#6366F1]/20 relative">
          <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">
            Popular
          </span>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[13px] font-bold text-[#6366F1] mb-0.5">Solo</p>
              <div className="flex items-baseline gap-1">
                {isLoading ? (
                  <div className="h-7 w-16 bg-[#EAECF0] rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-[24px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                      ₹{pricing?.solo.price ?? 299}
                    </span>
                    <span className="text-[12px] text-[#98A2B3]">/mo</span>
                  </>
                )}
              </div>
              {!isLoading && isFounding && (
                <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">₹299/mo regular</p>
              )}
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {FEATURES.SOLO.map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                <Check size={11} className="text-[#6366F1] shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => subscribe('SOLO', { onSuccess: () => navigate('/billing/success') })}
            disabled={isPending}
            className={cn(
              'w-full h-10 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
              'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            Get Solo
          </button>
        </div>

        {/* Studio */}
        <div className="bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[13px] font-bold text-[#7C3AED] mb-0.5">Studio</p>
              <div className="flex items-baseline gap-1">
                {isLoading ? (
                  <div className="h-7 w-16 bg-[#EAECF0] rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-[24px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                      ₹{pricing?.studio.price ?? 699}
                    </span>
                    <span className="text-[12px] text-[#98A2B3]">/mo</span>
                  </>
                )}
              </div>
              {!isLoading && isFounding && (
                <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">₹699/mo regular</p>
              )}
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {FEATURES.STUDIO.map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                <Check size={11} className="text-[#7C3AED] shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => subscribe('STUDIO', { onSuccess: () => navigate('/billing/success') })}
            disabled={isPending}
            className={cn(
              'w-full h-10 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
              'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            Get Studio
          </button>
        </div>
      </div>

      <p className="text-[11.5px] text-[#98A2B3] text-center pt-1">
        Monthly billing · Cancel anytime · Secure checkout via Cashfree
      </p>
    </div>
  )
}
