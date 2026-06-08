import { cn } from '@/lib/utils'
import { useLeads } from '@/features/leads/hooks/useLeads'
import { Users } from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

const STAGES = [
  {
    key:       'ENQUIRY',
    label:     'Enquiry',
    color:     '#98A2B3',
    darkColor: '#545C74',
    labelCls:  'bg-[#F2F4F7] dark:bg-[#26283A] text-[#667085] dark:text-[#8B92A8]',
  },
  {
    key:       'PROPOSAL_SENT',
    label:     'Proposal Sent',
    color:     '#6366F1',
    darkColor: '#6366F1',
    labelCls:  'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#4338CA] dark:text-[#818CF8]',
  },
  {
    key:       'NEGOTIATING',
    label:     'Negotiating',
    color:     '#F59E0B',
    darkColor: '#F59E0B',
    labelCls:  'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  },
  {
    key:       'WON',
    label:     'Won',
    color:     '#12B76A',
    darkColor: '#12B76A',
    labelCls:  'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  },
  {
    key:       'LOST',
    label:     'Lost',
    color:     '#F04438',
    darkColor: '#F04438',
    labelCls:  'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
  },
]

export default function LeadFunnelWidget() {
  const { data, isLoading } = useLeads({ limit: 200 })
  const items    = data?.items ?? []
  const maxCount = Math.max(...STAGES.map(s => items.filter(l => l.stage === s.key).length), 1)

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Lead Pipeline</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{items.length} total lead{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
          <Users size={14} className="text-[#6366F1]" strokeWidth={2} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {STAGES.map((stage, idx) => {
          const count = isLoading ? 0 : items.filter(l => l.stage === stage.key).length
          const pct   = isLoading ? 60 - idx * 8 : (count / maxCount) * 100
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={cn(
                'text-[11px] font-semibold rounded-lg px-2.5 py-1 shrink-0 w-[108px] text-center',
                stage.labelCls,
              )}>
                {stage.label}
              </div>
              <div className="flex-1 h-6 bg-[#F4F5F8] dark:bg-[#21222D] rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                  style={{
                    width: `${isLoading ? pct : Math.max(pct, count > 0 ? 8 : 0)}%`,
                    background: stage.color,
                    opacity: isLoading ? 0.3 : 1,
                  }}
                />
              </div>
              {isLoading
                ? <Skeleton className="h-4 w-4 rounded" />
                : <span className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8] w-6 text-right shrink-0">{count}</span>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}
