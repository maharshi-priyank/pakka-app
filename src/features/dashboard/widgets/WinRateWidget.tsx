import { cn } from '@/lib/utils'
import { useProposals } from '@/features/proposals/hooks/useProposals'
import { ThumbsUp } from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function RingChart({ percent, size = 88 }: { percent: number; size?: number }) {
  const strokeWidth = 9
  const radius      = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset      = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={strokeWidth}
        className="stroke-[#EEF2FF] dark:stroke-[#26283A]"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={percent >= 60 ? '#6366F1' : percent >= 30 ? '#F59E0B' : '#F04438'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="15" fontWeight="800"
        className="fill-[#101828] dark:fill-[#ECEEF3]"
        fontFamily="'Plus Jakarta Sans', sans-serif"
      >
        {percent}%
      </text>
    </svg>
  )
}

export default function WinRateWidget() {
  const { data, isLoading } = useProposals({ limit: 200 })
  const items    = data?.items ?? []
  const accepted = items.filter(p => p.status === 'ACCEPTED').length
  const declined = items.filter(p => p.status === 'DECLINED').length
  const decided  = accepted + declined
  const percent  = decided > 0 ? Math.round((accepted / decided) * 100) : 0

  return (
    <div className="card p-5 h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#EEF2FF] dark:bg-[#1E2040]">
          <ThumbsUp size={18} className="text-[#6366F1]" strokeWidth={2} />
        </div>
      </div>
      {isLoading ? (
        <div className="flex flex-col items-center py-2">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-3 w-16 mt-3" />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <RingChart percent={percent} />
          <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium mt-2">Win rate</p>
          <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            {decided > 0
              ? `${accepted} won · ${declined} lost`
              : 'No resolved proposals yet'}
          </p>
        </div>
      )}
    </div>
  )
}
