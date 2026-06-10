import { CheckCircle2, AlertCircle, XCircle, PauseCircle, Calendar } from 'lucide-react'
import type { SubscriptionState } from '../hooks/useSubscription'

interface Props {
  subscription: SubscriptionState
  onCancel: () => void
}

const STATUS_CONFIG = {
  ACTIVE: {
    icon:  CheckCircle2,
    color: 'text-[#17B26A]',
    bg:    'bg-[#ECFDF3]',
    label: 'Active',
  },
  PAST_DUE: {
    icon:  AlertCircle,
    color: 'text-[#F59E0B]',
    bg:    'bg-[#FFF8ED]',
    label: 'Past due',
  },
  CANCELLED: {
    icon:  XCircle,
    color: 'text-[#98A2B3]',
    bg:    'bg-[#F4F5F8]',
    label: 'Cancelled',
  },
  PAUSED: {
    icon:  PauseCircle,
    color: 'text-[#6366F1]',
    bg:    'bg-[#EEF2FF]',
    label: 'Paused',
  },
  NONE: {
    icon:  XCircle,
    color: 'text-[#98A2B3]',
    bg:    'bg-[#F4F5F8]',
    label: 'None',
  },
}

function planWindowLabel(planId?: string | null): string | null {
  if (!planId) return null
  if (planId.includes('founding'))    return 'Founding Member'
  if (planId.includes('earlyaccess')) return 'Early Access'
  return null
}

export default function PlanStatusCard({ subscription, onCancel }: Props) {
  const cfg = STATUS_CONFIG[subscription.subscriptionStatus] ?? STATUS_CONFIG.NONE
  const StatusIcon = cfg.icon
  const windowLabel = planWindowLabel(subscription.cashfreePlanId)

  const nextBilling = subscription.billingAnchorDate
    ? new Date(subscription.billingAnchorDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const expiresAt = subscription.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]`}>
              {subscription.plan === 'SOLO' ? 'Solo' : subscription.plan === 'STUDIO' ? 'Studio' : 'Free'} Plan
            </span>
            {windowLabel && (
              <span className="text-[10px] font-semibold bg-[#FFF8ED] text-[#92400E] border border-[#FEE3A3] px-2 py-0.5 rounded-full">
                {windowLabel}
              </span>
            )}
          </div>

          <div className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
            <StatusIcon size={11} />
            {cfg.label}
          </div>
        </div>

        {subscription.subscriptionStatus === 'ACTIVE' && (
          <button
            onClick={onCancel}
            className="text-[12px] font-medium text-[#667085] hover:text-[#D92D20] transition-colors cursor-pointer shrink-0"
          >
            Cancel plan
          </button>
        )}
      </div>

      {subscription.subscriptionStatus === 'PAST_DUE' && (
        <div className="flex items-start gap-2.5 bg-[#FFF8ED] border border-[#FEE3A3] rounded-lg px-3.5 py-3">
          <AlertCircle size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#92400E]">
            Payment failed — your plan will downgrade unless payment is updated.
            Contact support or update your payment method via Cashfree.
          </p>
        </div>
      )}

      {subscription.subscriptionStatus === 'CANCELLED' && expiresAt && (
        <div className="flex items-center gap-2 text-[12.5px] text-[#667085]">
          <Calendar size={13} />
          Access continues until {expiresAt}
        </div>
      )}

      {nextBilling && subscription.subscriptionStatus === 'ACTIVE' && (
        <div className="flex items-center gap-2 text-[12.5px] text-[#667085]">
          <Calendar size={13} />
          Next billing date: {nextBilling}
        </div>
      )}
    </div>
  )
}
