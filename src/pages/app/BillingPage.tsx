import BillingTab from '@/features/billing/components/BillingTab'

export default function BillingPage() {
  return (
    <div className="max-w-[860px] space-y-5">

      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Billing &amp; Plans</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Manage your subscription, plan, and account usage.</p>
      </div>

      <BillingTab />

    </div>
  )
}
