import { useState } from 'react'
import { Receipt, ExternalLink, Download, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateInvoiceOrder, type PortalInvoice } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  SENT:      'Awaiting payment',
  VIEWED:    'Awaiting payment',
  OVERDUE:   'Overdue',
  PAID:      'Paid',
  PARTIAL:   'Partial payment',
  CANCELLED: 'Cancelled',
}

const STATUS_STYLE: Record<string, string> = {
  SENT:      'bg-[#EEF2FF] text-[#4338CA]',
  VIEWED:    'bg-[#EEF2FF] text-[#4338CA]',
  OVERDUE:   'bg-[#FEF3F2] text-[#B42318]',
  PAID:      'bg-[#ECFDF3] text-[#027A48]',
  PARTIAL:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface Props {
  invoice:     PortalInvoice
  appUrl:      string
  portalToken: string
  clientName:  string
  clientEmail: string | null
  freelancerName: string | null
  onStatusChange: (id: string, status: string) => void
}

export default function PortalInvoiceCard({
  invoice, appUrl, portalToken, clientName, clientEmail, freelancerName, onStatusChange,
}: Props) {
  const [localStatus, setLocalStatus] = useState(invoice.status)
  const [payError,    setPayError]    = useState('')

  const createOrder = useCreateInvoiceOrder(portalToken)

  async function handlePayNow() {
    setPayError('')
    try {
      const order = await createOrder.mutateAsync(invoice.id)
      const rzp = new (window as any).Razorpay({
        key:       order.keyId,
        order_id:  order.orderId,
        amount:    order.amount,
        currency:  order.currency,
        name:      freelancerName ?? 'Pakka',
        description: `Invoice ${invoice.invoiceNumber}`,
        prefill:   { name: clientName, email: clientEmail ?? '' },
        theme:     { color: '#6366F1' },
        handler:   () => {
          setLocalStatus('PAID')
          onStatusChange(invoice.id, 'PAID')
        },
      })
      rzp.open()
    } catch {
      setPayError('Failed to initiate payment. Please try again.')
    }
  }

  const isPayable = localStatus === 'SENT' || localStatus === 'VIEWED' || localStatus === 'OVERDUE'
  const isOverdue = localStatus === 'OVERDUE'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden',
      isOverdue ? 'border-[#FDA29B]' : 'border-[#EAECF0]',
    )}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isOverdue ? 'bg-[#FEF3F2]' : 'bg-[#ECFDF3]')}>
              {isOverdue
                ? <AlertCircle size={16} className="text-[#D92D20]" />
                : <Receipt size={16} className="text-[#027A48]" />
              }
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] leading-tight">{invoice.invoiceNumber}</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {invoice.dueDate && ` · Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={cn('text-[20px] font-bold', isOverdue ? 'text-[#D92D20]' : 'text-[#101828]')}>
            ₹{fmt(invoice.total)}
          </p>
          <div className="flex items-center gap-2">
            <a
              href={`${appUrl}/invoice/${invoice.id}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
            >
              <ExternalLink size={12} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/invoice/${invoice.id}?print=1`, '_blank')}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
            >
              <Download size={12} /> PDF
            </button>
          </div>
        </div>
      </div>

      {isPayable && (
        <div className="border-t border-[#F2F4F7] px-5 py-3 bg-[#FAFBFF] space-y-2">
          <button
            onClick={handlePayNow}
            disabled={createOrder.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 shadow-sm"
          >
            <CreditCard size={13} strokeWidth={2} />
            {createOrder.isPending ? 'Opening…' : 'Pay Now'}
          </button>
          {payError && <p className="text-[11.5px] text-red-500">{payError}</p>}
        </div>
      )}

      {localStatus === 'PAID' && (
        <div className="border-t border-[#F2F4F7] px-5 py-2.5 flex items-center gap-2 bg-[#F0FDF4]">
          <CheckCircle2 size={13} className="text-[#027A48]" />
          <p className="text-[12px] font-semibold text-[#027A48]">
            Payment received{invoice.paidAt ? ` on ${new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
