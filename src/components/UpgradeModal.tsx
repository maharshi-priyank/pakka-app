import { X, Check, Zap } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id:    'FREE',
    name:  'Free',
    price: '₹0',
    per:   'forever',
    color: 'text-[#667085]',
    bg:    'bg-[#F4F5F8] dark:bg-[#21222D]',
    ring:  'ring-[#EAECF0] dark:ring-[#3D4258]',
    features: [
      '3 proposals / month',
      '3 active leads',
      '1 client',
      'ClearWork watermark on docs',
    ],
  },
  {
    id:    'SOLO',
    name:  'Solo',
    price: '₹299',
    per:   '/mo',
    color: 'text-[#6366F1]',
    bg:    'bg-[#EEF2FF] dark:bg-[#1E2040]',
    ring:  'ring-[#6366F1]/40',
    badge: 'Popular',
    features: [
      'Unlimited proposals',
      'Unlimited leads',
      '10 clients',
      'No watermark',
      'E-sign contracts',
    ],
  },
  {
    id:    'STUDIO',
    name:  'Studio',
    price: '₹699',
    per:   '/mo',
    color: 'text-[#7C3AED]',
    bg:    'bg-[#F5F3FF] dark:bg-[#1E1040]',
    ring:  'ring-[#7C3AED]/30',
    features: [
      'Everything in Solo',
      'Unlimited clients',
      'Team members (soon)',
      'White-label docs',
      'Priority support',
    ],
  },
]

export default function UpgradeModal() {
  const { upgradeModal, closeUpgradeModal } = useUiStore()
  if (!upgradeModal.open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={closeUpgradeModal} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-[640px] glass-modal rounded-2xl pointer-events-auto anim-modal-in">

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
                  <Zap size={14} className="text-[#6366F1]" strokeWidth={2.5} />
                </div>
                <h2 className="text-[16px] font-bold text-[#0D1117] dark:text-[#ECEEF3]">Upgrade your plan</h2>
              </div>
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                You've reached the <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{upgradeModal.feature}</span> limit on the Free plan.
              </p>
            </div>
            <button
              onClick={closeUpgradeModal}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-3 px-6 pb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl p-4 ring-1',
                  plan.bg,
                  plan.ring,
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-[#6366F1] text-white text-[10px] font-bold rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className={cn('text-[13px] font-bold mb-0.5', plan.color)}>{plan.name}</p>
                <p className="text-[20px] font-black text-[#0D1117] dark:text-[#ECEEF3] leading-none">
                  {plan.price}
                  <span className="text-[11px] font-medium text-[#98A2B3] ml-0.5">{plan.per}</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#344054] dark:text-[#C2C8D8]">
                      <Check size={11} className={cn('mt-0.5 shrink-0', plan.color)} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pb-6 pt-0 flex items-center justify-between border-t border-[#F1F3F8] dark:border-[#26283A] pt-4">
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">Plans launching soon — join the waitlist to get early access.</p>
            <a
              href="https://clearwork.in/#waitlist"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-[13px] h-9 px-4 shrink-0"
            >
              Join waitlist
            </a>
          </div>

        </div>
      </div>
    </>
  )
}
