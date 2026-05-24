import AutomationsList from '@/features/automations/components/AutomationsList'

export default function AutomationsPage() {
  return (
    <div className="space-y-6 max-w-[860px]">
      <div>
        <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Automations</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">
          Automate repetitive tasks — send emails, create documents, follow up — without lifting a finger.
        </p>
      </div>
      <AutomationsList />
    </div>
  )
}
