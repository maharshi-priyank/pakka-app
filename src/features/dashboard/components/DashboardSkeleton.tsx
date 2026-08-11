import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'
import { getWidgetMeta } from '../dashboardRegistry'

function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('animate-pulse rounded bg-[#F2F4F7] dark:bg-[#21222D]', className)} style={style} />
}

function colSpanClass(cols: 1 | 2 | 4) {
  if (cols === 4) return 'col-span-2 md:col-span-3 lg:col-span-4'
  if (cols === 2) return 'col-span-2'
  return 'col-span-1'
}

function StatCardSkeleton() {
  return (
    <div className="card-glass p-5 h-full">
      <Bone className="w-10 h-10 rounded-xl mb-4" />
      <Bone className="h-8 w-28 mb-2" />
      <Bone className="h-3 w-24 mb-1" />
      <Bone className="h-3 w-32" />
    </div>
  )
}

function PanelSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="card-glass overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <Bone className="h-4 w-32 mb-2" />
        <Bone className="h-3 w-24" />
      </div>
      <div className={cn('px-5 py-5', tall ? 'space-y-3' : 'flex items-center gap-4')}>
        {tall ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-24 h-6 rounded-lg shrink-0" />
              <Bone className="flex-1 h-6 rounded-lg" />
              <Bone className="w-4 h-4 rounded shrink-0" />
            </div>
          ))
        ) : (
          <>
            <Bone className="w-[120px] h-[120px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-4 w-full" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="card-glass overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <Bone className="h-4 w-28 mb-2" />
        <Bone className="h-3 w-40" />
      </div>
      <div className="px-4 py-5 flex items-end gap-3 h-[160px]">
        {[60, 90, 45, 120, 80, 140].map((h, i) => (
          <Bone key={i} className="flex-1 rounded-md" style={{ height: `${h}px` }} />
        ))}
      </div>
    </div>
  )
}

function ActionsSkeleton() {
  return (
    <div className="card-glass overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <Bone className="h-4 w-28 mb-2" />
        <Bone className="h-3 w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

function widgetSkeleton(id: string) {
  switch (id) {
    case 'revenue_month':
    case 'pipeline':
    case 'overdue':
    case 'open_proposals':
    case 'collection':
    case 'win_rate':
      return <StatCardSkeleton />
    case 'quick_actions':
      return <ActionsSkeleton />
    case 'revenue_chart':
      return <ChartSkeleton />
    case 'lead_funnel':
    case 'activity':
      return <PanelSkeleton tall />
    default:
      return <PanelSkeleton />
  }
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 md:gap-5 mb-6">
      <div className="flex-1 min-w-0">
        <Bone className="h-7 w-56 mb-2" />
        <Bone className="h-4 w-40" />
      </div>
      <div className="hidden md:block w-[280px] shrink-0">
        <Bone className="h-9 w-full rounded-xl" />
      </div>
      <div className="flex-1 flex items-center justify-end gap-2">
        <Bone className="w-9 h-9 rounded-xl" />
        <Bone className="w-9 h-9 rounded-xl" />
        <Bone className="w-8 h-8 rounded-full" />
        <Bone className="hidden md:block h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export default function DashboardSkeleton({
  visibleOrder,
  sizes,
}: {
  visibleOrder: string[]
  sizes: Record<string, 1 | 2 | 4>
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {visibleOrder.map(id => {
        const meta = getWidgetMeta(id)
        if (!meta) return null
        const cols = (sizes[id] ?? meta.cols) as 1 | 2 | 4
        return (
          <div key={id} className={colSpanClass(cols)}>
            {widgetSkeleton(id)}
          </div>
        )
      })}
    </div>
  )
}
