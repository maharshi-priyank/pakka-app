import { createPortal } from 'react-dom'
import { X, Check, Zap, Star, Loader2 } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { useCurrentPricing } from '@/features/billing/hooks/useCurrentPricing'
import { useCreateSubscription } from '@/features/billing/hooks/useSubscription'

const WINDOW_LABELS: Record<string, string> = {
  founding:    'Founding pricing',
  earlyaccess: 'Early access pricing',
  regular:     'Standard pricing',
}

const FEATURES = {
  FREE: [
    '3 proposals / month',
    '3 active leads',
    '1 client',
    'ClearWork watermark on docs',
  ],
  SOLO: [
    'Up to 25 clients',
    'Unlimited proposals & leads',
    'E-sign contracts',
    'GST invoice + TDS flagging',
    'Client portal',
    'Revenue dashboard',
  ],
  STUDIO: [
    'Everything in Solo',
    'Unlimited clients',
    '1 team member seat',
    'White-label documents & portal',
    'No "Powered by ClearWork" branding',
    'Priority email support',
  ],
}

function PriceSkeleton() {
  return <div className="h-7 w-16 bg-[#EAECF0] dark:bg-[#2A2B3A] rounded animate-pulse" />
}

export default function UpgradeModal() {
  const { upgradeModal, closeUpgradeModal } = useUiStore()
  const { data: pricing, isLoading: pricingLoading } = useCurrentPricing()
  const { mutate: createSubscription, isPending } = useCreateSubscription()

  if (!upgradeModal.open) return null

  const isFounding = pricing?.window === 'founding'
  const windowLabel = pricing ? WINDOW_LABELS[pricing.window] : null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        style={{ animation: 'fadeIn 150ms ease-out' }}
        onClick={closeUpgradeModal}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-[660px] bg-white dark:bg-[#1A1B27] rounded-2xl shadow-xl border border-[#EAECF0] dark:border-[#26283A] pointer-events-auto"
          style={{ animation: 'modalIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade your plan"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
                  <Zap size={14} className="text-[#6366F1]" strokeWidth={2.5} />
                </div>
                <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Upgrade your plan</h2>
              </div>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                You've reached the{' '}
                <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{upgradeModal.feature}</span>{' '}
                limit on the Free plan.
              </p>
            </div>
            <button
              onClick={closeUpgradeModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Founding badge */}
          {windowLabel && (
            <div className="mx-6 mb-4 flex items-center gap-2 bg-[#FFF8ED] dark:bg-[#2A2215] border border-[#FEE3A3] dark:border-[#4A3C1A] rounded-xl px-3.5 py-2.5">
              <Star size={13} className="text-[#F59E0B] shrink-0" fill="currentColor" />
              <p className="text-[12px] font-semibold text-[#92400E] dark:text-[#FCD34D]">
                {windowLabel}
                {pricing?.windowEnds && (
                  <span className="font-medium ml-1 text-[#B45309] dark:text-[#F6C343]">
                    — until {new Date(pricing.windowEnds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3 px-6 pb-5">
            {/* Free */}
            <div className="rounded-xl p-4 bg-[#F4F5F8] dark:bg-[#21222D] ring-1 ring-[#EAECF0] dark:ring-[#3D4258]">
              <p className="text-[13px] font-bold text-[#667085] mb-0.5">Free</p>
              <p className="text-[22px] font-black text-[#101828] dark:text-[#ECEEF3] leading-none tabular-nums">
                ₹0
                <span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">forever</span>
              </p>
              <ul className="mt-3 space-y-1.5">
                {FEATURES.FREE.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#98A2B3]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solo */}
            <div className="relative rounded-xl p-4 bg-[#EEF2FF] dark:bg-[#1E2040] ring-1 ring-[#6366F1]/40">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full whitespace-nowrap">
                Popular
              </span>
              <p className="text-[13px] font-bold text-[#6366F1] mb-0.5">Solo</p>
              <div className="leading-none">
                {pricingLoading ? <PriceSkeleton /> : (
                  <p className="text-[22px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                    ₹{pricing?.solo.price ?? 299}
                    <span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">/mo</span>
                  </p>
                )}
                {!pricingLoading && isFounding && (
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5 line-through">₹299/mo</p>
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {FEATURES.SOLO.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#6366F1]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => createSubscription('PRO', { onSuccess: () => { window.location.href = '/billing/success' } })}
                disabled={isPending || pricingLoading}
                className={cn(
                  'mt-4 w-full h-9 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  'bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                Subscribe
              </button>
            </div>

            {/* Studio */}
            <div className="rounded-xl p-4 bg-[#F5F3FF] dark:bg-[#1E1040] ring-1 ring-[#7C3AED]/30">
              <p className="text-[13px] font-bold text-[#7C3AED] mb-0.5">Studio</p>
              <div className="leading-none">
                {pricingLoading ? <PriceSkeleton /> : (
                  <p className="text-[22px] font-black text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                    ₹{pricing?.studio.price ?? 699}
                    <span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">/mo</span>
                  </p>
                )}
                {!pricingLoading && isFounding && (
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5 line-through">₹699/mo</p>
                )}
              </div>
              <ul className="mt-3 space-y-1.5">
                {FEATURES.STUDIO.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <Check size={11} className="mt-0.5 shrink-0 text-[#7C3AED]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => createSubscription('STUDIO', { onSuccess: () => { window.location.href = '/billing/success' } })}
                disabled={isPending || pricingLoading}
                className={cn(
                  'mt-4 w-full h-9 rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  'bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                Subscribe
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-0 border-t border-[#F1F3F8] dark:border-[#26283A] pt-4">
            <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] text-center">
              Monthly billing only · Cancel anytime · Secure checkout via Razorpay
            </p>
          </div>
        </div>
      </div>
    </>
  , document.body)
}
