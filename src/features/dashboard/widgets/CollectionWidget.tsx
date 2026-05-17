import { Wallet, IndianRupee } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useInvoices } from '@/features/invoices/hooks/useInvoices'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

export default function CollectionWidget() {
  const { data, isLoading } = useInvoices({ limit: 200 })
  const items = data?.items ?? []

  const sentAmount    = items.filter(i => i.status === 'SENT').reduce((s, i) => s + Number(i.total), 0)
  const overdueAmount = items.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + Number(i.total), 0)
  const total         = sentAmount + overdueAmount

  const sentPct    = total > 0 ? (sentAmount / total) * 100 : 0
  const overduePct = total > 0 ? (overdueAmount / total) * 100 : 0

  return (
    <div className="card p-5 h-full hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F0FDF4]">
          <Wallet size={18} className="text-[#16A34A]" strokeWidth={2} />
        </div>
      </div>
      {isLoading
        ? <Skeleton className="h-8 w-28 mb-2" />
        : <p className="text-[26px] font-extrabold text-[#101828] leading-none tracking-tight">
            {formatCurrency(total)}
          </p>
      }
      <p className="text-[12px] text-[#667085] font-medium mt-2">Pending collection</p>

      {isLoading ? (
        <Skeleton className="h-2 w-full mt-3 rounded-full" />
      ) : total > 0 ? (
        <>
          {/* Stacked bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-3 gap-px">
            {sentPct > 0 && (
              <div className="rounded-full bg-[#6366F1] transition-all" style={{ width: `${sentPct}%` }} />
            )}
            {overduePct > 0 && (
              <div className="rounded-full bg-[#F04438] transition-all" style={{ width: `${overduePct}%` }} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[11px] text-[#667085]">
              <span className="w-2 h-2 rounded-full bg-[#6366F1] shrink-0" />
              <IndianRupee size={9} />{formatCurrency(sentAmount).replace('₹', '')} sent
            </span>
            {overdueAmount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#D92D20]">
                <span className="w-2 h-2 rounded-full bg-[#F04438] shrink-0" />
                <IndianRupee size={9} />{formatCurrency(overdueAmount).replace('₹', '')} overdue
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-[#98A2B3] mt-1">No pending collections</p>
      )}
    </div>
  )
}
