import { useNavigate } from 'react-router-dom'
import { IndianRupee } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import QuickViewModal, { QVField } from '@/components/shared/QuickViewModal'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:   'bg-[#F2F4F7] dark:bg-[#21222D] text-[#344054] dark:text-[#8B92A8]',
  SENT:    'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  PAID:    'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  PARTIAL: 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  OVERDUE: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
}

export interface InvoiceSnap {
  id: string
  invoiceNumber: string
  status: string
  total: string | number
  amountPaid?: string | number
  dueDate?: string | null
  createdAt?: string
  clientName?: string
  projectName?: string
}

interface Props {
  invoice: InvoiceSnap | null
  onClose: () => void
}

export default function InvoiceQuickView({ invoice, onClose }: Props) {
  const navigate = useNavigate()
  if (!invoice) return null

  const total   = Number(invoice.total)
  const paid    = invoice.amountPaid != null ? Number(invoice.amountPaid) : null
  const balance = paid != null ? total - paid : null

  return (
    <QuickViewModal
      open
      onClose={onClose}
      onEdit={() => { onClose(); navigate(`/invoices/${invoice.id}`) }}
      editLabel="Open Invoice"
      title={invoice.invoiceNumber}
      subtitle={invoice.clientName ?? invoice.projectName}
      statusBadge={
        <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[invoice.status] ?? STATUS_COLORS['DRAFT'])}>
          {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
        </span>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <QVField label="Total Amount" value={
          <span className="flex items-center gap-0.5">
            <IndianRupee size={11} strokeWidth={2.5} className="inline text-gray-500" />
            {formatCurrency(total).replace('₹', '')}
          </span>
        } />
        {paid != null && <QVField label="Amount Paid" value={formatCurrency(paid)} />}
        {balance != null && (
          <QVField label="Balance Due" value={
            <span className={balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {formatCurrency(balance)}
            </span>
          } />
        )}
        <QVField label="Due Date" value={invoice.dueDate ? formatDate(invoice.dueDate) : null} />
        {invoice.createdAt && <QVField label="Issued On" value={formatDate(invoice.createdAt)} />}
        {invoice.clientName && <QVField label="Client" value={invoice.clientName} />}
      </dl>
    </QuickViewModal>
  )
}
