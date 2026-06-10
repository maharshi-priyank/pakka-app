import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscription'
import PlanCards from './PlanCards'
import PromoCodeInput from './PromoCodeInput'
import CancelSubscriptionModal from './CancelSubscriptionModal'

export default function BillingTab() {
  const { data: subscription, isLoading } = useSubscriptionStatus()
  const [showCancel, setShowCancel] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-[#6366F1]" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Billing & Plan</h2>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
          Manage your subscription and access level.
        </p>
      </div>

      <PlanCards
        subscription={subscription}
        onCancel={() => setShowCancel(true)}
      />

      <PromoCodeInput />

      {subscription && (
        <CancelSubscriptionModal
          open={showCancel}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  )
}
