import { useState } from 'react'
import { cn } from '@/lib/utils'
import AutomationsList from '@/features/automations/components/AutomationsList'
import WorkflowsList from '@/features/automations/components/WorkflowsList'

const TABS = [
  { key: 'workflows', label: 'My Workflows' },
  { key: 'builtin',   label: 'Built-in'     },
] as const
type TabKey = typeof TABS[number]['key']

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('workflows')

  return (
    <div className="space-y-5 max-w-[860px]">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Automations</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
          Build custom workflows or enable built-in automations to run without lifting a finger.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'workflows' && <WorkflowsList />}
      {activeTab === 'builtin'   && <AutomationsList />}
    </div>
  )
}
