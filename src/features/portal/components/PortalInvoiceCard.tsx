import { useState } from 'react'
import { Eye, Download, CreditCard, CheckCircle2, Receipt } from 'lucide-react'
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
  SENT:      'bg-[#EFF6FF] text-[#2563EB]',
  VIEWED:    'bg-[#EFF6FF] text-[#2563EB]',
  OVERDUE:   'bg-[#FEF3F2] text-[#B42318]',
  PAID:      'bg-[#ECFDF3] text-[#027A48]',
  PARTIAL:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface Props {
  invoice:        PortalInvoice
  appUrl:         string
  portalToken:    string
  clientName:     string
  clientEmail:    string | null
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
        key:         order.keyId,
        order_id:    order.orderId,
        amount:      order.amount,
        currency:    order.currency,
        name:        freelancerName ?? 'Rupway',
        description: `Invoice ${invoice.invoiceNumber}`,
        prefill:     { name: clientName, email: clientEmail ?? '' },
        theme:       { color: '#101828' },
        handler:     () => {
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
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      <div className="p-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: icon + meta */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF3] flex items-center justify-center shrink-0">
              <Receipt size={14} className="text-[#027A48]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#344054]">{invoice.invoiceNumber}</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {invoice.dueDate && (
                  <span className={cn(isOverdue && 'text-[#D92D20] font-medium')}>
                    {` · Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Right: icon actions + status badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5">
              <a
                href={`${appUrl}/invoice/${invoice.id}`}
                target="_blank" rel="noreferrer"
                title="View invoice"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#C9CDD4] hover:text-[#667085] hover:bg-[#F2F4F7] transition-colors"
              >
                <Eye size={13} />
              </a>
              <button
                onClick={() => window.open(`${appUrl}/invoice/${invoice.id}?print=1`, '_blank')}
                title="Download PDF"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#C9CDD4] hover:text-[#667085] hover:bg-[#F2F4F7] transition-colors"
              >
                <Download size={13} />
              </button>
            </div>
            <div className="w-px h-4 bg-[#EAECF0]" />
            <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
              {STATUS_LABEL[localStatus] ?? localStatus}
            </span>
          </div>
        </div>

        {/* Amount + action row */}
        <div className="flex items-center justify-between gap-3">
          <p className={cn('text-[22px] font-bold leading-none', isOverdue ? 'text-[#D92D20]' : 'text-[#101828]')}>
            ₹{fmt(invoice.total)}
          </p>
          {isPayable && (
            <button
              onClick={handlePayNow}
              disabled={createOrder.isPending}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
            >
              <CreditCard size={13} strokeWidth={2} />
              {createOrder.isPending ? 'Opening…' : 'Pay Now'}
            </button>
          )}
          {localStatus === 'PAID' && (
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#027A48]">
              <CheckCircle2 size={13} />
              Paid{invoice.paidAt ? ` · ${new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </div>
          )}
        </div>
        {payError && <p className="text-[11.5px] text-[#D92D20] mt-2">{payError}</p>}

      </div>
    </div>
  )
}
