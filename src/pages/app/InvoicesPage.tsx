import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInvoices } from '@/features/invoices/hooks/useInvoices'
import InvoiceCard, { InvoiceCardSkeleton } from '@/features/invoices/components/InvoiceCard'
import type { Invoice, InvoiceStatus } from '@/features/invoices/schemas/invoice.schema'
import { STATUS_LABELS } from '@/features/invoices/schemas/invoice.schema'

const STATUS_TABS: Array<{ value: InvoiceStatus | 'ALL'; label: string }> = [
  { value: 'ALL',     label: 'All' },
  { value: 'DRAFT',   label: 'Draft' },
  { value: 'SENT',    label: 'Sent' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID',    label: 'Paid' },
]

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL')

  const { data, isLoading } = useInvoices({ limit: 200 })

  const allInvoices  = data?.items ?? []
  const invoices     = statusFilter === 'ALL' ? allInvoices : allInvoices.filter(i => i.status === statusFilter)
  const paidCount    = allInvoices.filter(i => i.status === 'PAID').length
  const overdueCount = allInvoices.filter(i => i.status === 'OVERDUE').length

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Invoices</h1>
          {!isLoading && invoices.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">
              {paidCount} paid
              {overdueCount > 0 && (
                <span className="text-[#D92D20]"> · {overdueCount} overdue</span>
              )}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/app/invoices/new')} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Invoice
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count = tab.value === 'ALL'
            ? allInvoices.length
            : allInvoices.filter(i => i.status === tab.value).length

          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5',
                isActive
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab.value === 'OVERDUE'
                    ? 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20]'
                    : isActive ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <InvoiceCardSkeleton key={i} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
            <FileText size={22} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            {statusFilter === 'ALL' ? 'No invoices yet' : `No ${STATUS_LABELS[statusFilter as InvoiceStatus]?.toLowerCase()} invoices`}
          </p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            {statusFilter === 'ALL'
              ? 'Create an invoice manually or generate one from a signed contract.'
              : 'Try a different filter.'}
          </p>
          {statusFilter === 'ALL' && (
            <button onClick={() => navigate('/app/invoices/new')} className="btn-primary mt-4 text-[13px]">
              <Plus size={13} strokeWidth={2.5} /> New Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {invoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onClick={(i: Invoice) => navigate(`/app/invoices/${i.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
