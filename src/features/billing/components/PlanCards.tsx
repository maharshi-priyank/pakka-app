import { Check, Star, Loader2, AlertCircle, Calendar, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useCurrentPricing } from '../hooks/useCurrentPricing'
import { useCreateSubscription, useCreateStripeCheckout } from '../hooks/useSubscription'
import type { SubscriptionState } from '../hooks/useSubscription'

interface Props {
  subscription: SubscriptionState | undefined
  onCancel: () => void
}

const FEATURES = {
  SOLO:   ['Up to 25 clients', 'Unlimited proposals & leads', 'E-sign contracts', 'GST invoice + TDS flagging', 'Client portal'],
  STUDIO: ['Everything in Solo', 'Unlimited clients', '1 team member seat', 'White-label docs & portal', 'No ClearWork branding', 'Priority support'],
}

function StatusDetails({
  subscription,
  onCancel,
  onSubscribe,
  isPending,
  accent,
}: {
  subscription: SubscriptionState
  onCancel: () => void
  onSubscribe: (tier: 'SOLO' | 'STUDIO') => void
  isPending: boolean
  accent: string
}) {
  const tier = subscription.plan as 'SOLO' | 'STUDIO'
  const status = subscription.subscriptionStatus

  const nextBilling = subscription.billingAnchorDate
    ? new Date(subscription.billingAnchorDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const expiresAt = subscription.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  if (status === 'ACTIVE') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#17B26A] shrink-0" />
          <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8] font-medium">Active</span>
          {nextBilling && (
            <span className="text-[12px] text-[#98A2B3] flex items-center gap-1">
              <Calendar size={11} />
              {nextBilling}
            </span>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-[12px] text-[#667085] hover:text-[#D92D20] transition-colors cursor-pointer"
        >
          Cancel plan
        </button>
      </div>
    )
  }

  if (status === 'PAST_DUE') {
    return (
      <div className="flex items-start gap-2 bg-[#FFF8ED] border border-[#FEE3A3] rounded-lg px-3 py-2.5">
        <AlertCircle size={13} className="text-[#F59E0B] mt-0.5 shrink-0" />
        <p className="text-[11.5px] text-[#92400E]">
          Payment failed — update your payment method via Cashfree.
        </p>
      </div>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <div className="space-y-2">
        {expiresAt && (
          <p className="text-[12px] text-[#667085] flex items-center gap-1.5">
            <Calendar size={11} />
            Access until {expiresAt}
          </p>
        )}
        <button
          onClick={() => onSubscribe(tier)}
          disabled={isPending}
          className={cn(
            'w-full h-9 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
            accent === 'indigo'
              ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
              : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Re-subscribe
        </button>
      </div>
    )
  }

  if (status === 'PAUSED') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
        <span className="text-[12px] text-[#667085]">Paused</span>
      </div>
    )
  }

  // NONE
  if (expiresAt) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] text-[#667085]">
          Promo active — expires {expiresAt}
        </p>
        <button
          onClick={() => onSubscribe(tier)}
          disabled={isPending}
          className={cn(
            'w-full h-9 rounded-lg text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
            accent === 'indigo'
              ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
              : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Subscribe to keep access
        </button>
      </div>
    )
  }

  return (
    <p className="text-[12px] text-[#98A2B3]">
      Contact support to check your plan status.
    </p>
  )
}

// USD prices for international users — must match stripe.service.ts USD_PRICES
const USD_SOLO:   Record<string, number> = { founding: 5,  earlyaccess: 7,  regular: 9 }
const USD_STUDIO: Record<string, number> = { founding: 12, earlyaccess: 17, regular: 22 }

export default function PlanCards({ subscription, onCancel }: Props) {
  const navigate = useNavigate()
  const { isIndia } = useWorkspace()
  const { data: pricing, isLoading } = useCurrentPricing()
  const { mutate: subscribeCashfree, isPending: isPendingCashfree } = useCreateSubscription()
  const { mutate: subscribeStripe,   isPending: isPendingStripe   } = useCreateStripeCheckout()

  const isPending  = isPendingCashfree || isPendingStripe
  const currentPlan = subscription?.plan ?? 'FREE'
  const isFounding  = pricing?.window === 'founding'
  const priceWindow = pricing?.window ?? 'regular'

  const handleSubscribe = (tier: 'SOLO' | 'STUDIO') => {
    if (isIndia) {
      subscribeCashfree(tier, { onSuccess: () => navigate('/billing/success') })
    } else {
      subscribeStripe(tier)
    }
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Solo card */}
        {(() => {
          const isCurrent = currentPlan === 'SOLO'
          const isLower = currentPlan === 'STUDIO'

          return (
            <div className={cn(
              'bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5 relative flex flex-col',
              isCurrent && 'ring-2 ring-[#6366F1] shadow-md shadow-[#6366F1]/10',
              isLower && 'opacity-60',
            )}>
              {isCurrent ? (
                <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-[#EEF2FF] text-[#6366F1] text-[10px] font-bold rounded-full border border-[#C7D2FE]">
                  Current Plan
                </span>
              ) : !isLower ? (
                <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">
                  Popular
                </span>
              ) : null}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[14px] font-bold text-[#6366F1] mb-0.5">Solo</p>
                  <div className="flex items-baseline gap-1">
                    {isLoading ? (
                      <div className="h-7 w-16 bg-[#EAECF0] rounded animate-pulse" />
                    ) : isIndia ? (
                      <>
                        <span className="text-[26px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                          ₹{pricing?.solo.price ?? 299}
                        </span>
                        <span className="text-[12px] text-[#98A2B3]">/mo</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[26px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                          ${USD_SOLO[priceWindow] ?? 9}
                        </span>
                        <span className="text-[12px] text-[#98A2B3]">/mo</span>
                      </>
                    )}
                  </div>
                  {!isLoading && isFounding && isIndia && (
                    <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">₹299/mo regular</p>
                  )}
                  {!isLoading && isFounding && !isIndia && (
                    <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">$9/mo regular</p>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 mb-4 flex-1">
                {FEATURES.SOLO.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="text-[#6366F1] shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent && subscription ? (
                <StatusDetails
                  subscription={subscription}
                  onCancel={onCancel}
                  onSubscribe={handleSubscribe}
                  isPending={isPending}
                  accent="indigo"
                />
              ) : isLower ? (
                <p className="text-[11.5px] text-[#98A2B3] text-center">You're on a higher plan</p>
              ) : (
                <button
                  onClick={() => handleSubscribe('SOLO')}
                  disabled={isPending}
                  className={cn(
                    'w-full h-10 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                    'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Get Solo
                </button>
              )}
            </div>
          )
        })()}

        {/* Studio card */}
        {(() => {
          const isCurrent = currentPlan === 'STUDIO'
          const isUpgrade = currentPlan === 'SOLO'

          return (
            <div className={cn(
              'bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5 relative flex flex-col',
              isCurrent && 'ring-2 ring-[#7C3AED] shadow-md shadow-[#7C3AED]/10',
            )}>
              {isCurrent && (
                <span className="absolute -top-2.5 left-5 px-2.5 py-0.5 bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-bold rounded-full border border-[#DDD6FE]">
                  Current Plan
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[14px] font-bold text-[#7C3AED] mb-0.5">Studio</p>
                  <div className="flex items-baseline gap-1">
                    {isLoading ? (
                      <div className="h-7 w-16 bg-[#EAECF0] rounded animate-pulse" />
                    ) : isIndia ? (
                      <>
                        <span className="text-[26px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                          ₹{pricing?.studio.price ?? 699}
                        </span>
                        <span className="text-[12px] text-[#98A2B3]">/mo</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[26px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                          ${USD_STUDIO[priceWindow] ?? 22}
                        </span>
                        <span className="text-[12px] text-[#98A2B3]">/mo</span>
                      </>
                    )}
                  </div>
                  {!isLoading && isFounding && isIndia && (
                    <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">₹699/mo regular</p>
                  )}
                  {!isLoading && isFounding && !isIndia && (
                    <p className="text-[11px] text-[#9CA3AF] line-through mt-0.5">$22/mo regular</p>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 mb-4 flex-1">
                {FEATURES.STUDIO.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="text-[#7C3AED] shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent && subscription ? (
                <StatusDetails
                  subscription={subscription}
                  onCancel={onCancel}
                  onSubscribe={handleSubscribe}
                  isPending={isPending}
                  accent="violet"
                />
              ) : (
                <button
                  onClick={() => handleSubscribe('STUDIO')}
                  disabled={isPending}
                  className={cn(
                    'w-full h-10 rounded-lg text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer',
                    'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  {isUpgrade ? 'Upgrade to Studio' : 'Get Studio'}
                </button>
              )}
            </div>
          )
        })()}
      </div>

      <p className="text-[11.5px] text-[#98A2B3] text-center pt-1">
        {isIndia
          ? 'Monthly billing · Cancel anytime · Secure checkout via Cashfree'
          : 'Monthly billing · Cancel anytime · Secure checkout via Stripe'}
      </p>
    </div>
  )
}
