import { useNavigate } from 'react-router-dom'
import { IndianRupee, User, Calendar, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency-symbols'
import DocumentPreviewDrawer from '@/components/shared/DocumentPreviewDrawer'
import { useInvoice } from '../hooks/useInvoices'
import type { GstType } from '../schemas/invoice.schema'

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const GST_LABELS: Record<GstType, string> = {
  IGST:      'IGST',
  CGST_SGST: 'CGST + SGST',
  EXEMPT:    'GST Exempt',
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     'bg-[#F2F4F7] text-[#344054]',
  SENT:      'bg-[#EFF6FF] text-[#2563EB]',
  OVERDUE:   'bg-[#FEF3F2] text-[#B42318]',
  PAID:      'bg-[#ECFDF3] text-[#027A48]',
  PARTIAL:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

interface Props {
  id: string | null
  onClose: () => void
}

export default function InvoicePreviewDrawer({ id, onClose }: Props) {
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useInvoice(id)

  const open = !!id

  const lineItems = invoice?.lineItems ?? []
  const gstType   = invoice?.gstType ?? 'IGST'
  const symbol    = currencySymbol(invoice?.currency)

  const isOverdue = invoice?.dueDate
    ? new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID'
    : false

  const balanceDue = invoice
    ? Math.max(0, invoice.total - invoice.tdsDeducted - invoice.amountPaid)
    : 0

  const clientName = invoice?.client?.name ?? undefined
  const clientCo   = invoice?.client?.company ?? undefined

  const statusBadge = invoice ? (
    <span className={cn(
      'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
      STATUS_STYLES[invoice.status] ?? 'bg-[#F2F4F7] text-[#344054]',
    )}>
      {invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase()}
    </span>
  ) : undefined

  const metaRow = invoice ? (
    <>
      {clientName && (
        <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
          <User size={11} className="shrink-0" />
          {clientName}{clientCo ? ` · ${clientCo}` : ''}
        </span>
      )}
      <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
        <Calendar size={11} className="shrink-0" />
        {formatDate(invoice.createdAt)}
      </span>
    </>
  ) : undefined

  return (
    <DocumentPreviewDrawer
      open={open}
      onClose={onClose}
      onEdit={invoice ? () => { onClose(); navigate(`/invoices/${invoice.id}`) } : undefined}
      onDownload={invoice ? () => window.open(`/invoice/${invoice.id}`, '_blank', 'noreferrer') : undefined}
      title={invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}
      statusBadge={statusBadge}
      metaRow={metaRow}
      editLabel="Edit Invoice"
      isLoading={isLoading || (open && !invoice)}
    >
      {invoice && (
        <div className="px-5 py-5 space-y-6">

          {/* Amount summary card */}
          <div className={cn(
            'border rounded-xl p-4',
            invoice.status === 'PAID'
              ? 'bg-[#F6FEF9] dark:bg-emerald-950/20 border-[#ABEFC6] dark:border-emerald-800/40'
              : isOverdue
              ? 'bg-[#FFF9F8] dark:bg-red-950/20 border-[#FEA3B4] dark:border-red-800/40'
              : 'bg-[#F8F9FF] dark:bg-[#1A1B2E] border-[#E0E4FF] dark:border-[#2D3060]',
          )}>
            <div className="flex items-baseline gap-1">
              <IndianRupee
                size={14}
                strokeWidth={2.5}
                className={cn(
                  'shrink-0 mb-0.5',
                  invoice.status === 'PAID' ? 'text-[#027A48] dark:text-emerald-400'
                  : isOverdue ? 'text-[#D92D20] dark:text-red-400'
                  : 'text-[#3538CD] dark:text-indigo-400',
                )}
              />
              <span className="text-[26px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">
                {fmt(invoice.total)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-2.5">
              {invoice.dueDate && (
                <span className={cn(
                  'flex items-center gap-1 text-[11.5px]',
                  isOverdue ? 'text-[#D92D20] dark:text-red-400' : 'text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {isOverdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
                  Due {formatDate(invoice.dueDate)}
                  {isOverdue && ' (overdue)'}
                </span>
              )}
              {invoice.paidAt && (
                <span className="flex items-center gap-1 text-[11.5px] text-[#027A48] dark:text-emerald-400">
                  <CheckCircle size={11} /> Paid {formatDate(invoice.paidAt)}
                </span>
              )}
            </div>
          </div>

          {/* Line items */}
          {lineItems.length > 0 && (
            <Section title="Line Items">
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[360px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
                      <th className="text-left py-2 pr-3 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide">Description</th>
                      <th className="text-right py-2 px-3 w-12 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Qty</th>
                      <th className="text-right py-2 px-3 w-24 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Rate</th>
                      {gstType !== 'EXEMPT' && (
                        <th className="text-right py-2 px-3 w-14 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">GST</th>
                      )}
                      <th className="text-right py-2 pl-3 w-24 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const lineTotal = item.qty * item.rate
                      const lineGst   = gstType !== 'EXEMPT' ? lineTotal * (item.gstRate ?? 0) / 100 : 0
                      return (
                        <tr key={idx} className="border-b border-[#F9FAFB] dark:border-[#1A1B23]">
                          <td className="py-2.5 pr-3 align-top">
                            <p className="text-[#344054] dark:text-[#C2C8D8] font-medium leading-snug">{item.description}</p>
                            {item.hsnSac && (
                              <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">HSN/SAC: {item.hsnSac}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] tabular-nums align-top">{item.qty}</td>
                          <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] whitespace-nowrap tabular-nums align-top">{symbol}{fmt(item.rate)}</td>
                          {gstType !== 'EXEMPT' && (
                            <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] tabular-nums align-top">{item.gstRate ?? 0}%</td>
                          )}
                          <td className="py-2.5 pl-3 text-right font-semibold text-[#101828] dark:text-[#ECEEF3] whitespace-nowrap tabular-nums align-top">{symbol}{fmt(lineTotal + lineGst)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financials summary */}
              <div className="mt-3 border-t border-[#EAECF0] dark:border-[#26283A] pt-3 space-y-1.5">
                <Row label="Subtotal" value={`${symbol}${fmt(invoice.subtotal)}`} />
                {invoice.gstAmount > 0 && (
                  <>
                    {gstType === 'CGST_SGST' ? (
                      <>
                        <Row label="CGST" value={`${symbol}${fmt(invoice.gstAmount / 2)}`} />
                        <Row label="SGST" value={`${symbol}${fmt(invoice.gstAmount / 2)}`} />
                      </>
                    ) : (
                      <Row label={GST_LABELS[gstType]} value={`${symbol}${fmt(invoice.gstAmount)}`} />
                    )}
                  </>
                )}
                {invoice.tdsDeducted > 0 && (
                  <Row label={`TDS (${invoice.tdsRate ?? ''}%)`} value={`−${symbol}${fmt(invoice.tdsDeducted)}`} />
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#EAECF0] dark:border-[#26283A]">
                  <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Total</span>
                  <span className="flex items-center gap-0.5 text-[16px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                    <IndianRupee size={11} strokeWidth={3} />
                    {fmt(invoice.total)}
                  </span>
                </div>
                {invoice.amountPaid > 0 && (
                  <Row label="Amount Paid" value={`${symbol}${fmt(invoice.amountPaid)}`} />
                )}
                {balanceDue > 0 && invoice.status !== 'PAID' && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#EAECF0] dark:border-[#26283A]">
                    <span className={cn(
                      'text-[12.5px] font-semibold',
                      isOverdue ? 'text-[#D92D20] dark:text-red-400' : 'text-[#344054] dark:text-[#C2C8D8]',
                    )}>Balance Due</span>
                    <span className={cn(
                      'text-[14px] font-bold tabular-nums',
                      isOverdue ? 'text-[#D92D20] dark:text-red-400' : 'text-[#101828] dark:text-[#ECEEF3]',
                    )}>{symbol}{fmt(balanceDue)}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* No items fallback */}
          {lineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mb-3" />
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">No line items</p>
            </div>
          )}

        </div>
      )}
    </DocumentPreviewDrawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] text-[#667085] dark:text-[#8B92A8]">
      <span>{label}</span>
      <span className="font-medium text-[#344054] dark:text-[#C2C8D8] tabular-nums">{value}</span>
    </div>
  )
}
