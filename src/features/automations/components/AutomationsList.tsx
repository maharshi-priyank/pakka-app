import { useState } from 'react'
import { Zap, ChevronDown, ChevronUp, IndianRupee, FileText, FileSignature, Users, BarChart2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useAutomations, useToggleAutomation,
  CATEGORY_LABELS, CATEGORY_ORDER, type AutomationRule,
} from '../hooks/useAutomations'
import AutomationCard from './AutomationCard'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

const CATEGORY_ICONS: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  invoice:  { icon: IndianRupee,    bg: 'bg-[#ECFDF3] dark:bg-emerald-950/40', color: 'text-[#027A48] dark:text-[#34D399]' },
  proposal: { icon: FileText,       bg: 'bg-[#EFF6FF] dark:bg-[#1E2040]',      color: 'text-[#2563EB] dark:text-[#60A5FA]' },
  contract: { icon: FileSignature,  bg: 'bg-[#F4F3FF] dark:bg-violet-950/40',  color: 'text-[#5925DC] dark:text-[#A78BFA]' },
  lead:     { icon: Users,          bg: 'bg-[#FFFAEB] dark:bg-amber-950/30',   color: 'text-[#B54708] dark:text-amber-400' },
  business: { icon: BarChart2,      bg: 'bg-[#F8F9FC] dark:bg-[#21222D]',      color: 'text-[#344054] dark:text-[#C2C8D8]' },
}

export default function AutomationsList() {
  const { data: grouped, isLoading } = useAutomations()
  const { mutate: toggle, isPending, variables } = useToggleAutomation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCategory = (cat: string) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-table">
            <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
              <Skeleton className="h-4 w-40" />
            </div>
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-4 px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
                <Skeleton className="h-5 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const activeCount = grouped
    ? Object.values(grouped).flat().filter((r: AutomationRule) => r.isActive).length
    : 0
  const totalCount  = grouped ? Object.values(grouped).flat().length : 0

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#EFF6FF] dark:bg-[#1E2040] border border-[#BFDBFE] dark:border-[#26283A] rounded-xl">
        <Zap size={16} className="text-[#2563EB] dark:text-[#818CF8]" strokeWidth={2.5} />
        <p className="text-[13px] font-semibold text-[#1D4ED8] dark:text-[#818CF8]">
          {activeCount} of {totalCount} automations active
        </p>
        <p className="text-[12px] text-[#3B82F6] dark:text-[#6366F1] ml-auto">
          Runs daily at 9 AM
        </p>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.filter((cat) => grouped?.[cat]?.length).map((cat) => {
        const rules      = grouped![cat]
        const isCollapsed = collapsed[cat]
        const activeInCat = rules.filter((r) => r.isActive).length

        return (
          <div key={cat} className="glass-table">
            <button
              className="w-full flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors"
              onClick={() => toggleCategory(cat)}
            >
              <div className="flex items-center gap-2.5">
                {CATEGORY_ICONS[cat] && (() => {
                  const { icon: Icon, bg, color } = CATEGORY_ICONS[cat]
                  return (
                    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', bg)}>
                      <Icon size={13} className={color} strokeWidth={2} />
                    </div>
                  )
                })()}
                <h3 className="text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h3>
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  activeInCat === rules.length
                    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
                    : activeInCat === 0
                      ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'
                      : 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
                )}>
                  {activeInCat}/{rules.length} active
                </span>
              </div>
              {isCollapsed
                ? <ChevronDown size={16} className="text-[#98A2B3] dark:text-[#545C74]" />
                : <ChevronUp   size={16} className="text-[#98A2B3] dark:text-[#545C74]" />}
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {rules.map((rule) => (
                  <AutomationCard
                    key={rule.id}
                    rule={rule}
                    loading={isPending && variables?.id === rule.id}
                    onToggle={(id, isActive) => toggle({ id, isActive })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
