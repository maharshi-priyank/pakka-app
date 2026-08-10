import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscription'
import PlanCards from './PlanCards'
import PromoCodeInput from './PromoCodeInput'
import CancelSubscriptionModal from './CancelSubscriptionModal'
import { useEntitlementSummary } from '../hooks/useEntitlementSummary'

function formatStorage(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function BillingTab() {
  const { data: subscription, isLoading } = useSubscriptionStatus()
  const { data: summary } = useEntitlementSummary()
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
      <PlanCards
        subscription={subscription}
        onCancel={() => setShowCancel(true)}
      />

      {summary && (
        <div className="bg-white dark:bg-[#1A1B27] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5">
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Account usage</h3>
          <p className="text-[12px] text-[#667085] mt-0.5">Totals are shared across every workspace in this account.</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            {([
              ['Clients', summary.usage.clients, summary.limits.clients],
              ['Projects', summary.usage.projects, summary.limits.projects],
              ['Active leads', summary.usage.activeLeads, summary.limits.activeLeads],
              ['Team members', summary.usage.teamMembers, summary.limits.teamMembers],
              ['Storage', formatStorage(summary.usage.storageBytes), summary.limits.storageBytes == null ? 'Unlimited' : formatStorage(summary.limits.storageBytes)],
            ] as const).map(([label, value, limit]) => (
              <div key={label} className="rounded-lg bg-[#F9FAFB] dark:bg-[#202231] px-3 py-2.5">
                <p className="text-[11px] text-[#667085]">{label}</p>
                <p className="text-[16px] font-bold text-[#101828] dark:text-[#ECEEF3] mt-1">{value}</p>
                <p className="text-[10px] text-[#98A2B3]">of {limit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
