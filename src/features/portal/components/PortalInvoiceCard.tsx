import { useState } from 'react'
import { ExternalLink, Download, CreditCard, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateInvoiceOrder, type PortalInvoice } from '../hooks/usePortal'

const ACCENT_BAR: Record<string, string> = {
  SENT:      'bg-[#6366F1]',
  VIEWED:    'bg-[#6366F1]',
  OVERDUE:   'bg-[#D92D20]',
  PAID:      'bg-[#027A48]',
  PARTIAL:   'bg-[#B54708]',
  CANCELLED: 'bg-[#98A2B3]',
}

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
        theme:       { color: '#6366F1' },
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
  const accentBar = ACCENT_BAR[localStatus] ?? 'bg-[#98A2B3]'

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
      {/* Status accent bar */}
      <div className={cn('h-1', accentBar)} />

      <div className="px-5 pt-4 pb-5">
        {/* Top row: status badge + view/pdf links */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={`${appUrl}/invoice/${invoice.id}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/invoice/${invoice.id}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
          </div>
        </div>

        {/* Amount hero */}
        <p className={cn('text-[32px] font-extrabold leading-none', isOverdue ? 'text-[#D92D20]' : 'text-[#101828]')}>
          ₹{fmt(invoice.total)}
        </p>
        <p className="text-[12px] text-[#98A2B3] mt-1.5">
          {invoice.invoiceNumber}
          {' · '}
          {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {invoice.dueDate && (
            <span className={cn(isOverdue && 'text-[#D92D20] font-semibold')}>
              {` · Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </span>
          )}
        </p>

        {/* Pay Now — full width prominent CTA */}
        {isPayable && (
          <div className="mt-5 space-y-2">
            <button
              onClick={handlePayNow}
              disabled={createOrder.isPending}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold transition-colors disabled:opacity-60',
                isOverdue
                  ? 'bg-[#D92D20] hover:bg-[#B42318] text-white'
                  : 'bg-[#0F172A] hover:bg-[#1e293b] text-white',
              )}
            >
              <CreditCard size={15} strokeWidth={2} />
              {createOrder.isPending ? 'Opening payment…' : 'Pay Now'}
            </button>
            {payError && <p className="text-[11.5px] text-center text-red-500">{payError}</p>}
          </div>
        )}

        {/* Paid confirmation */}
        {localStatus === 'PAID' && (
          <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[13px] font-semibold text-[#027A48]">
              Paid{invoice.paidAt ? ` on ${new Date(invoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
