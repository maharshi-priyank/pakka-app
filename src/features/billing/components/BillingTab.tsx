import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscription'
import PlanStatusCard from './PlanStatusCard'
import UpgradePlanCards from './UpgradePlanCards'
import PromoCodeInput from './PromoCodeInput'
import CancelSubscriptionModal from './CancelSubscriptionModal'

export default function BillingTab() {
  const { data: subscription, isLoading } = useSubscriptionStatus()
  const [showCancel, setShowCancel] = useState(false)

  const isPaid =
    subscription &&
    subscription.plan !== 'FREE' &&
    subscription.subscriptionStatus !== 'NONE'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-[#6366F1]" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Billing & Plan</h2>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
          Manage your subscription and access level.
        </p>
      </div>

      {isPaid && subscription ? (
        <PlanStatusCard
          subscription={subscription}
          onCancel={() => setShowCancel(true)}
        />
      ) : (
        <UpgradePlanCards />
      )}

      <PromoCodeInput />

      {isPaid && subscription && (
        <CancelSubscriptionModal
          open={showCancel}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  )
}
