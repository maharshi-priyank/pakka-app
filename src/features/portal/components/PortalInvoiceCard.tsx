import { useState } from 'react'
import { ExternalLink, Download, CreditCard, CheckCircle2 } from 'lucide-react'
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
        name:        freelancerName ?? 'Clinekt',
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
        {/* Top row: id + status + links */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
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
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`${appUrl}/invoice/${invoice.id}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/invoice/${invoice.id}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
            <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
              {STATUS_LABEL[localStatus] ?? localStatus}
            </span>
          </div>
        </div>

        {/* Amount */}
        <p className={cn('text-[24px] font-bold', isOverdue ? 'text-[#D92D20]' : 'text-[#101828]')}>
          ₹{fmt(invoice.total)}
        </p>

        {/* Pay Now */}
        {isPayable && (
          <div className="mt-4 space-y-2">
            <button
              onClick={handlePayNow}
              disabled={createOrder.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13.5px] font-semibold transition-colors disabled:opacity-60"
            >
              <CreditCard size={14} strokeWidth={2} />
              {createOrder.isPending ? 'Opening payment…' : 'Pay Now'}
            </button>
            {payError && <p className="text-[11.5px] text-center text-[#D92D20]">{payError}</p>}
          </div>
        )}

        {localStatus === 'PAID' && (
          <div className="mt-3 flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[12.5px] font-semibold text-[#027A48]">
              Paid{invoice.paidAt ? ` on ${new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
